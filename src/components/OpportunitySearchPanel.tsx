import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAppContext } from "../AppContext";
import {
  Sparkles,
  TrendingUp,
  Zap,
  RefreshCw,
  HelpCircle,
  X,
} from "lucide-react";

interface Opportunity {
  symbol: string;
  rsi: number;
  rsi1h: number;
  rsi4h: number;
  type:
    | "explosion"
    | "bottom_fishing"
    | "ema_golden_cross"
    | "ema_death_cross"
    | "vol_stagnation"
    | "vol_rejection"
    | "breakout"
    | "rsi_jump_4h"
    | "rsi_cross_1h_4h";
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

  const [activeTab, setActiveTab] = useState<string>("all");
  const [showInfo, setShowInfo] = useState(false);

  // Filter list based on selected tab
  const filteredOpportunities = opportunities.filter((opp) => {
    if (activeTab === "all") return true;
    return opp.type === activeTab;
  });

  return (
    <>
      <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 flex flex-col gap-2.5 min-h-[220px] overflow-hidden relative">
        <div className="flex items-center justify-between mb-0.5 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-5 bg-[#3b82f6] rounded-full"></div>
            <h2 className="text-sm font-bold tracking-wider flex items-center gap-1.5">
              机会预警
              <button
                onClick={() => setShowInfo(true)}
                className="text-gray-400 hover:text-gray-200 transition-colors focus:outline-none"
              >
                <HelpCircle size={14} />
              </button>
            </h2>
          </div>
          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 bg-[#1e2329] px-2 py-0.5 rounded border border-[#2b2f36]/80 text-right select-none">
            <RefreshCw
              className={`w-3 h-3 text-gray-400 ${isSearching ? "animate-spin" : ""}`}
            />
            <span>
              {lastCompletedAt
                ? `已更新 ${new Date(lastCompletedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
                : "扫描中"}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
          {filteredOpportunities.length === 0 && (
            <div className="text-sm text-gray-500 text-center py-6">
              {isSearching && !lastCompletedAt
                ? "首次扫描进行中..."
                : "暂无符合条件的交易对"}
            </div>
          )}

          {filteredOpportunities.map((opp, i) => {
            const isBullish = [
              "explosion",
              "bottom_fishing",
              "ema_golden_cross",
              "breakout",
              "vol_rejection",
              "rsi_jump_4h",
              "rsi_cross_1h_4h",
            ].includes(opp.type);
            const isBearish = ["ema_death_cross", "vol_stagnation"].includes(
              opp.type,
            );

            let cardStyle =
              "bg-[#1e2329] hover:bg-[#2b2f36] border-l-2 border-[#3b82f6]";
            if (isBullish) {
              cardStyle =
                "bg-[#1e2329] hover:bg-[#2b2f36] border-l-2 border-[#00b07c]";
            } else if (isBearish) {
              cardStyle =
                "bg-[#1e2329] hover:bg-[#2b2f36] border-l-2 border-[#f6465d]";
            }

            return (
              <div
                key={i}
                onClick={() =>
                  setOverrideChartSymbol({ id: "chart-0", symbol: opp.symbol })
                }
                className={`p-2 rounded text-[10px] cursor-pointer transition-colors flex flex-col ${cardStyle}`}
              >
                <div className="flex flex-col flex-1 min-w-0 pr-1">
                  <div className="flex items-center mb-1.5 min-w-0">
                    <span className="font-bold text-gray-200">
                      {opp.symbol.replace("-SWAP", "")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 w-full">
                    {/* Type Label */}
                    {opp.type === "explosion" && (
                      <span className="flex items-center justify-center gap-1 bg-yellow-950/50 border border-yellow-800/40 py-1 px-1 rounded text-yellow-400 font-bold shrink-0 text-center w-full">
                        <Sparkles size={10} className="shrink-0" />{" "}
                        <span className="truncate">起爆预警</span>
                      </span>
                    )}
                    {opp.type === "bottom_fishing" && (
                      <span className="flex items-center justify-center gap-1 bg-emerald-950/50 border border-emerald-800/40 py-1 px-1 rounded text-emerald-400 font-bold shrink-0 text-center w-full">
                        <TrendingUp size={10} className="shrink-0" />{" "}
                        <span className="truncate">{opp.typeLabel}</span>
                      </span>
                    )}
                    {(opp.type === "ema_golden_cross" ||
                      opp.type === "breakout" ||
                      opp.type === "vol_rejection" ||
                      opp.type === "rsi_jump_4h" ||
                      opp.type === "rsi_cross_1h_4h") && (
                      <span className="flex items-center justify-center gap-1 bg-blue-950/50 border border-blue-800/40 py-1 px-1 rounded text-blue-400 font-bold shrink-0 text-center w-full">
                        <TrendingUp size={10} className="shrink-0" />{" "}
                        <span className="truncate">{opp.typeLabel}</span>
                      </span>
                    )}
                    {(opp.type === "ema_death_cross" ||
                      opp.type === "vol_stagnation") && (
                      <span className="flex items-center justify-center gap-1 bg-rose-950/50 border border-rose-800/40 py-1 px-1 rounded text-rose-400 font-bold shrink-0 text-center w-full">
                        <TrendingUp size={10} className="shrink-0 rotate-180" />{" "}
                        <span className="truncate">{opp.typeLabel}</span>
                      </span>
                    )}

                    {/* Volume surge check */}
                    {opp.volSurgeMultiplier !== undefined &&
                      opp.volSurgeMultiplier > 0 && (
                        <span
                          className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                            opp.volSurgeMultiplier >= 1.3
                              ? "bg-amber-950/65 border border-amber-800/60 text-amber-300"
                              : "bg-gray-800 border border-gray-700/80 text-gray-400"
                          }`}
                        >
                          <Zap size={10} className="shrink-0" />
                          <span className="truncate">
                            放量 {opp.volSurgeMultiplier.toFixed(1)}x
                          </span>
                        </span>
                      )}

                    {/* EMA20 Support check */}
                    {opp.aboveEma20 !== undefined && (
                      <span
                        className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                          opp.aboveEma20
                            ? "bg-sky-950/65 border border-sky-800/60 text-sky-300"
                            : "bg-rose-950/20 border border-rose-900/30 text-rose-300"
                        }`}
                      >
                        <TrendingUp
                          size={10}
                          className={`shrink-0 ${opp.aboveEma20 ? "" : "rotate-180"}`}
                        />
                        <span className="truncate">
                          {opp.aboveEma20 ? "EMA20上" : "EMA压制"}
                        </span>
                      </span>
                    )}

                    {/* Bullish Candle check */}
                    {opp.isBullishCandle !== undefined && (
                      <span
                        className={`flex items-center justify-center gap-1 py-1 px-1 rounded font-bold shrink-0 text-center w-full ${
                          opp.isBullishCandle
                            ? "bg-emerald-950/60 border border-emerald-800/60 text-emerald-300"
                            : "bg-rose-950/40 border border-rose-800/40 text-rose-400"
                        }`}
                      >
                        <span className="truncate">
                          {opp.isBullishCandle ? "阳线支持" : "阴线休整"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showInfo &&
        createPortal(
          <div
            className="fixed inset-0 flex items-center justify-center p-4 sm:p-6"
            style={{ zIndex: 999999 }}
          >
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
              onClick={() => setShowInfo(false)}
            ></div>
            
            {/* Modal Container */}
            <div className="bg-[#1e2329] border border-[#2b2f36] rounded-xl shadow-2xl max-w-4xl w-full max-h-[70vh] flex flex-col relative z-10 overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-[#2b2f36] shrink-0 bg-[#1e2329]">
                <div className="flex items-center gap-2">
                  <HelpCircle size={18} className="text-[#3b82f6]" />
                  <h3 className="text-base font-bold text-white">
                    机会预警策略逻辑说明
                  </h3>
                </div>
                <button
                  onClick={() => setShowInfo(false)}
                  className="p-1.5 hover:bg-[#2b2f36] rounded-md transition-colors text-gray-400 hover:text-white"
                  title="关闭"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5 overflow-y-auto bg-[#161a1e]/50 flex-1 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 起爆预警 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-[#00b07c]/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-[#00b07c]/10 rounded text-[#00b07c]">
                        <Sparkles size={16} />
                      </div>
                      <h4 className="font-bold text-[#00b07c] text-sm">起爆预警 (Explosion)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">多级别共振起飞条件</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">15M/1H/4H RSI全部大于等于68，且前一根K线对应周期的RSI均小于68。</span>
                        要求伴随放量（15M成交量放大1.25倍以上），收盘站上EMA20，且为阳线。
                      </p>
                    </div>
                  </div>

                  {/* 抄底预警 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-emerald-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-emerald-500/10 rounded text-emerald-400">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-emerald-400 text-sm">抄底预警 (Bottom Fishing)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">超卖反弹抓底逻辑</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">15M/4H RSI由30以下超卖区快速反弹（15M {">"} 55，1H {">"} 40并伴随前期超卖，4H从底部分反弹）。</span>
                        要求成交量放大1.2倍以上，且为阳线。
                      </p>
                    </div>
                  </div>

                  {/* 4H RSI急涨 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-blue-400 text-sm">4H RSI急涨 (4H RSI Jump)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">大周期强动能拉升</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">当前4H级别的RSI相比上一个4H级别的RSI，单根K线内增幅超过10点（RSI差值{">="}10）。</span>
                        意味着大级别资金快速吸筹拉升。此信号会实时通过15M周期获取触发。
                      </p>
                    </div>
                  </div>

                  {/* 1H上穿4H */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-blue-400 text-sm">1H上穿4H (1H RSI Cross 4H RSI)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">日内趋势转强信号</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">1H RSI在最近两个15M闭合时间内，由下方上穿4H RSI。</span>
                        表示中短线动能开始强于长线动能，属于早期上涨结构的转折特征。
                      </p>
                    </div>
                  </div>

                  {/* 均线金叉 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-blue-400 text-sm">均线金叉 (EMA Breakout)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">趋势启动特征</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">基于15M级别，EMA20上穿EMA50（金叉），或者价格强力突破上方密集均线抑制。</span>
                      </p>
                    </div>
                  </div>

                  {/* 地量长下影 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-blue-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-blue-500/10 rounded text-blue-400">
                        <TrendingUp size={16} />
                      </div>
                      <h4 className="font-bold text-blue-400 text-sm">地量长下影 (Volume Rejection)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">探底遇阻买盘介入</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">在价格缩量（地量）状态下，K线收出较长的下影线。</span>
                        说明下探没有抛压且有买盘承接，可能随时反转。
                      </p>
                    </div>
                  </div>

                  {/* 高位天量滞涨 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-rose-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-rose-500/10 rounded text-rose-400">
                        <TrendingUp size={16} className="rotate-180" />
                      </div>
                      <h4 className="font-bold text-rose-400 text-sm">高位天量滞涨 (Volume Stagnation)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">潜在见顶预警</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">处于上升趋势末端，爆出天量成交额但K线价格并未继续上涨（收长上影线或十字星）。</span>
                        通常是主力出货或多头力竭的信号。
                      </p>
                    </div>
                  </div>

                  {/* 死叉/动能衰减 */}
                  <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36] shadow-sm hover:border-rose-500/50 transition-colors">
                    <div className="flex items-center gap-2 mb-2.5">
                      <div className="p-1.5 bg-rose-500/10 rounded text-rose-400">
                        <TrendingUp size={16} className="rotate-180" />
                      </div>
                      <h4 className="font-bold text-rose-400 text-sm">死叉/动能衰减 (EMA Death Cross)</h4>
                    </div>
                    <div className="text-xs text-gray-400 space-y-1.5">
                      <p className="text-gray-300 font-medium pb-1.5 border-b border-[#2b2f36]/50 mb-1.5">下行趋势确认</p>
                      <p className="leading-relaxed">
                        <span className="text-gray-300">基于15M级别，EMA20下穿EMA50（死叉），且RSI指标表现疲软转空。</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-t border-[#2b2f36] flex justify-end shrink-0 bg-[#1a1e24]">
                <button
                  onClick={() => setShowInfo(false)}
                  className="px-6 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                >
                  我知道了
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
