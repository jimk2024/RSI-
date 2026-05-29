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
            <h3 className="text-2xl font-bold text-white mb-4">实时多空数据与深度盘口侦测</h3>
            <p className="text-gray-400 leading-relaxed mb-3">
              系统原生接入 OKX API，毫秒级获取全市场各大交易对的核心数据，从多个维度帮你在波谲云诡的市场中提前发现资金流向：
            </p>
            <ul className="list-disc pl-5 text-gray-400 space-y-2">
              <li><strong className="text-gray-300">资金费率与多空比：</strong>实时透视大户持仓比例与市场做多做空倾向。</li>
              <li><strong className="text-gray-300">Top 20 盘口动量：</strong>动态展示买卖盘挂单动量对比（红绿条占比），直观反映微观买卖预留压盘。</li>
              <li><strong className="text-gray-300">未平仓合约与成交额：</strong>追踪资金是在持续流入（增仓）还是流出（减仓），结合价格辨别趋势真伪。</li>
            </ul>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-white mb-4">八大核心异动预警矩阵</h3>
            <p className="text-gray-400 leading-relaxed mb-3">
              内置专业级技术扫描矩阵，算法不间断轮询全市场标的，为您提取多维度的交易机会与警报：
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-[#00b07c] font-bold mb-2">🚀 多级共振起爆</h4>
                <p className="text-sm text-gray-400">15M/1H/4H RSI 突破 68 并伴随放量突破均线，极速右侧动能触发。</p>
              </div>
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-emerald-400 font-bold mb-2">✅ 超卖反弹抄底</h4>
                <p className="text-sm text-gray-400">大周期超卖跌破 30，短周期发力突破 55，捕捉高胜率底部拐点。</p>
              </div>
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-blue-400 font-bold mb-2">📈 大级别 RSI 急涨</h4>
                <p className="text-sm text-gray-400">4H RSI 单根 K 线涨幅超过 10 点，直接反映大资金极速吸筹拉升。</p>
              </div>
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-blue-400 font-bold mb-2">⚔️ 动能跨周期金叉</h4>
                <p className="text-sm text-gray-400">1H RSI 上穿 4H RSI 或 15M 级别 EMA20 上穿 EMA50，日内趋势转强。</p>
              </div>
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-rose-400 font-bold mb-2">⚠️ 高位天量滞涨</h4>
                <p className="text-sm text-gray-400">处于上升末端爆出天量却未继续上涨（收长上影线/十字星），主力潜在出货。</p>
              </div>
              <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
                <h4 className="text-blue-400 font-bold mb-2">📍 地量长下影探底</h4>
                <p className="text-sm text-gray-400">地量缩量状态收长下影线，抛压枯竭买盘承接明显，随时准备反转。</p>
              </div>
            </div>
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
