// API client functions to communicate with our Express proxy

export interface OkxApiConfig {
  apiKey: string;
  apiSecret: string;
  apiPassword: string;
}

export async function okxPublicFetch(endpoint: string) {
  const res = await fetch('/api/okx/public', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ endpoint }),
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  const data = await res.json();
  if (data.code !== "0") throw new Error(data.msg || "OKX API Error");
  return data.data;
}

export async function okxPrivateFetch(
  config: OkxApiConfig,
  method: string,
  endpoint: string,
  payload?: any
) {
  if (!config.apiKey || !config.apiSecret || !config.apiPassword) {
    throw new Error("API 未配置完整");
  }
  const res = await fetch('/api/okx/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...config,
      method,
      endpoint,
      payload,
    }),
  });
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  const data = await res.json();
  if (data.code !== "0") {
    let msg = data.msg || "OKX API Error";
    throw new Error(msg);
  }
  if (Array.isArray(data.data) && data.data.length > 0) {
    const first = data.data[0];
    if (first && first.sCode && first.sCode !== "0") {
      throw new Error(first.sMsg || `OKX Operation Failed: ${first.sCode}`);
    }
  }
  return data.data;
}
