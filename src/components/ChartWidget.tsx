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
  const [latestRsiValues, setLatestRsiValues] = useState<{ rsi15m: number; rsi1h: number; rsi4h: number } | null>(null);
  
  const [timeframe, setTimeframe] = useState("15m");
  const [showEma50, setShowEma50] = useState(false);
  const [showEma200, setShowEma200] = useState(false);
  
  const [candleCountdown, setCandleCountdown] = useState("");
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchText, setSearchText] = useState("");

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

  // Try to use ref to hold chart state instead of React state to avoid re-render loops
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ema200SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsi15mSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsi1hSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const rsi4hSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const srLinesRef = useRef<{ support: IPriceLine; resistance: IPriceLine } | null>(null);
  const rsiLinesRef = useRef<{ ob: IPriceLine; os: IPriceLine } | null>(null);
  const posLinesRef = useRef<IPriceLine[]>([]);
  const userInteractedRef = useRef(false);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const formatters = {
      year: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric' }),
      month: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', month: 'short' }),
      day: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', day: 'numeric' }),
      time: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', hour12: false }),
      timeWithSeconds: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }),
      full: new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
    };

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "transparent" },
        textColor: "#94a3b8",
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      localization: {
        timeFormatter: (time: Time) => {
          return formatters.full.format(new Date((time as number) * 1000));
        },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        tickMarkFormatter: (time: Time, tickMarkType: TickMarkType, locale: string) => {
          const date = new Date((time as number) * 1000);
          switch(tickMarkType) {
            case TickMarkType.Year: return formatters.year.format(date);
            case TickMarkType.Month: return formatters.month.format(date);
            case TickMarkType.DayOfMonth: return formatters.day.format(date);
            case TickMarkType.Time: return formatters.time.format(date);
            default: return formatters.timeWithSeconds.format(date);
          }
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

    const rsi15mSeries = chart.addLineSeries({
      color: "#38bdf8", // Sky blue for 15M
      lineWidth: 2,
      priceScaleId: "rsi",
      title: "15M",
    });
    rsi15mSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });
    rsi15mSeriesRef.current = rsi15mSeries;

    const rsi1hSeries = chart.addLineSeries({
      color: "#f59e0b", // Amber for 1H
      lineWidth: 2,
      priceScaleId: "rsi",
      title: "1H",
    });
    rsi1hSeriesRef.current = rsi1hSeries;

    const rsi4hSeries = chart.addLineSeries({
      color: "#ec4899", // Pink/Hotpink for 4H
      lineWidth: 2,
      priceScaleId: "rsi",
      title: "4H",
    });
    rsi4hSeriesRef.current = rsi4hSeries;

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
      if (param.time && candleSeriesRef.current && volumeSeriesRef.current && rsi15mSeriesRef.current && rsi1hSeriesRef.current && rsi4hSeriesRef.current) {
        const data = param.seriesData.get(candleSeriesRef.current);
        const volData = param.seriesData.get(volumeSeriesRef.current);
        const rsi15mData = param.seriesData.get(rsi15mSeriesRef.current);
        const rsi1hData = param.seriesData.get(rsi1hSeriesRef.current);
        const rsi4hData = param.seriesData.get(rsi4hSeriesRef.current);
        if (data) {
          setCrosshairInfo({
            time: param.time as number,
            open: (data as any).open,
            high: (data as any).high,
            low: (data as any).low,
            close: (data as any).close,
            vol: (volData as any)?.value,
            rsi15m: (rsi15mData as any)?.value,
            rsi1h: (rsi1hData as any)?.value,
            rsi4h: (rsi4hData as any)?.value
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
        
        // Parallelized fetches for main timeframe, 15m, 1H, 4H to maintain constant synchrony
        const mainPromise = okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=${timeframe}&limit=${limit}`);
        const fetch15m = timeframe === "15m" ? mainPromise : okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=15m&limit=${limit}`);
        const fetch1h  = timeframe === "1H"  ? mainPromise : okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=1H&limit=${limit}`);
        const fetch4h  = timeframe === "4H"  ? mainPromise : okxPublicFetch(`/api/v5/market/candles?instId=${symbol}&bar=4H&limit=${limit}`);

        const [mainData, data15m, data1h, data4h] = await Promise.all([
          mainPromise,
          fetch15m,
          fetch1h,
          fetch4h
        ]);

        if (!active || !mainData) return;

        // OKX format: [ts, o, h, l, c, vol, volCcy, volCcyQuote, confirm]
        // Ordered newest first. We need oldest first.
        const sortedData = [...mainData].reverse();

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

        // RSI 15M, 1H, 4H Calculations and Timeframe Synchronization
        let r15mData: { time: Time, value: number }[] = [];
        if (data15m && data15m.length > 0) {
          const sorted15m = [...data15m].reverse();
          const closes15m = sorted15m.map((d: any) => parseFloat(d[4]));
          const rsi15mRaw = calculateRSI(closes15m, rsiPeriod);
          const rawList = sorted15m.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi15mRaw[idx] !== null ? rsi15mRaw[idx] : 50
          }));
          r15mData = mapTimeframeRsiToMain(candleData, rawList);
        }

        let r1hData: { time: Time, value: number }[] = [];
        if (data1h && data1h.length > 0) {
          const sorted1h = [...data1h].reverse();
          const closes1h = sorted1h.map((d: any) => parseFloat(d[4]));
          const rsi1hRaw = calculateRSI(closes1h, rsiPeriod);
          const rawList = sorted1h.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi1hRaw[idx] !== null ? rsi1hRaw[idx] : 50
          }));
          r1hData = mapTimeframeRsiToMain(candleData, rawList);
        }

        let r4hData: { time: Time, value: number }[] = [];
        if (data4h && data4h.length > 0) {
          const sorted4h = [...data4h].reverse();
          const closes4h = sorted4h.map((d: any) => parseFloat(d[4]));
          const rsi4hRaw = calculateRSI(closes4h, rsiPeriod);
          const rawList = sorted4h.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi4hRaw[idx] !== null ? rsi4hRaw[idx] : 50
          }));
          r4hData = mapTimeframeRsiToMain(candleData, rawList);
        }

        rsi15mSeriesRef.current?.setData(r15mData);
        rsi1hSeriesRef.current?.setData(r1hData);
        rsi4hSeriesRef.current?.setData(r4hData);

        // Evaluate the breakout signal strictly on the ultra-precise 15-minute timeframe resolution (execution timeline)
        const signalTimes = new Set<number>();
        const bottomSignalTimes = new Set<number>();
        if (data15m && data15m.length > 0 && data1h && data1h.length > 0 && data4h && data4h.length > 0) {
          const sorted15mBase = [...data15m].reverse();
          const closes15mBase = sorted15mBase.map((d: any) => parseFloat(d[4]));
          const baseCandle15mData = sorted15mBase.map((d: any) => ({
            time: parseInt(d[0]) / 1000 as Time,
            open: parseFloat(d[1]),
            high: parseFloat(d[2]),
            low: parseFloat(d[3]),
            close: parseFloat(d[4]),
            volume: parseFloat(d[5])
          }));

          const rsi15mBaseRaw = calculateRSI(closes15mBase, rsiPeriod);
          const ema20BaseList = calculateEMA(closes15mBase, 20);
          const r15mListBase = sorted15mBase.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi15mBaseRaw[idx] !== null ? rsi15mBaseRaw[idx] : 50
          }));

          const sorted1hBase = [...data1h].reverse();
          const closes1hBase = sorted1hBase.map((d: any) => parseFloat(d[4]));
          const rsi1hBaseRaw = calculateRSI(closes1hBase, rsiPeriod);
          const r1hListBaseRaw = sorted1hBase.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi1hBaseRaw[idx] !== null ? rsi1hBaseRaw[idx] : 50
          }));
          const r1hDataOn15m = mapTimeframeRsiToMain(baseCandle15mData, r1hListBaseRaw);

          const sorted4hBase = [...data4h].reverse();
          const closes4hBase = sorted4hBase.map((d: any) => parseFloat(d[4]));
          const rsi4hBaseRaw = calculateRSI(closes4hBase, rsiPeriod);
          const r4hListBaseRaw = sorted4hBase.map((d: any, idx) => ({
            timeSec: parseInt(d[0]) / 1000,
            value: rsi4hBaseRaw[idx] !== null ? rsi4hBaseRaw[idx] : 50
          }));
          const r4hDataOn15m = mapTimeframeRsiToMain(baseCandle15mData, r4hListBaseRaw);

          for (let idx = 2; idx < baseCandle15mData.length; idx++) {
            const item15m = r15mListBase[idx];
            const item15mPrev = r15mListBase[idx - 1];
            const item15mPrev2 = r15mListBase[idx - 2];
            const item1h = r1hDataOn15m[idx];
            const item1hPrev = r1hDataOn15m[idx - 1];
            const item4h = r4hDataOn15m[idx];

            if (item15m && item15mPrev && item15mPrev2 && item1h && item1hPrev && item4h) {
              const r15 = item15m.value;
              const r15_prev = item15mPrev.value;
              const r15_prev2 = item15mPrev2.value;
              const r1h = item1h.value;
              const r1h_prev = item1hPrev.value;
              const r4h = item4h.value;

              const is15mBullish = r15 > 55 && r15 > r15_prev && r15_prev > r15_prev2;
              const is15mBottom = r15 > 55 && r15_prev <= 55;
              
              const is1hBullish = r1h > 60 && r1h_prev > 60;
              let has1hBelow30 = false;
              for (let k = Math.max(0, idx - 6); k < idx; k++) {
                if (r1hDataOn15m[k] && r1hDataOn15m[k].value < 30) {
                  has1hBelow30 = true;
                }
              }
              const is1hBottom = r1h > 40 && has1hBelow30 && r1h_prev <= 40;

              let r4h_prev_val = r4h;
              for (let j = idx - 1; j >= 0; j--) {
                if (r4hDataOn15m[j] && r4hDataOn15m[j].value !== r4h) {
                  r4h_prev_val = r4hDataOn15m[j].value;
                  break;
                }
              }
              const is4hBullish = r4h >= 70 && r4h_prev_val < 70;
              const is4hBottom = r4h < 30;

              const validExplosion = is15mBullish && is1hBullish && is4hBullish;
              const validBottomFishing = is15mBottom && is1hBottom && is4hBottom;

              if (validExplosion || validBottomFishing) {
                // Calculate volume surge
                const currentVol = baseCandle15mData[idx].volume;
                let sumVol = 0;
                let count = 0;
                for (let i = Math.max(0, idx - 10); i < idx; i++) {
                  sumVol += baseCandle15mData[i].volume;
                  count++;
                }
                const avgVol = count > 0 ? (sumVol / count) : 0;
                const volSurgeMultiplier = avgVol > 0 ? (currentVol / avgVol) : 1.0;
                
                const ema20Val = ema20BaseList[idx];
                const aboveEma20 = ema20Val !== null && ema20Val !== undefined ? (baseCandle15mData[idx].close >= ema20Val) : true;
                const isBullishCandle = baseCandle15mData[idx].close > baseCandle15mData[idx].open;

                if (validExplosion && isBullishCandle && aboveEma20 && volSurgeMultiplier >= 1.25) {
                  signalTimes.add(baseCandle15mData[idx].time as number);
                } else if (validBottomFishing && isBullishCandle && volSurgeMultiplier >= 1.2) {
                  bottomSignalTimes.add(baseCandle15mData[idx].time as number);
                }
              }
            }
          }
        }

        // Map the evaluated 15M trigger timestamps to the active candle timeframe's candles
        const rsiMarkers: any[] = [];
        const timeframeDurationsSec: Record<string, number> = {
          "15m": 15 * 60,
          "1H": 60 * 60,
          "4H": 4 * 60 * 60,
          "1D": 24 * 60 * 60,
        };
        const durationSec = timeframeDurationsSec[timeframe] || (15 * 60);

        for (let idx = 0; idx < candleData.length; idx++) {
          const mc = candleData[idx];
          const mcTime = mc.time as number;

          let hasExplosion = false;
          for (const sTime of Array.from(signalTimes)) {
            if (sTime >= mcTime && sTime < mcTime + durationSec) {
              hasExplosion = true;
              break;
            }
          }

          let hasBottom = false;
          for (const bTime of Array.from(bottomSignalTimes)) {
            if (bTime >= mcTime && bTime < mcTime + durationSec) {
              hasBottom = true;
              break;
            }
          }

          if (hasExplosion) {
            rsiMarkers.push({
              time: mc.time,
              position: 'belowBar',
              color: '#fbbf24', // Amber / Gold color
              shape: 'arrowUp',
              text: '🚀'
            });
          } else if (hasBottom) {
            rsiMarkers.push({
              time: mc.time,
              position: 'belowBar',
              color: '#34d399', 
              shape: 'arrowUp',
              text: '✅'
            });
          }
        }
        candleSeriesRef.current?.setMarkers(rsiMarkers);

        // Analyze and extract latest values for resonance mapping
        if (r15mData.length > 0 && r1hData.length > 0 && r4hData.length > 0) {
          const l15m = r15mData[r15mData.length - 1].value;
          const l1h = r1hData[r1hData.length - 1].value;
          const l4h = r4hData[r4hData.length - 1].value;
          setLatestRsiValues({ rsi15m: l15m, rsi1h: l1h, rsi4h: l4h });
        }

        // Draw Overbought/Oversold dash limits on rsi15m
        if (rsi15mSeriesRef.current) {
          if (!rsiLinesRef.current) {
            rsiLinesRef.current = {
              ob: rsi15mSeriesRef.current.createPriceLine({
                price: rsiOverbought,
                color: 'rgba(244, 63, 94, 0.5)',
                lineStyle: LineStyle.Dashed,
                lineWidth: 1,
                axisLabelVisible: false,
              }),
              os: rsi15mSeriesRef.current.createPriceLine({
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

  const containerClasses = `bg-[#161a1e] border border-[#2b2f36] rounded-lg p-2 flex flex-col h-full min-h-0 transition-all duration-300 ${className}`;

  return (
    <div className={containerClasses}>
      {/* Header - Config */}
      <div className="flex justify-between items-center mb-1 shrink-0 relative">
        <div className="flex items-center gap-2">
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="bg-transparent text-xs font-bold focus:outline-none px-1 rounded uppercase text-[#e0e3e7] flex items-center gap-1 hover:bg-[#1e2329] cursor-pointer"
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
            <input type="number" min={6} max={20} value={rsiPeriod} onChange={(e) => setRsiPeriod(Number(e.target.value) || 14)} className="w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-gray-300 outline-none focus:border-[#474d57]" title="周期 (6-20)" />
            <span className="text-[10px] text-gray-500 ml-1">超买:</span>
            <input type="number" min={65} max={85} value={rsiOverbought} onChange={(e) => setRsiOverbought(Number(e.target.value) || 70)} className="w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-[#f43f5e] outline-none focus:border-[#474d57]" title="超买 (65-85)" />
            <span className="text-[10px] text-gray-500 ml-1">超卖:</span>
            <input type="number" min={15} max={35} value={rsiOversold} onChange={(e) => setRsiOversold(Number(e.target.value) || 30)} className="w-[30px] bg-[#1e2329] border border-[#2b2f36] rounded text-[10px] py-[2px] text-center text-[#10b981] outline-none focus:border-[#474d57]" title="超卖 (15-35)" />
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
          {crosshairInfo && crosshairInfo.close !== undefined ? (
            <>
              <span className="text-gray-400">{new Date(crosshairInfo.time * 1000).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              <span>开: <span className="font-mono text-white">{crosshairInfo.open?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>高: <span className="font-mono text-[#10b981]">{crosshairInfo.high?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>低: <span className="font-mono text-[#f43f5e]">{crosshairInfo.low?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>收: <span className="font-mono text-white">{crosshairInfo.close?.toFixed(instruments[symbol] ? Math.max(0, -Math.floor(Math.log10(instruments[symbol].tickSz))) : 4)}</span></span>
              <span>量: <span className="font-mono text-white">{crosshairInfo.vol >= 1e6 ? (crosshairInfo.vol / 1e6).toFixed(2) + 'M' : crosshairInfo.vol >= 1e3 ? (crosshairInfo.vol / 1e3).toFixed(2) + 'K' : crosshairInfo.vol?.toFixed(2)}</span></span>
              {crosshairInfo.rsi15m !== undefined && crosshairInfo.rsi15m !== null && <span className="text-[#38bdf8]">15M: <span className="font-mono font-bold">{crosshairInfo.rsi15m?.toFixed(2)}</span></span>}
              {crosshairInfo.rsi1h !== undefined && crosshairInfo.rsi1h !== null && <span className="text-[#f59e0b]">1H: <span className="font-mono font-bold">{crosshairInfo.rsi1h?.toFixed(2)}</span></span>}
              {crosshairInfo.rsi4h !== undefined && crosshairInfo.rsi4h !== null && <span className="text-[#ec4899]">4H: <span className="font-mono font-bold">{crosshairInfo.rsi4h?.toFixed(2)}</span></span>}
            </>
          ) : (
            <>
              <span className="text-gray-400">实时指标</span>
              {latestRsiValues ? (
                <>
                  <span className="ml-1 text-[#38bdf8]">15M: <span className="font-mono font-bold">{latestRsiValues.rsi15m.toFixed(2)}</span></span>
                  <span className="ml-1 text-[#f59e0b]">1H: <span className="font-mono font-bold">{latestRsiValues.rsi1h.toFixed(2)}</span></span>
                  <span className="ml-1 text-[#ec4899]">4H: <span className="font-mono font-bold">{latestRsiValues.rsi4h.toFixed(2)}</span></span>
                </>
              ) : (
                <span className="text-gray-500">计算中...</span>
              )}
            </>
          )}
        </div>

        <div className="flex-1 relative w-full h-full" ref={chartContainerRef}></div>
      </div>

      {/* Footer - Trading */}
      <div className="grid grid-cols-2 gap-1 mt-2 shrink-0">
        <button onClick={() => handleTrade("buy", "long")} className="py-1 rounded text-[10px] font-bold transition-colors bg-[#00b07c]/20 text-[#00b07c] border border-[#00b07c]/40 hover:bg-[#00b07c]/30">
          开多
        </button>
        <button onClick={() => handleTrade("sell", "short")} className="py-1 rounded text-[10px] font-bold transition-colors bg-[#f6465d]/20 text-[#f6465d] border border-[#f6465d]/40 hover:bg-[#f6465d]/30">
          开空
        </button>
      </div>
    </div>
  );
}

// Helper to scale/align other timeframe values with primary candle timeline timestamps
function mapTimeframeRsiToMain(
  mainCandles: { time: Time }[],
  tfList: { timeSec: number; value: number }[]
) {
  if (tfList.length === 0) return [];
  
  const sortedTfList = [...tfList].sort((a, b) => a.timeSec - b.timeSec);
  
  return mainCandles.map(mc => {
    const mainTime = mc.time as number;
    let matchedValue = sortedTfList[0].value;
    
    // Scan ascending for the most recent observation matching mainTime
    for (let i = 0; i < sortedTfList.length; i++) {
      if (sortedTfList[i].timeSec <= mainTime) {
        matchedValue = sortedTfList[i].value;
      } else {
        break;
      }
    }
    
    return {
      time: mc.time,
      value: matchedValue
    };
  });
}
