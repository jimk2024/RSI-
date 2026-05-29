import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../database";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key";

// Register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: "所有字段均为必填项" });
  }

  try {
    const existingUser = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (existingUser) {
      return res.status(400).json({ error: "该邮箱已被注册" });
    }

    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    // No free membership on register now, must activate
    const stmt = db.prepare("INSERT INTO users (email, password_hash, membership_expiry) VALUES (?, ?, ?)");
    const result = stmt.run(email, hash, new Date().toISOString());

    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, message: "注册成功" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "请提供账号和密码" });
  }

  try {
    const user: any = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
    if (!user) {
      return res.status(401).json({ error: "账号或密码错误" });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "账号或密码错误" });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
    
    // Update last_login_at
    db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").run(new Date().toISOString(), user.id);
    
    res.json({ token, message: "登录成功" });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "服务器内部错误" });
  }
});

// Get Me
router.get("/me", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未授权" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    const user: any = db.prepare("SELECT id, email, membership_expiry FROM users WHERE id = ?").get(decoded.id);
    
    if (!user) {
      return res.status(404).json({ error: "用户不存在" });
    }
    
    let isExpired = true;
    if (user.membership_expiry && new Date(user.membership_expiry).getTime() > Date.now()) {
      isExpired = false;
    }

    res.json({ ...user, isExpired });
  } catch (error) {
    res.status(401).json({ error: "Token 无效或已过期" });
  }
});

export default router;
