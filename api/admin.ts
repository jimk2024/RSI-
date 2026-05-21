import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import db from "../database";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Initialize admin if none exists
const adminCount = db.prepare("SELECT COUNT(*) as count FROM admins").get() as any;
if (adminCount.count === 0) {
  const randomUsername = "admin_" + crypto.randomBytes(4).toString('hex');
  const randomPassword = crypto.randomBytes(6).toString('hex');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(randomPassword, salt);
  db.prepare("INSERT INTO admins (username, password_hash) VALUES (?, ?)").run(randomUsername, hash);
  import("fs").then(fs => {
    fs.writeFileSync("admin_credentials.txt", `Username: ${randomUsername}\nPassword: ${randomPassword}`);
  });
  console.log("=========================================");
  console.log(" INITIALIZED ADMIN ACCOUNT ");
  console.log(` Username: ${randomUsername}`);
  console.log(` Password: ${randomPassword}`);
  console.log("=========================================");
}

// Admin Login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: "请输入用户名和密码" });
  }

  try {
    const admin: any = db.prepare("SELECT * FROM admins WHERE username = ?").get(username);
    if (!admin) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const isMatch = bcrypt.compareSync(password, admin.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "用户名或密码错误" });
    }

    const token = jwt.sign({ id: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, message: "登录成功" });
  } catch (error) {
    res.status(500).json({ error: "服务器错误" });
  }
});

// Middleware to check admin auth
const requireAdmin = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未授权" });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: "禁止访问" });
    }
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(401).json({ error: "无效的超管令牌" });
  }
};

// Get Dashboard Stats
router.get("/stats", requireAdmin, (req, res) => {
  try {
    const usersCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
    const licensesCount = (db.prepare("SELECT COUNT(*) as count FROM licenses").get() as any).count;
    const txCount = (db.prepare("SELECT COUNT(*) as count FROM transactions").get() as any).count;
    res.json({ usersCount, licensesCount, txCount });
  } catch (error) {
    res.status(500).json({ error: "查询失败" });
  }
});

// Get Users
router.get("/users", requireAdmin, (req, res) => {
  try {
    const users = db.prepare("SELECT id, email, membership_expiry, created_at FROM users ORDER BY id DESC").all();
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: "查询失败" });
  }
});

// Get Licenses
router.get("/licenses", requireAdmin, (req, res) => {
  try {
    const licenses = db.prepare("SELECT * FROM licenses ORDER BY created_at DESC").all();
    res.json({ licenses });
  } catch (error) {
    res.status(500).json({ error: "查询失败" });
  }
});

// Get Transactions
router.get("/transactions", requireAdmin, (req, res) => {
  try {
    const txs = db.prepare("SELECT * FROM transactions ORDER BY created_at DESC").all();
    res.json({ txs });
  } catch (error) {
    res.status(500).json({ error: "查询失败" });
  }
});

function generateCode(prefix: string = "NT") {
  return `${prefix}-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
}

// Generate Trial License
router.post("/generate-license", requireAdmin, (req, res) => {
  const { days } = req.body;
  if (!days) return res.status(400).json({ error: "请提供有效天数" });
  
  try {
    const code = generateCode(days <= 7 ? "TRIAL" : "NT");
    const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
    db.prepare("INSERT INTO licenses (code, days) VALUES (?, ?)").run(hashedCode, days);
    res.json({ success: true, code, days });
  } catch (error) {
    res.status(500).json({ error: "生成失败" });
  }
});

export default router;
