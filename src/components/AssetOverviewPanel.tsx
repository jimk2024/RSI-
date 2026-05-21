import React from "react";
import { useAppContext } from "../AppContext";
import { RefreshCw } from "lucide-react";

export function AssetOverviewPanel() {
  const { balance, isFetchingPosOrd } = useAppContext();
  const loading = isFetchingPosOrd;
  const displayBalance = balance || { totalEq: "---", availEq: "---" };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 text-xs text-gray-400 flex flex-col shrink-0">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-[10px] text-gray-500 uppercase flex items-center gap-1">
          资产概览 <RefreshCw className="w-3 h-3 animate-spin text-gray-500" />
        </h3>
      </div>
      <div className="space-y-3">
        <div className="flex justify-between items-end border-b border-[#2b2f36] pb-2">
          <span className="text-[10px] text-gray-400">权益 (USDT)</span>
          <span className="text-sm font-mono font-bold text-[#00b07c]">{displayBalance.totalEq}</span>
        </div>
        <div className="flex justify-between items-end border-b border-[#2b2f36] pb-2">
          <span className="text-[10px] text-gray-400">可用保证金</span>
          <span className="text-sm font-mono text-gray-200">{displayBalance.availEq}</span>
        </div>
      </div>
    </div>
  );
}
