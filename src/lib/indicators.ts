export function calculateRSI(closes: number[], period: number = 14) {
  const rsi = new Array(closes.length).fill(null);
  if (closes.length < period) return rsi;

  let gainSum = 0;
  let lossSum = 0;

  // First SMA
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff > 0) gainSum += diff;
    else lossSum -= diff;
  }

  let avgGain = gainSum / period;
  let avgLoss = lossSum / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  rsi[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    let gain = 0;
    let loss = 0;

    if (diff > 0) gain = diff;
    else loss = -diff;

    // Smoothed moving average
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    if (avgLoss === 0) {
      rsi[i] = 100;
    } else {
      rs = avgGain / avgLoss;
      rsi[i] = 100 - 100 / (1 + rs);
    }
  }

  return rsi;
}

export function calculateEMA(closes: number[], period: number) {
  const ema = new Array(closes.length).fill(null);
  if (closes.length < period) return ema;

  const k = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closes[i];
  }
  ema[period - 1] = sum / period; // SMA for first EMA point

  for (let i = period; i < closes.length; i++) {
    ema[i] = (closes[i] - ema[i - 1]) * k + ema[i - 1];
  }

  return ema;
}
