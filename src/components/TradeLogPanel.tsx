import React from "react";
import { useAppContext } from "../AppContext";

export function TradeLogPanel() {
  const { logs } = useAppContext();

  return (
    <div className="h-full bg-[#161a1e] border border-[#2b2f36] rounded-lg flex flex-col overflow-hidden">
      <div className="bg-[#2b2f36] px-3 py-1.5 text-[10px] uppercase tracking-tighter text-gray-400">交易日志</div>
      <div className="flex-1 p-2 font-mono text-[9px] text-gray-400 overflow-y-auto">
        {logs.length === 0 ? (
          <div className="text-gray-500 text-center p-4">暂无日志</div>
        ) : (
          <div className="flex flex-col gap-1">
            {logs.map((log) => {
              const timeStr = new Date(log.time).toLocaleTimeString();
              let color = "text-gray-300";
              if (log.type === "success") color = "text-[#00b07c]";
              if (log.type === "error") color = "text-[#f6465d]";

              return (
                <div key={log.id} className="flex gap-2 mb-1">
                  <span className="text-gray-500 shrink-0">[{timeStr}]</span>
                  <span className={color}>{log.message}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
