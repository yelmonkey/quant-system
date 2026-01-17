import React, { useEffect, useState } from 'react';
import { MarketMetrics } from '../types';
import { TrendingUp, Activity, AlertTriangle, BarChart3, Zap, RefreshCw, ExternalLink } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { fetchRealTimeMarketMetrics, GroundingSource } from '../services/geminiService';

interface DashboardProps {
  metrics: MarketMetrics;
  setMetrics: React.Dispatch<React.SetStateAction<MarketMetrics>>;
}

const StatCard: React.FC<{ title: string; value: string | number; subValue?: string; icon: React.ReactNode; trend?: 'up' | 'down' | 'neutral'; color?: string; loading?: boolean; }> = ({ title, value, subValue, icon, trend, color, loading }) => (
  <div className="bg-ashare-card border border-gray-700 rounded-xl p-4 shadow-lg">
    <div className="flex justify-between items-start mb-2">
      <h3 className="text-gray-400 text-xs font-medium uppercase">{title}</h3>
      <div className={`p-1.5 rounded-lg bg-opacity-10 ${color ? `text-[${color}]` : 'text-gray-400'}`}>{icon}</div>
    </div>
    {loading ? <div className="h-8 w-24 bg-gray-700/50 rounded animate-pulse"></div> : <div className={`text-2xl font-bold ${trend === 'up' ? 'text-ashare-red' : trend === 'down' ? 'text-ashare-green' : 'text-white'}`}>{value}</div>}
    {subValue && <p className="text-[10px] text-gray-500 mt-1">{subValue}</p>}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ metrics, setMetrics }) => {
  const [loading, setLoading] = useState(true);
  const [sources, setSources] = useState<GroundingSource[]>([]);

  const loadData = async () => {
    setLoading(true);
    const res = await fetchRealTimeMarketMetrics();
    setMetrics(res.data);
    setSources(res.sources);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Activity className="text-blue-500" size={20}/> 情绪感知层</h2>
        <button onClick={loadData} disabled={loading} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition"><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="连板高度" value={`${metrics.limitHeight}板`} subValue="市场高度上限" icon={<TrendingUp size={18}/>} trend={metrics.limitHeight >= 5 ? 'up' : 'down'} loading={loading}/>
        <StatCard title="晋级率" value={`${metrics.promotionRate}%`} subValue="昨日涨停表现" icon={<Zap size={18}/>} trend={metrics.promotionRate > 40 ? 'up' : 'down'} loading={loading}/>
        <StatCard title="涨停数" value={metrics.limitUpCount} subValue={`跌停: ${metrics.limitDownCount}`} icon={<BarChart3 size={18}/>} loading={loading}/>
        <StatCard title="核按钮" value={metrics.nuclearButtons} subValue="大面亏钱效应" icon={<AlertTriangle size={18}/>} trend={metrics.nuclearButtons > 3 ? 'down' : 'neutral'} loading={loading}/>
      </div>

      {sources.length > 0 && (
        <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700">
          <div className="text-[10px] text-gray-500 font-bold mb-2">数据来源 (Search Sources):</div>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" className="text-[9px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-800/50 flex items-center gap-1">
                {s.title} <ExternalLink size={8}/>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default Dashboard;