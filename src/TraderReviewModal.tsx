import React, { useState, useEffect } from "react";
import { X, Copy, Share2, AlertTriangle } from "lucide-react";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface Trader {
  address: string;
  fullAddress?: string;
  badge: string;
  aum: number;
  sharpe: number;
  profitFactor: number;
  maxDd: number;
  totalPnl: number;
  roi7d: number;
  roi30d: number;
  isFavorite: boolean;
}

interface TraderReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  trader: Trader | null;
  onToggleFavorite?: (address: string) => void;
  isCopyDetail?: boolean;
  onStopCopy?: (address: string) => void;
}

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

// Generate realistic looking chart data
const generateChartData = () => {
  const data = [];
  let currentVal = 200000;
  for (let i = 0; i < 60; i++) {
    // Upward trend with some random noise
    currentVal = currentVal + Math.random() * 500000 - 100000;
    if (i === 40) currentVal -= 800000; // a dip
    if (i > 50) currentVal += 1000000; // a spike at the end
    data.push({
      date: `Day ${i}`,
      value: Math.max(0, currentVal),
    });
  }
  return data;
};

const chartData = generateChartData();

// Mock chart data preserved

export function TraderReviewModal({
  isOpen,
  onClose,
  trader,
  onToggleFavorite,
  isCopyDetail,
  onStopCopy
}: TraderReviewModalProps) {
  const [activeTab, setActiveTab] = useState("PnL"); // "PnL" or "Account"
  const [activeTimeframe, setActiveTimeframe] = useState("allTime"); // "day", "week", "month", "allTime"
  const [realPositions, setRealPositions] = useState<any[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(false);
  const [portfolioData, setPortfolioData] = useState<any>(null);
  const [currentAUM, setCurrentAUM] = useState<number>(0);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  useEffect(() => {
    if (!isOpen || !trader?.fullAddress) {
      setRealPositions([]);
      setPortfolioData(null);
      return;
    }

    let isMounted = true;

    const fetchPortfolio = async () => {
      try {
        const response = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "portfolio",
            user: trader.fullAddress,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (isMounted && Array.isArray(data)) {
            const mapped: Record<string, any> = {};
            data.forEach((w: any) => {
              mapped[w[0]] = w[1];
            });
            setPortfolioData(mapped);
          }
        }
      } catch (e) {
        console.warn("Failed to fetch portfolio for modal", e);
      }
    };
    fetchPortfolio();

    const fetchPositions = async () => {
      // only set loading true on the first run, to avoid flicker
      if (realPositions.length === 0) setLoadingPositions(true);
      try {
        const response = await fetch("https://api.hyperliquid.xyz/info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "clearinghouseState",
            user: trader.fullAddress,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data && isMounted) {
            if (data.marginSummary?.accountValue) {
              setCurrentAUM(parseFloat(data.marginSummary.accountValue));
            }
            if (data.assetPositions) {
              const parsed = data.assetPositions.map((p: any) => {
                const pos = p.position;
                const size = parseFloat(pos.szi);
                const isLong = size > 0;
                const pnl = parseFloat(pos.unrealizedPnl);
                const roi = parseFloat(pos.returnOnEquity || "0") * 100;

                return {
                  asset: pos.coin,
                  leverage: pos.leverage?.value
                    ? `${pos.leverage.value}x`
                    : "-",
                  pnlValue: pnl, // keep numeric value for sum
                  pnl: `${pnl > 0 ? "+" : ""}${formatCurrency(pnl)}`,
                  roi: `${roi > 0 ? "+" : ""}${roi.toFixed(2)}%`,
                  isPositive: pnl >= 0,
                  size: pos.positionValue
                    ? formatCurrency(parseFloat(pos.positionValue))
                    : Math.abs(size).toString(),
                  margin: formatCurrency(parseFloat(pos.marginUsed)),
                  entry: pos.entryPx
                    ? parseFloat(pos.entryPx).toFixed(
                        Math.max(
                          2,
                          6 - Math.floor(Math.log10(parseFloat(pos.entryPx))),
                        ),
                      )
                    : "-",
                  mark:
                    pos.positionValue && Math.abs(size) > 0
                      ? (
                          parseFloat(pos.positionValue) / Math.abs(size)
                        ).toFixed(
                          Math.max(
                            2,
                            6 -
                              Math.floor(
                                Math.log10(
                                  parseFloat(pos.positionValue) /
                                    Math.abs(size),
                                ),
                              ),
                          ),
                        )
                      : "-", // Calculate real mark price if available, else keep simple
                  liq: pos.liquidationPx
                    ? parseFloat(pos.liquidationPx).toFixed(
                        Math.max(
                          2,
                          6 -
                            Math.floor(
                              Math.log10(parseFloat(pos.liquidationPx)),
                            ),
                        ),
                      )
                    : "--",
                  direction: isLong ? "Long" : "Short",
                };
              });
              setRealPositions(parsed);
            }
          }
        }
      } catch (e) {
        console.warn("Failed to fetch real positions for modal", e);
      } finally {
        if (isMounted) setLoadingPositions(false);
      }
    };

    fetchPortfolio();
    const portfolioIntervalId = setInterval(fetchPortfolio, 30000); // 30s for chart/volume updates
    fetchPositions();
    const intervalId = setInterval(fetchPositions, 3000); // Poll every 3 seconds for real-time updates

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      clearInterval(portfolioIntervalId);
    };
  }, [isOpen, trader]);

  if (!isOpen || !trader) return null;

  const totalUnrealizedPnl = realPositions.reduce(
    (sum, pos) => sum + (pos.pnlValue || 0),
    0,
  );

  // Calculate dynamic data based on active timeframe
  let currentChartData = [];
  let currentVlm = 0;
  let currentTotalPnl = trader.totalPnl || 0;

  if (portfolioData) {
    if (
      portfolioData["allTime"] &&
      portfolioData["allTime"].pnlHistory?.length
    ) {
      const history = portfolioData["allTime"].pnlHistory;
      currentTotalPnl = parseFloat(history[history.length - 1][1]);
    }
  }

  if (portfolioData && portfolioData[activeTimeframe]) {
    const tfData = portfolioData[activeTimeframe];
    currentVlm = parseFloat(tfData.vlm || "0");

    const historyKey =
      activeTab === "PnL" ? "pnlHistory" : "accountValueHistory";
    const rawHistory = tfData[historyKey] || [];

    currentChartData = rawHistory.map((point: any) => ({
      date: new Date(point[0]).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      value: parseFloat(point[1]),
    }));
  }

  const formattedUnrealizedPnl = `${totalUnrealizedPnl > 0 ? "+" : ""}${formatCurrency(totalUnrealizedPnl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="bg-[#0b0e11] w-full max-w-5xl rounded-2xl border border-[#2b2f36] shadow-2xl overflow-hidden flex flex-col font-sans"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#2b2f36]">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-bold font-mono text-white">
              {trader.address}
            </h2>
            <button
              onClick={() =>
                navigator.clipboard.writeText(
                  trader.fullAddress || trader.address,
                )
              }
              className="text-gray-400 hover:text-white transition-colors"
              title="复制地址"
            >
              <Copy size={16} />
            </button>
            <button className="text-gray-400 hover:text-white transition-colors">
              <Share2 size={16} />
            </button>
            <span className="inline-block px-2 py-0.5 ml-2 bg-[#2b2f36] text-xs text-gray-400 font-bold tracking-wider rounded uppercase">
              {trader.badge}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors rounded-full p-1 hover:bg-[#1e2329]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            {isCopyDetail ? (
              <>
                <div className="bg-[#ff6c22]/10 border border-[#ff6c22]/30 p-4 rounded-xl flex flex-col justify-center">
                  <span className="text-[#ff6c22] text-xs font-bold tracking-wider uppercase mb-1">
                    跟单保证金
                  </span>
                  <span className="text-xl font-bold text-white mb-1">
                    {formatCurrency((trader as any)._marginAmount || 0)}
                  </span>
                  <span className="text-xs text-gray-500">锁定本金</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    名义价值
                  </span>
                  <span className="text-xl font-bold text-white mb-1">
                    {formatCurrency((trader as any)._nominalValue || 0)}
                  </span>
                  <span className="text-xs text-gray-500">预估敞口</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    总盈亏 (PnL)
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${trader.totalPnl >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {trader.totalPnl >= 0 ? "+" : ""}
                    {formatCurrency(trader.totalPnl)}
                  </span>
                  <span className="text-xs text-gray-500">模拟收益</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    24H 收益率
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${((trader as any).roi24h || 0) >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {((trader as any).roi24h || 0) >= 0 ? "+" : ""}
                    {((trader as any).roi24h || 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500">近期表现</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    收益率 (ROI)
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${(trader.roi30d || 0) >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {(trader.roi30d || 0) >= 0 ? "+" : ""}
                    {(trader.roi30d || 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500">30日回报</span>
                </div>
              </>
            ) : (
              <>
                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl flex flex-col justify-center">
                  <span className="text-red-400 text-xs font-bold tracking-wider uppercase mb-1">
                    总资产 (AUM)
                  </span>
                  <span className="text-xl font-bold text-white mb-1">
                    {formatCurrency(currentAUM || trader.aum)}
                  </span>
                  <span className="text-xs text-gray-500">管理资产</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    交易量
                  </span>
                  <span className="text-xl font-bold text-white mb-1">
                    {formatCurrency(currentVlm)}
                  </span>
                  <span className="text-xs text-gray-500">历史名义金额</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    总盈亏 (PnL)
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${currentTotalPnl >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {currentTotalPnl >= 0 ? "+" : ""}
                    {formatCurrency(currentTotalPnl)}
                  </span>
                  <span className="text-xs text-gray-500">已实现 + 未实现</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    未实现盈亏
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${totalUnrealizedPnl >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {formattedUnrealizedPnl}
                  </span>
                  <span className="text-xs text-gray-500">敞口仓位</span>
                </div>
                <div className="p-4 rounded-xl border border-[#2b2f36] flex flex-col justify-center">
                  <span className="text-gray-400 text-xs font-bold tracking-wider uppercase mb-1">
                    收益率 (ROI)
                  </span>
                  <span
                    className={`text-xl font-bold mb-1 ${(trader.roi30d || 0) >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                  >
                    {(trader.roi30d || 0) >= 0 ? "+" : ""}
                    {(trader.roi30d || 0).toFixed(2)}%
                  </span>
                  <span className="text-xs text-gray-500">30日回报</span>
                </div>
              </>
            )}
          </div>
          {/* Chart Controls */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 space-y-4 md:space-y-0">
            <div className="flex bg-[#1e2329] p-1 rounded-lg">
              <button
                onClick={() => setActiveTab("PnL")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "PnL" ? "bg-[#3b424d] text-white" : "text-gray-400 hover:text-gray-200"}`}
              >
                盈亏
              </button>
              <button
                onClick={() => setActiveTab("Account")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === "Account" ? "bg-[#3b424d] text-white" : "text-gray-400 hover:text-gray-200"}`}
              >
                账户价值
              </button>
            </div>
            <div className="flex bg-[#1e2329] p-1 rounded-lg">
              {[
                { id: "day", label: "24小时" },
                { id: "week", label: "7天" },
                { id: "month", label: "1个月" },
                { id: "allTime", label: "全部" },
              ].map((tf) => (
                <button
                  key={tf.id}
                  onClick={() => setActiveTimeframe(tf.id)}
                  className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${activeTimeframe === tf.id ? "bg-[#3b424d] text-white" : "text-gray-400 hover:text-gray-200"}`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
          {/* Chart */}
          <div className="h-[300px] w-full mb-8 relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={
                  currentChartData.length > 0 ? currentChartData : chartData
                }
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  hide={false}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={30}
                />
                <YAxis
                  hide={false}
                  domain={["auto", "auto"]}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  tick={{ fill: "#6b7280", fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  width={60}
                  orientation="right"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1e2329",
                    borderColor: "#2b2f36",
                    color: "#fff",
                    borderRadius: "8px",
                  }}
                  itemStyle={{ color: "#3b82f6" }}
                  formatter={(value: number) => formatCurrency(value)}
                  labelStyle={{ display: "none" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorValue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="h-6"></div> {/* Spacer for X axis labels */}
          {/* Active Positions Header */}
          <div className="flex items-center justify-between mt-8 mb-4">
            <h3 className="text-sm font-bold text-gray-400 tracking-wider">
              当前持仓 ·{" "}
              <span className="text-white">
                {loadingPositions && realPositions.length === 0
                  ? "..."
                  : realPositions.length}
              </span>
              {trader.fullAddress && (
                <span className="ml-2 text-xs text-[#22c55e] font-normal tracking-normal px-2 py-0.5 rounded-full bg-[#22c55e]/10 border border-[#22c55e]/20">
                  实时数据
                </span>
              )}
            </h3>
            <div className="text-sm font-bold text-gray-400 tracking-wider">
              未实现盈亏{" "}
              <span
                className={
                  totalUnrealizedPnl >= 0 ? "text-[#22c55e]" : "text-red-500"
                }
              >
                {formattedUnrealizedPnl}
              </span>
            </div>
          </div>
          {/* Active Positions Table */}
          <div className="border border-[#2b2f36] rounded-xl overflow-hidden bg-[#161a1e]">
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="text-xs text-gray-500 font-medium border-b border-[#2b2f36]">
                    <th className="py-3 px-4 whitespace-nowrap">资产</th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      盈亏 (收益率)
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      仓位大小
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      保证金
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      开仓价格
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      标记价格
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap text-right">
                      强平价格
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loadingPositions && realPositions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-gray-400"
                      >
                        <div className="flex justify-center items-center">
                          <div className="w-5 h-5 border-2 border-t-[#22c55e] border-transparent rounded-full animate-spin mr-3"></div>
                          正在获取链上仓位数据...
                        </div>
                      </td>
                    </tr>
                  ) : realPositions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-8 text-center text-gray-500"
                      >
                        暂无持仓
                      </td>
                    </tr>
                  ) : (
                    realPositions.map((pos, i) => (
                      <tr
                        key={i}
                        className="border-b border-[#2b2f36] last:border-0 hover:bg-[#1e2329]/50 transition-colors relative"
                      >
                        <td className="py-4 px-4 whitespace-nowrap pl-5 relative">
                          <div
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3/5 rounded-r ${pos.direction === "Long" ? "bg-[#22c55e]" : "bg-red-500"}`}
                          ></div>
                          <div className="flex items-center space-x-2 font-mono">
                            <span className="text-white font-bold">
                              {pos.asset}
                            </span>
                            <span
                              className={`text-xs ${pos.direction === "Long" ? "text-[#22c55e]" : "text-red-500"}`}
                            >
                              {pos.leverage}
                            </span>
                          </div>
                        </td>
                        <td
                          className={`py-4 px-4 whitespace-nowrap text-right font-mono text-sm ${pos.isPositive ? "text-[#22c55e]" : "text-red-500"}`}
                        >
                          {pos.pnl} ({pos.roi})
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right font-mono text-sm text-white">
                          {pos.size}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right font-mono text-sm text-gray-300">
                          {pos.margin}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right font-mono text-sm text-white">
                          {pos.entry}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right font-mono text-sm text-white">
                          {pos.mark}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap text-right font-mono text-sm text-gray-300">
                          {pos.liq}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#2b2f36] flex justify-end bg-[#111419]">
          {isCopyDetail ? (
            showStopConfirm ? (
              <div className="flex items-center space-x-3 w-full justify-between bg-red-500/10 p-3 rounded-lg border border-red-500/30">
                <div className="flex items-center space-x-2 text-red-500 text-sm">
                  <AlertTriangle size={16} />
                  <span>确定要退出跟单吗？系统将自动为您市价平掉所有跟随仓位。</span>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setShowStopConfirm(false)}
                    disabled={isStopping}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg border border-[#2b2f36] text-gray-300 hover:bg-[#2b2f36] transition-colors disabled:opacity-50"
                  >
                    取消
                  </button>
                  <button
                    onClick={() => {
                      setIsStopping(true);
                      setTimeout(() => {
                        if (trader && onStopCopy) {
                          onStopCopy(trader.address);
                        }
                        setIsStopping(false);
                        setShowStopConfirm(false);
                        onClose();
                      }, 1500);
                    }}
                    disabled={isStopping}
                    className="text-sm font-medium px-4 py-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors flex items-center justify-center min-w-[80px]"
                  >
                    {isStopping ? (
                      <div className="w-4 h-4 border-2 border-t-white border-transparent rounded-full animate-spin"></div>
                    ) : (
                      "确认退出"
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowStopConfirm(true)}
                className="text-sm font-medium px-8 py-2 rounded-lg border border-red-500/50 text-red-500 hover:bg-red-500/10 transition-colors"
              >
                退出跟单
              </button>
            )
          ) : (
            <button
              onClick={() => {
                if (trader && onToggleFavorite) {
                  onToggleFavorite(trader.address);
                }
              }}
              className={`text-sm font-medium px-8 py-2 rounded-lg transition-colors ${
                trader?.isFavorite
                  ? "border border-[#2b2f36] text-gray-300 hover:bg-[#2b2f36] hover:text-white"
                  : "bg-[#ff6c22] text-white hover:bg-[#e85b17]"
              }`}
            >
              {trader?.isFavorite ? "取消关注" : "关注"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
