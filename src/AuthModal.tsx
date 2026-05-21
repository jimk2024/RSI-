import React, { useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { Eye, EyeOff } from "lucide-react";

interface AuthModalProps {
  onClose: () => void;
}

export function AuthModal({ onClose }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [captchaNum1, setCaptchaNum1] = useState(0);
  const [captchaNum2, setCaptchaNum2] = useState(0);
  const [captchaAnswer, setCaptchaAnswer] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { loginText } = useAuth();

  const loadCaptcha = () => {
    setCaptchaNum1(Math.floor(Math.random() * 10) + 1);
    setCaptchaNum2(Math.floor(Math.random() * 10) + 1);
    setCaptchaAnswer("");
  };

  useEffect(() => {
    if (!isLogin) {
      loadCaptcha();
    }
  }, [isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!isLogin && password !== confirmPassword) {
        setError("两次输入的密码不一致");
        setLoading(false);
        return;
      }

      if (!isLogin && Number(captchaAnswer) !== captchaNum1 + captchaNum2) {
        setError("人机验证错误");
        loadCaptcha();
        setLoading(false);
        return;
      }

      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (text.includes("Cookie check") || text.includes("<html")) {
            const isGoogleSandbox = window.location.hostname.includes("run.app") || window.location.hostname.includes("aistudio");
            if (isGoogleSandbox) {
              throw new Error("请在新标签页打开预览以完成验证，或检查后端服务是否正常。");
            } else {
              throw new Error(`服务器返回了 HTML 代码 (HTTP ${res.status})。这通常是因为：1. 宝塔面板/自建服务器的 Nginx 反向代理 (Reverse Proxy) 未配或配置错误，导致 API 接口请求直接返回了前端首页 HTML；2. 后端 Node 服务未启动或运行崩溃；3. 如果部署在 Vercel 上，其不支持标准全栈服务器的持久数据库与进程，导致接口 404。`);
            }
          }
          throw new Error(`解析服务器回复失败 (HTTP ${res.status})。请检查接口和反代配置。`);
        }
        
        if (res.ok) {
          loginText(data.token);
          onClose();
          window.location.hash = '#/dashboard';
        } else {
          setError(data.error || "登录失败");
        }
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (e) {
          if (text.includes("Cookie check") || text.includes("<html")) {
            const isGoogleSandbox = window.location.hostname.includes("run.app") || window.location.hostname.includes("aistudio");
            if (isGoogleSandbox) {
              throw new Error("请在新标签页打开预览以完成验证，或检查后端服务是否正常。");
            } else {
              throw new Error(`服务器返回了 HTML 代码 (HTTP ${res.status})。这通常是因为：1. 宝塔面板/自建服务器的 Nginx 反向代理 (Reverse Proxy) 未配或配置错误，导致 API 接口请求直接返回了前端首页 HTML；2. 后端 Node 服务未启动或运行崩溃；3. 如果部署在 Vercel 上，其不支持标准全栈服务器的持久数据库与进程，导致接口 404。`);
            }
          }
          throw new Error(`解析服务器回复失败 (HTTP ${res.status})。请检查接口和反代配置。`);
        }
        
        if (res.ok) {
          loginText(data.token);
          onClose();
          window.location.hash = '#/dashboard';
        } else {
          setError(data.error || "注册失败");
          loadCaptcha();
        }
      }
    } catch (err: any) {
      setError(err?.message || "网络错误，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 w-full max-w-md shadow-2xl relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
        >
          ✕
        </button>
        
        <h2 className="text-2xl font-black text-white mb-6">
          {isLogin ? "登录系统" : "成为会员"}
        </h2>

        {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">账号/邮箱账号</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 text-white outline-none focus:border-[#a855f7]"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">
              {isLogin ? "登录密码" : "设置密码"}
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 pr-10 text-white outline-none focus:border-[#a855f7]"
              />
              <button 
                type="button"
                className="absolute right-3 top-[10px] text-gray-400 hover:text-white"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">重复密码</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} 
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 pr-10 text-white outline-none focus:border-[#a855f7]"
                />
                <button 
                  type="button"
                  className="absolute right-3 top-[10px] text-gray-400 hover:text-white"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}
          
          {!isLogin && (
            <div>
              <label className="text-xs text-gray-400 uppercase tracking-wider block mb-1">人机验证</label>
              <div className="flex gap-2">
                <span className="bg-[#1e2329] border border-[#474d57] rounded p-2 text-gray-300 font-mono flex items-center cursor-pointer select-none whitespace-nowrap" onClick={loadCaptcha} title="点击刷新验证码">
                  {`请计算: ${captchaNum1} + ${captchaNum2} = ?`}
                </span>
                <input 
                  type="number" 
                  required
                  placeholder="请输入答案"
                  value={captchaAnswer}
                  onChange={e => setCaptchaAnswer(e.target.value)}
                  className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 text-white outline-none focus:border-[#a855f7] font-mono"
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full py-3 mt-4 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? "处理中..." : (isLogin ? "登录" : "注册")}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {isLogin ? "还没账号？" : "已有账号？"}
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
            className="ml-2 text-white hover:underline"
          >
            {isLogin ? "立即注册" : "去登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
