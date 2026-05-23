import React from 'react';
import { motion } from 'motion/react';
import { Activity, BrainCircuit, LineChart, Zap, ChevronRight, Cpu } from 'lucide-react';

interface LandingPageProps {
  onEnter: () => void;
}

export function LandingPage({ onEnter }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#e0e3e7] font-sans selection:bg-[#a855f7] selection:text-white relative overflow-hidden flex flex-col">
      {/* Background accents */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#a855f7] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-5%] w-[600px] h-[600px] bg-[#22c55e] rounded-full blur-[150px] opacity-10 pointer-events-none"></div>
      
      {/* Grid overlay */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CgkJPHBhdGggZD0iTTAgMjBMMjAgMjBMMjAgMCIgZmlsbD0ibm9uZSIgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiPjwvcGF0aD4KCTwvc3ZnPg==')] pointer-events-none"></div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
            <h1 className="text-2xl flex items-center font-sans tracking-widest drop-shadow-sm">
                <span className="font-light text-gray-400">NEURAL</span>
                <span className="font-black text-white">TRADER</span>
            </h1>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-gray-400">
          <a href="#/features" className="hover:text-white transition-colors">核心功能</a>
          <a href="#/technology" className="hover:text-white transition-colors">技术架构</a>
          <a href="#/docs" className="hover:text-white transition-colors">帮助文档</a>
        </nav>
        <button 
          onClick={onEnter}
          className="px-6 py-2 rounded-full border border-[#2b2f36] bg-[#161a1e] hover:bg-[#1e2329] hover:border-gray-500 transition-all text-sm font-bold tracking-wider"
        >
          启动终端
        </button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pt-12 pb-24 max-w-7xl mx-auto text-center w-full">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="max-w-4xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1e2329]/80 border border-[#2b2f36] mb-8 shadow-sm backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-mono tracking-widest uppercase text-gray-300">新一代量化架构平台</span>
          </div>
          
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-8 leading-[1.1]">
            毫秒级机器运算 <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-gray-200 via-white to-gray-400">
              赋予你全盘控制
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-gray-400 font-light mb-12 max-w-2xl mx-auto leading-relaxed">
            专业的量化交易终端，提供实时数据追踪、多位图表联动以及基于 OKX 的快捷执行。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onEnter}
              className="group relative px-8 py-4 bg-white text-black font-bold rounded-lg text-lg flex items-center justify-center gap-2 overflow-hidden hover:scale-105 transition-transform"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <span className="relative z-10">进入实时控制台</span>
              <ChevronRight className="relative z-10 w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </motion.div>

        {/* Feature Highlights Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-32 w-full text-left">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.2 }}
             className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl relative group overflow-hidden"
          >
             <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#a855f7]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 bg-[#1e2329] rounded-lg flex items-center justify-center mb-6 text-[#a855f7]">
               <BrainCircuit size={24} />
             </div>
             <h3 className="text-xl font-bold mb-3 tracking-wide">起爆预警检测系统</h3>
             <p className="text-gray-400 text-sm leading-relaxed">内置高级技术分析矩阵引擎，严格监控 15M / 1H / 4H 级别动能，实时为您寻找极高确定性的市场起爆机会。</p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.4 }}
             className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl relative group overflow-hidden"
          >
             <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 bg-[#1e2329] rounded-lg flex items-center justify-center mb-6 text-white">
               <LineChart size={24} />
             </div>
             <h3 className="text-xl font-bold mb-3 tracking-wide">专业多标签图表</h3>
             <p className="text-gray-400 text-sm leading-relaxed">完美集成 TradingView 轻量级图表技术，支持多周期十字线完美同步、K线复盘及极速图表交互。</p>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.6, delay: 0.6 }}
             className="bg-[#161a1e] border border-[#2b2f36] p-6 rounded-xl relative group overflow-hidden"
          >
             <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-[#22c55e]/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
             <div className="w-12 h-12 bg-[#1e2329] rounded-lg flex items-center justify-center mb-6 text-[#22c55e]">
               <Activity size={24} />
             </div>
             <h3 className="text-xl font-bold mb-3 tracking-wide">实盘数据追踪</h3>
             <p className="text-gray-400 text-sm leading-relaxed">提供实时的多空持仓比例及资金费率追踪，帮助分析了解当前市场情绪状态。</p>
          </motion.div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="relative z-10 border-t border-[#2b2f36] bg-[#0b0e11] py-8 w-full text-center">
        <p className="text-xs font-mono text-gray-500 uppercase tracking-widest">
            NeuralTrader © 2026 / 量化矩阵
        </p>
      </footer>
    </div>
  );
}
