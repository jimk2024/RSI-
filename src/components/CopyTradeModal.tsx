import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ExternalLink } from "lucide-react";
import { Trader } from "../LeaderboardPage";

interface CopyTradeModalProps {
  trader: Trader;
  onClose: () => void;
}

export function CopyTradeModal({
  trader,
  onClose,
}: Readonly<CopyTradeModalProps>) {
  const [amount, setAmount] = useState<string>("100");
  const [leverage, setLeverage] = useState<string>("5");
  const [isSubmit, setIsSubmit] = useState(false);

  const handleSubmit = () => {
    setIsSubmit(true);
    setTimeout(() => {
      onClose();
    }, 1500);
  };

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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-md bg-[#1e2329] border border-[#2b2f36] rounded-xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[#2b2f36]">
            <h3 className="text-lg font-medium text-white">大户跟单配置</h3>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 rounded-lg hover:text-white hover:bg-[#2b2f36] transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-5">
            <div className="flex items-center space-x-3 p-3 bg-[#111419] rounded-lg">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-[#ff6c22] flex items-center justify-center text-white font-bold text-lg">
                {trader.address.charAt(2)}
              </div>
              <div>
                <div className="text-gray-300 font-mono text-sm">
                  {trader.address}
                </div>
                <div className="text-green-500 text-xs font-medium">
                  总盈亏: {trader.totalPnl > 0 ? "+" : ""}
                  {trader.totalPnl.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  单笔跟单金额 (USDC)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-[#111419] border border-[#2b2f36] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ff6c22] transition-colors"
                    placeholder="10 - 10000"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                    USDC
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  最大杠杆倍数
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={leverage}
                    onChange={(e) => setLeverage(e.target.value)}
                    className="w-full bg-[#111419] border border-[#2b2f36] text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-[#ff6c22] transition-colors"
                    placeholder="1 - 50"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500">
                    x
                  </div>
                </div>
              </div>

              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                <div className="text-orange-400 text-sm flex items-start gap-2">
                  <ExternalLink size={16} className="mt-0.5 flex-shrink-0" />
                  <p>
                    大户跟单功能目前运行在模拟环境中。您的跟单操作将被记录并用于监控表现，但不会消耗真实资金。
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={isSubmit}
              className="w-full py-3 bg-[#ff6c22] hover:bg-[#e85b17] text-white font-medium rounded-lg transition-colors flex justify-center items-center h-12"
            >
              {isSubmit ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></div>
                  正在配置...
                </>
              ) : (
                "确认跟单"
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
