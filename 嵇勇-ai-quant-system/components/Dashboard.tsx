import React, { useEffect, useState } from 'react';
import { MarketMetrics } from '../types';
import { TrendingUp, Activity, AlertTriangle, BarChart3, Zap, RefreshCw } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { fetchRealTimeMarketMetrics } from '../services/geminiService';
import { INITIAL_MARKET_DATA } from '../constants';

interface DashboardProps {
  metrics: MarketMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<MarketMetrics>>;
}

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  subValue?: string;
  icon: React.ReactNode; 
  trend?: 'up' | 'down' | 'neutral';
  color?: string;
  loading?: boolean;
}> = ({ title, value, subValue, icon, trend, color, loading }) => (
  <div className="bg-ashare-card border border-gray-700 rounded-xl p-4 shadow-lg flex flex-col justify-between">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      <div className={`p-2 rounded-lg bg-opacity-20 ${color ? `bg-[${color}] text-[${color}]` : 'bg-gray-700 text-gray-300'}`}>
        {icon}
      </div>
    </div>
    <div>
      {loading ? (
        <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse mb-1"></div>
      ) : (
        <div className={`text-2xl font-bold ${trend === 'up' ? 'text-ashare-red' : trend === 'down' ? 'text-ashare-green' : 'text-white'}`}>
          {value}
        </div>
      )}
      {subValue && <p className="text-xs text-gray-500 mt-1">{subValue}</p>}
    </div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ metrics, setMetrics }) => {
  const [loading, setLoading] = useState(true);

  const loadRealTimeData = async () => {
    setLoading(true);
    try {
        const realTimeData = await fetchRealTimeMarketMetrics();
        if (realTimeData) {
            setMetrics(realTimeData);
        }
    } catch (e) {
        console.error("Failed to load real time data", e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    // Load data on mount
    loadRealTimeData();
  }, []);

  // Data for the gauge chart (Explosion Rate)
  const explosionData = [
    { name: 'Sealed', value: 100 - metrics.explosionRate },
    { name: 'Exploded', value: metrics.explosionRate },
  ];
  const COLORS = ['#ef4444', '#475569'];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof MarketMetrics) => {
    setMetrics({
      ...metrics,
      [key]: Number(e.target.value)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Activity className="text-blue-500" />
          情绪感知层 (Sentiment)
        </h2>
        <div className="flex gap-2 items-center">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${loading ? 'bg-yellow-400' : 'bg-green-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${loading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
            </span>
            <div className="text-xs text-gray-400 font-mono">
                {loading ? 'SYNCING REAL-TIME...' : 'LIVE DATA'}
            </div>
            <button 
                onClick={loadRealTimeData}
                disabled={loading}
                className="ml-2 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition border border-gray-700"
                title="Refresh Data"
            >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
        </div>
      </div>

      {/* Primary Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="连板高度 (Limit Height)" 
          value={`${metrics.limitHeight} 板`} 
          subValue="情绪天花板"
          icon={<TrendingUp size={20} />} 
          trend={metrics.limitHeight >= 5 ? 'up' : 'down'}
          color={metrics.limitHeight >= 5 ? '#ef4444' : '#22c55e'}
          loading={loading}
        />
        <StatCard 
          title="涨停晋级率 (Promotion)" 
          value={`${metrics.promotionRate}%`} 
          subValue=">40% 为强势"
          icon={<Zap size={20} />} 
          trend={metrics.promotionRate > 40 ? 'up' : 'down'}
          loading={loading}
        />
        <StatCard 
          title="涨停家数 (Limit Up)" 
          value={metrics.limitUpCount} 
          subValue={`跌停: ${metrics.limitDownCount} 家`}
          icon={<BarChart3 size={20} />} 
          trend="up"
          loading={loading}
        />
        <StatCard 
          title="大面数量 (Nuclear)" 
          value={metrics.nuclearButtons} 
          subValue="亏钱效应扩散"
          icon={<AlertTriangle size={20} />} 
          trend={metrics.nuclearButtons > 3 ? 'down' : 'neutral'}
          loading={loading}
        />
      </div>

      {/* Visualization Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-ashare-card border border-gray-700 rounded-xl p-6 col-span-1">
          <h3 className="text-sm font-medium text-gray-400 mb-4 text-center">封板 vs 炸板 (Seal Efficiency)</h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={explosionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {explosionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                 <RechartsTooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="text-center mt-[-10px]">
              <span className="text-xs text-gray-500">炸板率: </span>
              <span className={`font-bold ${metrics.explosionRate > 30 ? 'text-ashare-green' : 'text-ashare-red'}`}>
                {metrics.explosionRate}%
              </span>
            </div>
          </div>
        </div>

        <div className="bg-ashare-card border border-gray-700 rounded-xl p-6 col-span-2 flex flex-col justify-center items-center">
            <h3 className="text-gray-400 mb-2">养家心法 · 核心逻辑</h3>
            <div className="text-center space-y-4 max-w-md">
                <p className="text-sm text-gray-300 italic">"只有高度打开，才有空间；高度压制则情绪低迷。"</p>
                <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                    <div 
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-500"
                        style={{ width: `${Math.min((metrics.limitHeight / 8) * 100, 100)}%` }}
                    ></div>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                    <span>冰点 (2-3板)</span>
                    <span>启动 (4-5板)</span>
                    <span>高潮 (7+板)</span>
                </div>
            </div>
        </div>
      </div>

       {/* Editor Section (Manual Override) */}
       <div className="bg-ashare-card border border-gray-700 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
           <h3 className="text-lg font-semibold text-gray-200">数据修正 (Manual Correction)</h3>
           <span className="text-xs text-gray-500">AI 数据可能存在延迟，可手动修正</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-xs text-gray-400">连板高度</label>
            <input 
              type="number" 
              value={metrics.limitHeight} 
              onChange={(e) => handleInputChange(e, 'limitHeight')}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs text-gray-400">晋级率 (%)</label>
            <input 
              type="number" 
              value={metrics.promotionRate} 
              onChange={(e) => handleInputChange(e, 'promotionRate')}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="space-y-2">
             <label className="text-xs text-gray-400">炸板率 (%)</label>
             <div className="flex items-center gap-2">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={metrics.explosionRate} 
                  onChange={(e) => handleInputChange(e, 'explosionRate')}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-sm w-8">{metrics.explosionRate}</span>
             </div>
          </div>
           <div className="space-y-2">
            <label className="text-xs text-gray-400">大面 (跌停)</label>
            <input 
              type="number" 
              value={metrics.nuclearButtons} 
              onChange={(e) => handleInputChange(e, 'nuclearButtons')}
              className="w-full bg-gray-900 border border-gray-700 rounded p-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;