import React, { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, IPriceLine, ISeriesApi, LineStyle, TickMarkType, Time } from "lightweight-charts";
import { okxPublicFetch, okxPrivateFetch } from "../lib/api";
import { calculateRSI, calculateEMA } from "../lib/indicators";
import { useAppContext, InstrumentInfo } from "../AppContext";
import { ChevronDown, Maximize2, Minimize2 } from "lucide-react";

interface ChartWidgetProps {
  key?: number | string;
  id: string;
  defaultSymbol: string;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  className?: string;
}

export function ChartWidget({ id, defaultSymbol, isMaximized, onToggleMaximize, className = "" }: ChartWidgetProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { apiConfig, addLog, triggerRefresh, refreshTrigger, tradeConfig, instruments, positions, orders, overrideChartSymbol, setOverrideChartSymbol, setActiveMainSymbol } = useAppContext();
  
  const [symbol, setSymbol] = useState(defaultSymbol);
  const [inputSymbol, setInputSymbol] = useState(defaultSymbol);
  const [rsiPeriod, setRsiPeriod] = useState(14);
  const [rsiOverbought, setRsiOverbought] = useState(70);
  const [rsiOversold, setRsiOversold] = useState(30);
  const [price, setPrice] = useState<number | null>(null);
  const [vol24h, setVol24h] = useState<number | null>(null);
  const [crosshairInfo, setCrosshairInfo] = useState<any>(null);
  const [flashStatus, setFlashStatus] = useState<"none" | "red" | "green">("none");
  
  const [timeframe, setTimeframe] = useState("15m");
  const [showEma50, setShowEma50] = useState(false);
  const [showEma200, setShowEma200] = useState(false);
  
  const [candleCountdown, setCandleCountdown] = useState("");
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  
  const [isFrozen, setIsFrozen] = useState(false);

  useEffect(() => {
    if (isMaximized || id === "chart-0") {
      setActiveMainSymbol(symbol);
    }
  }, [symbol, isMaximized, id, setActiveMainSymbol]);

  useEffect(() => {
    if (overrideChartSymbol && overrideChartSymbol.id === id) {
      setSymbol(overrideChartSymbol.symbol);
      setInputSymbol(overrideChartSymbol.symbol);
      setOverrideChartSymbol(null);
    }
  }, [overrideChartSymbol, id, setOverrideChartSymbol]);

  // Position Checking
  useEffect(() => {
    setIsFrozen(positions?.some(p => p.instId === symbol) || false);
  }, [symbol, positions]);

  // Try to use ref to hold chart state instead of React state to avoid re-render loops
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsiSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const srLinesRef = useRef<{ support: IPriceLine; resistance: IPriceLine } | null>(null);
  const rsiLinesRef = useRef<{ ob: IPriceLine; os: IPriceLine } | null>(null);
  const posLinesRef = useRef<IPriceLine[]>([]);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType, locale: string) => {
          const date = new Date((time as number) * 1000);
          return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
        },
      },
      rightPriceScale: {
        borderColor: "#334155",
      },
    });
    
    chartRef.current = chart;

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#10b981",
      downColor: "#f43f5e",
      borderVisible: false,
      wickUpColor: "#10b981",
      wickDownColor: "#f43f5e",
    });
    candleSeries.priceScale().applyOptions({ scaleMargins: { top: 0.1, bottom: 0.3 } });
    candleSeriesRef.current = candleSeries;

    const volumeSeries = chart.addHistogramSeries({
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "vol",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.7, bottom: 0.15 },
    });
    volumeSeriesRef.current = volumeSeries;

    const ema50Series = chart.addLineSeries({
      color: "#eab308", // Yellow for 50
      lineWidth: 1,
      crosshairMarkerVisible: false,
      visible: showEma50, // Might not work dynamically without options update
    });
    ema50SeriesRef.current = ema50Series;

    const ema200Series = chart.addLineSeries({
      color: "#3b82f6", // Blue for 200
      lineWidth: 1,
      crosshairMarkerVisible: false,
      visible: showEma200,
    });
    ema200SeriesRef.current = ema200Series;

    const rsiSeries = chart.addLineSeries({
      color: "#a855f7",
      lineWidth: 2,
      priceScaleId: "rsi",
    });
    rsiSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    rsiSeriesRef.current = rsiSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    if (chartContainerRef.current) {
      resizeObserver.observe(chartContainerRef.current);
    }
    handleResize();

    const markUserInteracted = () => {
      userInteractedRef.current = true;
    };
    
    const container = chartContainerRef.current;
    container.addEventListener('mousedown', markUserInteracted);
    container.addEventListener('touchstart', markUserInteracted, { passive: true });
    container.addEventListener('wheel', markUserInteracted, { passive: true });

    chart.subscribeCrosshairMove((param) => {
      if (param.time && candleSeriesRef.current && volumeSeriesRef.current && rsiSeriesRef.current) {
        const data = param.seriesData.get(candleSeriesRef.current);
        const volData = param.seriesData.get(volumeSeriesRef.current);
        const rsiData = param.seriesData.get(rsiSeriesRef.current);
        if (data) {
          setCrosshairInfo({
            time: param.time as number,
            open: (data as any).open,
            high: (data as any).high,
            low: (data as any).low,
            close: (data as any).close,
            vol: (volData as any)?.value,
            rsi: (rsiData as any)?.value
          });
          return;
        }
      }
      setCrosshairInfo(null);
    });

    return () => {
      container.removeEventListener('mousedown', markUserInteracted);
      container.removeEventListener('touchstart', markUserInteracted);
      container.removeEventListener('wheel', markUserInteracted);
      resizeObserver.disconnect();
      chart.remove();
      srLinesRef.current = null;
      rsiLinesRef.current = null;
      posLinesRef.current = [];
    };
  }, []); // Run once

  useEffect(() => {
    ema50SeriesRef.current?.applyOptions({ visible: showEma50 });
  }, [showEma50]);

  useEffect(() => {
    ema200SeriesRef.current?.applyOptions({ visible: showEma200 });
  }, [showEma200]);

  useEffect(() => {
    if (!isMaximized) {
      setCandleCountdown("");
      return;
    }

    const timer = setInterval(() => {
      const now = Math.floor(Date.now() / 1000); // Current timestamp in seconds
      let nextTime = 0;
      if (timeframe === "15m") {
        const tfSec = 15 * 60;
        nextTime = Math.ceil(now / tfSec) * tfSec;
        if (nextTime === now) nextTime += tfSec;
      } else if (timeframe === "1H") {
        const tfSec = 60 * 60;
        nextTime = Math.ceil(now / tfSec) * tfSec;
        if (nextTime === now) nextTime += tfSec;
      } else if (timeframe === "4H") {
        const tfSec = 4 * 60 * 60;
        nextTime = Math.ceil(now / tfSec) * tfSec;
        if (nextTime === now) nextTime += tfSec;
      } else if (timeframe === "1D") {
        const tfSec = 24 * 60 * 60;
        nextTime = Math.ceil(now / tfSec) * tfSec;
        if (nextTime === now) nextTime += tfSec;
      }

      if (nextTime > 0) {
          const diff = nextTime - now;
          const h = Math.floor(diff / 3600);
          const m = Math.floor((diff % 3600) / 60);
          const s = diff % 60;

          if (h > 0) {
            setCandleCountdown(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          } else {
            setCandleCountdown(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
          }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [timeframe, isMaximized]);

  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Clean up old lines
    posLinesRef.current.forEach(line => {
      try { candleSeriesRef.current?.removePriceLine(line); } catch (e) {}
    });
    posLinesRef.current = [];

    if (!isMaximized) return;

    const pos = positions?.find(p => p.instId === symbol);
    if (!pos) return;

    const avgPx = parseFloat(pos.avgPx);
    if (avgPx && !isNaN(avgPx)) {
      posLinesRef.current.push(candleSeriesRef.current.createPriceLine({
        price: avgPx,
        color: pos.posSide === 'long' ? '#00b07c' : '#f6465d',
        lineWidth: 2,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Avg',
      }));
    }

    const tpPrices = new Set<number>();
    const slPrices = new Set<number>();

    orders?.filter(o => o.instId === symbol).forEach(o => {
      if (o.tpTriggerPx) tpPrices.add(parseFloat(o.tpTriggerPx));
      if (o.slTriggerPx) slPrices.add(parseFloat(o.slTriggerPx));
      if (o.ordType === "tp" && o.triggerPx) tpPrices.add(parseFloat(o.triggerPx));
      if (o.ordType === "sl" && o.triggerPx) slPrices.add(parseFloat(o.triggerPx));
    });

    tpPrices.forEach(px => {
      if (isNaN(px)) return;
      posLinesRef.current.push(candleSeriesRef.current!.createPriceLine({
        price: px,
        color: '#00b07c',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'TP',
      }));
    });

    slPrices.forEach(px => {
      if (isNaN(px)) return;
      posLinesRef.current.push(candleSeriesRef.current!.createPriceLine({
        price: px,
        color: '#f6465d',
        lineWidth: 1,
        lineStyle: LineStyle.Solid,
        axisLabelVisible: true,
        title: 'SL',
      }));
    });

  }, [positions, orders, symbol, isMaximized]);

  // Fetch K-lines
  useEffect(() => {
    let active = true;
    userInteractedRef.current = false;
    
    const fetchCandles = async () => {
      try {
        await new Promise(r => setTimeout(r, Math.random() * 200 + 100)); // 100-300ms random offset to stagger multiple widgets slightly
        const limit = isMaximized ? 300 : 100;
        const data = await okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=${timeframe}&limit=${limit}`);
        if (!active || !data) return;

        // OKX format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
        // Ordered newest first. We need oldest first.
        const sortedData = [...data].reverse();

        const closes: number[] = [];
        const candleData = sortedData.map((d: any) => {
          const time = parseInt(d[0]) / 1000 as Time;
          closes.push(parseFloat(d[4]));
          return { time, open: parseFloat(d[1]), high: parseFloat(d[2]), low: parseFloat(d[3]), close: parseFloat(d[4]) };
        });

        // Apply precision based on tickSz
        const instInfo = instruments[symbol];
        if (instInfo && candleSeriesRef.current) {
          const tickVal = parseFloat(instInfo.tickSz);
          if (!isNaN(tickVal) && tickVal > 0) {
            const precision = Math.max(0, -Math.floor(Math.log10(tickVal)));
            
            // To prevent internal minMove rounding issues with very small values,
            // we use type: 'custom' to guarantee the formatting string is correct.
            candleSeriesRef.current.applyOptions({
              priceFormat: {
                type: 'custom',
                minMove: tickVal,
                formatter: (price: number) => {
                  try {
                    return Number(price).toFixed(precision);
                  } catch(e) {
                    return price.toString();
                  }
                }
              }
            });
          }
        }

        const vData = sortedData.map((d: any) => ({
          time: parseInt(d[0]) / 1000 as Time,
          value: parseFloat(d[7]), // Use volCcyQuote for USDT volume instead of d[5]
          color: parseFloat(d[4]) >= parseFloat(d[1]) ? "rgba(16, 185, 129, 0.4)" : "rgba(244, 63, 94, 0.4)"
        }));

        candleSeriesRef.current?.setData(candleData);
        volumeSeriesRef.current?.setData(vData);

        const ema50Values = calculateEMA(closes, 50);
        const ema50Data = sortedData.map((d: any, idx) => ({
          time: parseInt(d[0]) / 1000 as Time,
          value: ema50Values[idx]
        })).filter(r => r.value !== null);
        ema50SeriesRef.current?.setData(ema50Data);

        const ema200Values = calculateEMA(closes, 200);
        const ema200Data = sortedData.map((d: any, idx) => ({
          time: parseInt(d[0]) / 1000 as Time,
          value: ema200Values[idx]
        })).filter(r => r.value !== null);
        ema200SeriesRef.current?.setData(ema200Data);

        const rsiValues = calculateRSI(closes, rsiPeriod);
        const rData = sortedData.map((d: any, idx) => ({
          time: parseInt(d[0]) / 1000 as Time,
          value: rsiValues[idx] !== null ? rsiValues[idx] : 50
        })).filter(r => r.value !== null);

        if (rData.length > 0) {
          const lastRsi = rData[rData.length - 1].value;
          if (lastRsi >= rsiOverbought) {
            setFlashStatus("red");
          } else if (lastRsi <= rsiOversold) {
            setFlashStatus("green");
          } else {
            setFlashStatus("none");
          }
        }

        rsiSeriesRef.current?.setData(rData);

        if (rsiSeriesRef.current) {
          if (!rsiLinesRef.current) {
            rsiLinesRef.current = {
              ob: rsiSeriesRef.current.createPriceLine({
                price: rsiOverbought,
                color: 'rgba(244, 63, 94, 0.5)',
                lineStyle: LineStyle.Dashed,
                lineWidth: 1,
                axisLabelVisible: false,
              }),
              os: rsiSeriesRef.current.createPriceLine({
                price: rsiOversold,
                color: 'rgba(16, 185, 129, 0.5)',
                lineStyle: LineStyle.Dashed,
                lineWidth: 1,
                axisLabelVisible: false,
              })
            };
          } else {
            rsiLinesRef.current.ob.applyOptions({ price: rsiOverbought });
            rsiLinesRef.current.os.applyOptions({ price: rsiOversold });
          }
        }

        // Zoom to latest 96 candles on first load for this symbol
        if (!userInteractedRef.current && chartRef.current && candleData.length > 0) {
          chartRef.current.timeScale().setVisibleLogicalRange({
            from: Math.max(0, candleData.length - 96),
            to: candleData.length - 1
          });
        }

        // Update latest price/vol
        if (candleData.length > 0) {
          setPrice(candleData[candleData.length - 1].close);
        }

        const last96Data = sortedData.slice(-96);
        if (last96Data.length > 0 && candleSeriesRef.current) {
          let totalVol = 0;
          let sumVolHigh = 0;
          let sumVolLow = 0;
          last96Data.forEach((d: any) => {
             const vol = parseFloat(d[7]) || 0; // Use volCcyQuote
             totalVol += vol;
             sumVolHigh += parseFloat(d[2]) * vol;
             sumVolLow += parseFloat(d[3]) * vol;
          });
          
          const maxH = totalVol > 0 ? sumVolHigh / totalVol : Math.max(...last96Data.map((d: any) => parseFloat(d[2])));
          const minL = totalVol > 0 ? sumVolLow / totalVol : Math.min(...last96Data.map((d: any) => parseFloat(d[3])));

          if (!srLinesRef.current) {
            srLinesRef.current = {
              resistance: candleSeriesRef.current.createPriceLine({
                price: maxH,
                color: "#f43f5e",
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: "阻",
              }),
              support: candleSeriesRef.current.createPriceLine({
                price: minL,
                color: "#10b981",
                lineWidth: 1,
                lineStyle: LineStyle.Solid,
                axisLabelVisible: true,
                title: "撑",
              }),
            };
          } else {
            srLinesRef.current.resistance.applyOptions({ price: maxH });
            srLinesRef.current.support.applyOptions({ price: minL });
          }
        }
      } catch (err) {
        console.error("Failed to fetch K-lines for", symbol, err);
      }
    };

    fetchCandles();
    const intervalTime = isMaximized ? 1000 : 5000;
    const interval = setInterval(fetchCandles, intervalTime); // 1s poll for max, 5s for grid

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [symbol, timeframe, rsiPeriod, rsiOverbought, rsiOversold, isMaximized]);

  const handleTrade = async (side: "buy" | "sell", posSide: "long" | "short") => {
    const amountUsdt = tradeConfig.amount;
    if (!price) {
      addLog(`无法获取当前价格，暂不能下单: ${symbol}`, "error");
      return;
    }

    const instInfo = instruments[symbol];
    if (!instInfo) {
      addLog(`无法获取合约信息: ${symbol}`, "error");
      return;
    }

    // 计算开单张数
    const notional = amountUsdt * tradeConfig.leverage;
    const contractValueUsdt = price * instInfo.ctVal * instInfo.ctMult;
    const rawSz = notional / contractValueUsdt;
    
    const lotPrecision = Math.max(0, -Math.floor(Math.log10(instInfo.lotSz)));
    const sz = Number((Math.floor(rawSz / instInfo.lotSz) * instInfo.lotSz).toFixed(lotPrecision));

    if (sz < instInfo.lotSz) {
      addLog(`单次投入 ${amountUsdt} USDT (杠杆 ${tradeConfig.leverage}x) 不足 ${instInfo.lotSz} 张 ${symbol} 合约。每张合约价值约为 ${contractValueUsdt.toFixed(2)} USDT。`, "error");
      return;
    }

    try {
      // 1. Setup leverage
      try {
        await okxPrivateFetch(apiConfig, "POST", "/api/v5/account/set-leverage", {
          instId: symbol,
          lever: tradeConfig.leverage.toString(),
          mgnMode: tradeConfig.marginMode || "cross",
          posSide,
        });
      } catch (err: any) {
        // Just log if this fails, as OKX will return an error if leverage is unchanged
        // addLog(`设置杠杆提示: ${err.message}`, "info");
      }

      const payload: any = {
        instId: symbol,
        tdMode: tradeConfig.marginMode || "cross",
        side,
        posSide,
        ordType: "market",
        sz: sz.toString()
      };

      const tickPrecision = Math.max(0, -Math.floor(Math.log10(instInfo.tickSz)));
      const roundToTick = (val: number) => Number((Math.round(val / instInfo.tickSz) * instInfo.tickSz).toFixed(tickPrecision));

      if (tradeConfig.tpPercent && tradeConfig.tpPercent > 0) {
        let tpTrigger = side === "buy" ? price * (1 + tradeConfig.tpPercent / 100) : price * (1 - tradeConfig.tpPercent / 100);
        let attachAlgo: any = {
          tpTriggerPx: roundToTick(tpTrigger).toString(),
          tpOrdPx: "-1",
          tpTriggerPxType: "last"
        };
        payload.attachAlgoOrds = [attachAlgo];
      }

      if (tradeConfig.slPercent && tradeConfig.slPercent > 0) {
        let slTrigger = side === "buy" ? price * (1 - tradeConfig.slPercent / 100) : price * (1 + tradeConfig.slPercent / 100);
        let slAlgo = {
          slTriggerPx: roundToTick(slTrigger).toString(),
          slOrdPx: "-1",
          slTriggerPxType: "last"
        };
        
        if (payload.attachAlgoOrds && payload.attachAlgoOrds.length > 0) {
           Object.assign(payload.attachAlgoOrds[0], slAlgo);
        } else {
           payload.attachAlgoOrds = [slAlgo];
        }
      }

      addLog(`正在市价 ${side === "buy" ? "开多" : "开空"} ${sz}张 ${symbol}...`, "info");
      const res = await okxPrivateFetch(apiConfig, "POST", "/api/v5/trade/order", payload);
      console.log("Order response:", res);
      
      const configInfo = `(TP:${tradeConfig.tpPercent || 0}% SL:${tradeConfig.slPercent || 0}%)`;
      addLog(`下单成功: ${symbol} ${posSide} ${sz}张 ${tradeConfig.tpPercent || tradeConfig.slPercent ? configInfo : ""}`, "success");
      triggerRefresh();
    } catch (err: any) {
      addLog(`下单失败 ${symbol}: ${err.message}`, "error");
    }
  };

  const filteredInstruments = (Object.values(instruments) as InstrumentInfo[])
    .filter(i => i.instId.endsWith("-USDT-SWAP") && i.instId.toUpperCase().includes(searchText.toUpperCase()))
    .sort((a, b) => a.instId.localeCompare(b.instId));

  const containerClasses = `bg-[#161a1e] border border-[#2b2f36] rounded-lg p-2 flex flex-col h-full min-h-0 transition-all duration-300 ${
    flashStatus === "red" ? "animate-flash-red" : flashStatus === "green" ? "animate-flash-green" : ""
  } ${className}`;

  return (
    <div className={containerClasses}>
      {/* Header - Config */}
      <div className="flex justify-between items-center mb-1 shrink-0 relative">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => !isFrozen && setDropdownOpen(!dropdownOpen)}
              disabled={isFrozen}
              className={`bg-transparent text-xs font-bold focus:outline-none px-1 rounded uppercase text-[#e0e3e7] flex items-center gap-1 ${isFrozen ? "opacity-50 cursor-not-allowed" : "hover:bg-[#1e2329] cursor-pointer"}`}
            >
              {symbol.replace("-SWAP", "")}
              <ChevronDown size={14} />
            </button>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)}></div>
                <div className="absolute top-full left-0 mt-2 w-[160px] max-h-[250px] bg-[#1e2329] border border-[#2b2f36] rounded shadow-lg z-50 flex flex-col overflow-hidden">
                  <input
                    autoFocus
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    placeholder="搜索..."
                    className="w-full bg-transparent border-b border-[#2b2f36] p-2 text-xs text-white outline-none"
                  />
                  <div className="overflow-y-auto flex-1">
                    {filteredInstruments.length > 0 ? (
                      filteredInstruments.map((inst) => (
                        <div
                          key={inst.instId}
                          onClick={() => {
                            setSymbol(inst.instId);
                            setInputSymbol(inst.instId);
                            setDropdownOpen(false);
                            setSearchText("");
                          }}
                          className={`p-2 text-xs cursor-pointer hover:bg-[#2b2f36] ${symbol === inst.instId ? "text-white font-bold bg-[#2b2f36]" : "text-gray-400"}`}
                        >
                          {inst.instId.replace("-SWAP", "")}
                        </div>
                      ))
                    ) : (
                      <div className="p-2 text-xs text-gray-500">
                        {Object.keys(instruments).length === 0 ? "加载中..." : "无结果"}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {isMaximized && (
            <>
              <div className="flex items-center gap-1 ml-2 bg-[#1e2329] rounded p-[2px]">
                 {["15m", "1H", "4H", "1D"].map(tf => (
                   <button
                     key={tf}
                     onClick={() => setTimeframe(tf)}
                     className={`text-[10px] px-2 py-[2px] rounded ${timeframe === tf ? "bg-[#3b82f6] text-white" : "text-gray-400 hover:text-white"}`}
                   >
                     {tf}
                   </button>
                 ))}
              </div>
              <div className="flex items-center gap-2 ml-4">
                <label className="flex items-center gap-1 text-[10px] text-[#eab308] cursor-pointer">
                  <input type="checkbox" checked={showEma50} onChange={e => setShowEma50(e.target.checked)} className="accent-[#eab308]" />
                  EMA50
                </label>
                <label className="flex items-center gap-1 text-[10px] text-[#3b82f6] cursor-pointer">
                  <input type="checkbox" checked={showEma200} onChange={e => setShowEma200(e.target.checked)} className="accent-[#3b82f6]" />
                  EMA200
                </label>
                {candleCountdown && (
                  <span className="text-[10px] font-mono text-[#f0b90b] ml-2">倒计时: {candleCountdown}</span>
                )}
              </div>
            </>
          )}
          
          <div className="flex items-center gap-1 ml-2">
            <span className="text-[10px] text-gray-500">RSI:</span>
            <input type="number" min={6} max={20} value={rsiPeriod} onChange={(e) => setRsiPeriod(Number(e.target.value) || 14)} disabled={isFrozen} className={`w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-gray-300 outline-none focus:border-[#474d57] ${isFrozen ? "opacity-50 cursor-not-allowed" : ""}`} title="周期 (6-20)" />
            <span className="text-[10px] text-gray-500 ml-1">超买:</span>
            <input type="number" min={65} max={85} value={rsiOverbought} onChange={(e) => setRsiOverbought(Number(e.target.value) || 70)} disabled={isFrozen} className={`w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-[#f43f5e] outline-none focus:border-[#474d57] ${isFrozen ? "opacity-50 cursor-not-allowed" : ""}`} title="超买 (65-85)" />
            <span className="text-[10px] text-gray-500 ml-1">超卖:</span>
            <input type="number" min={15} max={35} value={rsiOversold} onChange={(e) => setRsiOversold(Number(e.target.value) || 30)} disabled={isFrozen} className={`w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-[#10b981] outline-none focus:border-[#474d57] ${isFrozen ? "opacity-50 cursor-not-allowed" : ""}`} title="超卖 (15-35)" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-mono ${price && price > 0 ? "text-[#00b07c]" : "text-gray-400"}`}>{price ? (instruments[symbol]?.tickSz ? price.toFixed(Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz)))) : price.toFixed(4)) : "---"}</span>
          <button 
            onClick={onToggleMaximize}
            className="text-gray-500 hover:text-white p-1 rounded hover:bg-[#2b2f36] transition-colors ml-1"
            title={isMaximized ? "还原" : "最大化"}
          >
            {isMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="flex-1 bg-[#0b0e11] rounded flex flex-col overflow-hidden relative min-h-0">
        <div className="absolute top-1 left-2 z-10 text-[10px] space-x-2 text-gray-300 pointer-events-none flex flex-wrap max-w-full">
          {crosshairInfo && crosshairInfo.close !== undefined && (
            <>
              <span className="text-gray-400">{new Date(crosshairInfo.time * 1000).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>开: <span className="font-mono text-white">{crosshairInfo.open?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>高: <span className="font-mono text-[#10b981]">{crosshairInfo.high?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>低: <span className="font-mono text-[#f43f5e]">{crosshairInfo.low?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>收: <span className="font-mono text-white">{crosshairInfo.close?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>量: <span className="font-mono text-white">{crosshairInfo.vol >= 1e6 ? (crosshairInfo.vol / 1e6).toFixed(2) + 'M' : crosshairInfo.vol >= 1e3 ? (crosshairInfo.vol / 1e3).toFixed(2) + 'K' : crosshairInfo.vol?.toFixed(2)}</span></span>
              {crosshairInfo.rsi !== undefined && crosshairInfo.rsi !== null && <span>RSI: <span className="font-mono text-[#a855f7]">{crosshairInfo.rsi?.toFixed(2)}</span></span>}
            </>
          )}
        </div>
        <div className="flex-1 relative w-full h-full" ref={chartContainerRef}></div>
      </div>

      {/* Footer - Trading */}
      <div className="grid grid-cols-2 gap-1 mt-2 shrink-0">
        <button disabled={isFrozen} onClick={() => handleTrade("buy", "long")} className={`py-1 rounded text-[10px] font-bold transition-colors ${isFrozen ? "bg-[#1e2329] text-gray-600 cursor-not-allowed" : "bg-[#00b07c]/20 text-[#00b07c] border border-[#00b07c]/40 hover:bg-[#00b07c]/30"}`}>
          开多
        </button>
        <button disabled={isFrozen} onClick={() => handleTrade("sell", "short")} className={`py-1 rounded text-[10px] font-bold transition-colors ${isFrozen ? "bg-[#1e2329] text-gray-600 cursor-not-allowed" : "bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/40 hover:bg-[#f6465d]/30"}`}>
          开空
        </button>
      </div>
    </div>
  );
}
