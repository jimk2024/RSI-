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
          
          let cardStyle = "bg-[#1e2329] hover:bg-[#2b2f36] border-l-2 border-[#3b82f6]";
          if (isBullish) {
            cardStyle = "bg-emerald-950/30 hover:bg-emerald-900/40 border-l-2 border-[#00b07c]";
          } else if (isBearish) {
            cardStyle = "bg-rose-950/30 hover:bg-rose-900/40 border-l-2 border-[#f6465d]";
          }
          
          return (
          <div 
            key={i} 
            onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })}
            className={`p-2 rounded text-[10px] cursor-pointer transition-colors flex flex-col ${cardStyle}`}
          >
            <div className="flex flex-col flex-1 min-w-0 pr-1">
              <div className="flex items-center mb-1.5 min-w-0">
                <span className="font-bold text-gray-200">{opp.symbol.replace("-SWAP", "")}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-1.5 w-full">
                {/* Type Label */}
                {opp.type === "explosion" && (
                  <span className="flex items-center justify-center gap-1 bg-yellow-950/50 border border-yellow-800/40 py-1 px-1 rounded text-yellow-400 font-bold shrink-0 text-center w-full">
                    <Sparkles size={10} className="shrink-0" /> <span className="truncate">起爆预警</span>
                  </span>
                )}
                {opp.type === "bottom_fishing" && (
                  <span className="flex items-center justify-center gap-1 bg-emerald-950/50 border border-emerald-800/40 py-1 px-1 rounded text-emerald-400 font-bold shrink-0 text-center w-full">
                    <TrendingUp size={10} className="shrink-0" /> <span className="truncate">{opp.typeLabel}</span>
                  </span>
                )}
                {(opp.type === "ema_golden_cross" || opp.type === "breakout" || opp.type === "vol_rejection") && (
                  <span className="flex items-center justify-center gap-1 bg-blue-950/50 border border-blue-800/40 py-1 px-1 rounded text-blue-400 font-bold shrink-0 text-center w-full">
                    <TrendingUp size={10} className="shrink-0" /> <span className="truncate">{opp.typeLabel}</span>
                  </span>
                )}
                {(opp.type === "ema_death_cross" || opp.type === "vol_stagnation") && (
                  <span className="flex items-center justify-center gap-1 bg-rose-950/50 border border-rose-800/40 py-1 px-1 rounded text-rose-400 font-bold shrink-0 text-center w-full">
                    <TrendingUp size={10} className="shrink-0 rotate-180" /> <span className="truncate">{opp.typeLabel}</span>
                  </span>
                )}

                {/* Volume surge check */}
                {opp.volSurgeMultiplier !== undefined && opp.volSurgeMultiplier > 0 && (
                  <span className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                    opp.volSurgeMultiplier >= 1.3 
                      ? "bg-amber-950/65 border border-amber-800/60 text-amber-300"
                      : "bg-gray-800 border border-gray-700/80 text-gray-400"
                  }`}>
                    <Zap size={10} className="shrink-0" />
                    <span className="truncate">放量 {opp.volSurgeMultiplier.toFixed(1)}x</span>
                  </span>
                )}

                {/* EMA20 Support check */}
                {opp.aboveEma20 !== undefined && (
                  <span className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                    opp.aboveEma20 
                      ? "bg-sky-950/65 border border-sky-800/60 text-sky-300"
                      : "bg-rose-950/20 border border-rose-900/30 text-rose-300"
                  }`}>
                    <TrendingUp size={10} className={`shrink-0 ${opp.aboveEma20 ? '' : 'rotate-180'}`} />
                    <span className="truncate">{opp.aboveEma20 ? "EMA20上" : "EMA压制"}</span>
                  </span>
                )}

                {/* Bullish Candle check */}
                {opp.isBullishCandle !== undefined && (
                  <span className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                    opp.isBullishCandle 
                      ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                      : "bg-rose-950/40 border border-rose-800/40 text-rose-400"
                  }`}>
                    <span className="truncate">{opp.isBullishCandle ? "阳线支持" : "阴线休整"}</span>
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

