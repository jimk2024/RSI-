import React, { useState, useEffect } from "react";
import { ChartWidget } from "./ChartWidget";
import { useAppContext } from "../AppContext";

export function ChartGrid() {
  const [mainChartId, setMainChartId] = useState<string>("chart-0");
  const { overrideChartSymbol } = useAppContext();

  useEffect(() => {
    if (overrideChartSymbol) {
      setMainChartId(overrideChartSymbol.id);
    }
  }, [overrideChartSymbol]);

  const defaultPairs = [
    "BTC-USDT-SWAP",
    "ETH-USDT-SWAP",
    "SOL-USDT-SWAP"
  ];

  return (
    <div className="grid grid-cols-2 grid-rows-3 gap-2 h-full min-h-0">
      {defaultPairs.map((pair, idx) => {
        const id = `chart-${idx}`;
        const isMain = mainChartId === id;

        return (
          <ChartWidget 
            key={id}
            id={id} 
            defaultSymbol={pair} 
            isMaximized={isMain}
            onToggleMaximize={() => setMainChartId(id)}
            style={{ 
              gridColumn: isMain ? 'span 2 / span 2' : 'span 1 / span 1',
              gridRow: isMain ? 'span 2 / span 2' : 'span 1 / span 1',
              order: isMain ? -1 : 0
            }}
          />
        );
      })}
    </div>
  );
}
