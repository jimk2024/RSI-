import React, { useState, useEffect } from "react";
import { Activity, Loader2, TrendingUp, TrendingDown, Clock, BarChart2, Scale, Percent } from "lucide-react";
import { useAppContext } from "../AppContext";
import { okxPublicFetch } from "../lib/api";

interface SymbolData {
  lastPrice: string;
  open24h: string;
  change24hPx: string;
  change24hPct: string;
  high24h: string;
  low24h: string;
  volCcy24h: string;
  fundingRate: string;
  nextFundingTime: string;
  oiCcy: string;
  longShortRatio: string;
  buyVolRatio: number;
}

export function SymbolDataPanel() {
  const { activeMainSymbol } = useAppContext();
  const [data, setData] = useState<SymbolData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const symbol = activeMainSymbol;
        const ccy = symbol.split("-")[0];

        const [tickerRes, fundingRes, oiRes, lsRes, depthRes] = await Promise.all([
          okxPublicFetch(`/api/v5/market/ticker?instId=${symbol}`),
          okxPublicFetch(`/api/v5/public/funding-rate?instId=${symbol}`),
          okxPublicFetch(`/api/v5/public/open-interest?instType=SWAP&instId=${symbol}`),
          okxPublicFetch(`/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=${ccy}`),
          okxPublicFetch(`/api/v5/market/books?instId=${symbol}&sz=20`),
        ]);

        if (active) {
          const ticker = tickerRes?.[0] || {};
          const funding = fundingRes?.[0] || {};
          const oi = oiRes?.[0] || {};
          const lsData = Array.isArray(lsRes) && lsRes.length > 0 ? lsRes[0] || [] : [];
          const depth = Array.isArray(depthRes) ? depthRes[0] : null;

          const lastPx = parseFloat(ticker.last || "0");
          const open24h = parseFloat(ticker.open24h || "0");
          const deltaPx = lastPx - open24h;
          const deltaPct = open24h > 0 ? (deltaPx / open24h) * 100 : 0;

          let lsRatio = "N/A";
          if (lsData && lsData.length >= 2) {
             lsRatio = lsData[1];
          }

          let buyVolRatio = 50;
          if (depth && depth.bids && depth.asks) {
            const bidVol = depth.bids.reduce((acc: number, curr: any[]) => acc + parseFloat(curr[1]), 0);
            const askVol = depth.asks.reduce((acc: number, curr: any[]) => acc + parseFloat(curr[1]), 0);
            const totalVol = bidVol + askVol;
            if (totalVol > 0) {
              buyVolRatio = (bidVol / totalVol) * 100;
            }
          }

          setData({
            lastPrice: ticker.last || "0",
            open24h: ticker.open24h || "0",
            change24hPx: deltaPx.toString(),
            change24hPct: deltaPct.toString(),
            high24h: ticker.high24h || "0",
            low24h: ticker.low24h || "0",
            volCcy24h: ticker.volCcy24h || "0",
            fundingRate: funding.fundingRate || "0",
            nextFundingTime: funding.nextFundingTime || "0",
            oiCcy: oi.oiCcy || "0",
            longShortRatio: lsRatio,
            buyVolRatio: buyVolRatio,
          });
        }
      } catch (err) {
        console.error("Failed to fetch symbol data", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [activeMainSymbol]);

  const formatNumber = (numStr: string | number, decimals: number = 2) => {
    const num = typeof numStr === 'string' ? parseFloat(numStr) : numStr;
    if (isNaN(num)) return "0.00";
    if (num > 1000000000) return (num / 1000000000).toFixed(decimals) + "B";
    if (num > 1000000) return (num / 1000000).toFixed(decimals) + "M";
    if (num > 1000) return (num / 1000).toFixed(decimals) + "K";
    return num.toFixed(decimals);
  };

  const formatPercent = (numStr: string | number, multiplier: number = 100) => {
    const num = typeof numStr === 'string' ? parseFloat(numStr) : numStr;
    if (isNaN(num)) return "0.00%";
    const val = num * multiplier;
    return (val > 0 ? "+" : "") + val.toFixed(4) + "%";
  };

  const getTimeToFunding = (timestamp: string) => {
    const target = parseInt(timestamp);
    if (isNaN(target)) return "--:--:--";
    const now = Date.now();
    const diff = target - now;
    if (diff <= 0) return "00:00:00";
    
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getFundingRateColor = (rateStr: string) => {
    const rate = parseFloat(rateStr);
    if (rate > 0.0001) return "text-red-400";
    if (rate < -0.0001) return "text-green-400";
    return "text-gray-300";
  };

  return (
    <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 flex flex-col gap-3 min-h-[200px] overflow-hidden">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <div className="w-2 h-5 bg-[#f59e0b] rounded-full"></div>
        <h2 className="text-sm font-bold tracking-wider flex items-center justify-between w-full">
          <span className="flex items-center gap-2">
             市场情绪数据
          </span>
          <span className="text-xs font-mono text-gray-500 bg-[#1e2329] px-2 py-0.5 rounded border border-[#2b2f36] shadow-sm">{activeMainSymbol.replace("-SWAP", "")}</span>
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1 modern-scrollbar flex flex-col justify-start pb-2">
        {loading && !data ? (
          <div className="flex justify-center items-center h-full text-[#f59e0b]">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : data ? (
          <>
            <div className="bg-[#1e2329] rounded p-3 flex flex-col gap-2 relative overflow-hidden border border-[#2b2f36] shadow-inner">
               <div className="flex justify-between items-start">
                 <div className="flex flex-col">
                   <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider mb-1">最新价</span>
                   <span className={`text-xl font-mono block font-bold ${parseFloat(data.change24hPct) >= 0 ? "text-green-400" : "text-red-400"}`}>
                     {formatNumber(data.lastPrice, parseFloat(data.lastPrice) < 1 ? 4 : 2)}
                   </span>
                 </div>
                 <div className="flex flex-col items-end text-right">
                   <span className="text-[10px] text-gray-400 flex items-center gap-1 uppercase tracking-wider mb-1">24H 涨跌</span>
                   <span className={`text-sm font-mono font-bold ${parseFloat(data.change24hPct) >= 0 ? "text-green-400" : "text-red-400"}`}>
                     {parseFloat(data.change24hPct) > 0 ? "+" : ""}{parseFloat(data.change24hPct).toFixed(2)}%
                   </span>
                 </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div className="bg-[#1e2329] border border-[#2b2f36] rounded p-2 flex flex-col gap-1 transition-colors hover:bg-[#252a32]">
                 <span className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingUp size={12} className="text-gray-500"/>资金费率</span>
                 <span className={`text-sm font-mono font-bold ${getFundingRateColor(data.fundingRate)}`}>
                   {formatPercent(data.fundingRate, 100)}
                 </span>
                 <span className="text-[9px] text-gray-500 flex items-center gap-1 font-mono mt-0.5">
                   <Clock size={10} /> {getTimeToFunding(data.nextFundingTime)}
                 </span>
               </div>
               
               <div className="bg-[#1e2329] border border-[#2b2f36] rounded p-2 flex flex-col gap-1 transition-colors hover:bg-[#252a32]">
                 <span className="text-[10px] text-gray-400 flex items-center gap-1"><Scale size={12} className="text-gray-500"/>多空持仓比</span>
                 <span className={`text-sm font-mono font-bold ${parseFloat(data.longShortRatio) > 1 ? "text-green-400" : "text-red-400"}`}>
                   {data.longShortRatio !== "N/A" ? parseFloat(data.longShortRatio).toFixed(2) : "N/A"}
                 </span>
                 <span className="text-[9px] text-gray-500 flex items-center gap-1 mt-0.5">
                   大户多空账户比例
                 </span>
               </div>
            </div>

            <div className="bg-[#1e2329] border border-[#2b2f36] rounded p-2 px-3 flex flex-col gap-2">
               <span className="text-[10px] text-gray-400 flex items-center justify-between">
                  <span className="flex items-center gap-1"><BarChart2 size={12}/>盘口动量 (Top 20)</span>
                  <span className="font-mono">{data.buyVolRatio.toFixed(1)}% / {(100 - data.buyVolRatio).toFixed(1)}%</span>
               </span>
               <div className="w-full bg-[#161a1e] h-2 rounded-full overflow-hidden flex shadow-inner">
                  <div className="bg-green-500 h-full transition-all duration-500 ease-out" style={{ width: `${data.buyVolRatio}%` }}></div>
                  <div className="bg-red-500 h-full transition-all duration-500 ease-out" style={{ width: `${100 - data.buyVolRatio}%` }}></div>
               </div>
               <div className="flex justify-between text-[9px] text-gray-500 mt-0.5 font-mono">
                 <span>买盘较强</span>
                 <span>卖盘较强</span>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-1">
               <div className="bg-[#1e2329] border border-[#2b2f36] rounded p-2 flex flex-col gap-0.5">
                 <span className="text-[10px] text-gray-400">24H 成交额</span>
                 <span className="text-sm font-mono font-bold text-gray-200">
                   {formatNumber(data.volCcy24h)} <span className="text-[9px] font-normal text-gray-500">{activeMainSymbol.split("-")[0]}</span>
                 </span>
               </div>
               
               <div className="bg-[#1e2329] border border-[#2b2f36] rounded p-2 flex flex-col gap-0.5">
                 <span className="text-[10px] text-gray-400">未平仓合约 (OI)</span>
                 <span className="text-sm font-mono font-bold text-blue-400">
                   {formatNumber(data.oiCcy)} <span className="text-[9px] font-normal text-gray-500">USDT</span>
                 </span>
               </div>
            </div>
            
            <div className="bg-[#1e2329] border border-[#2b2f36] rounded px-3 py-2 flex flex-row items-center justify-between">
               <span className="text-[10px] text-gray-400">24H 振幅区间</span>
               <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-red-400">{formatNumber(data.low24h, parseFloat(data.low24h) < 1 ? 4 : 2)}</span>
                  <div className="w-8 h-[1px] bg-gray-600"></div>
                  <span className="text-xs font-mono text-green-400">{formatNumber(data.high24h, parseFloat(data.high24h) < 1 ? 4 : 2)}</span>
               </div>
            </div>

          </>
        ) : (
          <div className="text-xs text-gray-500 text-center py-4">无数据</div>
        )}
      </div>
    </div>
  );
}
