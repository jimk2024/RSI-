import React, { useEffect, useState } from "react";
import { useAppContext } from "../AppContext";
import { okxPrivateFetch } from "../lib/api";
import { RefreshCw } from "lucide-react";

interface Position {
  instId: string;
  posSide: string;
  pos: string;
  avgPx: string;
  upl: string;
  uplRatio: string;
  markPx: string;
  mgnMode: string;
}

interface Order {
  instId: string;
  ordId: string;
  side: string;
  posSide: string;
  sz: string;
  state: string;
  cTime: string;
  isAlgo?: boolean;
  ordType?: string;
}

export function PositionsPanel() {
  const { apiConfig, refreshTrigger, addLog, triggerRefresh, positions, orders, isFetchingPosOrd, setOverrideChartSymbol } = useAppContext();
  const loading = isFetchingPosOrd;

  const closePosition = async (pos: Position) => {
    try {
      addLog(`正在平仓 ${pos.instId}...`, "info");
      await okxPrivateFetch(apiConfig, "POST", "/api/v5/trade/close-position", {
        instId: pos.instId,
        posSide: pos.posSide,
        mgnMode: pos.mgnMode || "cross",
      });
      addLog(`平仓成功: ${pos.instId} ${pos.posSide}`, "success");
      // Trigger refresh handled by AppContext ideally, but we'll wait for next poll or dispatch
    } catch (err: any) {
      addLog(`平仓失败 ${pos.instId}: ${err.message}`, "error");
    }
  };

  const cancelOrder = async (ord: Order) => {
    try {
      addLog(`正在撤单 ${ord.instId}...`, "info");
      if (ord.isAlgo) {
         await okxPrivateFetch(apiConfig, "POST", "/api/v5/trade/cancel-algos", [{
           instId: ord.instId,
           algoId: ord.ordId,
         }]);
      } else {
         await okxPrivateFetch(apiConfig, "POST", "/api/v5/trade/cancel-order", {
           instId: ord.instId,
           ordId: ord.ordId,
         });
      }
      addLog(`撤单成功: ${ord.instId}`, "success");
    } catch (err: any) {
      addLog(`撤单失败 ${ord.instId}: ${err.message}`, "error");
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Positions */}
      <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex border-b border-[#2b2f36] shrink-0">
          <button className="flex-1 py-1.5 text-xs font-bold border-b-2 border-[#f0b90b] text-[#f0b90b] flex items-center justify-center gap-1">
            当前持仓 <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {positions.length === 0 ? (
            <div className="text-gray-500 text-xs text-center p-4">无持仓</div>
          ) : (
            <div className="flex flex-col gap-2">
              {positions.map((pos, idx) => {
                const isLong = pos.posSide === "long";
                const pnlClass = parseFloat(pos.upl) >= 0 ? "text-[#00b07c]" : "text-[#f6465d]";
                const borderColorClass = isLong ? "border-[#00b07c]" : "border-[#f6465d]";
                return (
                  <div 
                    key={idx} 
                    onClick={() => setOverrideChartSymbol({ id: "chart-0", symbol: pos.instId })}
                    className={`bg-[#1e2329] p-2 rounded border-l-2 ${borderColorClass} text-[10px] cursor-pointer hover:bg-[#2b2f36] transition-colors`}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-200">{pos.instId}</span>
                        <span className={isLong ? 'text-[#00b07c]' : 'text-[#f6465d]'}>
                          {isLong ? "多" : "空"} {pos.pos}张
                        </span>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          closePosition(pos);
                        }} 
                        className="text-white bg-red-600/80 px-2 py-1 rounded text-[10px] hover:bg-red-500 font-bold transition-colors"
                      >
                        市价平仓
                      </button>
                    </div>
                    <div className="flex justify-between text-gray-400 mb-0.5 mt-2">
                      <span>均价: {parseFloat(pos.avgPx).toFixed(4)}</span>
                      <span>标记: {parseFloat(pos.markPx).toFixed(4)}</span>
                    </div>
                    <div className="flex justify-between items-center text-gray-400 mt-1">
                      <div className="flex items-center gap-2">
                        <span>未实现: <span className={pnlClass}>{parseFloat(pos.upl).toFixed(4)}</span></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Internal order split if we want it here */}
      <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg overflow-hidden flex flex-col min-h-0">
        <div className="flex border-b border-[#2b2f36] shrink-0">
          <button className="flex-1 py-1.5 text-xs text-gray-500 flex items-center justify-center gap-1">
            当前委托 <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {orders.length === 0 ? (
             <div className="text-gray-500 text-xs text-center p-4">无委托</div>
          ) : (
            <div className="flex flex-col gap-2">
               {orders.map((ord, idx) => {
                 let typeLabel = "";
                 if (ord.isAlgo) {
                   if (ord.ordType === "tp") typeLabel = "[止盈]";
                   else if (ord.ordType === "sl") typeLabel = "[止损]";
                   else typeLabel = "[条件单]";
                 }
                 const actionLabel = ord.side === "buy" ? "买入" : "卖出";
                 const posLabel = ord.posSide === "long" ? "多" : ord.posSide === "short" ? "空" : "";
                 
                 return (
                   <div key={idx} className="bg-[#1e2329] p-2 rounded border border-[#2b2f36] text-[10px]">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-gray-200">
                          {ord.instId} <span className="text-gray-400 font-normal">{typeLabel}</span>
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={ord.side === "buy" ? "text-[#00b07c]" : "text-[#f6465d]"}>
                             {actionLabel} {posLabel}
                          </span>
                          <button onClick={() => cancelOrder(ord)} className="text-white bg-red-600/80 px-2 py-1 rounded text-[10px] hover:bg-red-500 font-bold transition-colors">
                            撤单
                          </button>
                        </div>
                      </div>
                      <div className="text-gray-400 mt-1 flex justify-between">
                         <span>数量: {ord.sz}</span>
                         {ord.isAlgo && (
                           <span className="text-gray-500">
                             {ord.tpTriggerPx && `盈:${parseFloat(ord.tpTriggerPx).toFixed(4)} `}
                             {ord.slTriggerPx && `损:${parseFloat(ord.slTriggerPx).toFixed(4)}`}
                           </span>
                         )}
                         {!ord.isAlgo && ord.px && (
                           <span className="text-gray-500">价格: {ord.px}</span>
                         )}
                      </div>
                   </div>
                 );
               })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
