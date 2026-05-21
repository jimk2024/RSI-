import crypto from "crypto";

function generateOkxSignature(
  timestamp: string,
  method: string,
  requestPath: string,
  body: string,
  secretKey: string
) {
  const signStr = timestamp + method + requestPath + body;
  return crypto.createHmac("sha256", secretKey).update(signStr).digest("base64");
}

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { apiKey, apiSecret, apiPassword, method = "GET", endpoint, payload } = req.body || {};

  if (!apiKey || !apiSecret || !apiPassword || !endpoint) {
    return res.status(400).json({ error: "Missing required auth parameters or endpoint" });
  }

  try {
    const timestamp = new Date().toISOString();
    const bodyStr = payload ? JSON.stringify(payload) : "";
    const signature = generateOkxSignature(timestamp, method, endpoint, bodyStr, apiSecret);

    const headers: Record<string, string> = {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": signature,
      "OK-ACCESS-TIMESTAMP": timestamp,
      "OK-ACCESS-PASSPHRASE": apiPassword,
      "Content-Type": "application/json",
      "Connection": "close", // prevent keep-alive issues
      "User-Agent": "Mozilla/5.0",
    };

    const apiUrl = `https://www.okx.com${endpoint}`;

    let response;
    let retries = 3;
    let lastErr;
    while(retries > 0) {
      try {
        response = await fetch(apiUrl, {
          method,
          headers,
          body: method !== "GET" ? bodyStr : undefined,
        });
        break; // success
      } catch (err: any) {
        lastErr = err;
        retries--;
        if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 500));
      }
    }

    if (!response) {
       throw lastErr;
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    console.error("OKX Proxy Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
