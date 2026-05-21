import React, { useState } from "react";
import { CheckCircle2, ChevronRight, Copy, ExternalLink, ShieldCheck, Wallet } from "lucide-react";

export function PurchasePage({ onEnter }: { onEnter?: () => void }) {
  const [selectedPlan, setSelectedPlan] = useState(30);
  const [walletConnected, setWalletConnected] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activationCode, setActivationCode] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);

  const plans = [
    { days: 30, price: 30, name: "包月授权", save: "" },
    { days: 90, price: 80, name: "包季授权", save: "省 10 U" },
    { days: 365, price: 280, name: "包年授权", save: "省 80 U" }
  ];

  const handleWalletConnect = () => {
    setShowWalletModal(false);
    setWalletConnected(true);
  };

  const handlePay = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/license/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Simulated transaction hash for demo
        body: JSON.stringify({ txHash: "0x" + Math.random().toString(16).slice(2, 66), days: selectedPlan })
      });
      const data = await res.json();
      if (data.success) {
        setActivationCode(data.code);
      } else {
        alert(data.error);
      }
    } catch {
      console.error("Payment API Error");
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPrice = plans.find(p => p.days === selectedPlan)?.price || 30;

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#e0e3e7] font-sans selection:bg-[#a855f7] selection:text-white pb-20">
      {/* Header */}
      <header className="flex justify-between items-center p-6 max-w-7xl mx-auto w-full">
        <h1 
          className="text-2xl flex items-center font-sans tracking-widest drop-shadow-sm cursor-pointer"
          onClick={() => window.location.hash = '#/'}
        >
          <span className="font-light text-gray-400">NEURAL</span>
          <span className="font-black text-white">TRADER</span>
        </h1>
        <nav className="hidden md:flex gap-8 text-sm font-bold tracking-widest text-[#a855f7]">
          <a href="#/features" className="hover:text-white transition-colors">核心功能</a>
          <a href="#/technology" className="hover:text-white transition-colors">技术架构</a>
          <a href="#/docs" className="hover:text-white transition-colors">帮助文档</a>
          <a href="#/purchase" className="text-white transition-colors">购买激活码</a>
        </nav>
        <button 
          onClick={onEnter || (() => window.location.hash = '#/dashboard')}
          className="px-6 py-2 rounded-full border border-[#2b2f36] bg-[#161a1e] hover:bg-[#1e2329] hover:border-gray-500 transition-all text-sm font-bold tracking-wider"
        >
          启动终端
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-black mb-4">购买系统激活码</h2>
          <p className="text-gray-400 text-lg">支持多链 USDT 支付，交易确认后自动下发授权凭证</p>
        </div>

        {activationCode ? (
          <div className="bg-[#161a1e] border-2 border-[#22c55e] rounded-xl p-10 text-center shadow-[0_0_30px_rgba(34,197,94,0.15)] animate-in fade-in zoom-in slide-in-from-bottom-4 duration-500 max-w-2xl mx-auto">
            <CheckCircle2 className="w-16 h-16 text-[#22c55e] mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-white mb-2">支付完成，您的系统已激活</h3>
            <p className="text-gray-400 mb-8">激活码已自动注入本地环境，请妥善保管以下凭证以备更换设备时使用。</p>
            
            <div className="bg-[#0b0e11] border border-[#2b2f36] p-6 rounded-lg mb-8 relative group">
              <div className="font-mono text-xl tracking-widest text-[#a855f7] select-all break-all text-left">
                {activationCode}
              </div>
              <button 
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-[#2b2f36] hover:bg-[#474d57] p-2 rounded text-white transition-colors"
                onClick={() => navigator.clipboard.writeText(activationCode)}
                title="复制激活码"
              >
                <Copy size={20} />
              </button>
            </div>

            <button 
              onClick={() => window.location.hash = '#/dashboard'}
              className="px-8 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)] inline-flex items-center gap-2"
            >
              启动终端平台 <ChevronRight size={18} />
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Left: Pricing */}
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-white mb-6">1. 选择授权时长</h3>
              {plans.map((plan) => (
                <div 
                  key={plan.days}
                  onClick={() => setSelectedPlan(plan.days)}
                  className={`border rounded-xl p-6 cursor-pointer transition-all flex items-center justify-between ${
                    selectedPlan === plan.days 
                      ? 'bg-[#1e2329] border-[#a855f7] shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                      : 'bg-[#161a1e] border-[#2b2f36] hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                      selectedPlan === plan.days ? 'border-[#a855f7]' : 'border-gray-500'
                    }`}>
                      {selectedPlan === plan.days && <div className="w-2.5 h-2.5 bg-[#a855f7] rounded-full"></div>}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg text-white">{plan.name}</h4>
                      {plan.save && <span className="text-xs text-[#22c55e] border border-[#22c55e]/30 bg-[#22c55e]/10 px-2 py-0.5 rounded ml-2">{plan.save}</span>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black font-mono">{plan.price} U</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right: Payment */}
            <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 flex flex-col">
              <h3 className="text-xl font-bold text-white mb-6">2. 加密货币支付</h3>
              
              <div className="bg-[#0b0e11] border border-[#2b2f36] rounded-lg p-5 mb-8 flex justify-between items-center">
                <span className="text-gray-400">支付总额</span>
                <span className="text-3xl font-black font-mono text-[#a855f7]">{currentPrice} USDT</span>
              </div>

              {!walletConnected ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                  <Wallet size={48} className="text-gray-600 mb-6" />
                  <p className="text-gray-400 text-center mb-6 px-4">
                    请连接您的 Web3 钱包以进行签名和交易。支持 MetaMask, OKX Wallet, Binance 等主流钱包。
                  </p>
                  <button 
                    onClick={() => setShowWalletModal(true)}
                    className="w-full py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                  >
                    连接钱包 (Connect Wallet)
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex items-center gap-3 bg-[#1e2329] border border-[#2b2f36] rounded p-4 mb-6">
                    <div className="w-2 h-2 rounded-full bg-[#22c55e]"></div>
                    <span className="font-mono text-sm text-gray-300">0x742d...44e</span>
                    <button className="text-xs text-blue-400 ml-auto flex items-center gap-1 hover:underline" onClick={() => setWalletConnected(false)}>
                      断开连接 <ExternalLink size={12} />
                    </button>
                  </div>

                  <div className="space-y-4 mt-auto">
                    <p className="text-xs text-gray-500 flex items-center justify-center gap-2">
                      <ShieldCheck size={14} /> 采用去中心化智能合约处理，资金安全可靠
                    </p>
                    <button 
                      onClick={handlePay}
                      disabled={isProcessing}
                      className="w-full py-4 bg-[#a855f7] text-white font-bold rounded-lg hover:bg-[#9333ea] transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] relative overflow-hidden"
                    >
                      {isProcessing ? (
                        <span className="flex items-center justify-center gap-2">
                           <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                           处理交易中...
                        </span>
                      ) : (
                        `安全支付 ${currentPrice} USDT`
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Mock Wallet Connect Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#161a1e] border border-[#2b2f36] rounded-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             <div className="p-4 border-b border-[#2b2f36] flex justify-between items-center">
                <h3 className="font-bold text-lg text-white">连接您的钱包</h3>
                <button onClick={() => setShowWalletModal(false)} className="text-gray-500 hover:text-white">✕</button>
             </div>
             <div className="p-4 space-y-2">
                {[
                  { name: 'MetaMask', color: 'hover:border-[#f6851b]' },
                  { name: 'OKX Web3 Wallet', color: 'hover:border-white' },
                  { name: 'Binance Web3', color: 'hover:border-[#f0b90b]' },
                  { name: 'WalletConnect', color: 'hover:border-[#3b99fc]' }
                ].map(wallet => (
                  <button 
                    key={wallet.name}
                    onClick={handleWalletConnect}
                    className={`w-full bg-[#0b0e11] border border-[#2b2f36] p-4 rounded-xl flex items-center justify-between transition-colors text-white ${wallet.color}`}
                  >
                     <span className="font-bold">{wallet.name}</span>
                     <ChevronRight size={18} className="text-gray-600" />
                  </button>
                ))}
             </div>
             <div className="p-4 bg-[#0b0e11] text-xs text-center text-gray-500">
               新用户如何创建加密钱包？ <a href="https://web3js.readthedocs.io/" target="_blank" className="text-[#a855f7] hover:underline" rel="noreferrer">了解更多</a>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
