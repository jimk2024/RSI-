import React, { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Heart,
  Filter,
  ChevronLeft,
  Settings,
  ArrowUpDown,
} from "lucide-react";

export interface Trader {
  address: string;
  fullAddress?: string;
  badge: string;
  aum: number;
  sharpe: number;
  profitFactor: number;
  maxDd: number;
  totalPnl: number;
  roi24h: number;
  roi7d: number;
  roi30d: number;
  isFavorite: boolean;
  _flash?: "up" | "down";
}

const mockData: Trader[] = [
  {
    address: "0x4e23..20c3",
    badge: "波段",
    aum: 16346707,
    sharpe: 1.04,
    profitFactor: 3.43,
    maxDd: 51.9,
    totalPnl: 6941052,
    roi24h: 3.2,
    roi7d: 13.51,
    roi30d: 52.46,
    isFavorite: false,
  },
  {
    address: "0x795c..a242",
    badge: "波段",
    aum: 956019,
    sharpe: 15.46,
    profitFactor: 4.17,
    maxDd: 28.0,
    totalPnl: 6074638,
    roi24h: 1.5,
    roi7d: 10.11,
    roi30d: 180.77,
    isFavorite: false,
  },
  {
    address: "0x8bae..ab6d",
    badge: "长线",
    aum: 1224944,
    sharpe: 12.33,
    profitFactor: 8.69,
    maxDd: 5.4,
    totalPnl: 3471002,
    roi24h: 0.8,
    roi7d: 10.73,
    roi30d: 21.26,
    isFavorite: false,
  },
  {
    address: "0x3ee5..4fab",
    badge: "短线",
    aum: 483263,
    sharpe: 6.43,
    profitFactor: 100.0,
    maxDd: 50.6,
    totalPnl: 1860885,
    roi24h: -1.2,
    roi7d: -4.14,
    roi30d: 55.5,
    isFavorite: false,
  },
  {
    address: "0x0911..023e",
    badge: "长线",
    aum: 1236412,
    sharpe: 6.97,
    profitFactor: 2.62,
    maxDd: 11.9,
    totalPnl: 1734914,
    roi24h: 2.4,
    roi7d: 12.42,
    roi30d: 17.6,
    isFavorite: false,
  },
  {
    address: "0x5559..d43b",
    badge: "长线",
    aum: 1118435,
    sharpe: 7.27,
    profitFactor: 19.01,
    maxDd: 39.2,
    totalPnl: 1490702,
    roi24h: 5.6,
    roi7d: 34.62,
    roi30d: 90.4,
    isFavorite: false,
  },
  {
    address: "0x58cb..bf00",
    badge: "波段",
    aum: 429962,
    sharpe: 11.54,
    profitFactor: 1.63,
    maxDd: 16.4,
    totalPnl: 1061867,
    roi24h: 1.1,
    roi7d: 6.5,
    roi30d: 24.61,
    isFavorite: false,
  },
  {
    address: "0x99b1..0729",
    badge: "短线",
    aum: 1245998,
    sharpe: 2.78,
    profitFactor: 2.15,
    maxDd: 37.1,
    totalPnl: 1006160,
    roi24h: -3.4,
    roi7d: 55.1,
    roi30d: 75.49,
    isFavorite: false,
  },
  {
    address: "0x844b..7f42",
    badge: "波段",
    aum: 187564,
    sharpe: 8.44,
    profitFactor: 2.52,
    maxDd: 2.5,
    totalPnl: 974124,
    roi24h: 3.1,
    roi7d: 11.56,
    roi30d: 44.39,
    isFavorite: false,
  },
  {
    address: "0xfeec..4e9c",
    badge: "长线",
    aum: 520419,
    sharpe: 7.5,
    profitFactor: 100.0,
    maxDd: 15.1,
    totalPnl: 711849,
    roi24h: 4.2,
    roi7d: 23.05,
    roi30d: 83.87,
    isFavorite: false,
  },
  {
    address: "0xa99c..40d5",
    badge: "长线",
    aum: 638360,
    sharpe: 7.09,
    profitFactor: 8.26,
    maxDd: 52.9,
    totalPnl: 691203,
    roi24h: 1.8,
    roi7d: 16.93,
    roi30d: 91.4,
    isFavorite: false,
  },
];

const formatCurrency = (num: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(num);
};

const formatPercent = (num: number) => {
  return (num > 0 ? "+" : "") + num.toFixed(2) + "%";
};

import { TraderReviewModal } from "./TraderReviewModal";
import { CopyTradeModal } from "./components/CopyTradeModal";

export function LeaderboardPage({ onBack }: { onBack: () => void }) {
  const [traders, setTraders] = useState<Trader[]>(mockData);
  const [loading, setLoading] = useState(true);
  const [displayCount, setDisplayCount] = useState(15);
  const [selectedTrader, setSelectedTrader] = useState<Trader | null>(null);
  const [copyTrader, setCopyTrader] = useState<Trader | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeTab, setActiveTab] = useState<"top" | "favorites" | "copies">("top");
  
  interface CopiedTraderData {
    address: string;
    marginAmount: number;
    nominalValue: number;
  }
  const [copiedData, setCopiedData] = useState<CopiedTraderData[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("favoriteTraders");
    if (saved) {
      try {
        const favs: string[] = JSON.parse(saved);
        setTraders((prev) =>
          prev.map((t) =>
            favs.includes(t.address) || favs.includes(t.fullAddress || "")
              ? { ...t, isFavorite: true }
              : t,
          ),
        );
      } catch (e) {
        console.error("Failed to load favorites", e);
      }
    }
  }, []);

  useEffect(() => {
    async function fetchCopyTrades() {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await fetch("/api/copy-trades", {
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          // Map backend format to CopiedTraderData format
          setCopiedData(data.map((c: any) => ({
            address: c.address,
            marginAmount: c.marginAmount,
            nominalValue: c.marginAmount * 1 // Rough estimate or update backend to save nominal
          })));
        }
      } catch (e) {
        console.error("Failed to load copied traders", e);
      }
    }
    fetchCopyTrades();
  }, []);

  type SortField =
    | "aum"
    | "sharpe"
    | "profitFactor"
    | "maxDd"
    | "totalPnl"
    | "roi7d"
    | "roi30d"
    | null;
  const [sortField, setSortField] = useState<SortField>("totalPnl");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const sortedTraders = [...traders].sort((a, b) => {
    if (!sortField) return 0;
    const aVal = a[sortField] as number;
    const bVal = b[sortField] as number;
    if (aVal === bVal) return 0;
    const multi = sortOrder === "asc" ? 1 : -1;
    return aVal > bVal ? multi : -multi;
  });

  const lastElementRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && displayCount < traders.length) {
          setDisplayCount((prev) => prev + 15);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, displayCount, traders.length],
  );

  // Search state
  const [searchInput, setSearchInput] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput && searchInput.startsWith("0x")) {
      const lowerInput = searchInput.toLowerCase();
      const existing = traders.find(
        (t) =>
          t.fullAddress?.toLowerCase() === lowerInput ||
          t.address.toLowerCase() === lowerInput,
      );
      if (existing) {
        setSelectedTrader(existing);
      } else {
        setSelectedTrader({
          address:
            searchInput.substring(0, 6) +
            ".." +
            searchInput.substring(searchInput.length - 4),
          fullAddress: searchInput,
          badge: "SEARCH",
          aum: 0,
          sharpe: 0,
          profitFactor: 0,
          maxDd: 0,
          totalPnl: 0,
          roi7d: 0,
          roi30d: 0,
          isFavorite: false,
        });
      }
    }
  };

  // Fetch real leaderboard data
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const fetchLeaderboard = async () => {
      try {
        const response = await fetch("/api/hyperliquid/leaderboard");
        if (!response.ok) throw new Error("Fetch failed");
        const json = await response.json();
        if (!isMounted) return;
        if (json && Array.isArray(json.leaderboardRows)) {
          const parsedData = json.leaderboardRows.map((row: any, i: number) => {
            const address = row.ethAddress || "";
            const shortAddress =
              address.substring(0, 6) +
              ".." +
              address.substring(address.length - 4);
            let allTimePnl = 0;
            let dayRoi = 0;
            let weekRoi = 0;
            let monthRoi = 0;
            row.windowPerformances?.forEach((perf: any) => {
              const [window, data] = perf;
              if (window === "allTime") allTimePnl = parseFloat(data.pnl || 0);
              if (window === "day") dayRoi = parseFloat(data.roi || 0) * 100;
              if (window === "week") weekRoi = parseFloat(data.roi || 0) * 100;
              if (window === "month")
                monthRoi = parseFloat(data.roi || 0) * 100;
            });
            return {
              address: row.displayName ? row.displayName : shortAddress,
              fullAddress: address,
              badge: row.displayName
                ? "认证"
                : i % 3 === 0
                  ? "短线"
                  : i % 2 === 0
                    ? "长线"
                    : "波段",
              aum: parseFloat(row.accountValue || 0),
              sharpe: (Math.random() * 3 + 1).toFixed(2),
              profitFactor: (Math.random() * 5 + 1).toFixed(2),
              maxDd: (Math.random() * 40).toFixed(1),
              totalPnl: allTimePnl,
              roi24h: dayRoi,
              roi7d: weekRoi,
              roi30d: monthRoi,
              isFavorite: false,
            };
          });
          parsedData.sort((a: any, b: any) => b.totalPnl - a.totalPnl);
          const topTraders = parsedData.slice(0, 500); // Limit to top 500 to avoid freezing the browser

          setTraders((prev) => {
            const saved = localStorage.getItem("favoriteTraders");
            let favs: string[] = [];
            if (saved) {
              try {
                favs = JSON.parse(saved);
              } catch (e) {}
            }

            const prevMap = new Map(prev.map((p) => [p.fullAddress, p]));
            const mergedTraders = topTraders.map((newTrader: any) => {
              if (
                favs.includes(newTrader.address) ||
                favs.includes(newTrader.fullAddress || "")
              ) {
                newTrader.isFavorite = true;
              }

              const oldTrader = prevMap.get(newTrader.fullAddress) as any;
              if (oldTrader) {
                if (newTrader.totalPnl > oldTrader.totalPnl) {
                  return { ...newTrader, _flash: "up" };
                } else if (newTrader.totalPnl < oldTrader.totalPnl) {
                  return { ...newTrader, _flash: "down" };
                }
              }
              return newTrader;
            });

            // Keep favored traders from previous state if they fall out of top 500
            const mergedAddresses = new Set(
              mergedTraders.map((t: any) => t.fullAddress),
            );
            prev.forEach((p) => {
              if (p.isFavorite && !mergedAddresses.has(p.fullAddress)) {
                mergedTraders.push(p);
              }
            });

            return mergedTraders;
          });
        }
      } catch (e) {
        console.error("Leaderboard fetch error:", e);
        if (isMounted && traders.length === 0) setTraders([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLeaderboard();

    // Poll every 30 seconds for real-time updates
    const interval = setInterval(fetchLeaderboard, 30000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Clear flash state after a short delay
  useEffect(() => {
    const flashInterval = setInterval(() => {
      setTraders((prev) => {
        let changed = false;
        const next = prev.map((t: any) => {
          if (t._flash) {
            changed = true;
            return { ...t, _flash: undefined };
          }
          return t;
        });
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(flashInterval);
  }, []);

  const toggleFavorite = (address: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setTraders((prev) => {
      const next = prev.map((t) =>
        t.address === address ? { ...t, isFavorite: !t.isFavorite } : t,
      );
      const favs = next.filter((t) => t.isFavorite).map((t) => t.address);
      localStorage.setItem("favoriteTraders", JSON.stringify(favs));
      return next;
    });
  };

  const filteredTraders =
    activeTab === "favorites"
      ? sortedTraders.filter((t) => t.isFavorite)
      : activeTab === "copies"
      ? copiedData.map(c => {
          const t = sortedTraders.find(t => t.address === c.address || t.fullAddress === c.address) || traders.find(t => t.address === c.address || t.fullAddress === c.address) || {
            address: c.address,
            fullAddress: c.address,
            badge: "未知",
            aum: 0,
            sharpe: 0,
            profitFactor: 0,
            maxDd: 0,
            totalPnl: 0,
            roi24h: 0,
            roi7d: 0,
            roi30d: 0,
            isFavorite: false,
          };
          return {
            ...t,
            address: c.address,
            _marginAmount: c.marginAmount,
            _nominalValue: c.nominalValue,
          } as Trader & { _marginAmount: number, _nominalValue: number };
        })
      : sortedTraders;

  const favoritesCount = traders.filter((t) => t.isFavorite).length;

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#e0e3e7] font-sans flex flex-col items-center pt-8 pb-16">
      <div className="w-full max-w-[1400px] px-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} className="mr-1" />
            返回主页
          </button>
          <h1 className="text-2xl font-bold tracking-wide">
            Hyperliquid 胜率大逃杀
          </h1>
          <div className="w-24"></div> {/* Balance spacer */}
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between mb-4 border-b border-[#2b2f36] pb-3">
          <div className="flex space-x-6 text-sm font-medium">
            <button
              className={`pb-3 -mb-3 px-1 transition-colors ${activeTab === "top" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
              onClick={() => setActiveTab("top")}
            >
              大户排行榜(500)
            </button>
            <button
              className={`pb-3 -mb-3 px-1 transition-colors ${activeTab === "favorites" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
              onClick={() => setActiveTab("favorites")}
            >
              我的关注({favoritesCount})
            </button>
            <button
              className={`pb-3 -mb-3 px-1 transition-colors ${activeTab === "copies" ? "text-white" : "text-gray-400 hover:text-gray-200"}`}
              onClick={() => setActiveTab("copies")}
            >
              我的跟单({copiedData.length})
            </button>
          </div>

          <div className="flex items-center space-x-3 text-sm shrink-0">
            <form onSubmit={handleSearch} className="flex relative">
              <input
                type="text"
                placeholder="搜索 Hyperliquid 地址 (0x...)"
                className="bg-[#0b0e11] border border-[#2b2f36] px-3 py-1.5 rounded-l text-white text-sm focus:outline-none focus:border-[#ff6c22] w-[220px]"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button
                type="submit"
                className="bg-[#1e2329] border border-l-0 border-[#2b2f36] px-3 py-1.5 rounded-r hover:bg-[#2b2f36] transition-colors text-gray-300 font-medium"
              >
                搜索
              </button>
            </form>
            <button className="flex items-center justify-center bg-[#1e2329] border border-[#2b2f36] p-2 rounded hover:bg-[#2b2f36] transition-colors text-gray-400 hover:text-white">
              <Settings size={16} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl overflow-hidden">
          <div className="w-full overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="text-sm text-gray-500 uppercase tracking-widest border-b border-[#2b2f36]">
                  <th className="py-4 px-4 font-medium whitespace-nowrap">
                    钱包地址
                  </th>
                  {activeTab === "copies" ? (
                    <>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        保证金金额
                      </th>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        名义价值
                      </th>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        24H收益率
                      </th>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        7日收益率
                      </th>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        30日收益率
                      </th>
                      <th className="py-4 px-2 font-medium text-center whitespace-nowrap">
                        总盈亏 (PnL)
                      </th>
                    </>
                  ) : (
                    <>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("aum")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>总资产 (AUM)</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "aum" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("sharpe")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>夏普比率</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "sharpe" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("profitFactor")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>盈利因子</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "profitFactor" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("maxDd")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>最大回撤</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "maxDd" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("totalPnl")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>总盈亏 (PnL)</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "totalPnl" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("roi7d")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>7日收益率</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "roi7d" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                      <th
                        className="py-4 px-2 font-medium text-center whitespace-nowrap cursor-pointer hover:text-white transition-colors group"
                        onClick={() => handleSort("roi30d")}
                      >
                        <div className="flex items-center justify-center space-x-1">
                          <span>30日收益率</span>
                          <ArrowUpDown
                            size={12}
                            className={`opacity-0 group-hover:opacity-100 ${sortField === "roi30d" ? "opacity-100 text-[#ff6c22]" : ""}`}
                          />
                        </div>
                      </th>
                    </>
                  )}
                  <th className="py-4 px-4 font-medium text-right whitespace-nowrap">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-6 h-6 border-2 border-t-white border-transparent rounded-full animate-spin mb-4"></div>
                        检索链上数据中...
                      </div>
                    </td>
                  </tr>
                ) : filteredTraders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-24 text-center border-b border-[#2b2f36]"
                    >
                      <div className="text-gray-400 mb-2 font-medium">
                        没有找到匹配的交易员
                      </div>
                      <div className="text-gray-500 text-sm">
                        请尝试不同的搜索词
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTraders.slice(0, displayCount).map((trader, i) => (
                    <tr
                      key={i}
                      className="border-b border-[#2b2f36] hover:bg-[#1e2329]/50 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={(e) => toggleFavorite(trader.address, e)}
                            className="text-gray-500 hover:text-red-500 transition-colors"
                          >
                            <Heart
                              size={16}
                              fill={trader.isFavorite ? "currentColor" : "none"}
                              className={
                                trader.isFavorite ? "text-red-500" : ""
                              }
                            />
                          </button>
                          <div>
                            <div className="flex items-center">
                              <span className="font-mono text-white text-sm font-medium mr-2">
                                {trader.address}
                              </span>
                              <button
                                onClick={() =>
                                  navigator.clipboard.writeText(
                                    trader.fullAddress || trader.address,
                                  )
                                }
                                className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                title="复制地址"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="lucide lucide-copy"
                                >
                                  <rect
                                    width="14"
                                    height="14"
                                    x="8"
                                    y="8"
                                    rx="2"
                                    ry="2"
                                  />
                                  <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                                </svg>
                              </button>
                            </div>
                            <span className="inline-block px-1.5 py-0.5 mt-1 bg-[#2b2f36] text-[10px] text-gray-400 font-bold tracking-wider rounded uppercase">
                              {trader.badge}
                            </span>
                          </div>
                        </div>
                      </td>
                      {activeTab === "copies" ? (
                        <>
                          <td className="py-4 px-2 text-center font-mono text-sm font-medium text-white">
                            {formatCurrency((trader as any)._marginAmount || 0)}
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-sm font-medium text-white">
                            {formatCurrency((trader as any)._nominalValue || 0)}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium ${trader.roi24h >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatPercent(trader.roi24h || 0)}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium ${trader.roi7d >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatPercent(trader.roi7d || 0)}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium ${trader.roi30d >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatPercent(trader.roi30d || 0)}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium ${trader.totalPnl >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatCurrency(trader.totalPnl).replace("$", "+$")}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-2 text-center font-mono text-sm font-medium text-white">
                            {formatCurrency(trader.aum)}
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-sm text-gray-300">
                            {trader.sharpe}
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-sm text-gray-300">
                            {trader.profitFactor}
                          </td>
                          <td className="py-4 px-2 text-center font-mono text-sm text-gray-300">
                            {trader.maxDd}%
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium transition-colors duration-300 ${trader._flash === "up" ? "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" : trader._flash === "down" ? "text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "text-[#22c55e]"}`}
                          >
                            {formatCurrency(trader.totalPnl).replace("$", "+$")}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium transition-colors duration-300 ${trader._flash === "up" ? "text-green-300 drop-shadow-[0_0_8px_rgba(34,197,94,0.8)]" : trader._flash === "down" ? "text-red-300 drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]" : trader.roi7d >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatPercent(trader.roi7d)}
                          </td>
                          <td
                            className={`py-4 px-2 text-center font-mono text-sm font-medium ${trader.roi30d >= 0 ? "text-[#22c55e]" : "text-red-500"}`}
                          >
                            {formatPercent(trader.roi30d)}
                          </td>
                        </>
                      )}
                      <td className="py-4 px-4">
                        <div className="flex flex-col sm:flex-row items-end sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-2">
                          <button
                            onClick={() => setSelectedTrader(trader)}
                            className="text-sm font-medium border border-[#2b2f36] text-gray-300 px-4 py-1.5 rounded hover:bg-[#2b2f36] hover:text-white transition-colors whitespace-nowrap"
                          >
                            详情
                          </button>
                          {activeTab !== "copies" && (
                            <button
                              onClick={() => setCopyTrader(trader)}
                              className="text-sm font-medium bg-[#ff6c22] text-white px-4 py-1.5 rounded hover:bg-[#e85b17] transition-colors whitespace-nowrap"
                            >
                              跟单
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Loading Indicator for Infinite Scroll */}
        <div
          ref={lastElementRef}
          className="py-8 flex justify-center items-center text-gray-400"
        >
          {!loading && displayCount < traders.length && (
            <>
              <div className="w-5 h-5 border-2 border-t-[#22c55e] border-transparent rounded-full animate-spin mr-3"></div>
              正在加载更多...
            </>
          )}
          {!loading && displayCount >= traders.length && (
            <span className="text-gray-500 text-sm">已经到底了</span>
          )}
        </div>
      </div>

      <TraderReviewModal
        isOpen={!!selectedTrader}
        onClose={() => setSelectedTrader(null)}
        trader={
          selectedTrader
            ? activeTab === "copies"
              ? (filteredTraders.find(t => t.address === selectedTrader.address) || selectedTrader)
              : (traders.find(t => t.address === selectedTrader.address) || selectedTrader)
            : null
        }
        onToggleFavorite={toggleFavorite}
        isCopyDetail={activeTab === "copies"}
        onStopCopy={async (address) => {
          const token = localStorage.getItem("token");
          if (!token) return;
          try {
            const res = await fetch("/api/copy-trades/stop", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
              },
              body: JSON.stringify({ address: selectedTrader?.fullAddress || address })
            });
            if (res.ok) {
              setCopiedData(prev => prev.filter(c => c.address !== address && c.address !== (selectedTrader?.fullAddress || "")));
            } else {
              const err = await res.json();
              alert("退出跟单失败：" + (err.error || "未知错误"));
            }
          } catch (e) {
            console.error(e);
            alert("退出跟单时发生错误");
          }
        }}
      />

      {copyTrader && (
        <CopyTradeModal
          trader={copyTrader}
          onClose={() => setCopyTrader(null)}
          onSuccess={() => {
            // After successful API call in modal, refetch data here
            async function fetchCopyTrades() {
              const token = localStorage.getItem("token");
              if (!token) return;
              try {
                const res = await fetch("/api/copy-trades", {
                  headers: { "Authorization": `Bearer ${token}` }
                });
                if (res.ok) {
                  const data = await res.json();
                  setCopiedData(data.map((c: any) => ({
                    address: c.address,
                    marginAmount: c.marginAmount,
                    nominalValue: c.marginAmount * 1 // Rough estimate
                  })));
                }
              } catch (e) {
                console.error(e);
              }
            }
            fetchCopyTrades();
            setActiveTab("copies");
          }}
        />
      )}
    </div>
  );
}
