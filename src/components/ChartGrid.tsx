import React, { useState } from "react";
import { ChartWidget } from "./ChartWidget";

export function ChartGrid() {
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);

  const defaultPairs = [
    "BTC-USDT-SWAP",
    "ETH-USDT-SWAP",
    "SOL-USDT-SWAP",
    "DOGE-USDT-SWAP",
    "XRP-USDT-SWAP",
    "ADA-USDT-SWAP"
  ];

  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full relative">
      {defaultPairs.map((pair, idx) => {
        const id = `chart-${idx}`;
        const isMaximized = maximizedChart === id;
        
        // If another chart is maximized, hide this one
        if (maximizedChart !== null && !isMaximized) {
          return null;
        }

        return (
          <ChartWidget 
            key={idx} 
            id={id} 
            defaultSymbol={pair} 
            isMaximized={isMaximized}
            onToggleMaximize={() => setMaximizedChart(isMaximized ? null : id)}
            className={isMaximized ? "absolute inset-0 z-50 bg-[#0b0e11]" : ""}
          />
        );
      })}
    </div>
  );
}
