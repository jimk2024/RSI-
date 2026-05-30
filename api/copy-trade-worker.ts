import ccxt from "ccxt";
import db from "../database";
import { decrypt } from "./crypto";

// Keep track of sync state
const lastKnownPositions: Record<string, Record<string, any>> = {}; // targetAddress -> coin -> posSize

const SLEEP_MS = 10000; // Poll every 10 seconds

export async function fetchHyperliquidState(userAddress: string) {
  try {
    const response = await fetch("https://api.hyperliquid.xyz/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "clearinghouseState", user: userAddress }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("HL Fetch error for", userAddress, e);
    return null;
  }
}

export async function runCopyTradeWorker() {
  console.log("Copy trade worker started...");
  while (true) {
    try {
      await processAllCopyTrades();
    } catch (error) {
      console.error("Error in copy trade loop:", error);
    }
    await new Promise((resolve) => setTimeout(resolve, SLEEP_MS));
  }
}

async function processAllCopyTrades() {
  const activeTrades = db.prepare(`SELECT * FROM copy_trades WHERE is_active = 1`).all();
  if (activeTrades.length === 0) return;

  // Group by target address to avoid fetching HL state multiple times
  const byTarget: Record<string, any[]> = {};
  for (const trade of activeTrades) {
    if (!byTarget[trade.target_wallet_address]) byTarget[trade.target_wallet_address] = [];
    byTarget[trade.target_wallet_address].push(trade);
  }

  for (const [targetAddr, trades] of Object.entries(byTarget)) {
    const hlState = await fetchHyperliquidState(targetAddr);
    if (!hlState || !hlState.assetPositions) continue;

    const accountValue = parseFloat(hlState.marginSummary?.accountValue || "1");
    
    // Build map of coin -> { size, value, leverage, side }
    const positions = hlState.assetPositions.map((p: any) => p.position);
    const hlPosMap: Record<string, any> = {};
    for (const p of positions) {
      // HL size is signed (negative for short)
      hlPosMap[p.coin] = {
        szi: parseFloat(p.szi),
        positionValue: parseFloat(p.positionValue),
        leverage: parseFloat(p.leverage?.value || "1"),
      };
    }

    // Now for each user following this target, match OKX positions
    for (const trade of trades) {
      await syncOkxPositions(trade, hlPosMap, accountValue);
    }
  }
}

export async function syncOkxPositions(trade: any, hlPosMap: Record<string, any>, accountValue: number, log?: (msg: string) => void) {
  const tLog = (msg: string) => {
    console.log(msg);
    if(log) log(msg);
  };
  try {
    const okx = new ccxt.okx({
      apiKey: decrypt(trade.api_key),
      secret: decrypt(trade.api_secret),
      password: decrypt(trade.passphrase),
      enableRateLimit: true,
    });
    // Check credentials by loading markets and getting current positions
    tLog("Connecting to OKX API...");
    await okx.loadMarkets();
    tLog(`Fetched ${Object.keys(okx.markets).length} OKX markets.`);
    
    // Check posMode
    let posMode = "long_short_mode";
    try {
       const accConfig = await okx.privateGetAccountConfig();
       if (accConfig?.data?.[0]?.posMode) {
          posMode = accConfig.data[0].posMode;
       }
       tLog(`OKX Account posMode: ${posMode}`);
    } catch(e) {
       tLog(`Could not fetch account config, assuming long_short_mode`);
    }

    const okxPositionsData = await okx.fetchPositions();
    tLog(`Found ${okxPositionsData.length} existing OKX positions.`);
    
    const configuredMargin = trade.margin_amount || 1000;
    
    // We want our total position value on OKX for a coin to be:
    // (HL positionValue / HL accountValue) * configuredMargin * Leverage (or we just use nominal value mapping)
    // Wait, the "proportion" is positionValue / accountValue. That ratio is the % of total equity.
    // Our equity allocated is configuredMargin.
    // So our absolute nominal position value target is: Ratio * configuredMargin * leverage (if margin is raw equity).
    // Actually simpler: if trader uses 20% of their account on BTC, we use 20% of `configuredMargin` on BTC.
    // OKX API requires size in contracts (sz). We use ccxt `createMarketOrder` with `createMarketBuyOrderRequiresPrice = false`.
    // Wait, ccxt has a unified API. We can just calculate the delta and order.

    for (const [coin, hlPos] of Object.entries(hlPosMap)) {
      if (hlPos.szi === 0) continue;
      
      const symbol = `${coin}/USDT:USDT`;
      if (!okx.markets[symbol]) continue;

      const market = okx.markets[symbol];
      
      // Calculate target nominal value for this copiers position
      const ratio = hlPos.positionValue / accountValue;
      const targetNominalValue = ratio * configuredMargin * hlPos.leverage;

      // Find current okx position for this symbol
      const currentPos = okxPositionsData.find((p: any) => p.symbol === symbol);
      
      let currentNominalValue = 0;
      if (currentPos && currentPos.info) {
        // ccxt standardises positions, usually p.notional exists, or p.info.notionalUsd
        currentNominalValue = parseFloat(currentPos.notional || currentPos.info.notionalUsd || currentPos.info.imr || "0") * parseFloat(currentPos.info.lever || "1");
        if (currentPos.side === 'short') {
          currentNominalValue = -currentNominalValue;
        }
      }

      // Very rough logic: if delta > 10% of target, we adjust
      const targetSignedValue = hlPos.szi > 0 ? targetNominalValue : -targetNominalValue;
      const delta = targetSignedValue - currentNominalValue;
      
      if (Math.abs(delta) > targetNominalValue * 0.1 || (!currentPos && targetNominalValue > 10)) {
        // execute an order on OKX to adjust delta
        // ccxt okx swap requires contract amounts
        const contractSize = market.contractSize || 1;
        const ticker = await okx.fetchTicker(symbol);
        const price = ticker.last;
        
        if (price) {
           let contractsToOrder = Math.abs(delta) / ticker.last! / contractSize;
           contractsToOrder = Math.round(contractsToOrder);
           if (contractsToOrder >= Math.max((market.limits?.amount?.min || 1), 1)) {
              const side = delta > 0 ? "buy" : "sell";
              const targetPosSide = hlPos.szi > 0 ? "long" : "short";

              tLog(`Copying Target ${trade.target_wallet_address} for user ${trade.user_id}: ${side} ${contractsToOrder} of ${symbol} (${posMode === 'long_short_mode' ? targetPosSide : 'net'})`);
              // In production, execute order. We use a try/catch to ensure exceptions don't bubble
              try {
                try {
                // Set leverage first to match the leader's leverage
                const levParams: any = { mgnMode: "cross" };
                if (posMode === "long_short_mode") levParams.posSide = targetPosSide;
                await okx.setLeverage(hlPos.leverage, symbol, levParams);
                tLog(`Successfully set leverage to ${hlPos.leverage}x for ${symbol}`);
                } catch(levErr: any) {
                   tLog(`Leverage set error for ${symbol} (might be already set): ${levErr?.message}`);
                }
                
                const orderParams: any = { tdMode: 'cross' };
                if (posMode === "long_short_mode") orderParams.posSide = targetPosSide;

                await okx.createOrder(symbol, "market", side, contractsToOrder, undefined, orderParams);
                tLog(`Successfully ordered ${side} ${contractsToOrder} of ${symbol}`);
              } catch(e: any) {
                tLog(`OKX Error ordering ${symbol}: ${e?.message}`);
              }
           } else {
             tLog(`Order size for ${symbol} (${contractsToOrder}) is below minimum allowed size (${market.limits?.amount?.min})`);
           }
        }
      }
    }
    
    // Close positions on OKX that are no longer present on HL
    for (const p of okxPositionsData) {
      if (p.contracts && p.contracts > 0) {
         const coinObj = p.symbol.split('/')[0];
         if (!hlPosMap[coinObj] || hlPosMap[coinObj].szi === 0) {
            tLog(`Closing OKX position on ${p.symbol} for user ${trade.user_id} - Leader exited`);
            try {
              const side = p.side === 'long' ? 'sell' : 'buy';
              const closeParams: any = {
                 reduceOnly: true,
                 tdMode: 'cross'
              };
              if (posMode === 'long_short_mode') {
                 closeParams.posSide = p.info?.posSide || p.side;
              }
              await okx.createOrder(p.symbol, "market", side, p.contracts, undefined, closeParams);
              tLog(`Successfully closed ${p.symbol}`);
            } catch(e: any) {
              tLog(`OKX close Error on ${p.symbol}: ${e?.message}`);
            }
         }
      }
    }
  } catch (error: any) {
    tLog(`Failed to sync OKX for user ${trade.user_id}: ${error?.message}`);
  }
}
