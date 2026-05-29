import React, { useState, useEffect } from "react";

export function AdminPage() {
  const [token, setToken] = useState<string | null>(localStorage.getItem("admin_token"));
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [licenses, setLicenses] = useState<any[]>([]);
  const [txs, setTxs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/sys-control/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        if (text.includes("Cookie check") || text.includes("<html")) {
          const isGoogleSandbox = window.location.hostname.includes("run.app") || window.location.hostname.includes("aistudio");
          if (isGoogleSandbox) {
            throw new Error("请在新标签页打开预览以完成验证，或检查后端服务是否正常启动。");
          } else {
            throw new Error(`服务器返回了 HTML 代码 (HTTP ${res.status})。这通常是因为：1. 宝塔面板/自建服务器的 Nginx 反向代理 (Reverse Proxy) 未配或配置错误，导致 API 接口请求直接返回了前端首页 HTML；2. 后端 Node 服务未启动或运行崩溃；3. 如果部署在 Vercel 上，其不支持标准全栈服务器的持久数据库与进程，导致接口 404。`);
          }
        }
        throw new Error(`请求失败 (HTTP ${res.status})。若您已迁移至宝塔/自建服务器，请检查接口和反代配置。`);
      }

      if (res.ok) {
        localStorage.setItem("admin_token", data.token);
        setToken(data.token);
      } else {
        setError(data.error || "登录失败");
      }
    } catch (err: any) {
      console.error(err);
      setError("网络错误: " + err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const logout = () => {
    localStorage.removeItem("admin_token");
    setToken(null);
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/sys-control/stats", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const text = await res.text();
        try { setStats(JSON.parse(text)); } catch (e) {}
      }
    } catch (e) {}
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/sys-control/users", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const text = await res.text();
        try { setUsers(JSON.parse(text).users); } catch (e) {}
      }
    } catch (e) {}
  };

  const fetchLicenses = async () => {
    try {
      const res = await fetch("/api/sys-control/licenses", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const text = await res.text();
        try { setLicenses(JSON.parse(text).licenses); } catch (e) {}
      }
    } catch (e) {}
  };

  const fetchTxs = async () => {
    try {
      const res = await fetch("/api/sys-control/transactions", { headers: { "Authorization": `Bearer ${token}` } });
      if (res.ok) {
        const text = await res.text();
        try { setTxs(JSON.parse(text).txs); } catch (e) {}
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (token) {
      if (activeTab === "overview") fetchStats();
      else if (activeTab === "users") fetchUsers();
      else if (activeTab === "licenses") fetchLicenses();
      else if (activeTab === "transactions") fetchTxs();
    }
  }, [token, activeTab]);

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex items-center justify-center p-4">
        <form onSubmit={login} className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 w-full max-w-sm">
          <h1 className="text-xl text-white font-bold mb-6 text-center">系统管理后台登录</h1>
          {error && <div className="text-red-500 mb-4 text-sm text-center">{error}</div>}
          <div className="space-y-4">
            <input 
              type="text" 
              placeholder="管理员账号"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 text-white outline-none" 
            />
            <input 
              type="password" 
              placeholder="密码"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-[#1e2329] border border-[#474d57] rounded p-2 text-white outline-none" 
            />
            <button disabled={loading} type="submit" className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700 font-bold">登录</button>
            <button type="button" onClick={() => window.location.hash = '#/'} className="w-full py-2 bg-transparent text-gray-500 hover:text-white rounded border border-[#474d57]">返回首页</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-gray-300 flex">
      {/* Sidebar */}
      <div className="w-48 bg-[#161a1e] border-r border-[#2b2f36] flex flex-col">
        <div className="p-4 border-b border-[#2b2f36] text-white font-bold text-center">
          NEURAL ADMIN
        </div>
        <div className="flex-1 p-2 space-y-1">
          {['overview', 'users', 'licenses', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-2 rounded text-sm ${activeTab === tab ? 'bg-purple-600 text-white' : 'hover:bg-[#1e2329] text-gray-400'}`}
            >
              {tab === 'overview' && '数据总览'}
              {tab === 'users' && '用户管理'}
              {tab === 'licenses' && '激活码库'}
              {tab === 'transactions' && '交易记录'}
            </button>
          ))}
        </div>
        <button onClick={logout} className="p-4 text-sm text-red-500 hover:bg-[#1e2329]">
          安全退出
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8 overflow-y-auto">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-2xl text-white font-bold mb-6">数据总览</h2>
            <div className="grid grid-cols-3 gap-6">
              <div className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl">
                <div className="text-gray-500 text-sm mb-2">总注册用户</div>
                <div className="text-3xl text-white">{stats?.usersCount || 0}</div>
              </div>
              <div className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl">
                <div className="text-gray-500 text-sm mb-2">生成激活码数</div>
                <div className="text-3xl text-white">{stats?.licensesCount || 0}</div>
              </div>
              <div className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl">
                <div className="text-gray-500 text-sm mb-2">有效交易数</div>
                <div className="text-3xl text-white">{stats?.txCount || 0}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h2 className="text-2xl text-white font-bold mb-6">用户管理</h2>
            <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e2329] text-gray-400">
                  <tr>
                     <th className="p-4">ID</th>
                     <th className="p-4">账号/邮箱</th>
                     <th className="p-4">最后登录时间</th>
                     <th className="p-4">授权到期时间</th>
                     <th className="p-4">注册时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2f36]">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-[#1e2329]/50">
                      <td className="p-4">{u.id}</td>
                      <td className="p-4 text-white font-medium">{u.email}</td>
                      <td className="p-4 text-gray-500">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '从未使用'}</td>
                      <td className="p-4">
                         {u.membership_expiry ? (
                            new Date(u.membership_expiry).getTime() > Date.now() ? 
                              <span className="text-green-500">{new Date(u.membership_expiry).toLocaleString()}</span> : 
                              <span className="text-red-500">{new Date(u.membership_expiry).toLocaleString()} (已过期)</span>
                         ) : <span className="text-gray-500">未激活</span>}
                      </td>
                      <td className="p-4 text-gray-500">{new Date(u.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'licenses' && (
          <div>
            <h2 className="text-2xl text-white font-bold mb-6">激活码库 (已使用)</h2>
            <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e2329] text-gray-400">
                  <tr>
                     <th className="p-4">激活码(Hash)</th>
                     <th className="p-4">天数</th>
                     <th className="p-4">使用者 ID</th>
                     <th className="p-4">使用时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2f36]">
                  {licenses.map(l => (
                    <tr key={l.code} className="hover:bg-[#1e2329]/50">
                      <td className="p-4 font-mono text-purple-400">{l.code}</td>
                      <td className="p-4 text-green-500">+{l.days} 天</td>
                      <td className="p-4">{l.used_by}</td>
                      <td className="p-4 text-gray-500">{new Date(l.used_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <h2 className="text-2xl text-white font-bold mb-6">交易记录</h2>
            <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#1e2329] text-gray-400">
                  <tr>
                     <th className="p-4">交易 Hash</th>
                     <th className="p-4">记录时间</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2b2f36]">
                  {txs.map(t => (
                    <tr key={t.tx_hash} className="hover:bg-[#1e2329]/50">
                      <td className="p-4 font-mono text-gray-400">{t.tx_hash}</td>
                      <td className="p-4 text-gray-500">{new Date(t.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
