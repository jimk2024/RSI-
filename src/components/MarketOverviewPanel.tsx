import React, { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Flame, Activity, Sparkles } from "lucide-react";
import { useAppContext } from "../AppContext";

interface TickerData {
  instId: string;
  last: string;
  open24h: string;
  volCcy24h: string; // Turnover in USDT
  changePercent: number; // Derived
}

export function MarketOverviewPanel() {
  const { setOverrideChartSymbol, instruments } = useAppContext();
  const [tickers, setTickers] = useState<TickerData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const fetchTickers = async () => {
      try {
        const response = await fetch("https://www.okx.com/api/v5/market/tickers?instType=SWAP");
        if (!response.ok) throw new Error("Network error");
        const data = await response.json();
        
        if (data.code === "0" && data.data) {
          const usdtSwaps = data.data.filter((t: any) => t.instId.endsWith("-USDT-SWAP"));
          
          const newTickers = usdtSwaps.map((t: any) => {
            const open = parseFloat(t.open24h);
            const last = parseFloat(t.last);
            const change = open > 0 ? ((last - open) / open) * 100 : 0;
            return {
              instId: t.instId,
              last: t.last,
              open24h: t.open24h,
              volCcy24h: t.volCcy24h,
              changePercent: change
            };
          });
          
          if (isMounted) {
            setTickers(newTickers);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error("Failed to fetch tickers", err);
      }
      
      if (isMounted) {
        timeoutId = setTimeout(fetchTickers, 4000); // Update every 4 seconds
      }
    };

    fetchTickers();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  const handleSymbolClick = (symbol: string) => {
    setOverrideChartSymbol({ id: "chart-0", symbol });
  };

  // Sort logic
  const gainers = [...tickers].sort((a, b) => b.changePercent - a.changePercent).slice(0, 15);
  const losers = [...tickers].sort((a, b) => a.changePercent - b.changePercent).slice(0, 15);
  const volumeLeaders = [...tickers].sort((a, b) => parseFloat(b.volCcy24h) - parseFloat(a.volCcy24h)).slice(0, 15);
  const newListings = [...tickers].sort((a, b) => (instruments[b.instId]?.listTime || 0) - (instruments[a.instId]?.listTime || 0)).slice(0, 15);

  const formatVol = (vol: string) => {
    const v = parseFloat(vol);
    if (v >= 100000000) return `${(v / 100000000).toFixed(2)}亿`;
    if (v >= 10000) return `${(v / 10000).toFixed(2)}万`;
    return v.toFixed(0);
  };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 flex-1 flex flex-col min-h-0 text-[#e0e3e7]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#2b2f36] gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-[#3b82f6]"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#3b82f6]"></span>
          </span>
          <h3 className="font-bold text-sm tracking-wider text-gray-200 flex items-center gap-1.5 font-sans">
            <Activity size={16} className="text-[#3b82f6] shrink-0" />
            <span>市场行情雷达</span>
            <span className="text-gray-500 text-xs font-normal">Market Radar</span>
          </h3>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
          Loading market data...
        </div>
      ) : (
        <div className="flex flex-row items-stretch gap-4 flex-1 min-h-0 overflow-hidden mt-2">
          
          {/* Top Gainers */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#2b2f36]/40">
              <div className="flex items-center gap-1.5">
                <TrendingUp size={14} className="text-[#00b07c]" />
                <span className="text-xs font-bold text-gray-200">24H 涨幅榜</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
              {gainers.map((t, i) => (
                <div 
                  key={t.instId} 
                  onClick={() => handleSymbolClick(t.instId)}
                  className="flex items-center justify-between p-1 text-[10.5px] rounded hover:bg-[#2b2f36] cursor-pointer cursor-crosshair group"
                >
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{t.instId.replace("-SWAP", "")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">{t.last}</span>
                    <span className="text-[#00b07c] font-mono whitespace-nowrap min-w-[38px] text-right">+{t.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Losers */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#2b2f36]/40">
              <div className="flex items-center gap-1.5">
                <TrendingDown size={14} className="text-[#f6465d]" />
                <span className="text-xs font-bold text-gray-200">24H 跌幅榜</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
              {losers.map((t, i) => (
                <div 
                  key={t.instId}
                  onClick={() => handleSymbolClick(t.instId)} 
                  className="flex items-center justify-between p-1 text-[10.5px] rounded hover:bg-[#2b2f36] cursor-pointer cursor-crosshair group"
                >
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{t.instId.replace("-SWAP", "")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono">{t.last}</span>
                    <span className="text-[#f6465d] font-mono whitespace-nowrap min-w-[38px] text-right">{t.changePercent.toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Volume */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#2b2f36]/40">
              <div className="flex items-center gap-1.5">
                <Flame size={14} className="text-[#f0b90b]" />
                <span className="text-xs font-bold text-gray-200">24H 成交榜</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
              {volumeLeaders.map((t, i) => (
                <div 
                  key={t.instId}
                  onClick={() => handleSymbolClick(t.instId)} 
                  className="flex items-center justify-between p-1 text-[10.5px] rounded hover:bg-[#2b2f36] cursor-pointer cursor-crosshair group"
                >
                  <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{t.instId.replace("-SWAP", "")}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-mono whitespace-nowrap min-w-[38px] text-right">${formatVol(t.volCcy24h)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* New Listings */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-2 pb-1 border-b border-[#2b2f36]/40">
              <div className="flex items-center gap-1.5">
                <Sparkles size={14} className="text-[#a074f7]" />
                <span className="text-xs font-bold text-gray-200">新上交易对</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto pr-1 space-y-1 custom-scrollbar">
              {newListings.map((t, i) => {
                const listTimeStr = instruments[t.instId]?.listTime ? 
                  `${new Date(instruments[t.instId].listTime).getMonth() + 1}/${new Date(instruments[t.instId].listTime).getDate()}` 
                  : 'New';
                return (
                  <div 
                    key={t.instId}
                    onClick={() => handleSymbolClick(t.instId)} 
                    className="flex items-center justify-between p-1 text-[10.5px] rounded hover:bg-[#2b2f36] cursor-pointer cursor-crosshair group"
                  >
                    <span className="font-bold text-gray-300 group-hover:text-white transition-colors">{t.instId.replace("-SWAP", "")}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono">{t.last}</span>
                      <span className="text-[#a074f7] font-mono whitespace-nowrap min-w-[38px] text-right">{listTimeStr}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
