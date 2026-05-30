import { Router } from "express";
import jwt from "jsonwebtoken";
import db from "../database";
import ccxt from "ccxt";
import { encrypt, decrypt } from "./crypto";
import { fetchHyperliquidState, syncOkxPositions } from "./copy-trade-worker";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Middleware to verify JWT and attach user_id
router.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未授权" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    (req as any).userId = decoded.id;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token 无效或已过期" });
  }
});

// Get all active copy trades for the user
router.get("/", async (req, res) => {
  const userId = (req as any).userId;
  try {
    const stmt = db.prepare(`
      SELECT id, target_wallet_address as address, api_key, api_secret, passphrase, margin_amount as marginAmount, is_active, created_at 
      FROM copy_trades 
      WHERE user_id = ? AND is_active = 1
    `);
    const trades = stmt.all(userId) as any[];

    const result = await Promise.all(trades.map(async (t) => {
      let aum = t.marginAmount;
      let totalPnl = 0;
      let assetPositions: any[] = [];
      let roi = 0;
      
      try {
        const okx = new ccxt.okx({
          apiKey: t.api_key,
          secret: t.api_secret,
          password: t.passphrase,
          enableRateLimit: true,
        });

        const [balance, positions] = await Promise.all([
          okx.fetchBalance(),
          okx.fetchPositions()
        ]);

        aum = balance?.total?.USDT || t.marginAmount;
        totalPnl = (balance?.info?.data?.[0]?.upl || 0) * 1; // Unrealized PNL

        let nominalVal = 0;
        assetPositions = positions.map((p: any) => {
            const size = p.side === 'long' ? p.contracts : -p.contracts;
            const notional = parseFloat(p.notional || p.info?.notionalUsd || '0');
            nominalVal += notional;
            return {
                position: {
                    coin: p.symbol.split('/')[0],
                    szi: size,
                    marginUsed: p.initialMargin || 0,
                    leverage: { value: p.leverage || 1 },
                    entryPx: p.entryPrice || 0,
                    positionValue: notional,
                    unrealizedPnl: p.unrealizedPnl || p.info?.upl || 0,
                    returnOnEquity: ((p.unrealizedPnl || 0) / (p.initialMargin || 1)) * 100,
                    liquidationPx: p.liquidationPrice || 0,
                }
            };
        });

      } catch(e) {
         console.error(`Error fetching OKX status for trade ${t.id}`, e);
      }

      return {
        address: t.address,
        marginAmount: t.marginAmount,
        _marginAmount: t.marginAmount,
        _nominalValue: isNaN(nominalVal) ? 0 : nominalVal,
        aum: aum,
        totalPnl: totalPnl,
        assetPositions: assetPositions,
        roi30d: totalPnl / t.marginAmount,
        roi7d: totalPnl / t.marginAmount,
        roi24h: totalPnl / t.marginAmount,
      };
    }));

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new copy trade
router.post("/", async (req, res) => {
  const userId = (req as any).userId;
  const { address, apiKey, apiSecret, passphrase, marginAmount } = req.body;

  if (!address || !apiKey || !apiSecret || !passphrase || !marginAmount) {
    return res.status(400).json({ error: " Missing required fields" });
  }

  try {
    // We could check if there is already an active copy trade for this address
    const existing = db.prepare(`
        SELECT id FROM copy_trades 
        WHERE user_id = ? AND target_wallet_address = ? AND is_active = 1
    `).get(userId, address);

    // Verify OKX Credentials
    try {
      const okx = new ccxt.okx({
        apiKey,
        secret: apiSecret,
        password: passphrase,
      });
      await okx.fetchBalance(); // basic call to check
    } catch(ccxtErr: any) {
      return res.status(400).json({ error: "OKX API 验证失败，请检查您的 Key/Secret/Passphrase 是否开启了读取和交易权限: " + ccxtErr.message });
    }

    // Encrypt API credentials
    const encApiKey = encrypt(apiKey);
    const encApiSecret = encrypt(apiSecret);
    const encPassphrase = encrypt(passphrase);

    if (existing) {
      const stmt = db.prepare(`
          UPDATE copy_trades 
          SET api_key = ?, api_secret = ?, passphrase = ?, margin_amount = ? 
          WHERE user_id = ? AND target_wallet_address = ? AND is_active = 1
      `);
      stmt.run(encApiKey, encApiSecret, encPassphrase, marginAmount, userId, address);
    } else {
      const stmt = db.prepare(`
          INSERT INTO copy_trades (user_id, target_wallet_address, api_key, api_secret, passphrase, margin_amount, is_active)
          VALUES (?, ?, ?, ?, ?, ?, 1)
      `);
      stmt.run(userId, address, encApiKey, encApiSecret, encPassphrase, marginAmount);
    }
    
    // Perform initial sync inline and collect logs
    const logs: string[] = [];
    const hlState = await fetchHyperliquidState(address);
    if (!hlState || !hlState.assetPositions) {
      logs.push("Warning: Could not fetch initial Hyperliquid state or target has no open positions.");
    } else {
      const accountValue = parseFloat(hlState.marginSummary?.accountValue || "1");
      const positions = hlState.assetPositions.map((p: any) => p.position);
      const hlPosMap: Record<string, any> = {};
      for (const p of positions) {
        hlPosMap[p.coin] = {
          szi: parseFloat(p.szi),
          positionValue: parseFloat(p.positionValue),
          leverage: parseFloat(p.leverage?.value || "1"),
        };
      }
      const tradeObj = {
         user_id: userId,
         target_wallet_address: address,
         api_key: encApiKey,
         api_secret: encApiSecret,
         passphrase: encPassphrase,
         margin_amount: marginAmount,
      };
      await syncOkxPositions(tradeObj, hlPosMap, accountValue, (msg) => logs.push(msg));
    }
    
    res.json({ success: true, message: "跟单配置保存成功，初始持仓同步完成。", logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stop a copy trade
router.post("/stop", (req, res) => {
  const userId = (req as any).userId;
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ error: "Missing target address" });
  }

  try {
    const stmt = db.prepare(`
       UPDATE copy_trades SET is_active = 0 WHERE user_id = ? AND target_wallet_address = ?
    `);
    const result = stmt.run(userId, address);

    if (result.changes > 0) {
      res.json({ success: true, message: "已退出跟单，相关市场仓位将随OKX平仓单清算。" });
    } else {
      res.status(404).json({ error: "未找到活跃的跟单记录" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
