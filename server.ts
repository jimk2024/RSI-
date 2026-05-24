import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import proxyHandler from "./api/okx/proxy";
import publicHandler from "./api/okx/public";
import licenseRouter from "./api/license";
import authRouter from "./api/auth";
import adminRouter from "./api/admin";
import { GoogleGenAI } from "@google/genai";

// No backend opportunity scanning loop: moved to client-side to save server bandwidth and CPU
const cachedOpportunities: any[] = [];
const scanStatus = {
  isSearching: false,
  scannedCount: 0,
  totalToScan: 0,
  lastCompletedAt: null as string | null,
};

const app = express();

// Add basic CORS
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, Content-Length, X-Requested-With");
  // Intercept OPTIONS method
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});
app.use(express.json());

const PORT = 3000;

let ai: GoogleGenAI | null = null;
try {
  if (process.env.GEMINI_API_KEY) {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
} catch (e) {}

// REST Proxy for authenticated OKX endpoints
app.post("/api/okx/proxy", proxyHandler as any);

// REST Proxy for public OKX endpoints (market data)
app.post("/api/okx/public", publicHandler as any);

// Auth, License and Admin endpoints
app.use("/api/auth", authRouter);
app.use("/api/license", licenseRouter);
app.use("/api/sys-control", adminRouter);

// News Endpoint with Translation & Sentiment
app.get("/api/news", async (req, res) => {
  try {
    const coin = (req.query.coin as string || "btc").toLowerCase();
    let url = `https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss/tag/${coin}`;
    let resp = await fetch(url);
    let data = await resp.json();
    
    if (data.status === "error") {
      url = `https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss`;
      resp = await fetch(url);
      data = await resp.json();
    }

    if (!data.items) {
      return res.json([]);
    }

    const items = data.items.slice(0, 5).map((item: any, i: number) => ({
      id: i.toString() + item.link,
      source_info: { name: "Cointelegraph", img: "https://cointelegraph.com/favicon.ico" },
      title: item.title,
      url: item.link,
      body: item.content,
      published_on: new Date(item.pubDate.replace(" ", "T") + "Z").getTime() / 1000,
      sentiment: "Neutral"
    }));

    if (ai) {
      const prompt = `Translate the following crypto news headlines to Chinese. For each, assign a sentiment of exactly "利多" (Bullish), "利空" (Bearish), or "中性" (Neutral).
Return ONLY a valid JSON array of objects with "title_zh" and "sentiment" keys in the exact order provided.
Here are the headlines:
${items.map((it: any) => "- " + it.title).join("\n")}`;
      
      try {
        if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY" || !process.env.GEMINI_API_KEY.startsWith("AIza")) {
           console.warn("Invalid or default GEMINI_API_KEY detected. Skipping translation.");
        } else {
          const response = await ai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: prompt,
             config: {
               responseMimeType: "application/json"
             }
          });
          const aiData = JSON.parse(response.text || "[]");
          aiData.forEach((result: any, index: number) => {
             if (items[index]) {
               items[index].title = result.title_zh || items[index].title;
               items[index].sentiment = result.sentiment || "中性";
             }
          });
        }
      } catch (e: any) {
        console.error("Gemini AI sentiment error:", e.message);
      }
    }

    res.json(items);
  } catch (error) {
    console.error("News endpoint error:", error);
    res.status(500).json([]);
  }
});

// Background Opportunity Scanner Endpoint
app.get("/api/opportunities", (req, res) => {
  res.json({
    opportunities: cachedOpportunities,
    ...scanStatus
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
