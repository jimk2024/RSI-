import React, { useState, useEffect } from "react";
import { ChartWidget } from "./ChartWidget";
import { useAppContext } from "../AppContext";

export function ChartGrid() {
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);
  const { overrideChartSymbol } = useAppContext();

  useEffect(() => {
    if (overrideChartSymbol) {
      setMaximizedChart(overrideChartSymbol.id);
    }
  }, [overrideChartSymbol]);

  const defaultPairs = [
    "BTC-USDT-SWAP",
    "ETH-USDT-SWAP",
    "SOL-USDT-SWAP",
    "DOGE-USDT-SWAP",
    "XRP-USDT-SWAP",
    "ADA-USDT-SWAP"
  ];

  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full">
      {defaultPairs.map((pair, idx) => {
        const id = `chart-${idx}`;
        const isMaximized = maximizedChart === id;
        
        let className = "";
        
        if (maximizedChart !== null) {
          if (isMaximized) {
            className = "col-span-2 row-span-2 order-first";
          } else {
            // Find if this is one of the first 2 non-maximized charts
            const otherPairs = defaultPairs.filter((p, i) => `chart-${i}` !== maximizedChart);
            const otherIndex = otherPairs.indexOf(pair);
            if (otherIndex >= 2) return null; // hide charts after the first 2
          }
        }

        return (
          <ChartWidget 
            key={pair} // using pair as key ensures it doesn't remount if order changes
            id={id} 
            defaultSymbol={pair} 
            isMaximized={isMaximized}
            onToggleMaximize={() => setMaximizedChart(isMaximized ? null : id)}
            className={className}
          />
        );
      })}
    </div>
  );
}
