import React, { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { Loader2, Sparkles, TrendingUp, Zap } from "lucide-react";

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
  const { setOverrideChartSymbol } = useAppContext();
  const [isSearching, setIsSearching] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [scannedCount, setScannedCount] = useState(0);
  const [totalToScan, setTotalToScan] = useState(0);
  const [lastCompletedAt, setLastCompletedAt] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "explosion" | "extreme_buy" | "extreme_sell">("all");

  const fetchOpportunities = async () => {
    try {
      const resp = await fetch("/api/opportunities");
      if (resp.ok) {
        const data = await resp.json();
        setOpportunities(data.opportunities || []);
        setIsSearching(!!data.isSearching);
        setScannedCount(data.scannedCount || 0);
        setTotalToScan(data.totalToScan || 0);
        setLastCompletedAt(data.lastCompletedAt || null);
      }
    } catch (err) {
      console.error("Failed to fetch opportunities from backend:", err);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    const interval = setInterval(fetchOpportunities, 3000);
    return () => clearInterval(interval);
  }, []);

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
              <span>扫描中 {scannedCount}/{totalToScan}</span>
            </span>
          ) : (
            <span>
              {lastCompletedAt ? `已更新 ${new Date(lastCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "已连接后台"}
            </span>
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

