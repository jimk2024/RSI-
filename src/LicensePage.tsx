import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import { Send } from "lucide-react";

export function LicensePage({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, token, refreshUser } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");

    try {
        const res = await fetch("/api/license/activate", {
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ code: code.trim() })
        });
        const data = await res.json();
        
        if (data.success) {
            await refreshUser();
            window.location.hash = '#/dashboard';
        } else {
            setError(data.error || "激活失败");
            setLoading(false);
        }
    } catch {
        setError("网络错误，无法连接验证服务器");
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0e11] flex flex-col items-center justify-center font-sans relative overflow-hidden selection:bg-[#a855f7] selection:text-white px-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(43,47,54,0.3)_0%,rgba(11,14,17,1)_100%)]"></div>
      
      <div className="z-10 bg-[#161a1e] border border-[#2b2f36] rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
        <button onClick={onBack} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">✕</button>

        <div className="flex flex-col items-center mb-6">
            <h1 className="text-2xl flex items-center font-sans tracking-widest drop-shadow-sm mb-2">
                <span className="font-light text-gray-400">NEURAL</span>
                <span className="font-black text-white">TRADER</span>
            </h1>
            <div className="text-[10px] tracking-widest font-sans text-[#a855f7] uppercase px-3 py-1 bg-[#a855f7]/10 rounded-full border border-[#a855f7]/30">
              云端授权验证
            </div>
        </div>

        <p className="text-gray-400 text-sm text-center mb-6 leading-relaxed">
          用户 <span className="text-white font-bold">{user?.email}</span> 您好，您的系统使用权已到期或尚未激活。<br/>请输入您的系统激活码解锁终端控制台。
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-center justify-center gap-1.5 text-xs text-[#3b82f6] bg-[#3b82f6]/10 border border-[#3b82f6]/20 py-2.5 px-3 rounded-lg">
            <Send size={14} className="-ml-1 -rotate-12" />
            <span>可加入Telegram群获取激活码：</span>
            <a href="https://t.me/aitrader100" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 font-bold tracking-wide">
              https://t.me/aitrader100
            </a>
          </div>

          <div>
            <label className="text-xs text-gray-400 uppercase tracking-wider block mb-2 font-mono">
              Activation License Key
            </label>
            <input 
              type="text" 
              required
              placeholder="NT-XXXX-XXXX"
              value={code}
              onChange={e => setCode(e.target.value)}
              className="w-full bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-3 text-white outline-none focus:border-[#a855f7] font-mono tracking-wider text-center placeholder:text-gray-700 focus:shadow-[0_0_10px_rgba(168,85,247,0.2)] transition-all"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading || !code.trim()}
            className="w-full py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(255,255,255,0.3)]"
          >
            {loading ? "联网验证中..." : "激活系统并进入控制台"}
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-gray-600 border-t border-[#2b2f36] pt-6 flex flex-col gap-2">
          <p>如需获取系统授权码或续订服务时长，请联系管理员获取激活码。</p>
        </div>
      </div>
    </div>
  );
}
