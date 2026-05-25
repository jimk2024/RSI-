import React, { useState, useEffect } from "react";
import { useAppContext } from "../AppContext";
import { Sparkles, TrendingUp, Zap, RefreshCw } from "lucide-react";

interface Opportunity {
  symbol: string;
  rsi: number;
  rsi1h: number;
  rsi4h: number;
  type: "explosion" | "bottom_fishing" | "ema_golden_cross" | "ema_death_cross" | "vol_stagnation" | "vol_rejection" | "breakout";
  typeLabel: string;
  volSurgeMultiplier?: number;
  aboveEma20?: boolean;
  isBullishCandle?: boolean;
}

export function OpportunitySearchPanel() {
  const { 
    setOverrideChartSymbol,
    scanOpportunities: opportunities,
    isScanning: isSearching,
    scanScannedCount: scannedCount,
    scanTotalToScan: totalToScan,
    scanLastCompletedAt: lastCompletedAt,
  } = useAppContext();

  const [activeTab, setActiveTab] = useState<"all" | "explosion" | "extreme_buy" | "extreme_sell">("all");

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
        <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 bg-[#1e2329] px-2 py-0.5 rounded border border-[#2b2f36]/80 text-right select-none">
          <RefreshCw className={`w-3 h-3 text-gray-400 ${isSearching ? "animate-spin" : ""}`} />
          <span>
            {lastCompletedAt ? `已更新 ${new Date(lastCompletedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "扫描中"}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {filteredOpportunities.length === 0 && (
          <div className="text-sm text-gray-500 text-center py-6">
            {isSearching && !lastCompletedAt ? "首次扫描进行中..." : "暂无符合条件的交易对"}
          </div>
        )}
        
        {filteredOpportunities.map((opp, i) => {
          const isBullish = ['explosion', 'bottom_fishing', 'ema_golden_cross', 'breakout', 'vol_rejection'].includes(opp.type);
          const isBearish = ['ema_death_cross', 'vol_stagnation'].includes(opp.type);
          
          let cardStyle = "bg-[#1e2329] hover:bg-[#2b2f36] border-transparent hover:border-[#3b82f6]/50";
          if (isBullish) {
            cardStyle = "bg-emerald-900/40 hover:bg-emerald-800/50 border-emerald-500/30 hover:border-emerald-400/60";
          } else if (isBearish) {
            cardStyle = "bg-rose-900/40 hover:bg-rose-800/50 border-rose-500/30 hover:border-rose-400/60";
          }
          
          return (
          <div 
            key={i} 
            onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-colors ${cardStyle}`}
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
                {(opp.type === "ema_golden_cross" || opp.type === "breakout" || opp.type === "vol_rejection") && (
                  <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1 bg-blue-950/50 border border-blue-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    <TrendingUp size={10} className="text-blue-400" /> {opp.typeLabel}
                  </span>
                )}
                {(opp.type === "ema_death_cross" || opp.type === "vol_stagnation") && (
                  <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-950/50 border border-rose-800/40 px-1.5 py-0.5 rounded select-none shrink-0">
                    <TrendingUp size={10} className="text-rose-400" /> {opp.typeLabel}
                  </span>
                )}
              </div>
              
              {/* Show auxiliary parameters for live trading verification */}
              <div className="flex flex-wrap gap-1.5 mt-0.5">
                {/* Volume surge check */}
                {opp.volSurgeMultiplier !== undefined && opp.volSurgeMultiplier > 0 && (
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
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}

