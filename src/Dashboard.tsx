import React, { useState, useEffect } from "react";
import { AppProvider, useAppContext } from "./AppContext";
import { ApiConfigPanel } from "./components/ApiConfigPanel";
import { AssetOverviewPanel } from "./components/AssetOverviewPanel";
import { TradeSettingsPanel } from "./components/TradeSettingsPanel";
import { OpportunitySearchPanel } from "./components/OpportunitySearchPanel";
import { ChartWidget } from "./components/ChartWidget";
import { AbnormalMonitoringPanel } from "./components/AbnormalMonitoringPanel";
import { PositionsPanel } from "./components/PositionsPanel";
import { TradeLogPanel } from "./components/TradeLogPanel";
import { SymbolDataPanel } from "./components/SymbolDataPanel";
import { useAuth } from "./AuthContext";

export function Dashboard() {
  return (
    <AppProvider>
      <DashboardContent />
    </AppProvider>
  );
}

function DashboardContent() {
  const { user, logout } = useAuth();
  const { overrideChartSymbol } = useAppContext();
  const [activeSymbol, setActiveSymbol] = useState("BTC-USDT-SWAP");

  useEffect(() => {
    if (overrideChartSymbol) {
      setActiveSymbol(overrideChartSymbol.symbol);
    }
  }, [overrideChartSymbol]);

  return (
    <div className="h-screen overflow-hidden bg-[#0b0e11] text-[#e0e3e7] flex p-3 gap-3 font-sans">
      
      {/* Column 1 + Middle Column Combined to guarantee grid-alignment */}
      <div className="flex-1 flex flex-col gap-3 min-h-0 overflow-hidden">
        
        {/* Top Row: Left Top 3 Panels + Right ChartWidget */}
        <div className="flex-1 flex gap-3 min-h-0">
          {/* Left Top Sub-column */}
          <div className="w-56 flex flex-col gap-3 min-h-0 shrink-0">
            {/* Brand Module */}
            <div className="flex-1 bg-[#161a1e] border border-[#2b2f36] rounded-lg py-2 px-3 flex flex-col justify-center items-center min-h-0 relative shadow-inner hover:bg-[#1e2329] transition-colors group">
               {/* Tech accent line */}
               <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-gray-400/30 to-transparent"></div>
               
               <button 
                  className="flex flex-col items-center w-full cursor-pointer"
                  onClick={() => window.location.hash = '#/'}
               >
                  <h1 className="text-xl flex items-center font-sans tracking-widest drop-shadow-sm group-hover:scale-105 transition-transform">
                    <span className="font-light text-gray-400">NEURAL</span>
                    <span className="font-black text-white">TRADER</span>
                  </h1>
                  
                  <div className="mt-1 opacity-60">
                     <span className="text-[10px] tracking-widest font-sans text-gray-400">
                       智能量化交易系统
                     </span>
                  </div>
               </button>

               {user && (
                 <div className="mt-2 w-full border-t border-[#2b2f36] pt-2 flex flex-col items-center flex-wrap">
                   <div className="text-[10px] text-gray-400 tracking-wider truncate w-full text-center">
                     {user.email}
                   </div>
                   <div className="text-[10px] text-[#22c55e] font-sans font-medium mb-2 mt-0.5 tracking-wide">
                     授权至: {new Date(user.membership_expiry).toLocaleDateString()}
                   </div>
                   <button 
                     onClick={() => { logout(); window.location.hash = '#/'; }}
                     className="text-[10px] bg-red-500/10 text-red-500 border border-red-500/20 px-3 py-1 rounded-full hover:bg-red-500/20 transition-colors"
                   >
                     退出登录
                   </button>
                 </div>
               )}
            </div>
            
            <div className="shrink-0">
              <ApiConfigPanel />
            </div>
            <div className="shrink-0">
              <AssetOverviewPanel />
            </div>
          </div>

          {/* Chart Widget Panel */}
          <div className="flex-1 min-h-0">
            <ChartWidget 
              id="chart-0" 
              defaultSymbol={activeSymbol} 
            />
          </div>
        </div>

        {/* Bottom Row: Left Trade Settings + Right Abnormal Monitoring */}
        <div className="h-[290px] shrink-0 flex gap-3 min-h-0">
          <div className="w-56 shrink-0 h-full">
            <TradeSettingsPanel />
          </div>
          <div className="flex-1 min-h-0 h-full">
            <AbnormalMonitoringPanel />
          </div>
        </div>

      </div>

      {/* Column 3: Opportunity Search & News */}
      <div className="w-64 flex flex-col gap-3 min-h-0">
        <OpportunitySearchPanel />
        <SymbolDataPanel />
      </div>

      {/* Column 4: Positions & Logs */}
      <div className="w-64 flex flex-col gap-3 min-h-0">
        <div className="flex-[2] min-h-0 flex flex-col">
          <PositionsPanel />
        </div>
        <div className="h-48 shrink-0 flex flex-col">
          <TradeLogPanel />
        </div>
      </div>

    </div>
  );
}
