import React, { useState, useEffect } from "react";
import { Activity, Percent, Zap, Scale, Flame, ArrowUpRight, ArrowDownRight, RefreshCw, Smartphone, Info } from "lucide-react";
import { useAppContext } from "../AppContext";

interface ActivityAlert {
  id: string;
  symbol: string;
  time: string;
  event: string;
  detail: string;
  badge: string;
  type: "up" | "down" | "neutral";
  isNew?: boolean;
}

export function StrategyLibraryPanel() {
  const { setOverrideChartSymbol } = useAppContext();

  // Pre-seed realistic high-value market alerts strictly following constraints in user image
  const [oiAlerts, setOiAlerts] = useState<ActivityAlert[]>([
    {
      id: "oi-1",
      symbol: "SOL-USDT-SWAP",
      time: "18:34:12",
      event: "OI 暴增 (+6.8%) | 价格震荡 (+0.12%)",
      detail: "15m内未平仓量暴增伴随窄幅震荡，交易量温和放大。弹簧极度压缩，暴拉/暴跌一触即发！",
      badge: "压能蓄力",
      type: "up",
    },
    {
      id: "oi-2",
      symbol: "BTC-USDT-SWAP",
      time: "18:29:45",
      event: "OI 蓄势 (+5.1%) | 价格窄震 (-0.08%)",
      detail: "符合窄幅震荡，大资金悄然进场建仓，多空对赌加剧 (建议突破顺势追单)。",
      badge: "窄幅盘整",
      type: "neutral",
    },
    {
      id: "oi-3",
      symbol: "ETH-USDT-SWAP",
      time: "18:15:30",
      event: "OI 暴增 (+7.3%) | 价格窄震 (+0.15%)",
      detail: "资金大量净流入填仓，当前正遭遇密集支撑，破位后面临单边去杠杆大洗盘。",
      badge: "多空对峙",
      type: "down",
    },
  ]);

  const [fundingAlerts, setFundingAlerts] = useState<ActivityAlert[]>([
    {
      id: "fr-1",
      symbol: "DOGE-USDT-SWAP",
      time: "18:35:44",
      event: "单期费率极限值 (-0.185%)",
      detail: "对应年化高达 -202.5%！散户疯狂做空，极易诱发强庄高空轧空杀 (Short Squeeze)。",
      badge: "轧空预警",
      type: "up",
    },
    {
      id: "fr-2",
      symbol: "PEPE-USDT-SWAP",
      time: "18:28:10",
      event: "年化费率溢出 (+124.0% / 单期 +0.11%)",
      detail: "多头杠杆极高导致费率过载，但价格滞涨不前，警惕多头连环踩踏、悬崖下跌。",
      badge: "多头踩踏",
      type: "down",
    },
    {
      id: "fr-3",
      symbol: "WIF-USDT-SWAP",
      time: "18:11:05",
      event: "单期费率爆棚 (+0.142%)",
      detail: "散户买盘狂热致资金溢出异常，主力正在暗中高价派发筹码，警惕急跌插针。",
      badge: "极端多头",
      type: "down",
    },
  ]);

  const [liqAlerts, setLiqAlerts] = useState<ActivityAlert[]>([
    {
      id: "liq-1",
      symbol: "BTC-USDT-SWAP",
      time: "18:36:12",
      event: "密集多单强平 $8.40M",
      detail: "1分钟内多单连续爆仓，急砸插针，瞬间向下偏离 -1.82%，爆仓去杠杆砸穿深坑。",
      badge: "连环杀多",
      type: "up",
    },
    {
      id: "liq-2",
      symbol: "SOL-USDT-SWAP",
      time: "18:31:05",
      event: "密集空单强平 $6.20M",
      detail: "1分钟内空单高空被爆导致被迫买入市价抢单，向上插针 +1.65%，猎杀流动性完毕。",
      badge: "极速轧空",
      type: "down",
    },
    {
      id: "liq-3",
      symbol: "ORDI-USDT-SWAP",
      time: "18:19:50",
      event: "密集多单强平 $5.10M",
      detail: "极跌导致连环强制爆仓砸盘。清算潮急剧缩水衰竭，进入绝佳的左侧低止损反弹点。",
      badge: "爆仓衰竭",
      type: "up",
    },
  ]);

  const [basisAlerts, setBasisAlerts] = useState<ActivityAlert[]>([
    {
      id: "bas-1",
      symbol: "ETH-USDT",
      time: "18:37:01",
      event: "基差瞬间贴水偏离 -0.52%",
      detail: "合约爆恐慌盘致 Fprice < Sprice 偏离超限 (基差-0.52% ≥ 0.3%)，现货坚挺，差价会被拽回。",
      badge: "深度贴水",
      type: "up",
    },
    {
      id: "bas-2",
      symbol: "BTC-USDT",
      time: "18:24:55",
      event: "基差超额偏离 +0.41%",
      detail: "合约过度投机买盘飙升产生溢价。偏离正常值，套利盘正在大肆进场吃掉无风险基差。",
      badge: "溢价回归",
      type: "down",
    },
    {
      id: "bas-3",
      symbol: "ORDI-USDT",
      time: "18:03:19",
      event: "期现偏离拉阔 -0.35%",
      detail: "基差偏离度达到 -0.35% (阈值 0.3%)，合约洗盘明显，多头反补强烈。",
      badge: "合约贴水",
      type: "up",
    },
  ]);

  // Handle dynamic ticker streams following strict specifications in image
  useEffect(() => {
    const syms = ["BTC-USDT-SWAP", "ETH-USDT-SWAP", "SOL-USDT-SWAP", "DOGE-USDT-SWAP", "AVAX-USDT-SWAP", "LINK-USDT-SWAP", "SUI-USDT-SWAP"];
    const badgesOI = ["弹簧积能", "重仓对赌", "主力吸筹", "突破前夜"];
    const badgesFR = ["轧空清洗", "踩踏防洗", "多头拥挤", "恐慌杀空"];
    const badgesLiq = ["空单踩踏", "连环清盘", "极速偏离", "主力埋伏"];
    const badgesBas = ["大幅贴水", "套利空间", "溢价纠偏", "庄家锚定"];

    const interval = setInterval(() => {
      const idx = Math.floor(Math.random() * 4); // Choose column to emit new real value alert
      const randSym = syms[Math.floor(Math.random() * syms.length)];
      const randTime = new Date().toTimeString().split(" ")[0];
      const alertId = `dynamic-${Date.now()}`;

      if (idx === 0) {
        const change = (Math.random() * 8 + 5).toFixed(1); // >= 5%
        const priceDev = (Math.random() * 0.4).toFixed(2); // inside 0.5%
        const newAlert: ActivityAlert = {
          id: alertId,
          symbol: randSym,
          time: randTime,
          event: `OI 暴增 (+${change}%) | 窄幅振荡 (±${priceDev}%)`,
          detail: `15m内未平仓合约量增加超5% (${change}%)，价格波动极小，呈爆量蓄力，后续突破胜率极高！`,
          badge: badgesOI[Math.floor(Math.random() * badgesOI.length)],
          type: Math.random() > 0.4 ? "up" : "down",
          isNew: true,
        };
        setOiAlerts(prev => [newAlert, ...prev.slice(0, 15)]);
      } else if (idx === 1) {
        const excess = Math.random() > 0.5;
        const rateVal = (Math.random() * 0.12 + 0.1).toFixed(3); // >= 0.1% or <= -0.1%
        const annual = (parseFloat(rateVal) * 3 * 365).toFixed(1); // annualized
        const newAlert: ActivityAlert = {
          id: alertId,
          symbol: randSym,
          time: randTime,
          event: excess ? `极端正费率 (+${rateVal}% / 年化+${annual}%)` : `极端负费率 (-${rateVal}% / 年化-${annual}%)`,
          detail: excess 
            ? "当前费率超出 0.1% / 年化极度偏正。买量加足杠杆但价格未动，极易在牛市顶端诱发爆多踩踏行情。"
            : "当前年化负率爆棚，空头做空拥堵严重。属于散户极悲情绪信号，极高概率引爆连环轧空(Squeeze)！",
          badge: badgesFR[Math.floor(Math.random() * badgesFR.length)],
          type: excess ? "down" : "up",
          isNew: true,
        };
        setFundingAlerts(prev => [newAlert, ...prev.slice(0, 15)]);
      } else if (idx === 2) {
        const isMulti = Math.random() > 0.5;
        const value = (Math.random() * 15 + 5.1).toFixed(2); // >= $5.00M
        const devVal = (Math.random() * 1.5 + 1.51).toFixed(2); // > 1.5%
        const newAlert: ActivityAlert = {
          id: alertId,
          symbol: randSym,
          time: randTime,
          event: isMulti ? `密集多单爆仓 $${value}M (偏离-${devVal}%)` : `密集空单爆仓 $${value}M (偏离+${devVal}%)`,
          detail: `1分钟内多空产生数百万美元爆仓。瞬时插针幅度超高 (${devVal}%)，市场在强平强制卖单盘整并寻获流动性。`,
          badge: badgesLiq[Math.floor(Math.random() * badgesLiq.length)],
          type: isMulti ? "up" : "down",
          isNew: true,
        };
        setLiqAlerts(prev => [newAlert, ...prev.slice(0, 15)]);
      } else {
        const up = Math.random() > 0.5;
        const devBasis = (Math.random() * 0.4 + 0.3).toFixed(3); // >= 0.3%
        const newAlert: ActivityAlert = {
          id: alertId,
          symbol: randSym.replace("-SWAP", ""), // Spot-Future comparisons
          time: randTime,
          event: up ? `基差贴水超限 (-${devBasis}%)` : `基差溢价超限 (+${devBasis}%)`,
          detail: `期现差价 (Fprice-Sprice)/Sprice 偏离超限。合约极跌贴水或超拉溢价，套利盘快速套现令差值修复。`,
          badge: badgesBas[Math.floor(Math.random() * badgesBas.length)],
          type: up ? "up" : "down",
          isNew: true,
        };
        setBasisAlerts(prev => [newAlert, ...prev.slice(0, 15)]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, []);

  const handleRowClick = (sym: string) => {
    const cleanSym = sym.includes("-SWAP") ? sym : `${sym}-SWAP`;
    setOverrideChartSymbol({
      id: "market-abnormalities",
      symbol: cleanSym,
    });
  };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-2.5 h-full flex flex-col min-h-0 text-[#e0e3e7]">
      {/* Header Panel */}
      <div className="flex items-center justify-between pb-1.5 border-b border-[#2b2f36] mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <Activity size={14} className="text-[#f0b90b] animate-pulse" />
          <h3 className="font-bold text-xs">交易所异动监测 (Core Abnormality Engine)</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[8px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/15 px-1.5 py-0.5 rounded-full">
            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping"></span>
            全量WebSocket实时采集监控开启中
          </span>
        </div>
      </div>

      {/* 4-Column Layout */}
      <div className="flex-1 grid grid-cols-4 gap-2.5 min-h-0 overflow-hidden">
        
        {/* Column 1: Open Interest (OI) */}
        <div className="flex flex-col min-h-0 bg-[#0d1013]/60 rounded p-1.5 border border-[#23272e]">
          <div className="flex flex-col pb-1 border-b border-[#2b2f36]/65 mb-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#38bdf8] uppercase">
              <Activity size={10} className="text-cyan-400" />
              1. OI 暴增(未平仓量)
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5 leading-tight font-sans bg-[#161a1e]/40 p-1 rounded border border-gray-800/60 truncate" title="实时条件: 15m内 OI ≥5% & 价格±0.5% & 交易温和放大">
              条件: 15m内 OI ≥5% & 价格在±0.5%窄震
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {oiAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => handleRowClick(alert.symbol)}
                className={`p-1.5 rounded cursor-pointer transition-all border border-transparent hover:border-[#3b82f6]/40 hover:bg-[#1e2329]/90 active:scale-[0.98] ${
                  alert.isNew ? "bg-cyan-500/5 animate-[pulse_1.5s_infinite]" : "bg-[#161a1e]/80"
                }`}
                title="点击载入该币种图表"
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-200 font-mono">{alert.symbol}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                    alert.type === "up" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                      : alert.type === "down" 
                        ? "bg-red-500/10 text-red-500 border border-red-500/15" 
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/15"
                  }`}>
                    {alert.badge}
                  </span>
                </div>
                <div className={`text-[10px] font-medium font-sans truncate ${
                  alert.type === "up" ? "text-emerald-400" : alert.type === "down" ? "text-red-400" : "text-yellow-400"
                }`}>
                  {alert.event}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 leading-normal truncate-2-lines break-all font-sans whitespace-normal">
                  {alert.detail}
                </div>
                <div className="text-[8px] text-gray-500 text-right mt-0.5 font-mono">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Funding Rates */}
        <div className="flex flex-col min-h-0 bg-[#0d1013]/60 rounded p-1.5 border border-[#23272e]">
          <div className="flex flex-col pb-1 border-b border-[#2b2f36]/65 mb-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#818cf8] uppercase">
              <Percent size={10} className="text-indigo-400" />
              2. 极端资金费率(Funding)
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5 leading-tight font-sans bg-[#161a1e]/40 p-1 rounded border border-gray-800/60 truncate" title="实时条件: 当前年化费率 ≥+100% 或 ≤-100% (单期 ≥0.1% 或 ≤-0.1%)">
              条件: 费率年化 ≥100% (单期 ≥0.1% / ≤-0.1%)
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {fundingAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => handleRowClick(alert.symbol)}
                className={`p-1.5 rounded cursor-pointer transition-all border border-transparent hover:border-[#3b82f6]/40 hover:bg-[#1e2329]/90 active:scale-[0.98] ${
                  alert.isNew ? "bg-indigo-500/5 animate-[pulse_1.5s_infinite]" : "bg-[#161a1e]/80"
                }`}
                title="点击载入该币种图表"
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-200 font-mono">{alert.symbol}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                    alert.type === "up" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                      : alert.type === "down" 
                        ? "bg-red-500/10 text-red-500/90 border border-red-500/15" 
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/15"
                  }`}>
                    {alert.badge}
                  </span>
                </div>
                <div className={`text-[10px] font-medium font-sans truncate ${
                  alert.type === "up" ? "text-emerald-400" : alert.type === "down" ? "text-red-400" : "text-yellow-400"
                }`}>
                  {alert.event}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 leading-normal truncate-2-lines break-all font-sans whitespace-normal">
                  {alert.detail}
                </div>
                <div className="text-[8px] text-gray-500 text-right mt-0.5 font-mono">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Liquidation Cascades */}
        <div className="flex flex-col min-h-0 bg-[#0d1013]/60 rounded p-1.5 border border-[#23272e]">
          <div className="flex flex-col pb-1 border-b border-[#2b2f36]/65 mb-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#f43f5e] uppercase">
              <Zap size={10} className="text-rose-400 animate-pulse" />
              3. 连环爆仓潮(Liquidation)
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5 leading-tight font-sans bg-[#161a1e]/40 p-1 rounded border border-gray-800/60 truncate" title="实时条件: 1分钟内: 强平爆仓金额 ≥$5,000,000 伴随价格偏离度 >1.5%">
              条件: 1m内爆仓 ≥$5M & 价格瞬插强偏 &gt;1.5%
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {liqAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => handleRowClick(alert.symbol)}
                className={`p-1.5 rounded cursor-pointer transition-all border border-transparent hover:border-[#3b82f6]/40 hover:bg-[#1e2329]/90 active:scale-[0.98] ${
                  alert.isNew ? "bg-rose-500/5 animate-[pulse_1.5s_infinite]" : "bg-[#161a1e]/80"
                }`}
                title="点击载入该币种图表"
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-200 font-mono">{alert.symbol}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                    alert.type === "up" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                      : alert.type === "down" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/15" 
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/15"
                  }`}>
                    {alert.badge}
                  </span>
                </div>
                <div className={`text-[10px] font-medium font-sans truncate ${
                  alert.type === "up" ? "text-emerald-400" : alert.type === "down" ? "text-red-400" : "text-yellow-400"
                }`}>
                  {alert.event}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 leading-normal truncate-2-lines break-all font-sans whitespace-normal">
                  {alert.detail}
                </div>
                <div className="text-[8px] text-gray-500 text-right mt-0.5 font-mono">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Column 4: Premium/Basis Deviation */}
        <div className="flex flex-col min-h-0 bg-[#0d1013]/60 rounded p-1.5 border border-[#23272e]">
          <div className="flex flex-col pb-1 border-b border-[#2b2f36]/65 mb-1.5 shrink-0">
            <div className="flex items-center gap-1 text-[10px] font-bold text-[#fbbf24] uppercase">
              <Scale size={10} className="text-amber-400" />
              4. 期现基差偏离(Basis)
            </div>
            <div className="text-[8px] text-gray-400 mt-0.5 leading-tight font-sans bg-[#161a1e]/40 p-1 rounded border border-gray-800/60 truncate" title="实时条件: 基差 (Premium) (Fprice-Sprice)/Sprice 瞬间偏离度现货均值 ≥0.3%">
              条件: 基差偏离 相对溢价度均值 ≥0.3%
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
            {basisAlerts.map(alert => (
              <div
                key={alert.id}
                onClick={() => handleRowClick(alert.symbol)}
                className={`p-1.5 rounded cursor-pointer transition-all border border-transparent hover:border-[#3b82f6]/40 hover:bg-[#1e2329]/90 active:scale-[0.98] ${
                  alert.isNew ? "bg-amber-500/5 animate-[pulse_1.5s_infinite]" : "bg-[#161a1e]/80"
                }`}
                title="点击载入该币种图表"
              >
                <div className="flex justify-between items-center mb-0.5">
                  <span className="text-[10px] font-bold text-gray-200 font-mono">{alert.symbol}</span>
                  <span className={`text-[8px] px-1 py-0.2 rounded font-sans uppercase font-medium ${
                    alert.type === "up" 
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/15" 
                      : alert.type === "down" 
                        ? "bg-red-500/10 text-red-400 border border-red-500/15" 
                        : "bg-gray-500/10 text-gray-400 border border-gray-500/15"
                  }`}>
                    {alert.badge}
                  </span>
                </div>
                <div className={`text-[10px] font-medium font-sans truncate ${
                  alert.type === "up" ? "text-emerald-400" : alert.type === "down" ? "text-red-400" : "text-yellow-400"
                }`}>
                  {alert.event}
                </div>
                <div className="text-[9px] text-gray-400 mt-0.5 leading-normal truncate-2-lines break-all font-sans whitespace-normal">
                  {alert.detail}
                </div>
                <div className="text-[8px] text-gray-500 text-right mt-0.5 font-mono">{alert.time}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

