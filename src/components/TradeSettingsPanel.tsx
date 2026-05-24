import React from "react";
import { useAppContext } from "../AppContext";

export function TradeSettingsPanel() {
  const { tradeConfig, setTradeConfig, addLog } = useAppContext();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTradeConfig({
      ...tradeConfig,
      [name]: value === "" ? "" : parseFloat(value) || 0,
    });
  };

  return (
    <div className="shrink-0 bg-[#161a1e] border border-[#2b2f36] rounded-lg p-4 flex flex-col gap-4 overflow-hidden min-h-0 h-full">
      <div className="flex items-center gap-2 mb-1 shrink-0">
        <div className="w-2 h-5 bg-[#f0b90b] rounded-full"></div>
        <h2 className="text-sm font-bold tracking-wider">交易参数</h2>
      </div>

      <div className="space-y-3 flex-1 flex flex-col justify-between overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase block mb-1">仓位模式</label>
            <select
              name="marginMode"
              value={tradeConfig.marginMode || "cross"}
              onChange={(e) => setTradeConfig({ ...tradeConfig, marginMode: e.target.value as "cross" | "isolated" })}
              className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
            >
              <option value="cross">全仓</option>
              <option value="isolated">逐仓</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase block mb-1">杠杆</label>
            <input
              type="number"
              name="leverage"
              value={tradeConfig.leverage}
              onChange={handleChange}
              className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
            />
          </div>
        </div>

        <div className="flex flex-col">
          <label className="text-[10px] text-gray-500 uppercase block mb-1">单笔保证金 (USDT)</label>
          <input
            type="number"
            name="amount"
            value={tradeConfig.amount}
            onChange={handleChange}
            className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase block mb-1">止盈 (%)</label>
            <input
              type="number"
              name="tpPercent"
              value={tradeConfig.tpPercent}
              onChange={handleChange}
              step="0.5"
              className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
            />
          </div>
          <div className="flex flex-col">
             <label className="text-[10px] text-gray-500 uppercase block mb-1">止损 (%)</label>
             <input
               type="number"
               name="slPercent"
               value={tradeConfig.slPercent}
               onChange={handleChange}
               step="0.5"
               className="w-full bg-[#1e2329] border border-[#474d57] rounded px-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-[#474d57]"
             />
          </div>
        </div>

        <button
          onClick={() => {
            addLog("交易参数已保存", "success");
          }}
          className="w-full bg-[#f0b90b] text-[#1e2329] font-bold py-2 rounded text-xs hover:bg-[#f8d33a] cursor-pointer shrink-0 transition-colors mt-2"
        >
          保存配置
        </button>
      </div>
    </div>
  );
}
