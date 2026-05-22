import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../AppContext";
import { okxPublicFetch } from "../lib/api";
import { calculateRSI } from "../lib/indicators";
import { Search, Loader2 } from "lucide-react";

interface Opportunity {
  symbol: string;
  rsi: number;
  rsi1h: number;
  rsi4h: number;
  type: "extreme_buy" | "extreme_sell" | "explosion";
  typeLabel: string;
}

export function OpportunitySearchPanel() {
  const { instruments, setOverrideChartSymbol } = useAppContext();
  const [isSearching, setIsSearching] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [countdown, setCountdown] = useState(600);
  const [activeTab, setActiveTab] = useState<"all" | "explosion" | "extreme_buy" | "extreme_sell">("all");
  
  const isSearchingRef = useRef(false);
  const countdownRef = useRef(600);

  const startSearch = async () => {
    if (isSearchingRef.current) return;
    isSearchingRef.current = true;
    setIsSearching(true);
    setOpportunities([]);
    setScannedCount(0);
    
    countdownRef.current = 600;
    setCountdown(600);

    const swapPairsRaw = Object.values(instruments)
      .filter((inst: any) => inst.instId.endsWith("-USDT-SWAP"))
      .map((inst: any) => inst.instId);

    let swapPairs: string[] = [];
    try {
      const tickersResp = await okxPublicFetch("/api/v5/market/tickers?instType=SWAP");
      if (tickersResp && tickersResp.length > 0) {
        const highVolSymbols = new Set(
          tickersResp
            .filter((t: any) => parseFloat(t.volCcy24h) > 10000000)
            .map((t: any) => t.instId)
        );
        swapPairs = swapPairsRaw.filter(symbol => highVolSymbols.has(symbol));
      } else {
        swapPairs = swapPairsRaw;
      }
    } catch (err) {
      console.error("Failed to fetch tickers", err);
      swapPairs = swapPairsRaw;
    }

    setTotalToScan(swapPairs.length);

    // Concurrency limit to prevent rate limits
    const concurrency = 2;
    let index = 0;
    const opps: Opportunity[] = [];

    const scanWorker = async () => {
      while (index < swapPairs.length) {
        const symbol = swapPairs[index];
        index++;
        
        try {
          const data15m = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=15m&limit=50`);
          setScannedCount((prev) => prev + 1);
          
          if (data15m && data15m.length > 0) {
            const closes15m = [...data15m].reverse().map((d: any) => parseFloat(d[4]));
            const rsi15mList = calculateRSI(closes15m, 14);
            const r15 = rsi15mList[rsi15mList.length - 1];
            const r15_prev = rsi15mList[rsi15mList.length - 2];
            
            if (r15 !== undefined && r15 !== null && r15_prev !== undefined && r15_prev !== null) {
              const isExtreme = r15 > 70 || r15 < 30;
              // 精准起爆瞬间：
              // 1. 15M (快线) 处于 45-61 刚刚起跑或交叉区间，不能超过 61 防止已经高度拉升/追高
              // 2. 15M 之前处于走平及洗盘低层 (r15_prev <= 53)
              // 3. 15M 出现大角度上攻拐头 (RSI 单周向上猛冲: r15 - r15_prev >= 2.5)
              const isExplosionPrep = 
                r15 >= 45 && 
                r15 <= 61 && 
                r15_prev <= 53 && 
                (r15 - r15_prev) >= 2.5;

              if (isExtreme || isExplosionPrep) {
                await new Promise(r => setTimeout(r, 100)); // Delay before 1H
                const data1h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=1H&limit=50`);
                if (data1h && data1h.length > 0) {
                  const closes1h = [...data1h].reverse().map((d: any) => parseFloat(d[4]));
                  const rsi1hList = calculateRSI(closes1h, 14);
                  const r1h = rsi1hList[rsi1hList.length - 1];
                  const r1h_prev = rsi1hList[rsi1hList.length - 2];

                  if (r1h !== undefined && r1h !== null && r1h_prev !== undefined && r1h_prev !== null) {
                    let matchExtreme = isExtreme && ((r15 > 70 && r1h > 70) || (r15 < 30 && r1h < 30));
                    // 1H (中线) 仍在 45-58 蓄势期，之前也低，并且当前开始同向拐头拐升 (r1h - r1h_prev >= 0.1)
                    let matchExplosion = isExplosionPrep && (
                      r1h >= 45 && 
                      r1h <= 58 && 
                      r1h_prev <= 55 && 
                      (r1h - r1h_prev) >= 0.1
                    );

                    if (matchExtreme || matchExplosion) {
                      await new Promise(r => setTimeout(r, 100)); // Delay before 4H
                      const data4h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=4H&limit=50`);
                      if (data4h && data4h.length > 0) {
                        const closes4h = [...data4h].reverse().map((d: any) => parseFloat(d[4]));
                        const rsi4hList = calculateRSI(closes4h, 14);
                        const r4h = rsi4hList[rsi4hList.length - 1];

                        if (r4h !== undefined && r4h !== null) {
                          let finalExtreme = matchExtreme && ((r15 > 70 && r4h > 70) || (r15 < 30 && r4h < 30));
                          // 4H 慢线在 54-75 高位稳定，形成良性多头格局
                          // 重度开口背离校验 (慢线明显远高于 1H 与 15M 前值，构成弹簧拉紧状态：4H - 1H_prev >= 4 且 4H - 15M_prev >= 8)
                          let finalExplosion = matchExplosion && (
                            r4h >= 54 && 
                            r4h <= 75 && 
                            r4h > r1h && 
                            r4h > r15 &&
                            (r4h - r1h_prev >= 4) && 
                            (r4h - r15_prev >= 8)
                          );

                          if (finalExtreme) {
                            opps.push({
                              symbol,
                              rsi: r15,
                              rsi1h: r1h,
                              rsi4h: r4h,
                              type: r15 > 70 ? "extreme_sell" : "extreme_buy",
                              typeLabel: r15 > 70 ? "极值超买" : "极值超卖"
                            });
                            // Sort with extreme levels first
                            setOpportunities([...opps].sort((a, b) => b.rsi - a.rsi));
                          } else if (finalExplosion) {
                            opps.push({
                              symbol,
                              rsi: r15,
                              rsi1h: r1h,
                              rsi4h: r4h,
                              type: "explosion",
                              typeLabel: "共振起爆"
                            });
                            setOpportunities([...opps].sort((a, b) => b.rsi - a.rsi));
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        } catch (err) {
           console.error("Opportunity search err:", err);
        }

        // Delay to respect strict OKX API limits
        await new Promise(r => setTimeout(r, 150));
      }
    };

    const workers = [];
    for (let i = 0; i < concurrency; i++) {
        workers.push(scanWorker());
    }

    await Promise.all(workers);
    setIsSearching(false);
    isSearchingRef.current = false;
  };

  useEffect(() => {
    if (Object.keys(instruments).length > 0) {
      startSearch();

      const timer = setInterval(() => {
        countdownRef.current -= 1;
        setCountdown(countdownRef.current);
        
        if (countdownRef.current <= 0) {
          startSearch();
        }
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [instruments]);

  // Filter list based on selected tab
  const filteredOpportunities = opportunities.filter(opp => {
    if (activeTab === "all") return true;
    return opp.type === activeTab;
  });

  return (
    <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 flex flex-col gap-2.5 min-h-[220px] overflow-hidden">
      <div className="flex items-center justify-between mb-0.5 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-5 bg-[#3b82f6] rounded-full"></div>
          <h2 className="text-sm font-bold tracking-wider">机会搜索</h2>
        </div>
        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 bg-[#1e2329] px-2 py-0.5 rounded border border-[#2b2f36]/80 text-right">
          {isSearching ? (
            <span className="flex items-center gap-1 text-[#3b82f6] font-semibold">
              <Loader2 size={10} className="animate-spin" />
              <span>{scannedCount}/{totalToScan}</span>
            </span>
          ) : (
            <span>{Math.floor(countdown / 60)}分{(countdown % 60).toString().padStart(2, '0')}秒</span>
          )}
        </div>
      </div>

      {/* Strategy Indicator Tabs */}
      <div className="flex items-center bg-[#1e2329] p-0.5 rounded border border-[#2b2f36] text-[10px] select-none shrink-0">
        <button
          onClick={() => setActiveTab("all")}
          className={`flex-1 text-center py-1 rounded transition-colors ${activeTab === "all" ? "bg-[#3b82f6] text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          综合 ({opportunities.length})
        </button>
        <button
          onClick={() => setActiveTab("explosion")}
          className={`flex-1 text-center py-1 rounded transition-colors ${activeTab === "explosion" ? "bg-yellow-600/80 text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          🚀 起爆 ({opportunities.filter(o => o.type === "explosion").length})
        </button>
        <button
          onClick={() => setActiveTab("extreme_sell")}
          className={`flex-1 text-center py-1 rounded transition-colors ${activeTab === "extreme_sell" ? "bg-[#f43f5e] text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          📉 超买 ({opportunities.filter(o => o.type === "extreme_sell").length})
        </button>
        <button
          onClick={() => setActiveTab("extreme_buy")}
          className={`flex-1 text-center py-1 rounded transition-colors ${activeTab === "extreme_buy" ? "bg-[#10b981] text-white font-bold" : "text-gray-400 hover:text-white"}`}
        >
          📈 超卖 ({opportunities.filter(o => o.type === "extreme_buy").length})
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {!isSearching && filteredOpportunities.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-6">无符合当前条件的交易对</div>
        )}
        
        {filteredOpportunities.map((opp, i) => (
          <div 
            key={i} 
            onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })}
            className="flex items-center justify-between p-2 rounded bg-[#1e2329] hover:bg-[#2b2f36] cursor-pointer border border-[#2b2f36] hover:border-[#3b82f6]/30 transition-colors"
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-gray-300">{opp.symbol.replace("-SWAP", "")}</span>
              {opp.type === "explosion" && (
                <span className="text-[9px] font-semibold text-yellow-400 bg-yellow-950/40 border border-yellow-800/30 px-1 py-[0.5px] rounded w-fit">
                  🚀 起爆异动 (金叉合力)
                </span>
              )}
              {opp.type === "extreme_sell" && (
                <span className="text-[9px] font-semibold text-red-400 bg-red-950/40 border border-red-800/30 px-1 py-[0.5px] rounded w-fit">
                  📉 三维极值 (超买回调)
                </span>
              )}
              {opp.type === "extreme_buy" && (
                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/30 px-1 py-[0.5px] rounded w-fit">
                  📈 三维极值 (超卖反弹)
                </span>
              )}
            </div>

             {/* Timeframe values color-coded exactly to chart colors */}
             <div className="flex flex-col items-end gap-0.5">
               <div className="text-[10px] font-mono leading-none">
                 <span className="text-gray-500">15M:</span>{" "}
                 <span className="text-[#38bdf8] font-bold">{opp.rsi.toFixed(1)}</span>
               </div>
               <div className="text-[10px] font-mono leading-none">
                 <span className="text-gray-500">1H:</span>{" "}
                 <span className="text-[#f59e0b] font-bold">{opp.rsi1h.toFixed(1)}</span>
               </div>
               <div className="text-[10px] font-mono leading-none">
                 <span className="text-gray-500">4H:</span>{" "}
                 <span className="text-[#ec4899] font-bold">{opp.rsi4h.toFixed(1)}</span>
               </div>
             </div>
          </div>
        ))}
      </div>
    </div>
  );
}

