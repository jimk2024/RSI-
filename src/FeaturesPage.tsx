import React from "react";

export function FeaturesPage({ onEnter }: { onEnter?: () => void }) {
  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#e0e3e7] font-sans selection:bg-[#a855f7] selection:text-white pb-20">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <a href="#/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <h1 className="text-2xl flex items-center font-sans tracking-widest drop-shadow-sm">
                <span className="font-light text-gray-400">NEURAL</span>
                <span className="font-black text-white">TRADER</span>
            </h1>
        </a>
        <nav className="hidden md:flex gap-8 text-sm font-medium tracking-wide text-gray-400">
          <a href="#/features" className="text-white transition-colors">核心功能</a>
          <a href="#/technology" className="hover:text-white transition-colors">技术架构</a>
          <a href="#/docs" className="hover:text-white transition-colors">帮助文档</a>
        </nav>
        <button 
          onClick={onEnter || (() => window.location.hash = '#/dashboard')}
          className="px-6 py-2 rounded-full border border-[#2b2f36] bg-[#161a1e] hover:bg-[#1e2329] hover:border-gray-500 transition-all text-sm font-bold tracking-wider"
        >
          启动终端
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <h2 className="text-4xl font-black mb-8">核心功能</h2>
        <div className="space-y-12">
          <section>
            <h3 className="text-2xl font-bold text-white mb-4">实时多空资金监控</h3>
            <p className="text-gray-400 leading-relaxed">
              系统原生接入 OKX API，毫秒级获取全市场各大交易对的资金费率（Funding Rate）、持仓量（Open Interest）以及多空比（Long/Short Ratio）。通过数据分析引擎进行聚合计算，帮你在波谲云诡的市场中提前发现资金流向。
            </p>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-white mb-4">技术指标扫描</h3>
            <p className="text-gray-400 leading-relaxed">
              内置基础的技术分析辅助扫描功能，通过均线、RSI 甚至是简单的放量状态进行即时条件过滤。从几百个市场交易对中筛选出符合趋势特征的标的。
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-white mb-4">全平台网格化多图表联动</h3>
            <p className="text-gray-400 leading-relaxed">
              抛弃传统笨拙的单图表交易。系统内置 TradingView 轻量化图表引擎，支持无限分屏。多个标的周期之间可以实现十字光标同步，极大增强多维度盘面复盘和技术分析的效率。
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-white mb-4">一键式极速下单</h3>
            <p className="text-gray-400 leading-relaxed">
              无论是全仓还是逐仓，支持参数预设和直接市价开仓。内置持仓管理、盈利测算面板以及完整的历史订单记录查看，交易执行如闪电般迅速。
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
