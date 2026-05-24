import React, { useState, useEffect } from "react";
import { ChartWidget } from "./ChartWidget";
import { StrategyLibraryPanel } from "./StrategyLibraryPanel";
import { useAppContext } from "../AppContext";

export function ChartGrid() {
  const { overrideChartSymbol } = useAppContext();
  const [activeSymbol, setActiveSymbol] = useState("BTC-USDT-SWAP");

  useEffect(() => {
    if (overrideChartSymbol) {
      setActiveSymbol(overrideChartSymbol.symbol);
    }
  }, [overrideChartSymbol]);

  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full min-h-0">
      <ChartWidget 
        id="main-chart" 
        defaultSymbol={activeSymbol} 
        isMaximized={true}
        style={{ 
          gridColumn: 'span 2 / span 2',
          gridRow: 'span 2 / span 2'
        }}
      />
      <div className="row-span-1 min-h-0 w-full" style={{ gridColumn: 'span 2 / span 2' }}>
        <StrategyLibraryPanel />
      </div>
    </div>
  );
}
