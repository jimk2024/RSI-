import React, { useState } from 'react';
import { Play, Settings, Activity } from 'lucide-react';

const STRATEGIES = [
  {
    id: 'rsi_breakout',
    name: 'RSI突破震荡',
    description: '结合多周期RSI判断超买超卖，捕捉逆势反转机会',
    params: [
      { id: 'rsi_period', name: 'RSI 周期', type: 'number', default: 14 },
      { id: 'overbought', name: '超买线', type: 'number', default: 70 },
      { id: 'oversold', name: '超卖线', type: 'number', default: 30 },
      { id: 'tf_confirm', name: '确认周期', type: 'select', options: ['15m', '1H', '4H'], default: '15m' }
    ]
  },
  {
    id: 'ema_crossover',
    name: '双均线交叉',
    description: '使用快慢均线金叉死叉判断长短线趋势拐点',
    params: [
      { id: 'fast_ema', name: '快线周期', type: 'number', default: 10 },
      { id: 'slow_ema', name: '慢线周期', type: 'number', default: 50 }
    ]
  },
  {
    id: 'bollinger_reversion',
    name: '布林带均值回归',
    description: '价格触碰布林带上下轨引发的快速均值回归策略',
    params: [
      { id: 'bb_period', name: '布林带周期', type: 'number', default: 20 },
      { id: 'bb_std', name: '标准差倍数', type: 'number', default: 2 }
    ]
  }
];

export function StrategyLibraryPanel() {
  const [activeStrategyId, setActiveStrategyId] = useState(STRATEGIES[0].id);
  const activeStrategy = STRATEGIES.find(s => s.id === activeStrategyId) || STRATEGIES[0];

  const [paramValues, setParamValues] = useState<Record<string, any>>(() => {
    const initial: Record<string, any> = {};
    STRATEGIES.forEach(strat => {
      strat.params.forEach(p => {
        initial[`${strat.id}_${p.id}`] = p.default;
      });
    });
    return initial;
  });

  const handleParamChange = (strId: string, pId: string, value: any) => {
    setParamValues(prev => ({
      ...prev,
      [`${strId}_${pId}`]: value
    }));
  };

  return (
    <div className="bg-[#161a1e] border border-[#2b2f36] rounded-lg p-3 h-full flex flex-col min-h-0 text-[#e0e3e7]">
      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-[#2b2f36]">
        <Activity size={16} className="text-[#3b82f6]" />
        <h3 className="font-bold text-sm">策略库与回测 (Strategy Library)</h3>
      </div>
      
      <div className="flex flex-1 min-h-0 min-w-0">
        {/* Left: Strategy List */}
        <div className="w-1/3 flex flex-col min-h-0 border-r border-[#2b2f36] pr-3">
          <div className="text-xs text-gray-500 mb-2">选择常用策略</div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {STRATEGIES.map(strat => (
              <div 
                key={strat.id}
                onClick={() => setActiveStrategyId(strat.id)}
                className={`p-2 rounded cursor-pointer transition-colors border text-xs ${
                  activeStrategyId === strat.id 
                    ? 'bg-[#3b82f6]/10 border-[#3b82f6] text-[#3b82f6]' 
                    : 'bg-[#1e2329] border-[#2b2f36] hover:border-[#474d57] text-gray-300'
                }`}
              >
                <div className="font-bold mb-1">{strat.name}</div>
                <div className={`text-[10px] line-clamp-2 ${activeStrategyId === strat.id ? 'text-[#3b82f6]/70' : 'text-gray-500'}`}>
                  {strat.description}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Middle: Strategy Parameters */}
        <div className="w-1/3 flex flex-col min-h-0 border-r border-[#2b2f36] px-3">
          <div className="text-xs text-gray-500 mb-2">参数调优</div>
          <div className="flex-1 overflow-y-auto pr-1">
            <div className="space-y-3">
              {activeStrategy.params.map(param => (
                <div key={param.id} className="flex flex-col gap-1">
                  <label className="text-[11px] text-gray-400">{param.name}</label>
                  {param.type === 'number' ? (
                    <input 
                      type="number" 
                      value={paramValues[`${activeStrategy.id}_${param.id}`] ?? ''}
                      onChange={(e) => handleParamChange(activeStrategy.id, param.id, Number(e.target.value))}
                      className="bg-[#1e2329] border border-[#2b2f36] rounded text-xs px-2 py-1.5 outline-none focus:border-[#3b82f6] w-full text-[#e0e3e7]"
                    />
                  ) : param.type === 'select' ? (
                    <select
                      value={paramValues[`${activeStrategy.id}_${param.id}`] ?? ''}
                      onChange={(e) => handleParamChange(activeStrategy.id, param.id, e.target.value)}
                      className="bg-[#1e2329] border border-[#2b2f36] rounded text-xs px-2 py-1.5 outline-none focus:border-[#3b82f6] w-full text-[#e0e3e7]"
                    >
                      {param.options?.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="w-1/3 flex flex-col min-h-0 pl-3 pt-2 gap-3">
          <div className="text-xs text-gray-400 text-center mb-2 px-4">
            当前处于模拟阶段，可以先进行历史数据回测或注入模拟盘环境运行寻找参数最优解。
          </div>
          <button 
            className="bg-[#2b2f36] hover:bg-[#3b82f6]/20 border border-[#2b2f36] hover:border-[#3b82f6] text-white py-2 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
            onClick={() => alert(`回测策略 [${activeStrategy.name}]\n尚未接入回测引擎核心`)}
          >
            <Settings size={14} />
            运行历史回测
          </button>
          
          <button 
            className="bg-[#00b07c] hover:bg-[#00b07c]/80 text-white py-2 px-4 rounded text-xs font-bold transition-colors flex items-center justify-center gap-2"
            onClick={() => alert(`启用策略 [${activeStrategy.name}]\n模拟盘开始捕捉机会`)}
          >
            <Play size={14} />
            部署到模拟盘
          </button>
        </div>
      </div>
    </div>
  );
}
