import React, { useState, useEffect, useRef } from "react";
import { 
  Activity, 
  Volume2, 
  VolumeX, 
  Trash2, 
  Play, 
  Pause, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Scale, 
  Percent, 
  Flame, 
  ShieldAlert,
  Info 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAppContext } from "../AppContext";

// Define TypeScript interfaces for our Anomaly events
interface AnomalyEvent {
  id: string;
  time: string;
  symbol: string;
  type: "oi" | "funding" | "liquidation" | "basis";
  primaryValue: string;
  isPositive: boolean; // true for upward/bullish, false for downward/bearish/negative
  metrics: {
    label: string;
    value: string;
  }[];
}

export function AbnormalMonitoringPanel() {
  const { addLog, setOverrideChartSymbol } = useAppContext();
  const [alarmEnabled, setAlarmEnabled] = useState(true);
  const [isActive, setIsActive] = useState(true);
  const scrollContainerRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Interactive user-configurable Thresholds
  const [oiThreshold, setOiThreshold] = useState(5.0); // % in 15 mins
  const [fundingThreshold, setFundingThreshold] = useState(100.0); // % annualized
  const [liqThreshold, setLiqThreshold] = useState(5.0); // Million USD
  const [basisThreshold, setBasisThreshold] = useState(0.3); // % Premium deviation

  // Store the anomaly event feeds for the 4 columns
  const [oiEvents, setOiEvents] = useState<AnomalyEvent[]>([
    {
      id: "oi-1",
      time: "18:41:02",
      symbol: "BTC-USDT-SWAP",
      type: "oi",
      primaryValue: "+6.85%",
      isPositive: true,
      metrics: [
        { label: "价格波动", value: "+0.18%" },
        { label: "成交量变动", value: "+14.2%" },
        { label: "15m增幅", value: "+6.85%" }
      ]
    },
    {
      id: "oi-2",
      time: "18:32:15",
      symbol: "ETH-USDT-SWAP",
      type: "oi",
      primaryValue: "+5.12%",
      isPositive: false,
      metrics: [
        { label: "价格波动", value: "-0.28%" },
        { label: "成交量变动", value: "+8.90%" },
        { label: "15m增幅", value: "+5.12%" }
      ]
    },
    {
      id: "oi-3",
      time: "18:18:40",
      symbol: "SOL-USDT-SWAP",
      type: "oi",
      primaryValue: "+5.98%",
      isPositive: true,
      metrics: [
        { label: "价格波动", value: "+0.05%" },
        { label: "成交量变动", value: "+11.5%" },
        { label: "15m增幅", value: "+5.98%" }
      ]
    }
  ]);

  const [fundingEvents, setFundingEvents] = useState<AnomalyEvent[]>([
    {
      id: "fund-1",
      time: "18:43:55",
      symbol: "DOGE-USDT-SWAP",
      type: "funding",
      primaryValue: "+102.50%",
      isPositive: true,
      metrics: [
        { label: "单期费率", value: "+0.103%" },
        { label: "结算倒计时", value: "02h 16m" },
        { label: "年化水平", value: "+102.5%" }
      ]
    },
    {
      id: "fund-2",
      time: "18:25:10",
      symbol: "XRP-USDT-SWAP",
      type: "funding",
      primaryValue: "-120.45%",
      isPositive: false,
      metrics: [
        { label: "单期费率", value: "-0.121%" },
        { label: "结算倒计时", value: "02h 16m" },
        { label: "年化水平", value: "-120.5%" }
      ]
    },
    {
      id: "fund-3",
      time: "18:05:12",
      symbol: "SHIB-USDT-SWAP",
      type: "funding",
      primaryValue: "+114.20%",
      isPositive: true,
      metrics: [
        { label: "单期费率", value: "+0.114%" },
        { label: "结算倒计时", value: "06h 16m" },
        { label: "年化水平", value: "+114.2%" }
      ]
    }
  ]);

  const [liqEvents, setLiqEvents] = useState<AnomalyEvent[]>([
    {
      id: "liq-1",
      time: "18:42:15",
      symbol: "BTC-USDT-SWAP",
      type: "liquidation",
      primaryValue: "$6.82M (爆多)",
      isPositive: false, // red for longs liquidations (downward drop)
      metrics: [
        { label: "价格偏离", value: "-1.82%" },
        { label: "累计笔数", value: "482笔" },
        { label: "瞬时插针", value: "C-Pin Down" }
      ]
    },
    {
      id: "liq-2",
      time: "18:35:00",
      symbol: "ETH-USDT-SWAP",
      type: "liquidation",
      primaryValue: "$5.15M (爆空)",
      isPositive: true, // green for shorts liquidations (bullish spike)
      metrics: [
        { label: "价格偏离", value: "+1.65%" },
        { label: "累计笔数", value: "311笔" },
        { label: "瞬时插针", value: "C-Pin Up" }
      ]
    }
  ]);

  const [basisEvents, setBasisEvents] = useState<AnomalyEvent[]>([
    {
      id: "basis-1",
      time: "18:44:02",
      symbol: "BTC-USDT",
      type: "basis",
      primaryValue: "+0.38%",
      isPositive: true,
      metrics: [
        { label: "合约价格", value: "88,416.5" },
        { label: "现货价格", value: "88,081.2" },
        { label: "均值差", value: "$335.3" }
      ]
    },
    {
      id: "basis-2",
      time: "18:29:44",
      symbol: "ETH-USDT",
      type: "basis",
      primaryValue: "+0.42%",
      isPositive: true,
      metrics: [
        { label: "合约价格", value: "3,126.8" },
        { label: "现货价格", value: "3,113.7" },
        { label: "均值差", value: "$13.1" }
      ]
    }
  ]);

  // Audio synthesize system to produce elegant sci-fi alert bells
  const playAlertSound = (type: "oi" | "funding" | "liquidation" | "basis") => {
    if (!alarmEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      // Distinct musical chime tones for each type of alarm
      if (type === "liquidation") {
        // High alert chime
        osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc2.frequency.setValueAtTime(880.00, ctx.currentTime); // A5
      } else if (type === "oi") {
        // Sci-fi positive pulse
        osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc2.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
      } else if (type === "funding") {
        // Dense double octave chime
        osc1.frequency.setValueAtTime(440.00, ctx.currentTime); // A4
        osc2.frequency.setValueAtTime(554.37, ctx.currentTime); // C#5
      } else {
        // Warning chime
        osc1.frequency.setValueAtTime(493.88, ctx.currentTime); // B4
        osc2.frequency.setValueAtTime(622.25, ctx.currentTime); // D#5
      }
      
      osc1.type = "sine";
      osc2.type = "sine";
      
      gainNode.gain.setValueAtTime(0.001, ctx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      
      osc1.start();
      osc2.start();
      osc1.stop(ctx.currentTime + 0.5);
      osc2.stop(ctx.currentTime + 0.5);
    } catch (e) {
      // Ignored if browser policy blocks audio before user interaction
    }
  };

  // Click symbol to center dashboard chart on that symbol
  const handleSymbolClick = (symbol: string) => {
    // Normalise futures symbol back to standard if it comes as spot
    let finalSym = symbol;
    if (!finalSym.endsWith("-SWAP")) {
      finalSym = `${finalSym}-SWAP`;
    }
    setOverrideChartSymbol({ id: Math.random().toString(), symbol: finalSym });
    addLog(`图表焦点已切换至: ${finalSym}`, "info");
  };

  // Simulating live ticks matches specified rules exactly
  useEffect(() => {
    if (!isActive) return;

    const SYMBOLS = ["BTC-USDT", "ETH-USDT", "SOL-USDT", "DOGE-USDT", "XRP-USDT", "AVAX-USDT", "SUI-USDT", "WIF-USDT"];

    const interval = setInterval(() => {
      // Choose a random column type to trigger an event (1 in 4 chance)
      const rollType = Math.floor(Math.random() * 4);
      const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];
      const id = `${Date.now()}-${Math.random()}`;

      if (rollType === 0) {
        // OI Spike Condition: OI increase >= 5% in 15min, price ±0.5% oscillation, vol expands
        const oiChange = (oiThreshold + (Math.random() * 3)).toFixed(2); // e.g. 5.15% to 8.15%
        const priceDevVal = (Math.random() * 0.9 - 0.45).toFixed(2); // price within ±0.45% (matches ±0.5% oscillation)
        const volExp = (10 + (Math.random() * 25)).toFixed(1); // vol expands moderately (e.g. +10% to +35%)
        const isPos = parseFloat(priceDevVal) >= 0;

        const newEvent: AnomalyEvent = {
          id,
          time: timeStr,
          symbol: `${symbol}-SWAP`,
          type: "oi",
          primaryValue: `+${oiChange}%`,
          isPositive: isPos,
          metrics: [
            { label: "价格波动", value: `${isPos ? "+" : ""}${priceDevVal}%` },
            { label: "成交量变动", value: `+${volExp}%` },
            { label: "15m增幅", value: `+${oiChange}%` }
          ]
        };

        setOiEvents(prev => [newEvent, ...prev].slice(0, 3));
        playAlertSound("oi");
        addLog(`[异动监控] ${symbol}-SWAP 触发 OI 爆增: +${oiChange}% (15min)`, "info");

      } else if (rollType === 1) {
        // Funding Rate Condition: Annualized >= 100% or <= -100% (or single period >= 0.1% or <= -0.1%)
        const bias = Math.random() > 0.4 ? 1 : -1;
        // calculate annualized of simulated single period rate
        const singleRate = bias * (0.10 + Math.random() * 0.08); // single period rate >= 0.1%
        const annualizedRate = singleRate * 8 * 365; // ~ Annualized %

        const newEvent: AnomalyEvent = {
          id,
          time: timeStr,
          symbol: `${symbol}-SWAP`,
          type: "funding",
          primaryValue: `${annualizedRate.toFixed(2)}%`,
          isPositive: bias > 0,
          metrics: [
            { label: "单期费率", value: `${bias > 0 ? "+" : ""}${singleRate.toFixed(3)}%` },
            { label: "结算倒计时", value: "05h 59m" },
            { label: "年化水平", value: `${bias > 0 ? "+" : ""}${annualizedRate.toFixed(1)}%` }
          ]
        };

        setFundingEvents(prev => [newEvent, ...prev].slice(0, 3));
        playAlertSound("funding");
        addLog(`[异动监控] ${symbol}-SWAP 资金费率极端: ${annualizedRate.toFixed(1)}%`, "error");

      } else if (rollType === 2) {
        // Cascading Liquidations: 1 min global sum >= $5M (5.0M config), price deviation > 1.5%
        const sizeMillion = (liqThreshold + (Math.random() * 6)).toFixed(2); // $5.0M to $11.0M
        const devPercent = (1.51 + Math.random() * 1.8).toFixed(2); // deviation > 1.5%
        const isBullishLiq = Math.random() > 0.5; // Short liquidations spike prices upwards, Long liquidations drop price

        const newEvent: AnomalyEvent = {
          id,
          time: timeStr,
          symbol: `${symbol}-SWAP`,
          type: "liquidation",
          primaryValue: `$${sizeMillion}M (${isBullishLiq ? "爆空" : "爆多"})`,
          isPositive: isBullishLiq,
          metrics: [
            { label: "价格偏离", value: `${isBullishLiq ? "+" : "-"}${devPercent}%` },
            { label: "累计笔数", value: `${Math.floor(200 + Math.random() * 600)}笔` },
            { label: "瞬时插针", value: isBullishLiq ? "Pin Up 📈" : "Pin Down 📉" }
          ]
        };

        setLiqEvents(prev => [newEvent, ...prev].slice(0, 3));
        playAlertSound("liquidation");
        addLog(`[异动监控] ${symbol}-SWAP 连环爆仓潮: $${sizeMillion}M 的仓位被强制平仓`, "success");

      } else {
        // Basis Premium Deviation: (Fprice - Sprice)/Sprice momentary deviation >= 0.3%
        const deviation = (basisThreshold + (Math.random() * 0.25)).toFixed(3); // dev >= 0.3%
        const spotPrice = 100 + Math.random() * 88000;
        const spotPriceStr = spotPrice < 5 ? spotPrice.toFixed(4) : spotPrice < 1000 ? spotPrice.toFixed(2) : Math.floor(spotPrice).toLocaleString();
        const futPrice = spotPrice * (1 + parseFloat(deviation) / 100);
        const futPriceStr = spotPrice < 5 ? futPrice.toFixed(4) : spotPrice < 1000 ? futPrice.toFixed(2) : Math.floor(futPrice).toLocaleString();
        const diffStr = (futPrice - spotPrice).toFixed(spotPrice < 1000 ? 3 : 1);

        const newEvent: AnomalyEvent = {
          id,
          time: timeStr,
          symbol, // spot comparison usually pair base
          type: "basis",
          primaryValue: `+${deviation}%`,
          isPositive: true,
          metrics: [
            { label: "合约价格", value: futPriceStr },
            { label: "现货价格", value: spotPriceStr },
            { label: "瞬间差价", value: `$${diffStr}` }
          ]
        };

        setBasisEvents(prev => [newEvent, ...prev].slice(0, 3));
        playAlertSound("basis");
        addLog(`[异动监控] ${symbol} 期现基差瞬时发生偏离: +${deviation}%`, "info");
      }

    }, Math.random() * 1500 + 2500); // Trigger dynamic notifications every 2.5s - 4s

    return () => clearInterval(interval);
  }, [isActive, oiThreshold, fundingThreshold, liqThreshold, basisThreshold]);

  const clearAllLogs = () => {
    setOiEvents([]);
    setFundingEvents([]);
    setLiqEvents([]);
    setBasisEvents([]);
    addLog("已清空所有交易所异动实时监控数据", "info");
  };

  const toggleActive = () => {
    setIsActive(!isActive);
    addLog(isActive ? "异动监控轮询已暂停" : "已启动交易所异动实时常驻监控", "info");
  };

  const toggleAlarm = () => {
    setAlarmEnabled(!alarmEnabled);
    addLog(alarmEnabled ? "异动声音警报系统已静音" : "异动声音警报系统已开启 (Chime Alerts Active)", "info");
  };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 h-full flex flex-col min-h-0 text-[#e0e3e7]">
      
      {/* Dashboard Top Header Bar with interactive toggle configs */}
      <div className="flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-[#2b2f36] gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isActive ? 'bg-red-400' : 'bg-gray-400'}`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${isActive ? 'bg-red-500' : 'bg-gray-500'}`}></span>
          </span>
          <h3 className="font-bold text-xs tracking-wider text-white flex items-center gap-1.5 font-sans">
            <Activity size={14} className="text-[#3b82f6] shrink-0" />
            <span>实时异动监测柜 (Dynamic Exchange Anomaly Monitor)</span>
          </h3>
        </div>

        {/* Quick parameters controller */}
        <div className="flex items-center gap-4 text-[10px] text-gray-400 bg-[#1e2329] px-2 py-1 rounded border border-[#2b2f36]/60">
          <div className="flex items-center gap-1">
            <span>OI阈值:</span>
            <input 
              type="number" 
              step="0.5" 
              value={oiThreshold} 
              onChange={(e) => setOiThreshold(Math.max(0.1, parseFloat(e.target.value) || 1))}
              className="w-10 bg-black/40 text-center border border-[#2b2f36] rounded text-[#3b82f6] font-bold py-0.5 outline-none"
            />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1 border-l border-[#2b2f36] pl-2">
            <span>年度资费:</span>
            <input 
              type="number" 
              step="10" 
              value={fundingThreshold} 
              onChange={(e) => setFundingThreshold(Math.max(10, parseFloat(e.target.value) || 10))}
              className="w-11 bg-black/40 text-center border border-[#2b2f36] rounded text-[#00b07c] font-bold py-0.5 outline-none"
            />
            <span>%</span>
          </div>
          <div className="flex items-center gap-1 border-l border-[#2b2f36] pl-2">
            <span>单批爆仓:</span>
            <input 
              type="number" 
              step="0.5" 
              value={liqThreshold} 
              onChange={(e) => setLiqThreshold(Math.max(0.5, parseFloat(e.target.value) || 1))}
              className="w-9 bg-black/40 text-center border border-[#2b2f36] rounded text-orange-400 font-bold py-0.5 outline-none"
            />
            <span>M$</span>
          </div>
          <div className="flex items-center gap-1 border-l border-[#2b2f36] pl-2">
            <span>基差偏离:</span>
            <input 
              type="number" 
              step="0.05" 
              value={basisThreshold} 
              onChange={(e) => setBasisThreshold(Math.max(0.05, parseFloat(e.target.value) || 0.1))}
              className="w-10 bg-black/40 text-center border border-[#2b2f36] rounded text-purple-400 font-bold py-0.5 outline-none"
            />
            <span>%</span>
          </div>
        </div>

        {/* Action button triggers details */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={toggleAlarm}
            title={alarmEnabled ? "静音警报声" : "开启实时警报声 (当有严重异动时提示)"}
            className={`flex items-center justify-center h-6 w-6 rounded border transition-all cursor-pointer ${
              alarmEnabled 
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/25' 
                : 'bg-[#1e2329] border-[#2b2f36] text-gray-500 hover:text-gray-300'
            }`}
          >
            {alarmEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          </button>
          
          <button 
            onClick={toggleActive}
            className={`flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded border font-medium transition-all cursor-pointer ${
              isActive 
                ? 'bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20' 
                : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20'
            }`}
          >
            {isActive ? <Pause size={10} /> : <Play size={10} />}
            <span>{isActive ? '监控中' : '暂停中'}</span>
          </button>
          
          <button 
            onClick={clearAllLogs}
            className="flex items-center gap-1 text-[10px] bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 px-2 py-1 rounded transition-colors cursor-pointer"
          >
            <Trash2 size={10} />
            <span>清除</span>
          </button>
        </div>
      </div>

      {/* 4 horizontal columns separated by gap */}
      <div className="flex flex-row items-stretch gap-4 flex-1 min-h-0 overflow-hidden mt-2">
        
        {/* Column 1: OI Spike (OI 暴增) */}
        <div className="flex-1 flex flex-col min-h-0 h-full relative overflow-hidden transition-colors hover:bg-white/[0.01] rounded">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#2b2f36]/60">
            <div className="flex items-center gap-1">
              <Zap size={11} className="text-[#3b82f6]" />
              <span className="text-[11px] font-bold text-white tracking-wide">1. OI 暴增(未平仓量)</span>
            </div>
            <div className="text-[9px] text-[#3b82f6] font-mono bg-[#3b82f6]/10 px-1.5 rounded-sm">OI Spike</div>
          </div>
          
          <div className="text-[9px] text-gray-500 leading-tight mb-1.5 p-1.5 rounded bg-[#161a1e]">
            15分钟内: OI增幅 ≥ {oiThreshold}% 伴随价格盘整(±0.5%)且量能放大
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {oiEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-[10px] italic py-8">
                  暂无捕获数据...
                </div>
              ) : (
                oiEvents.map((evt) => (
                  <motion.div
                    layout
                    key={evt.id}
                    initial={{ opacity: 0, x: -5, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="p-1.5 bg-[#14181b] rounded text-[10px] transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <button 
                        onClick={() => handleSymbolClick(evt.symbol)}
                        className="font-bold text-gray-200 hover:text-[#3b82f6] hover:underline transition-colors font-mono cursor-pointer"
                      >
                        {evt.symbol}
                      </button>
                      <span className="text-[9px] text-gray-500 font-mono">{evt.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-gray-400 font-mono">15m增幅:</span>
                      <span className="font-bold text-[#3b82f6] font-mono">{evt.primaryValue}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 mt-0.5 pt-0.5 border-t border-[#2b2f36]/20 text-[9px] text-gray-500 font-mono">
                      {evt.metrics.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="truncate">
                          <span>{m.label.substring(0, 3)}:</span>{" "}
                          <span className={m.value.startsWith("-") ? "text-red-400" : "text-green-400"}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>



        {/* Column 2: Extreme Funding Rate (极端资金费率) */}
        <div className="flex-1 flex flex-col min-h-0 h-full relative overflow-hidden transition-colors hover:bg-white/[0.01] rounded">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#2b2f36]/60">
            <div className="flex items-center gap-1">
              <Percent size={11} className="text-[#00b07c]" />
              <span className="text-[11px] font-bold text-white tracking-wide">2. 极端资金费率(Funding)</span>
            </div>
            <div className="text-[9px] text-[#00b07c] font-mono bg-[#00b07c]/10 px-1.5 rounded-sm">Funding</div>
          </div>
          
          <div className="text-[9px] text-gray-500 leading-tight mb-1.5 p-1.5 rounded bg-[#161a1e]">
            当前年化费率 ≥ +{fundingThreshold}% 或 ≤ -{fundingThreshold}% (结算期 ≥ 0.1%)
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {fundingEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-[10px] italic py-8">
                  暂无捕获数据...
                </div>
              ) : (
                fundingEvents.map((evt) => (
                  <motion.div
                    layout
                    key={evt.id}
                    initial={{ opacity: 0, x: -5, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="p-1.5 bg-[#14181b] rounded text-[10px] transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <button 
                        onClick={() => handleSymbolClick(evt.symbol)}
                        className="font-bold text-gray-200 hover:text-[#00b07c] hover:underline transition-colors font-mono cursor-pointer"
                      >
                        {evt.symbol}
                      </button>
                      <span className="text-[9px] text-gray-500 font-mono">{evt.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-gray-400 font-mono">年化费率:</span>
                      <span className={`font-black font-mono ${evt.isPositive ? "text-green-400" : "text-red-400"}`}>
                        {evt.primaryValue}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 mt-0.5 pt-0.5 border-t border-[#2b2f36]/20 text-[9px] text-gray-500 font-mono">
                      {evt.metrics.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="truncate">
                          <span>{m.label.substring(0, 2)}:</span>{" "}
                          <span className={`${m.value.startsWith("-") ? "text-red-400" : m.value.startsWith("+") ? "text-green-400" : "text-gray-400"}`}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>



        {/* Column 3: Cascading Liquidation (连环爆仓潮) */}
        <div className="flex-1 flex flex-col min-h-0 h-full relative overflow-hidden transition-colors hover:bg-white/[0.01] rounded">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#2b2f36]/60">
            <div className="flex items-center gap-1">
              <Flame size={11} className="text-orange-500" />
              <span className="text-[11px] font-bold text-white tracking-wide">3. 连环爆仓潮(Liquidation)</span>
            </div>
            <div className="text-[9px] text-orange-500 font-mono bg-orange-500/10 px-1.5 rounded-sm">Liquidation</div>
          </div>
          
          <div className="text-[9px] text-gray-500 leading-tight mb-1.5 p-1.5 rounded bg-[#161a1e]">
            1分钟内全网爆多/爆空累积 ≥ ${liqThreshold}M 瞬时插针偏离 &gt;1.5%
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {liqEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-[10px] italic py-8">
                  暂无捕获数据...
                </div>
              ) : (
                liqEvents.map((evt) => (
                  <motion.div
                    layout
                    key={evt.id}
                    initial={{ opacity: 0, x: -5, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="p-1.5 bg-[#14181b] rounded text-[10px] transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <button 
                        onClick={() => handleSymbolClick(evt.symbol)}
                        className="font-bold text-gray-200 hover:text-orange-400 hover:underline transition-colors font-mono cursor-pointer"
                      >
                        {evt.symbol}
                      </button>
                      <span className="text-[9px] text-gray-500 font-mono">{evt.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-gray-400 font-mono">1m爆仓额:</span>
                      <span className={`font-bold font-mono ${evt.isPositive ? "text-green-400" : "text-red-400"}`}>
                        {evt.primaryValue}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 mt-0.5 pt-0.5 border-t border-[#2b2f36]/20 text-[9px] text-gray-500 font-mono">
                      {evt.metrics.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="truncate">
                          <span>{m.label.substring(0, 2)}:</span>{" "}
                          <span className={m.value.startsWith("-") || m.value.includes("Down") ? "text-red-400" : "text-green-400"}>
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>



        {/* Column 4: Spot-Futures Basis Deviation (期现基差偏离) */}
        <div className="flex-1 flex flex-col min-h-0 h-full relative overflow-hidden transition-colors hover:bg-white/[0.01] rounded">
          <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#2b2f36]/60">
            <div className="flex items-center gap-1">
              <Scale size={11} className="text-purple-400" />
              <span className="text-[11px] font-bold text-white tracking-wide">4. 期现基差偏离(Basis)</span>
            </div>
            <div className="text-[9px] text-purple-400 font-mono bg-purple-400/10 px-1.5 rounded-sm">Basis</div>
          </div>
          
          <div className="text-[9px] text-gray-500 leading-tight mb-1.5 p-1.5 rounded bg-[#161a1e]">
            基差溢价 (Fprice - Sprice)/Sprice 偏离正常溢价均值 ≥ {basisThreshold}%
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
            <AnimatePresence mode="popLayout" initial={false}>
              {basisEvents.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-600 text-[10px] italic py-8">
                  暂无捕获数据...
                </div>
              ) : (
                basisEvents.map((evt) => (
                  <motion.div
                    layout
                    key={evt.id}
                    initial={{ opacity: 0, x: -5, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.2 }}
                    className="p-1.5 bg-[#14181b] rounded text-[10px] transition-colors relative"
                  >
                    <div className="flex justify-between items-center mb-0.5">
                      <button 
                        onClick={() => handleSymbolClick(evt.symbol)}
                        className="font-bold text-gray-200 hover:text-purple-400 hover:underline transition-colors font-mono cursor-pointer"
                      >
                        {evt.symbol}
                      </button>
                      <span className="text-[9px] text-gray-500 font-mono">{evt.time}</span>
                    </div>
                    <div className="flex justify-between items-center gap-1">
                      <span className="text-gray-400 font-mono">溢价偏离:</span>
                      <span className="font-bold text-purple-400 font-mono">{evt.primaryValue}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-1 mt-0.5 pt-0.5 border-t border-[#2b2f36]/20 text-[9px] text-gray-500 font-mono">
                      {evt.metrics.slice(0, 2).map((m, idx) => (
                        <div key={idx} className="truncate">
                          <span>{m.label.substring(0, 2)}:</span>{" "}
                          <span className="text-gray-200">
                            {m.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}
