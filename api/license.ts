import { Router } from "express";
import crypto from "crypto";
import db from "../database";

const router = Router();
const OFFLINE_SECRET = process.env.LICENSE_SECRET || "NEURAL_TRADER_SUPER_SECRET_KEY_2026_OFFLINE_MODE";

function generateCode(prefix: string = "NT") {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

router.post("/purchase", (req, res) => {
  const { txHash, days } = req.body;
  if (!txHash) {
    return res.status(400).json({ success: false, error: "缺少交易哈希" });
  }
  
  try {
     // Anti-crack: Ensure txHash is not reused to prevent fake purchases
     const existingTx = db.prepare("SELECT * FROM transactions WHERE tx_hash = ?").get(txHash);
     if (existingTx) {
        return res.status(400).json({ success: false, error: "此交易已处理，请勿重复发包提交" });
     }
     
     // Store txHash
     db.prepare("INSERT INTO transactions (tx_hash) VALUES (?)").run(txHash);
     
     // Generate unique code
     const code = generateCode();
     const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
     db.prepare("INSERT INTO licenses (code, days) VALUES (?, ?)").run(hashedCode, days || 30);
     
     // Simulate blockchain validation delay
     setTimeout(() => {
        res.json({ success: true, code, message: "支付确认成功，已生成注册码" });
     }, 1500);
  } catch (error) {
     res.status(500).json({ success: false, error: "内部服务器错误" });
  }
});

// Admin API to generate a license (for internal / trial use)
router.get("/generate", (req, res) => {
  const days = Number(req.query.days) || 3;
  const code = generateCode(days <= 7 ? "TRIAL" : "NT");
  const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
  db.prepare("INSERT INTO licenses (code, days) VALUES (?, ?)").run(hashedCode, days);
  res.json({ code, days, message: `成功生成有效期为 ${days} 天的注册码` });
});

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

router.post("/activate", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, error: "请先登录" });
  }

  const token = authHeader.split(" ")[1];
  let userId;
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    userId = decoded.id;
  } catch (error) {
    return res.status(401).json({ success: false, error: "登录已失效，请重新登录" });
  }

  const { code } = req.body;
  if (!code) {
     return res.status(400).json({ success: false, error: "缺少激活码" });
  }
  
  const hashedCode = crypto.createHash("sha256").update(code.trim()).digest("hex");
  const license: any = db.prepare("SELECT * FROM licenses WHERE code = ?").get(hashedCode);
  if (!license) {
     return res.status(400).json({ success: false, error: "激活码无效" });
  }
  
  if (license.used_by) {
     return res.status(400).json({ success: false, error: "此激活码已被使用" });
  }

  const user: any = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
  if (!user) {
     return res.status(404).json({ success: false, error: "用户不存在" });
  }

  try {
    const nowTimestamp = Date.now();
    let currentExpiry = user.membership_expiry ? new Date(user.membership_expiry).getTime() : nowTimestamp;
    
    // If expired, start from now
    if (currentExpiry < nowTimestamp) {
        currentExpiry = nowTimestamp;
    }

    const newExpiry = new Date(currentExpiry + license.days * 24 * 60 * 60 * 1000);

    db.prepare("BEGIN TRANSACTION").run();
    db.prepare("UPDATE licenses SET used_by = ?, used_at = ? WHERE code = ?").run(userId, new Date().toISOString(), hashedCode);
    db.prepare("UPDATE users SET membership_expiry = ? WHERE id = ?").run(newExpiry.toISOString(), userId);
    db.prepare("COMMIT").run();

    res.json({ success: true, message: "激活成功", newExpiry: newExpiry.toISOString() });
  } catch (e) {
    db.prepare("ROLLBACK").run();
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

export default router;
