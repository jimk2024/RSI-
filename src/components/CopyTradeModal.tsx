import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink, Key, Lock, Eye, EyeOff, ShieldCheck, Activity } from "lucide-react";
import { Trader } from "../LeaderboardPage";

interface CopyTradeModalProps {
  trader: Trader;
  onClose: () => void;
  onSuccess?: (marginAmount: number, nominalValue: number) => void;
}

export function CopyTradeModal({
  trader,
  onClose,
  onSuccess
}: Readonly<CopyTradeModalProps>) {
  const [amount, setAmount] = useState<string>("1000");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  
  const [isSubmit, setIsSubmit] = useState(false);

  const handleSubmit = async () => {
    setIsSubmit(true);
    const parsedAmount = parseFloat(amount) || 0;
    const token = localStorage.getItem("token");
    if (!token) {
       alert("请先登录");
       setIsSubmit(false);
       return;
    }

    try {
      const res = await fetch("/api/copy-trades", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          address: trader.fullAddress || trader.address,
          apiKey,
          apiSecret,
          passphrase,
          marginAmount: parsedAmount
        })
      });

      if (!res.ok) {
        const err = await res.json();
        alert("跟单失败：" + (err.error || "未知错误"));
        setIsSubmit(false);
        return;
      }

      const totalNominal = positions.reduce((acc, pos) => acc + (parsedAmount * pos.weight * pos.leverage), 0);
      onSuccess?.(parsedAmount, totalNominal);
      onClose();
    } catch (e) {
      console.error(e);
      alert("提交失败，请重试");
      setIsSubmit(false);
    }
  };

  const [positions, setPositions] = useState<any[]>([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  useEffect(() => {
    let isMounted = true;
    async function fetchPositions() {
      try {
        setLoadingPositions(true);
        const res = await fetch("/api/hyperliquid/clearinghouseState", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user: trader.fullAddress || trader.address })
        });
        if (!res.ok) throw new Error("Failed to load positions");
        const data = await res.json();
        
        if (isMounted && data && Array.isArray(data.assetPositions)) {
          const totalMarginUsed = data.assetPositions.reduce((sum: number, pos: any) => sum + parseFloat(pos.position.marginUsed || "0"), 0);
          
          const formatted = data.assetPositions.map((pos: any) => {
            const coin = pos.position.coin;
            const szi = parseFloat(pos.position.szi);
            const marginUsed = parseFloat(pos.position.marginUsed || "0");
            const side = szi > 0 ? "long" : "short";
            const leverage = pos.position.leverage?.value || 1;
            const weight = totalMarginUsed > 0 ? marginUsed / totalMarginUsed : 0;
            
            return {
              symbol: `${coin}-USDT-SWAP`,
              side,
              leverage,
              weight
            };
          }).filter((p: any) => p.weight > 0);
          
          setPositions(formatted);
        }
      } catch (err) {
        console.error("Failed to fetch target positions", err);
      } finally {
        if (isMounted) setLoadingPositions(false);
      }
    }
    fetchPositions();
    
    return () => { isMounted = false; };
  }, [trader]);

  const parsedAmount = parseFloat(amount) || 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden bg-[#1e2329] border border-[#2b2f36] rounded-xl shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#2b2f36] bg-[#161a1e] flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[#ff6c22] to-orange-600 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                {trader.address.charAt(2)}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  跟单配置
                </h3>
                <div className="text-gray-400 font-mono text-xs">
                  Target: {trader.address}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 rounded-lg hover:text-white hover:bg-[#2b2f36] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-0">
            {/* Left: Configuration */}
            <div className="w-full md:w-1/2 p-6 space-y-6 border-b md:border-b-0 md:border-r border-[#2b2f36] bg-[#1e2329] overflow-y-auto">
              
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-white font-medium pb-2 border-b border-[#2b2f36]">
                  <ShieldCheck size={18} className="text-[#ff6c22]" />
                  OKX API 配置 （请使用独立子账户进行跟单）
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">API Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Key size={14} />
                    </div>
                    <input
                      type="text"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="w-full bg-[#111419] border border-[#2b2f36] text-white text-sm rounded-lg pl-9 px-4 py-2.5 focus:outline-none focus:border-[#ff6c22] transition-colors"
                      placeholder="输入您的 OKX API Key"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Secret Key</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Lock size={14} />
                    </div>
                    <input
                      type={showSecret ? "text" : "password"}
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      className="w-full bg-[#111419] border border-[#2b2f36] text-white text-sm rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:border-[#ff6c22] transition-colors"
                      placeholder="输入您的 OKX Secret Key"
                    />
                    <button 
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">Passphrase</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                      <Lock size={14} />
                    </div>
                    <input
                      type={showSecret ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      className="w-full bg-[#111419] border border-[#2b2f36] text-white text-sm rounded-lg pl-9 px-4 py-2.5 focus:outline-none focus:border-[#ff6c22] transition-colors"
                      placeholder="输入 API Passphrase"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 text-white font-medium pb-2 border-b border-[#2b2f36]">
                  <Activity size={18} className="text-[#ff6c22]" />
                  跟单资金配置
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1.5">
                    总跟单保证金 (USDT)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[#111419] border border-[#2b2f36] text-white rounded-lg px-4 py-3 font-mono focus:outline-none focus:border-[#ff6c22] transition-colors"
                      placeholder="例如: 1000"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-500 font-medium">
                      USDT
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-[#ff6c22]/10 border border-[#ff6c22]/20 rounded-lg p-4">
                <div className="text-[#ff6c22] text-sm flex items-start gap-2.5">
                  <ExternalLink size={16} className="mt-0.5 flex-shrink-0" />
                  <div className="space-y-2">
                    <p className="font-semibold text-[13px]">OKX 智能合约跟单规则</p>
                    <ul className="list-disc pl-4 text-xs space-y-1.5 text-[#ff6c22]/80">
                      <li><strong>自动杠杆：</strong>杠杆倍数完全同步跟随大户对应仓位的真实杠杆。</li>
                      <li><strong>全仓模式 (默认)：</strong>使用账户 USDT 余额作为统一保证金池进行全仓担保。</li>
                      <li><strong>尽力跟单：</strong>如遇滑点过大或深度不足，引擎将执行尽力按比例建仓，保证结构最大程度一致。</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Simulation preview */}
            <div className="w-full md:w-1/2 p-6 flex flex-col min-h-0 overflow-hidden bg-[#161a1e]">
              <div className="mb-4 flex-shrink-0">
                <h4 className="text-white font-medium text-sm">建仓结构预览</h4>
                <p className="text-xs text-gray-500 mt-1">
                  根据目标大户当前持仓及您设置的 {parsedAmount.toLocaleString()} USDT 实时计算
                </p>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 max-h-[400px] md:max-h-none space-y-3 pr-2 scroll-smooth [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-[#2b2f36] [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#3a3f4a]">
                {loadingPositions ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-3">
                    <div className="w-6 h-6 border-2 border-[#ff6c22]/30 border-t-[#ff6c22] rounded-full animate-spin"></div>
                    <span className="text-gray-500 text-sm">正在同步大户真实持仓...</span>
                  </div>
                ) : positions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 space-y-2">
                    <div className="w-12 h-12 rounded-full bg-[#111419] flex items-center justify-center text-gray-500 mb-2">
                      <Activity size={24} />
                    </div>
                    <span className="text-gray-400 text-sm">该大户当前空仓</span>
                    <span className="text-gray-600 text-xs">引擎将持续监听，建仓后自动为您跟进</span>
                  </div>
                ) : (
                  positions.map((pos) => {
                    const marginRequired = parsedAmount * pos.weight;
                    const posValue = marginRequired * pos.leverage;
                    const isLong = pos.side === "long";

                    return (
                      <div key={pos.symbol} className="p-3 bg-[#1e2329] rounded-lg border border-[#2b2f36] hover:border-[#3a3f4a] transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isLong ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                              {isLong ? '做多' : '做空'}
                            </span>
                            <span className="text-white font-medium text-sm">{pos.symbol}</span>
                            <span className="text-gray-500 text-xs">{pos.leverage}x</span>
                          </div>
                          <div className="text-gray-400 text-xs">
                            占比 {(pos.weight * 100).toFixed(0)}%
                          </div>
                        </div>
                        
                        <div className="w-full bg-[#111419] h-1.5 rounded-full overflow-hidden mb-3">
                          <div 
                            className={`h-full rounded-full ${isLong ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${pos.weight * 100}%` }}
                          />
                        </div>
                        
                        <div className="flex justify-between items-center text-xs">
                          <div className="flex flex-col">
                            <span className="text-gray-500">分配保证金</span>
                            <span className="text-white font-mono">{marginRequired.toLocaleString(undefined, {maximumFractionDigits: 2})} USDT</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-gray-500">预估价值</span>
                            <span className="text-white font-mono">{posValue.toLocaleString(undefined, {maximumFractionDigits: 2})} USDT</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-auto pt-4 border-t border-[#2b2f36] flex-shrink-0">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm text-gray-400">总预估名义价值</span>
                  <span className="text-lg font-mono font-bold text-white">
                    {positions.reduce((acc, pos) => acc + (parsedAmount * pos.weight * pos.leverage), 0).toLocaleString(undefined, {maximumFractionDigits: 2})} USDT
                  </span>
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmit || !apiKey || !apiSecret || !passphrase || parsedAmount <= 0}
                  className="w-full py-3.5 bg-[#ff6c22] hover:bg-[#e85b17] disabled:bg-[#ff6c22]/50 disabled:text-white/50 text-white font-medium rounded-lg transition-colors flex justify-center items-center"
                >
                  {isSubmit ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                      正在下发指令...
                    </>
                  ) : (
                    "确认授权并立即跟单"
                  )}
                </button>
              </div>

            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

