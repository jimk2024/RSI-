import { Router } from "express";
import crypto from "crypto";
import db from "../database";
import jwt from "jsonwebtoken";

const router = Router();
const OFFLINE_SECRET = process.env.LICENSE_SECRET || "NEURAL_TRADER_SUPER_SECRET_KEY_2026_OFFLINE_MODE";
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

function verifyLicense(code: string): number | null {
  const hex = code.replace(/-/g, '').toUpperCase();
  if (hex.length !== 20 || !/^[0-9A-F]+$/.test(hex)) return null;
  
  const payloadHex = hex.substring(0, 12);
  const sigHex = hex.substring(12, 20);
  
  const expectedSig = crypto.createHmac('sha256', OFFLINE_SECRET)
    .update(Buffer.from(payloadHex, 'hex'))
    .digest('hex')
    .substring(0, 8)
    .toUpperCase();
    
  if (sigHex !== expectedSig) return null;
  
  const days = parseInt(payloadHex.substring(0, 4), 16);
  return days;
}

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
  
  const days = verifyLicense(code.trim());
  if (days === null || days <= 0) {
     return res.status(400).json({ success: false, error: "激活码无效" });
  }
  
  const hashedCode = crypto.createHash("sha256").update(code.trim()).digest("hex");
  const usedLicense: any = db.prepare("SELECT * FROM used_licenses WHERE code = ?").get(hashedCode);
  if (usedLicense) {
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

    const newExpiry = new Date(currentExpiry + days * 24 * 60 * 60 * 1000);

    db.prepare("BEGIN TRANSACTION").run();
    db.prepare("INSERT INTO used_licenses (code, days, used_by, used_at) VALUES (?, ?, ?, ?)").run(hashedCode, days, userId, new Date().toISOString());
    db.prepare("UPDATE users SET membership_expiry = ? WHERE id = ?").run(newExpiry.toISOString(), userId);
    db.prepare("COMMIT").run();

    res.json({ success: true, message: `激活成功，已为您增加 ${days} 天授权时长`, newExpiry: newExpiry.toISOString() });
  } catch (e) {
    db.prepare("ROLLBACK").run();
    res.status(500).json({ success: false, error: "服务器内部错误" });
  }
});

export default router;
