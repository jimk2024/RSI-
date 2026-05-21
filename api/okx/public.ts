export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { endpoint } = req.body || {};

  if (!endpoint) {
    return res.status(400).json({ error: "Missing endpoint" });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Connection": "close",
      "User-Agent": "Mozilla/5.0",
    };

    let response;
    let retries = 3;
    let lastErr;
    while(retries > 0) {
      try {
        response = await fetch(`https://www.okx.com${endpoint}`, { headers });
        break;
      } catch(err: any) {
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
    console.error("OKX Public API Proxy Error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
}
