import React, { useState, useEffect, useRef } from "react";
import { useAppContext } from "../AppContext";
import { okxPublicFetch } from "../lib/api";
import { calculateRSI } from "../lib/indicators";
import { Search, Loader2 } from "lucide-react";

export function OpportunitySearchPanel() {
  const { instruments, setOverrideChartSymbol } = useAppContext();
  const [isSearching, setIsSearching] = useState(false);
  const [opportunities, setOpportunities] = useState<{ symbol: string; rsi: number; rsi1h: number; rsi4h: number }[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [countdown, setCountdown] = useState(600);
  
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

    // Limit concurrency to avoid rate limiting
    const concurrency = 2;
    let index = 0;
    const opps: { symbol: string; rsi: number; rsi1h: number; rsi4h: number }[] = [];

    const scanWorker = async () => {
      while (index < swapPairs.length) {
        const symbol = swapPairs[index];
        index++;
        
        try {
          const data15m = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=15m&limit=50`);
          setScannedCount((prev) => prev + 1);
          
          if (data15m && data15m.length > 0) {
            const closes15m = [...data15m].reverse().map((d: any) => parseFloat(d[4]));
            const rsi15m = calculateRSI(closes15m, 14).pop();
            
            if (rsi15m !== undefined && rsi15m !== null && (rsi15m > 70 || rsi15m < 30)) {
               await new Promise(r => setTimeout(r, 100)); // Delay before 1H
               const data1h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=1H&limit=50`);
               if (data1h && data1h.length > 0) {
                 const closes1h = [...data1h].reverse().map((d: any) => parseFloat(d[4]));
                 const rsi1h = calculateRSI(closes1h, 14).pop();

                 if (rsi1h !== undefined && rsi1h !== null && ((rsi15m > 70 && rsi1h > 70) || (rsi15m < 30 && rsi1h < 30))) {
                    await new Promise(r => setTimeout(r, 100)); // Delay before 4H
                    const data4h = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=4H&limit=50`);
                    if (data4h && data4h.length > 0) {
                      const closes4h = [...data4h].reverse().map((d: any) => parseFloat(d[4]));
                      const rsi4h = calculateRSI(closes4h, 14).pop();

                      if (rsi4h !== undefined && rsi4h !== null && ((rsi15m > 70 && rsi4h > 70) || (rsi15m < 30 && rsi4h < 30))) {
                        opps.push({ symbol, rsi: rsi15m, rsi1h, rsi4h });
                        setOpportunities([...opps].sort((a, b) => b.rsi - a.rsi));
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
      // Run once immediately
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
  }, [instruments]); // instruments loads once usually

  return (
    <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 flex flex-col gap-3 min-h-[200px] overflow-hidden">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <div className="w-2 h-5 bg-[#3b82f6] rounded-full"></div>
        <h2 className="text-sm font-bold tracking-wider">机会搜索 (RSI 14)</h2>
      </div>

      <button
        onClick={startSearch}
        disabled={isSearching}
        className="w-full bg-[#1e2329] border border-[#3b82f6]/50 text-[#3b82f6] font-bold py-2 rounded text-xs hover:bg-[#3b82f6]/10 flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSearching ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
        {isSearching ? `扫描中... ${scannedCount}/${totalToScan}` : `立即扫描 (自动更新: ${Math.floor(countdown / 60)}分${(countdown % 60).toString().padStart(2, '0')}秒)`}
      </button>

      <div className="flex-1 overflow-y-auto space-y-2">
        {!isSearching && opportunities.length === 0 && (
          <div className="text-xs text-gray-500 text-center py-4">无符合条件的交易对</div>
        )}
        
        {opportunities.map((opp, i) => (
          <div 
            key={i} 
            onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })}
            className="flex items-center justify-between p-2 rounded bg-[#1e2329] hover:bg-[#2b2f36] cursor-pointer border border-[#2b2f36] hover:border-[#3b82f6]/30 transition-colors"
          >
             <span className="text-xs font-bold text-gray-300">{opp.symbol.replace("-SWAP", "")}</span>
             <span className={`text-[10px] font-mono font-bold ${opp.rsi > 70 ? "text-[#f43f5e]" : "text-[#10b981]"}`}>
                15M:{opp.rsi.toFixed(1)} 1H:{opp.rsi1h.toFixed(1)} 4H:{opp.rsi4h.toFixed(1)}
             </span>
          </div>
        ))}
      </div>
    </div>
  );
}
