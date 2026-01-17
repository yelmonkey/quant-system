import React, { useState, useEffect } from 'react';
import { ShieldAlert, Calculator, RefreshCw, AlertTriangle, ShieldCheck, Siren } from 'lucide-react';
import { fetchRealTimeMarketMetrics, generateRiskAssessment } from '../services/geminiService';
import { MarketMetrics } from '../types';

interface RiskReport {
    riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    riskScore: number;
    suggestedPosition: number;
    maxLoss: number;
    warningTitle: string;
    actionPlan: string;
}

const RiskCalculator: React.FC = () => {
  const [totalCapital, setTotalCapital] = useState<number>(100000);
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [riskReport, setRiskReport] = useState<RiskReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load real market data on mount
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        const data = await fetchRealTimeMarketMetrics();
        setMetrics(data);
        setLoading(false);
    };
    loadData();
  }, []);

  const runRiskAudit = async () => {
      if (!metrics) return;
      setLoadingReport(true);
      const report = await generateRiskAssessment(metrics, totalCapital);
      setRiskReport(report);
      setLoadingReport(false);
  };

  const getRiskColor = (level: string) => {
      switch(level) {
          case 'LOW': return 'text-green-500 border-green-500 bg-green-500/10';
          case 'MEDIUM': return 'text-yellow-500 border-yellow-500 bg-yellow-500/10';
          case 'HIGH': return 'text-orange-500 border-orange-500 bg-orange-500/10';
          case 'CRITICAL': return 'text-red-600 border-red-600 bg-red-600/10 animate-pulse';
          default: return 'text-gray-500';
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
       <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
                <ShieldAlert className="text-ashare-red" size={28} />
                <h2 className="text-2xl font-bold text-white">实时风控审计 (Real-time Risk Audit)</h2>
            </div>
            {metrics && (
                <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    实时盘面数据已同步
                </div>
            )}
       </div>

       <div className="bg-ashare-card border border-gray-700 rounded-xl p-8 shadow-xl">
            {/* Top Section: Inputs & Live Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-700 pb-8">
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm text-gray-400 mb-2">总资金 (Total Capital)</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-gray-500">¥</span>
                            <input 
                                type="number" 
                                value={totalCapital}
                                onChange={(e) => setTotalCapital(Number(e.target.value))}
                                className="w-full bg-gray-900 border border-gray-600 rounded-lg py-2 pl-8 pr-4 text-white focus:ring-2 focus:ring-blue-500 outline-none font-mono text-lg"
                            />
                        </div>
                    </div>

                    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-sm text-gray-400 font-semibold">关键风控指标 (Key Metrics)</span>
                            {loading && <RefreshCw className="animate-spin text-gray-500" size={14} />}
                        </div>
                        {metrics ? (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">跌停/大面:</span>
                                    <span className={`font-mono font-bold ${metrics.limitDownCount > 3 ? 'text-red-500' : 'text-gray-300'}`}>
                                        {metrics.limitDownCount} 家
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">炸板率:</span>
                                    <span className={`font-mono font-bold ${metrics.explosionRate > 30 ? 'text-red-500' : 'text-green-500'}`}>
                                        {metrics.explosionRate}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">连板高度:</span>
                                    <span className="font-mono text-white">{metrics.limitHeight} 板</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">晋级率:</span>
                                    <span className="font-mono text-white">{metrics.promotionRate}%</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center text-gray-500 text-xs py-2">正在获取实时数据...</div>
                        )}
                    </div>

                    <button 
                        onClick={runRiskAudit}
                        disabled={loading || !metrics || loadingReport}
                        className="w-full bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold py-3 rounded-lg shadow-lg flex justify-center items-center gap-2 transition disabled:opacity-50"
                    >
                        {loadingReport ? <RefreshCw className="animate-spin" /> : <ShieldCheck />}
                        {loadingReport ? 'AI 审计计算中...' : '生成风控报告'}
                    </button>
                </div>

                {/* Right Side: AI Report Output */}
                <div className="flex flex-col justify-center">
                    {!riskReport ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-800 rounded-xl p-6 bg-gray-900/30">
                            <Siren size={48} className="mb-4 opacity-50" />
                            <p className="text-center text-sm">
                                请点击左侧按钮<br/>基于实时盘面数据进行风控测算
                            </p>
                        </div>
                    ) : (
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 h-full flex flex-col justify-between animate-fade-in">
                             <div>
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-sm text-gray-400">风险等级 (Risk Level)</span>
                                    <span className={`px-3 py-1 rounded text-xs font-bold border ${getRiskColor(riskReport.riskLevel)}`}>
                                        {riskReport.riskLevel}
                                    </span>
                                </div>
                                
                                <h3 className={`text-lg font-bold mb-2 flex items-center gap-2 ${riskReport.riskLevel === 'CRITICAL' ? 'text-red-500' : 'text-white'}`}>
                                    <AlertTriangle size={20}/> {riskReport.warningTitle}
                                </h3>
                                
                                <p className="text-sm text-gray-300 leading-relaxed bg-gray-900/50 p-3 rounded border border-gray-700 mb-4">
                                    {riskReport.actionPlan}
                                </p>
                             </div>

                             <div className="grid grid-cols-2 gap-4 mt-auto">
                                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">建议仓位上限</div>
                                    <div className="text-xl font-bold text-white font-mono">
                                        {riskReport.suggestedPosition}%
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        ¥ {(totalCapital * riskReport.suggestedPosition / 100).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-gray-900 p-3 rounded border border-gray-700">
                                    <div className="text-xs text-gray-500 mb-1">硬性止损线</div>
                                    <div className="text-xl font-bold text-ashare-red font-mono">
                                        - ¥ {riskReport.maxLoss.toLocaleString()}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">
                                        Max Loss Limit
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Rules */}
            <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700">
                <h4 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">养家心法 · 铁律 (Iron Rules)</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-500">
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5"></div>
                        <span>大面家数 &gt; 5：强制空仓，关闭软件。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5"></div>
                        <span>炸板率 &gt; 35%：当日禁止打板，只看不做。</span>
                    </div>
                    <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mt-1.5"></div>
                        <span>高潮次日：只处理持仓，原则上不新开仓。</span>
                    </div>
                </div>
            </div>
       </div>
    </div>
  );
};

export default RiskCalculator;