import { Router } from "express";
import jwt from "jsonwebtoken";
import db from "../database";

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
router.get("/", (req, res) => {
  const userId = (req as any).userId;
  try {
    const stmt = db.prepare(`
      SELECT id, target_wallet_address as address, margin_amount as marginAmount, is_active, created_at 
      FROM copy_trades 
      WHERE user_id = ? AND is_active = 1
    `);
    const trades = stmt.all(userId);
    res.json(trades);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new copy trade
router.post("/", (req, res) => {
  const userId = (req as any).userId;
  const { address, apiKey, apiSecret, passphrase, marginAmount } = req.body;

  if (!address || !apiKey || !apiSecret || !passphrase || !marginAmount) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    // We could check if there is already an active copy trade for this address
    const existing = db.prepare(`
        SELECT id FROM copy_trades 
        WHERE user_id = ? AND target_wallet_address = ? AND is_active = 1
    `).get(userId, address);

    if (existing) {
      return res.status(400).json({ error: "您已经跟单了该交易员，请勿重复跟单。" });
    }

    const stmt = db.prepare(`
        INSERT INTO copy_trades (user_id, target_wallet_address, api_key, api_secret, passphrase, margin_amount, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `);
    
    stmt.run(userId, address, apiKey, apiSecret, passphrase, marginAmount);
    
    res.json({ success: true, message: "跟单配置保存成功，系统将开始为您追踪建仓" });
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
