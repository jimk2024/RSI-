import React, { createContext, useContext, useState, useEffect } from "react";
import { OkxApiConfig, okxPublicFetch, okxPrivateFetch } from "./lib/api";

export interface LogEntry {
  id: string;
  time: number;
  message: string;
  type: "info" | "success" | "error";
}

export interface TradeConfig {
  amount: number;
  leverage: number;
  tpPercent: number;
  slPercent: number;
  marginMode: "cross" | "isolated";
}

export interface InstrumentInfo {
  instId: string;
  ctVal: number;
  ctMult: number;
  tickSz: number;
  lotSz: number;
}

interface AppContextType {
  apiConfig: OkxApiConfig;
  setApiConfig: React.Dispatch<React.SetStateAction<OkxApiConfig>>;
  tradeConfig: TradeConfig;
  setTradeConfig: (config: TradeConfig) => void;
  logs: LogEntry[];
  addLog: (message: string, type: "info" | "success" | "error") => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  instruments: Record<string, InstrumentInfo>;
  positions: any[];
  orders: any[];
  balance: { totalEq: string, availEq: string } | null;
  isFetchingPosOrd: boolean;
  overrideChartSymbol: { id: string, symbol: string } | null;
  setOverrideChartSymbol: React.Dispatch<React.SetStateAction<{ id: string, symbol: string } | null>>;
  activeMainSymbol: string;
  setActiveMainSymbol: React.Dispatch<React.SetStateAction<string>>;
}

const defaultEnvConfig: OkxApiConfig = {
  apiKey: "",
  apiSecret: "",
  apiPassword: "",
};

const defaultTradeConfig: TradeConfig = {
  amount: 10,
  leverage: 20,
  tpPercent: 10,
  slPercent: 10,
  marginMode: "cross",
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [apiConfig, setApiConfig] = useState<OkxApiConfig>(() => {
    const saved = localStorage.getItem("okxConfigV3");
    if (saved) return JSON.parse(saved);

    const oldV2 = localStorage.getItem("okxConfigsV2");
    if (oldV2) {
      const parsed = JSON.parse(oldV2);
      return parsed.real || defaultEnvConfig;
    }

    const oldSaved = localStorage.getItem("okxConfig");
    if (oldSaved) {
       const old = JSON.parse(oldSaved);
       return { apiKey: old.apiKey || "", apiSecret: old.apiSecret || "", apiPassword: old.apiPassword || "" };
    }
    return defaultEnvConfig;
  });

  const [tradeConfig, setTradeConfig] = useState<TradeConfig>(() => {
    const saved = localStorage.getItem("okxTradeConfig");
    return saved ? JSON.parse(saved) : defaultTradeConfig;
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [instruments, setInstruments] = useState<Record<string, InstrumentInfo>>({});
  const [positions, setPositions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [balance, setBalance] = useState<{ totalEq: string, availEq: string } | null>(null);
  const [isFetchingPosOrd, setIsFetchingPosOrd] = useState(false);
  const [overrideChartSymbol, setOverrideChartSymbol] = useState<{ id: string, symbol: string } | null>(null);
  const [activeMainSymbol, setActiveMainSymbol] = useState("BTC-USDT-SWAP");

  useEffect(() => {
    localStorage.setItem("okxConfigV3", JSON.stringify(apiConfig));
  }, [apiConfig]);

  useEffect(() => {
    localStorage.setItem("okxTradeConfig", JSON.stringify(tradeConfig));
  }, [tradeConfig]);

  useEffect(() => {
    // Fetch instrument info globally so we know contract sizes for position calculation
    let active = true;
    okxPublicFetch("/api/v5/public/instruments?instType=SWAP")
      .then((data) => {
        if (!active || !data) return;
        const instMap: Record<string, InstrumentInfo> = {};
        for (const inst of data) {
          instMap[inst.instId] = {
            instId: inst.instId,
            ctVal: parseFloat(inst.ctVal),
            ctMult: parseFloat(inst.ctMult),
            tickSz: parseFloat(inst.tickSz),
            lotSz: parseFloat(inst.lotSz),
          };
        }
        setInstruments(instMap);
      })
      .catch((err) => {
        console.error("Failed to fetch instruments info", err);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    let posOrdTimeout: NodeJS.Timeout;
    
    const fetchPositionsAndOrders = async () => {
      if (!apiConfig.apiKey || !apiConfig.apiSecret) {
        if (active) posOrdTimeout = setTimeout(fetchPositionsAndOrders, 1000);
        return;
      }
      
      if (active) setIsFetchingPosOrd(true);
      try {
        const [posData, ordData, algoData] = await Promise.all([
          okxPrivateFetch(apiConfig, "GET", "/api/v5/account/positions?instType=SWAP").catch(err => {
            if (!err.message?.includes("APIKey")) console.error("Fetch pos error:", err.message);
            return null;
          }),
          okxPrivateFetch(apiConfig, "GET", "/api/v5/trade/orders-pending?instType=SWAP").catch(err => {
            if (!err.message?.includes("APIKey")) console.error("Fetch ord error:", err.message);
            return [];
          }),
          Promise.all([
            okxPrivateFetch(apiConfig, "GET", "/api/v5/trade/orders-algo-pending?instType=SWAP&ordType=conditional").catch(e => []),
            okxPrivateFetch(apiConfig, "GET", "/api/v5/trade/orders-algo-pending?instType=SWAP&ordType=oco").catch(e => []),
            okxPrivateFetch(apiConfig, "GET", "/api/v5/trade/orders-algo-pending?instType=SWAP&ordType=trigger").catch(e => [])
          ]).then(results => results.flat()).catch(err => {
            if (!err.message?.includes("APIKey")) console.error("Fetch algo ord error:", err.message);
            return [];
          })
        ]);
        
        if (active) {
          if (posData !== null) setPositions(posData);
          if (ordData !== null && algoData !== null) {
            // Unify them a bit, so they can be rendered easily
            const normal = ordData.map((o: any) => ({ ...o, isAlgo: false }));
            const algos = algoData.map((a: any) => ({ ...a, isAlgo: true, ordId: a.algoId }));
            setOrders([...normal, ...algos]);
          }
        }
      } finally {
        if (active) {
          setIsFetchingPosOrd(false);
          posOrdTimeout = setTimeout(fetchPositionsAndOrders, 500); // 0.5s poll
        }
      }
    };
    
    fetchPositionsAndOrders();
    return () => {
      active = false;
      clearTimeout(posOrdTimeout);
    };
  }, [apiConfig, refreshTrigger]);

  useEffect(() => {
    let active = true;
    let balanceTimeout: NodeJS.Timeout;

    const fetchBalance = async () => {
      if (!apiConfig.apiKey || !apiConfig.apiSecret) {
        if (active) balanceTimeout = setTimeout(fetchBalance, 5000);
        return;
      }
      
      try {
        const balData = await okxPrivateFetch(apiConfig, "GET", "/api/v5/account/balance").catch(err => {
          if (!err.message?.includes("APIKey")) console.error("Fetch balance error:", err.message);
          return null;
        });

        if (active && balData !== null && balData.length > 0) {
          const acc = balData[0];
          const usdtDetail = acc.details?.find((d: any) => d.ccy === "USDT");
          setBalance({
            totalEq: parseFloat(acc.totalEq || "0").toFixed(2),
            availEq: usdtDetail ? parseFloat(usdtDetail.availEq || "0").toFixed(2) : parseFloat(acc.totalEq || "0").toFixed(2),
          });
        }
      } finally {
        if (active) {
          balanceTimeout = setTimeout(fetchBalance, 5000); // 5s poll
        }
      }
    };
    
    fetchBalance();
    return () => {
      active = false;
      clearTimeout(balanceTimeout);
    };
  }, [apiConfig, refreshTrigger]);

  const addLog = (message: string, type: "info" | "success" | "error") => {
    const entry: LogEntry = {
      id: Math.random().toString(36).substr(2, 9),
      time: Date.now(),
      message,
      type,
    };
    setLogs((prev) => [entry, ...prev].slice(0, 100)); // Keep last 100
  };

  const triggerRefresh = () => setRefreshTrigger((p) => p + 1);

  return (
    <AppContext.Provider
      value={{ apiConfig, setApiConfig, tradeConfig, setTradeConfig, logs, addLog, refreshTrigger, triggerRefresh, instruments, positions, orders, isFetchingPosOrd, balance, overrideChartSymbol, setOverrideChartSymbol, activeMainSymbol, setActiveMainSymbol }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useAppContext must be used within AppProvider");
  return ctx;
}
