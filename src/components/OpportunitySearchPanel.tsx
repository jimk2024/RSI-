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
  type: "explosion" | "bottom_fishing";
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
  const [countdown, setCountdown] = useState(300);
  const [activeTab, setActiveTab] = useState<"all" | "explosion" | "extreme_buy" | "extreme_sell">("all");
  
  const isSearchingRef = useRef(false);
  const countdownRef = useRef(300);

  const startSearch = async () => {
    if (isSearchingRef.current) return;
    isSearchingRef.current = true;
    setIsSearching(true);
    setOpportunities([]);
    setScannedCount(0);
    
    countdownRef.current = 300;
    setCountdown(300);

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
            const r15_prev2 = rsi15mList[latestIdx - 2];
            
            if (r15 !== undefined && r15 !== null && r15_prev !== undefined && r15_prev !== null && r15_prev2 !== undefined && r15_prev2 !== null) {
              // 15M线在55以上且连续上涨
              const is15mBullish = r15 > 55 && r15 > r15_prev && r15_prev > r15_prev2;
              // 15M 强力击穿 55
              const is15mBottom = r15 > 55 && r15_prev <= 55;

              if (is15mBullish || is15mBottom) {
                await new Promise(r => setTimeout(r, 100)); // Delay before 1H
                const data1h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=1H&limit=50`);
                if (data1h && data1h.length > 0) {
                  const closes1h = [...data1h].reverse().map((d: any) => parseFloat(d[4]));
                  const rsi1hList = calculateRSI(closes1h, 14);
                  const r1h = rsi1hList[rsi1hList.length - 1];
                  const r1h_prev = rsi1hList[rsi1hList.length - 2];

                  if (r1h !== undefined && r1h !== null && r1h_prev !== undefined && r1h_prev !== null) {
                    // 1H线连续2个K线超越60 (当前和前一个)
                    const is1hBullish = r1h > 60 && r1h_prev > 60;
                    
                    // 1H 拒绝创新低，从30以下向上突破40
                    let has1hBelow30 = false;
                    for (let k = Math.max(0, rsi1hList.length - 6); k < rsi1hList.length - 1; k++) {
                      if (rsi1hList[k] < 30) has1hBelow30 = true;
                    }
                    const is1hBottom = r1h > 40 && has1hBelow30 && r1h_prev <= 40;

                    if (is1hBullish || is1hBottom) {
                      await new Promise(r => setTimeout(r, 100)); // Delay before 4H
                      const data4h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=4H&limit=50`);
                      if (data4h && data4h.length > 0) {
                        const closes4h = [...data4h].reverse().map((d: any) => parseFloat(d[4]));
                        const rsi4hList = calculateRSI(closes4h, 14);
                        const r4h = rsi4hList[rsi4hList.length - 1];

                        const r4h_prev = rsi4hList[rsi4hList.length - 2];

                        if (r4h !== undefined && r4h !== null && r4h_prev !== undefined && r4h_prev !== null) {
                          // 4H线刚确认上到70且未收缩 (当前>=70, 并且前值严格<70，确保只抓取最初爆破的瞬间，防止高位钝化后追涨)
                          const is4hBullish = r4h >= 70 && r4h_prev < 70;
                          
                          // 4H 极度超卖 < 30
                          const is4hBottom = r4h < 30;
                          
                          const isExplosion = is15mBullish && is1hBullish && is4hBullish;
                          const isBottomFishing = is15mBottom && is1hBottom && is4hBottom;

                          if (isExplosion || isBottomFishing) {
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

                            const validExplosion = isExplosion && isBullishCandle && aboveEma20 && volSurgeMultiplier >= 1.25;
                            const validBottom = isBottomFishing && isBullishCandle && volSurgeMultiplier >= 1.2;

                            // Additional filters: must be a bullish candle, must be above EMA20, and must have a volume surge
                            if (validExplosion || validBottom) {
                              opps.push({
                                symbol,
                                rsi: r15,
                                rsi1h: r1h,
                                rsi4h: r4h,
                                type: validExplosion ? "explosion" : "bottom_fishing",
                                typeLabel: validExplosion ? "起爆预警" : "抄底预警",
                                volSurgeMultiplier,
                                aboveEma20,
                                isBullishCandle
                              });
                              // Sort with highest 15m RSI first
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
          <h2 className="text-sm font-bold tracking-wider">机会预警</h2>
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
                    <Sparkles size={10} className="text-yellow-400" /> 起爆预警
                  </span>
                )}
                {opp.type === "bottom_fishing" && (
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1 bg-emerald-950/50 border border-emerald-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    <TrendingUp size={10} className="text-emerald-400" /> {opp.typeLabel}
                  </span>
                )}
              </div>
              
              {/* Show auxiliary parameters for live trading verification */}
              {(opp.type === "explosion" || opp.type === "bottom_fishing") && (
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

