import React, { useState } from 'react';
import { MarketMetrics } from '../types';
import { generateMarketAnalysis } from '../services/geminiService';
import { BrainCircuit, Sparkles, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AIAnalystProps {
  metrics: MarketMetrics;
}

const AIAnalyst: React.FC<AIAnalystProps> = ({ metrics }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runAnalysis = async () => {
    setLoading(true);
    try {
      const resultString = await generateMarketAnalysis(metrics);
      // Clean string to ensure JSON parsing (sometimes LLM adds markdown backticks)
      const cleanedString = resultString.replace(/```json/g, '').replace(/```/g, '').trim();
      const resultJson = JSON.parse(cleanedString);
      setReport(resultJson);
    } catch (e) {
      console.error("Failed to parse AI response", e);
      setReport({ 
          analysis: "解析 AI 响应失败，请重试。", 
          phase: "未知", 
          score: 0, 
          position: "0%" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BrainCircuit className="text-teal-400" />
            AI 策略大脑 (Strategy Brain)
         </h2>
         <button 
            onClick={runAnalysis}
            disabled={loading}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-semibold transition shadow-lg ${
                loading 
                ? 'bg-gray-600 cursor-not-allowed text-gray-300' 
                : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-500/20'
            }`}
         >
            {loading ? <Sparkles className="animate-spin" size={18} /> : <Sparkles size={18} />}
            {loading ? '思考中...' : '生成养家策略'}
         </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Left Panel: Prompt Context */}
        <div className="lg:col-span-1 bg-ashare-card border border-gray-700 rounded-xl p-6">
            <h3 className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-4">输入上下文 (Context)</h3>
            <div className="space-y-4 text-sm text-gray-300">
                <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span>涨停家数</span>
                    <span className="font-mono text-white">{metrics.limitUpCount}</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span>连板高度</span>
                    <span className="font-mono text-ashare-red font-bold">{metrics.limitHeight} 板</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span>晋级率</span>
                    <span className="font-mono text-white">{metrics.promotionRate}%</span>
                </div>
                <div className="flex justify-between border-b border-gray-700 pb-2">
                    <span>炸板率</span>
                    <span className="font-mono text-white">{metrics.explosionRate}%</span>
                </div>
                 <div className="bg-blue-900/20 border border-blue-800 rounded p-3 mt-6">
                    <p className="text-xs text-blue-300">
                        <AlertCircle size={12} className="inline mr-1"/>
                        AI 将基于"养家心法"的四个阶段（启动、发酵、高潮、退潮）对上述数据进行推理，重点评估风险收益比。
                    </p>
                 </div>
            </div>
        </div>

        {/* Right Panel: Output */}
        <div className="lg:col-span-2 bg-ashare-card border border-gray-700 rounded-xl p-6 relative min-h-[400px]">
            {!report && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 opacity-50">
                    <BrainCircuit size={64} strokeWidth={1} />
                    <p className="mt-4">等待指令生成策略...</p>
                </div>
            )}
            
            {report && (
                <div className="space-y-6 animate-fade-in">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">市场阶段</div>
                            <div className="text-xl font-bold text-teal-400">{report.phase}</div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">情绪评分 (0-10)</div>
                            <div className={`text-xl font-bold ${report.score >= 8 ? 'text-ashare-red' : report.score <= 4 ? 'text-ashare-green' : 'text-yellow-400'}`}>
                                {report.score}
                            </div>
                        </div>
                        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-600">
                            <div className="text-xs text-gray-400 mb-1">建议仓位</div>
                            <div className="text-xl font-bold text-white">{report.position}</div>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none">
                        <h4 className="text-teal-400 font-bold text-lg mb-2">深度分析报告</h4>
                        <div className="text-gray-300 leading-relaxed whitespace-pre-line">
                            <ReactMarkdown>{report.analysis}</ReactMarkdown>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default AIAnalyst;
