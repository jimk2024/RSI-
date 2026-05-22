import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../AppContext";
import { okxPublicFetch } from "../lib/api";
import { calculateRSI, calculateEMA } from "../lib/indicators";
import { Search, Loader2, Sparkles, TrendingUp, Zap } from "lucide-react";

interface Opportunity {
  symbol: string;
  rsi: number;
  rsi1h: number;
  rsi4h: number;
  type: "extreme_buy" | "extreme_sell" | "explosion";
  typeLabel: string;
  volSurgeMultiplier?: number;
  aboveEma20?: boolean;
  isBullishCandle?: boolean;
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
            const sorted15m = [...data15m].reverse();
            const closes15m = sorted15m.map((d: any) => parseFloat(d[4]));
            const opens15m = sorted15m.map((d: any) => parseFloat(d[1]));
            const vols15m = sorted15m.map((d: any) => parseFloat(d[5]));
            const rsi15mList = calculateRSI(closes15m, 14);
            const ema20List = calculateEMA(closes15m, 20);

            const latestIdx = closes15m.length - 1;
            const r15 = rsi15mList[latestIdx];
            const r15_prev = rsi15mList[latestIdx - 1];
            
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

                          // Calculate multi-dimensional health confirmation filters (成交量放大, 均线支持, 阳线确认)
                          const currentClose = closes15m[latestIdx];
                          const currentOpen = opens15m[latestIdx];
                          const currentVol = vols15m[latestIdx];
                          
                          let sumVol = 0;
                          let count = 0;
                          for (let i = Math.max(0, latestIdx - 10); i < latestIdx; i++) {
                            sumVol += vols15m[i];
                            count++;
                          }
                          const avgVol = count > 0 ? (sumVol / count) : 0;
                          const volSurgeMultiplier = avgVol > 0 ? (currentVol / avgVol) : 1.0;
                          
                          const ema20Val = ema20List[latestIdx];
                          const aboveEma20 = ema20Val !== null && ema20Val !== undefined ? (currentClose >= ema20Val) : true;
                          const isBullishCandle = currentClose > currentOpen;

                          if (finalExtreme) {
                            opps.push({
                              symbol,
                              rsi: r15,
                              rsi1h: r1h,
                              rsi4h: r4h,
                              type: r15 > 70 ? "extreme_sell" : "extreme_buy",
                              typeLabel: r15 > 70 ? "极值超买" : "极值超卖",
                              volSurgeMultiplier,
                              aboveEma20,
                              isBullishCandle
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
                              typeLabel: "共振起爆",
                              volSurgeMultiplier,
                              aboveEma20,
                              isBullishCandle
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

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {!isSearching && filteredOpportunities.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-6">无符合当前条件的交易对</div>
        )}
        
        {filteredOpportunities.map((opp, i) => (
          <div 
            key={i} 
            onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })}
            className="flex items-center justify-between p-3 rounded bg-[#1e2329] hover:bg-[#2b2f36] cursor-pointer border border-[#2b2f36] hover:border-[#3b82f6]/30 transition-colors"
          >
            <div className="flex flex-col gap-2 flex-1 min-w-0 pr-2">
              <div className="flex flex-wrap items-center gap-2 min-w-0">
                <span className="text-sm font-bold text-gray-200">{opp.symbol.replace("-SWAP", "")}</span>
                {opp.type === "explosion" && (
                  <span className="text-[10px] font-bold text-yellow-400 flex items-center gap-1 bg-yellow-950/50 border border-yellow-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    <Sparkles size={10} className="text-yellow-400" /> 共振起爆
                  </span>
                )}
                {opp.type === "extreme_sell" && (
                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 bg-red-950/50 border border-red-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    📉 极值超买
                  </span>
                )}
                {opp.type === "extreme_buy" && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    📈 极值超卖
                  </span>
                )}
              </div>
              
              {/* Show auxiliary parameters for live trading verification */}
              {opp.type === "explosion" && (
                <div className="flex flex-wrap gap-1.5 mt-0.5">
                  {/* Volume surge check */}
                  {opp.volSurgeMultiplier !== undefined && (
                    <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                      opp.volSurgeMultiplier >= 1.3 
                        ? "bg-amber-950/65 border border-amber-800/60 text-amber-300"
                        : "bg-gray-800 border border-gray-700/80 text-gray-400"
                    }`}>
                      <Zap size={10} />
                      放量 {opp.volSurgeMultiplier.toFixed(1)}x
                    </span>
                  )}
                  {/* EMA20 Support check */}
                  {opp.aboveEma20 !== undefined && (
                    <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                      opp.aboveEma20 
                        ? "bg-sky-950/65 border border-sky-800/60 text-sky-300"
                        : "bg-rose-950/20 border border-rose-900/30 text-rose-300"
                    }`}>
                      <TrendingUp size={10} />
                      {opp.aboveEma20 ? "EMA20上" : "EMA压制"}
                    </span>
                  )}
                  {/* Bullish Candle check */}
                  {opp.isBullishCandle !== undefined && (
                    <span className={`text-[10px] leading-none px-1.5 py-0.5 rounded font-semibold flex items-center gap-1 ${
                      opp.isBullishCandle 
                        ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                        : "bg-rose-950/40 border border-rose-800/40 text-rose-400"
                    }`}>
                      {opp.isBullishCandle ? "阳线支持" : "阴线休整"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

