import React from "react";

export function TechnologyPage({ onEnter }: { onEnter?: () => void }) {
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
          <a href="#/features" className="hover:text-white transition-colors">核心功能</a>
          <a href="#/technology" className="text-white transition-colors">技术架构</a>
          <a href="#/docs" className="hover:text-white transition-colors">帮助文档</a>
          <a href="#/purchase" className="hover:text-white transition-colors">购买激活码</a>
        </nav>
        <button 
          onClick={onEnter || (() => window.location.hash = '#/dashboard')}
          className="px-6 py-2 rounded-full border border-[#2b2f36] bg-[#161a1e] hover:bg-[#1e2329] hover:border-gray-500 transition-all text-sm font-bold tracking-wider"
        >
          启动终端
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <h2 className="text-4xl font-black mb-8">技术架构</h2>
        <div className="space-y-12">
          <section>
            <h3 className="text-2xl font-bold text-white mb-4">前端渲染与交互引擎</h3>
            <p className="text-gray-400 leading-relaxed">
              平台采用了 React + Vite 作为主要开发栈。摒弃了繁重的状态库，通过原生的 Context API 和高度模块化的函数式组件，实现了在 120Hz 高刷屏上的丝滑拖拽和实时刷新体验。样式层采用 Tailwind CSS，兼顾轻量与高定制化能力。
            </p>
          </section>
          
          <section>
            <h3 className="text-2xl font-bold text-white mb-4">高性能图表引擎</h3>
            <p className="text-gray-400 leading-relaxed">
              核心 K 线视口和分析界面利用 TradingView 的 Lightweight Charts 组件库，支持流畅的图表缩放、平移体验和多种基础绘图及游标同步机制。
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-white mb-4">直连与代理层</h3>
            <p className="text-gray-400 leading-relaxed">
              通过内部轻量级服务端代理转发请求来解决跨域问题。API Key 和密文信息仅在运行时保存在本地浏览器中，所有的 REST API 请求都会通过平台发送到 OKX 交易所。
            </p>
          </section>

          <section>
            <h3 className="text-2xl font-bold text-white mb-4">客户端信号扫描</h3>
            <p className="text-gray-400 leading-relaxed">
              扫描模块通过异步请求遍历市场上的主流币种，结合简易均线（MA）及基础动量指标辅助发现特定形态。计算逻辑由本地化快速运行并呈现在列表区。
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
