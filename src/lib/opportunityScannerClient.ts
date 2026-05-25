import { calculateRSI, calculateEMA } from "./indicators";
import { okxPublicFetch as proxyPublicFetch } from "./api";

export interface Opportunity {
  symbol: string;
  rsi: number;
  rsi1h: number;
  rsi4h: number;
  type: "explosion" | "bottom_fishing";
  typeLabel: string;
  volSurgeMultiplier?: number;
  aboveEma20?: boolean;
  isBullishCandle?: boolean;
}

export interface ScanStatus {
  isSearching: boolean;
  scannedCount: number;
  totalToScan: number;
  lastCompletedAt: string | null;
}

// Resilient public fetcher: tries direct OKX API first (zero server load), falls back to proxy if blocked/CORS
async function okxDirectOrProxyFetch(endpoint: string): Promise<any> {
  try {
    const response = await fetch(`https://www.okx.com${endpoint}`);
    if (!response.ok) {
      throw new Error(`Direct fetch status: ${response.status}`);
    }
    const data = await response.json();
    if (data.code !== "0") {
      throw new Error(data.msg || "OKX API Error");
    }
    return data.data;
  } catch (err) {
    // If direct fails (CORS, network block, etc.), gracefully use proxy
    return await proxyPublicFetch(endpoint);
  }
}

export async function runClientScanStep(
  onProgress: (scanned: number, total: number) => void,
  onOpportunityFound: (opp: Opportunity) => void,
  signal?: AbortSignal
): Promise<Opportunity[]> {
  // 1. Fetch SWAP instruments
  let swapPairsRaw: string[] = [];
  try {
    const instruments = await okxDirectOrProxyFetch("/api/v5/public/instruments?instType=SWAP");
    if (instruments && instruments.length > 0) {
      swapPairsRaw = instruments
        .filter((inst: any) => inst.instId.endsWith("-USDT-SWAP"))
        .map((inst: any) => inst.instId);
    }
  } catch (err) {
    console.error("[ClientScanner] Failed to fetch instruments:", err);
  }

  if (swapPairsRaw.length === 0 || signal?.aborted) {
    return [];
  }

  // 2. Fetch tickers to screen by volume (> 10,000,000 USDT)
  let swapPairs: string[] = [];
  try {
    const tickersResp = await okxDirectOrProxyFetch("/api/v5/market/tickers?instType=SWAP");
    if (tickersResp && tickersResp.length > 0) {
      const highVolSymbols = new Set(
        tickersResp
          .filter((t: any) => parseFloat(t.volCcy24h) > 10000000)
          .map((t: any) => t.instId)
      );
      swapPairs = swapPairsRaw.filter(symbol => highVolSymbols.has(symbol));
    } else {
      swapPairs = swapPairsRaw;
    }
  } catch (err) {
    console.error("[ClientScanner] Failed to fetch volume tickers, using all pairs:", err);
    swapPairs = swapPairsRaw;
  }

  if (signal?.aborted) return [];

  const totalToScan = swapPairs.length;
  onProgress(0, totalToScan);

  const foundOpps: Opportunity[] = [];

  for (let i = 0; i < swapPairs.length; i++) {
    if (signal?.aborted) break;

    const symbol = swapPairs[i];
    onProgress(i + 1, totalToScan);

    try {
      // A. Get 15M candles
      const data15m = await okxDirectOrProxyFetch(`/api/v5/market/candles?instId=${symbol}&bar=15m&limit=50`);
      if (data15m && data15m.length > 0 && !signal?.aborted) {
        const sorted15m = [...data15m].reverse();
        const closes15m = sorted15m.map((d: any) => parseFloat(d[4]));
        const opens15m = sorted15m.map((d: any) => parseFloat(d[1]));
        const vols15m = sorted15m.map((d: any) => parseFloat(d[5]));
        const rsi15mList = calculateRSI(closes15m, 14);
        const ema20List = calculateEMA(closes15m, 20);

        const latestIdx = closes15m.length - 1;
        const r15 = rsi15mList[latestIdx];
        const r15_prev = rsi15mList[latestIdx - 1];
        const r15_prev2 = rsi15mList[latestIdx - 2];

        if (
          r15 !== undefined && r15 !== null &&
          r15_prev !== undefined && r15_prev !== null &&
          r15_prev2 !== undefined && r15_prev2 !== null
        ) {
          const is15mBullish = r15 > 55 && r15 > r15_prev && r15_prev > r15_prev2;
          const is15mBottom = r15 > 55 && r15_prev <= 55;

          if (is15mBullish || is15mBottom) {
            // Fetch 1H
            await new Promise(r => setTimeout(r, 60));
            if (signal?.aborted) break;

            const data1h = await okxDirectOrProxyFetch(`/api/v5/market/candles?instId=${symbol}&bar=1H&limit=50`);
            if (data1h && data1h.length > 0 && !signal?.aborted) {
              const closes1h = [...data1h].reverse().map((d: any) => parseFloat(d[4]));
              const rsi1hList = calculateRSI(closes1h, 14);
              const r1h = rsi1hList[rsi1hList.length - 1];
              const r1h_prev = rsi1hList[rsi1hList.length - 2];

              if (r1h !== undefined && r1h !== null && r1h_prev !== undefined && r1h_prev !== null) {
                const is1hBullish = r1h > 60 && r1h_prev > 60;
                
                let has1hBelow30 = false;
                for (let k = Math.max(0, rsi1hList.length - 6); k < rsi1hList.length - 1; k++) {
                  if (rsi1hList[k] < 30) has1hBelow30 = true;
                }
                const is1hBottom = r1h > 40 && has1hBelow30 && r1h_prev <= 40;

                if (is1hBullish || is1hBottom) {
                  // Fetch 4H
                  await new Promise(r => setTimeout(r, 60));
                  if (signal?.aborted) break;

                  const data4h = await okxDirectOrProxyFetch(`/api/v5/market/candles?instId=${symbol}&bar=4H&limit=50`);
                  if (data4h && data4h.length > 0 && !signal?.aborted) {
                    const closes4h = [...data4h].reverse().map((d: any) => parseFloat(d[4]));
                    const rsi4hList = calculateRSI(closes4h, 14);
                    const r4h = rsi4hList[rsi4hList.length - 1];
                    const r4h_prev = rsi4hList[rsi4hList.length - 2];

                    if (r4h !== undefined && r4h !== null && r4h_prev !== undefined && r4h_prev !== null) {
                      const is4hBullish = r4h >= 65 && r4h_prev < 65;
                      const is4hBottom = r4h < 30;

                      const isExplosion = is15mBullish && is1hBullish && is4hBullish;
                      const isBottomFishing = is15mBottom && is1hBottom && is4hBottom;

                      if (isExplosion || isBottomFishing) {
                        const currentClose = closes15m[latestIdx];
                        const currentOpen = opens15m[latestIdx];
                        const currentVol = vols15m[latestIdx];

                        let sumVol = 0;
                        let count = 0;
                        for (let idx = Math.max(0, latestIdx - 10); idx < latestIdx; idx++) {
                          sumVol += vols15m[idx];
                          count++;
                        }
                        const avgVol = count > 0 ? (sumVol / count) : 0;
                        const volSurgeMultiplier = avgVol > 0 ? (currentVol / avgVol) : 1.0;

                        const ema20Val = ema20List[latestIdx];
                        const aboveEma20 = ema20Val !== null && ema20Val !== undefined ? (currentClose >= ema20Val) : true;
                        const isBullishCandle = currentClose > currentOpen;

                        const validExplosion = isExplosion && isBullishCandle && aboveEma20 && volSurgeMultiplier >= 1.25;
                        const validBottom = isBottomFishing && isBullishCandle && volSurgeMultiplier >= 1.2;

                        if (validExplosion || validBottom) {
                          const opp: Opportunity = {
                            symbol,
                            rsi: r15,
                            rsi1h: r1h,
                            rsi4h: r4h,
                            type: validExplosion ? "explosion" : "bottom_fishing",
                            typeLabel: validExplosion ? "起爆预警" : "抄底预警",
                            volSurgeMultiplier,
                            aboveEma20,
                            isBullishCandle
                          };
                          foundOpps.push(opp);
                          onOpportunityFound(opp);
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    } catch (err) {
      console.error(`[ClientScanner] Error scanning ${symbol}:`, err);
    }

    // Gentle delay to keep client IP far below standard rate-limit pools
    await new Promise(r => setTimeout(r, 100));
  }

  return foundOpps;
}
