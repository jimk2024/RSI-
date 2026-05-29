import React, { useState, useEffect } from "react";
import { ChartWidget } from "./ChartWidget";
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
    <div className="flex flex-col gap-3 h-full min-h-0">
      <div className="flex-1 min-h-0">
        <ChartWidget 
          id="chart-0" 
          defaultSymbol={activeSymbol} 
        />
      </div>
      <div className="shrink-0 h-[290px] min-h-0 w-full">
        {/* AbnormalMonitoringPanel removed temporarily */}
      </div>
    </div>
  );
}
