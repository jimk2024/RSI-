import React from "react";

export function DocsPage({ onEnter }: { onEnter?: () => void }) {
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
          <a href="#/technology" className="hover:text-white transition-colors">技术架构</a>
          <a href="#/docs" className="text-white transition-colors">帮助文档</a>
        </nav>
        <button 
          onClick={onEnter || (() => window.location.hash = '#/dashboard')}
          className="px-6 py-2 rounded-full border border-[#2b2f36] bg-[#161a1e] hover:bg-[#1e2329] hover:border-gray-500 transition-all text-sm font-bold tracking-wider"
        >
          启动终端
        </button>
      </header>

      <main className="max-w-4xl mx-auto px-6 pt-12">
        <h2 className="text-4xl font-black mb-8">帮助文档</h2>
        <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-white">API 密钥配置</h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            首次进入终端后，需要在左上角的连接面板填写您的 OKX API 信息：
          </p>
          <ul className="list-disc pl-5 text-gray-300 space-y-2 mb-4">
            <li><strong className="text-white">API Key:</strong> 您在交易所申请的访问公钥</li>
            <li><strong className="text-white">Secret Key:</strong> 用户进行数字签名验证的私钥</li>
            <li><strong className="text-white">Passphrase:</strong> 为 API 设置的安全口令</li>
          </ul>
          <p className="text-xs text-gray-500 font-mono">
            提示：这些信息仅保存在您的浏览器内存中，一旦刷新或关闭窗口将自动清除。我们不会将任何敏感数据上传至任何第三方服务器。
          </p>
        </div>

        <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-white">仓单面板使用说明</h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            在界面左侧配置栏，您可以设定全/逐仓模式，杠杆倍数以及单笔预留保证金。设置完成后直接点击图表区域的上方的“做多” / “做空”即可立刻发单。
          </p>
          <p className="text-gray-400 leading-relaxed">
            成交后的仓位将出现在右下方的仓位面板中，点击平仓按钮即可一键市价结算。
          </p>
        </div>

        <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-white">机会预警面板 (共振预警)</h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            左侧的机会预警面板可持续对市场全盘进行轮询扫描，寻找市场极具潜力的异动信号：
          </p>
          <div className="space-y-4 mb-4">
             <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
               <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                 <span className="text-yellow-400">🚀 起爆预警</span>
               </h4>
               <p className="text-sm text-gray-400">当标的 4小时级别 RSI 刚刚突破 70 并处于扩张期（非高位久居或开始收缩），同时 1小时级别 RSI 连续两根 K线稳住 60 以上，且最核心的 15分钟级别 RSI 突破 55 并且呈现连续上涨态势时触发。该起爆算法能够有效地对各个周期的共振突破点进行监测过滤，寻找极高确定性的右侧动能。信号触发后会在主图表底部印刻醒目的黄色向上标识。</p>
             </div>
             <div className="bg-[#1e2329] p-4 rounded-lg border border-[#2b2f36]">
               <h4 className="text-white font-bold mb-2 flex items-center gap-2">
                 <span className="text-emerald-400">✅ 抄底预警</span>
               </h4>
               <p className="text-sm text-gray-400">当标的在 4小时级别极度超卖（RSI 跌破 30），且在 1小时级别拒绝创新低并强势从 30 以下反抽突破 40，同时在核心的 15分钟级别被强力向上击穿 RSI 55 边界时触发。该算法旨在过滤下跌途中的“死猫跳”，精准捕捉跌势穷竭后的高胜率反转拐点。</p>
             </div>
          </div>
          <p className="text-xs text-gray-500 font-mono">
            提示：点击列表中任意预警结果，所有相关联的实时金融图表将会瞬间同步为您展示该币种的微观走势与核心指标。
          </p>
        </div>

        <div className="bg-[#161a1e] border border-[#2b2f36] rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4 text-white">图表快捷键与布局</h3>
          <p className="text-gray-400 mb-4 leading-relaxed">
            图表默认分为四大象限，点击任意象限右上角的最大化图标可将其放大全屏显示，方便分析。滚轮可用于缩放时间轴，鼠标拖动平移K线。
          </p>
        </div>
      </main>
    </div>
  );
}
