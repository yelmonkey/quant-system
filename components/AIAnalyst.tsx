import React, { useState } from 'react';
import { MarketMetrics } from '../types';
import { generateMarketAnalysis } from '../services/geminiService';
import { BrainCircuit, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const AIAnalyst: React.FC<{ metrics: MarketMetrics }> = ({ metrics }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const runAnalysis = async () => {
    setLoading(true);
    const res = await generateMarketAnalysis(metrics);
    setReport(res.data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
         <h2 className="text-xl font-bold text-white flex items-center gap-2"><BrainCircuit className="text-teal-400" /> AI 策略大脑</h2>
         <button onClick={runAnalysis} disabled={loading} className="bg-teal-600 px-4 py-2 rounded-lg font-bold text-white flex items-center gap-2 shadow-lg shadow-teal-900/20">
            {loading ? <Sparkles className="animate-spin" size={16}/> : <Sparkles size={16}/>}
            {loading ? '演算中...' : '生成养家策略'}
         </button>
      </div>

      <div className="bg-ashare-card border border-gray-700 rounded-xl p-6 min-h-[300px]">
        {report ? (
          <div className="animate-in fade-in slide-in-from-bottom-2">
            <div className="flex gap-4 mb-6">
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 text-center flex-1">
                <div className="text-[10px] text-gray-500 uppercase">周期阶段</div>
                <div className="text-lg font-bold text-teal-400">{report.phase}</div>
              </div>
              <div className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700 text-center flex-1">
                <div className="text-[10px] text-gray-500 uppercase">仓位建议</div>
                <div className="text-lg font-bold text-white">{report.position}</div>
              </div>
            </div>
            <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
              <ReactMarkdown>{report.analysis}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-600">
            <BrainCircuit size={48} className="mb-4 opacity-20"/>
            <p className="text-sm">点击上方按钮启动 AI 逻辑推理</p>
          </div>
        )}
      </div>
    </div>
  );
};
export default AIAnalyst;