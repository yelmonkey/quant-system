import React, { useState, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { Search, Filter, RefreshCcw, Flame, XCircle, Zap, Trophy, TrendingUp, RefreshCw, ShieldCheck, ShieldAlert, AlertTriangle, Target, ChevronRight } from 'lucide-react';
import { analyzeStock, fetchDragonStocks, verifyRealTimeQuote, StockFilterCriteria } from '../services/geminiService';
import StockDetailModal from './StockDetailModal';

const HOT_CONCEPTS = ["低空经济", "华为海思", "固态电池", "人形机器人", "车路云", "并购重组", "CPO", "合成生物"];

const StockScreener: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [loadingStocks, setLoadingStocks] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [verifying, setVerifying] = useState<string | null>(null); 
  const [analysisResult, setAnalysisResult] = useState<Record<string, string>>({});
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  
  // Filter State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<StockFilterCriteria>({});
  const [currentPhase, setCurrentPhase] = useState("发酵期"); 
  const filterRef = useRef<HTMLDivElement>(null);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  // Live Simulation State
  const [isLive, setIsLive] = useState(true);

  // Auto-Verify Queue State
  const [verificationQueue, setVerificationQueue] = useState<string[]>([]);

  const loadRealTimeStocks = async () => {
    setLoadingStocks(true);
    setStocks([]); 
    setAnalysisResult({});
    setIsFilterOpen(false); 
    setVerificationQueue([]);

    try {
        const dragons = await fetchDragonStocks(filters);
        setStocks(dragons);
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Auto-populate recommendations
        const initialAnalysis: Record<string, string> = {};
        dragons.forEach(stock => {
            initialAnalysis[stock.id] = stock.description ? `🚀 强力推荐：${stock.description}` : "🚀 强力推荐：数据确认，即刻买入。";
        });
        setAnalysisResult(initialAnalysis);

        // Add all fetched stocks to verification queue immediately
        const idsToVerify = dragons.map(s => s.id);
        setVerificationQueue(idsToVerify);

    } catch (e) {
        console.error("Failed to fetch dragon stocks", e);
    } finally {
        setLoadingStocks(false);
    }
  };

  useEffect(() => {
    loadRealTimeStocks();
  }, []);

  // --- Process Verification Queue ---
  useEffect(() => {
    const processQueue = async () => {
        if (verificationQueue.length === 0) return;

        const currentId = verificationQueue[0];
        const stockToVerify = stocks.find(s => s.id === currentId);

        if (stockToVerify) {
            setVerifying(currentId);
            try {
                const verifiedData = await verifyRealTimeQuote(stockToVerify.code, stockToVerify.name);
                if (verifiedData) {
                    setStocks(prev => prev.map(s => 
                        s.id === currentId 
                        ? { ...s, price: verifiedData.price, changePercent: verifiedData.change, exactTime: verifiedData.time } 
                        : s
                    ));
                }
            } catch (e) {
                console.warn(`Auto-verify failed for ${stockToVerify.name}`, e);
            } finally {
                setVerifying(null);
                setVerificationQueue(prev => prev.slice(1));
            }
        } else {
             setVerificationQueue(prev => prev.slice(1));
        }
    };

    if (verificationQueue.length > 0 && !verifying) {
        processQueue();
    }
  }, [verificationQueue, verifying, stocks]);


  // --- Real-time Simulation Effect ---
  useEffect(() => {
    if (!isLive || stocks.length === 0) return;

    const interval = setInterval(() => {
      setStocks(currentStocks => 
        currentStocks.map(stock => {
          if (verifying === stock.id) return stock;
          if (stock.status === 'LimitUp') return stock;
          if (Math.random() > 0.7) return stock;

          const change = (Math.random() > 0.5 ? 1 : -1) * 0.01;
          const newPrice = Number((stock.price + change).toFixed(2));
          const newChangePercent = Number((stock.changePercent + (change / (stock.price || 1)) * 100).toFixed(2));
          
          return {
            ...stock,
            price: newPrice,
            changePercent: newChangePercent,
          };
        })
      );
    }, 2000); 

    return () => clearInterval(interval);
  }, [isLive, stocks.length, verifying]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
            setIsFilterOpen(false);
        }
    };
    if (isFilterOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterOpen]);

  const handleAnalysis = async (e: React.MouseEvent, stock: Stock) => {
    e.stopPropagation(); 
    setAnalyzing(stock.id);
    const result = await analyzeStock(stock, currentPhase);
    setAnalysisResult(prev => ({ ...prev, [stock.id]: result || "无法获取分析" }));
    setAnalyzing(null);
  };

  const handleManualVerify = async (e: React.MouseEvent, stock: Stock) => {
      e.stopPropagation();
      setVerificationQueue(prev => [stock.id, ...prev.filter(id => id !== stock.id)]);
  };

  const handleStockUpdate = (updatedStock: Stock) => {
      setStocks(prev => prev.map(s => s.id === updatedStock.id ? updatedStock : s));
  };

  const clearFilters = () => {
      setFilters({});
  };

  const getRankIcon = (index: number) => {
      if (index === 0) return <Trophy size={16} className="text-yellow-400 fill-yellow-400/20" />;
      if (index === 1) return <Trophy size={14} className="text-gray-300 fill-gray-300/20" />;
      if (index === 2) return <Trophy size={14} className="text-orange-400 fill-orange-400/20" />;
      return <span className="font-mono text-gray-500 font-bold w-4 text-center text-xs">{index + 1}</span>;
  };

  const getScoreColor = (score: number = 0) => {
      if (score >= 95) return 'text-red-500';
      if (score >= 90) return 'text-orange-500';
      return 'text-yellow-500';
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Flame className="text-ashare-red" fill="#ef4444" size={20} />
            猎杀真龙
          </h2>
          <button 
                onClick={loadRealTimeStocks}
                disabled={loadingStocks || verificationQueue.length > 0}
                className="bg-red-600 text-white p-2 rounded-full transition shadow-lg active:scale-95"
            >
                {loadingStocks || verificationQueue.length > 0 ? (
                    <RefreshCcw size={18} className="animate-spin" /> 
                ) : (
                    <RefreshCcw size={18} />
                )}
            </button>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <div className="bg-gray-800/50 border border-gray-700 rounded-full px-3 py-1.5 flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-500 font-bold uppercase">周期:</span>
                <select 
                    value={currentPhase} 
                    onChange={(e) => setCurrentPhase(e.target.value)}
                    className="bg-transparent text-xs text-blue-400 outline-none cursor-pointer font-bold"
                >
                    <option value="启动期">启动期</option>
                    <option value="发酵期">发酵期</option>
                    <option value="高潮期">高潮期</option>
                    <option value="退潮期">退潮期</option>
                </select>
            </div>
            <button 
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition shrink-0 font-bold ${
                    isFilterOpen || Object.keys(filters).length > 0 
                    ? 'bg-blue-600 border-blue-500 text-white' 
                    : 'bg-gray-800/50 border-gray-700 text-gray-400'
                }`}
            >
                <Filter size={12} /> 筛选
            </button>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] shrink-0 font-bold">
                 <ShieldCheck size={12}/> {verificationQueue.length > 0 ? `核验中(${verificationQueue.length})` : '数据已校准'}
            </div>
        </div>
      </div>

      {isFilterOpen && (
        <div ref={filterRef} className="bg-ashare-card border border-gray-700 rounded-xl p-4 shadow-2xl animate-in fade-in slide-in-from-top-2">
            <label className="text-xs text-gray-400 mb-2 block font-bold uppercase tracking-wider">题材关键词</label>
            <div className="flex flex-wrap gap-2">
                {HOT_CONCEPTS.map(concept => (
                    <button
                        key={concept}
                        onClick={() => {setFilters({...filters, keyword: concept}); setIsFilterOpen(false); loadRealTimeStocks();}}
                        className={`text-[10px] px-3 py-1.5 rounded-full border transition font-bold ${
                            filters.keyword === concept 
                            ? 'bg-blue-600 border-blue-500 text-white' 
                            : 'bg-gray-800/50 border-gray-700 text-gray-500'
                        }`}
                    >
                        {concept}
                    </button>
                ))}
            </div>
        </div>
      )}

      <div className="bg-ashare-card border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex flex-col divide-y divide-gray-800">
            {loadingStocks ? (
                 Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="p-4 animate-pulse flex justify-between">
                        <div className="space-y-2">
                            <div className="h-4 bg-gray-800 rounded w-24"></div>
                            <div className="h-3 bg-gray-800 rounded w-16"></div>
                        </div>
                        <div className="h-8 bg-gray-800 rounded w-20"></div>
                    </div>
                 ))
            ) : stocks.length > 0 ? (
                stocks.map((stock, index) => (
                <div key={stock.id || stock.code} className="relative">
                    <div 
                        onClick={() => setSelectedStock(stock)}
                        className="p-4 flex items-center justify-between active:bg-gray-800 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 w-6 flex justify-center">
                                {getRankIcon(index)}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-white text-base leading-tight">{stock.name}</span>
                                <span className="text-[10px] font-mono text-gray-500">{stock.code}</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {stock.tags?.slice(0, 2).map(tag => (
                                        <span key={tag} className="text-[9px] bg-red-900/20 text-red-400 px-1.5 py-0.5 rounded border border-red-900/30 font-bold uppercase">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1">
                            {stock.exactTime ? (
                                <div className="text-right">
                                    <div className={`text-lg font-bold font-mono leading-none ${stock.changePercent > 0 ? 'text-ashare-red' : 'text-ashare-green'}`}>
                                        {stock.price?.toFixed(2)}
                                    </div>
                                    <div className={`text-[10px] font-bold ${stock.changePercent > 0 ? 'text-ashare-red' : 'text-ashare-green'}`}>
                                        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent?.toFixed(2)}%
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1 opacity-50">
                                     <RefreshCw size={10} className="animate-spin text-yellow-500"/>
                                     <span className="text-[9px] text-yellow-500 font-mono">核验中</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1 mt-1">
                                <span className={`text-xs font-bold font-mono ${getScoreColor(stock.score)}`}>{stock.score || 85}分</span>
                                <ChevronRight size={14} className="text-gray-600" />
                            </div>
                        </div>
                    </div>
                    {analysisResult[stock.id] && (
                        <div className="mx-4 mb-4 p-3 bg-red-900/10 rounded-lg border border-red-900/20 text-[10px] text-red-200">
                             <strong>策略建议:</strong> {analysisResult[stock.id].substring(0, 100)}...
                        </div>
                    )}
                </div>
                ))
            ) : (
                <div className="text-center py-20 text-gray-500 px-10">
                    <ShieldCheck size={32} className="mx-auto mb-4 text-gray-700" />
                    <p className="text-sm font-bold">暂无符合条件的真龙个股</p>
                    <p className="text-xs mt-2 text-gray-600 italic">"空仓也是一种最高级的策略"</p>
                </div>
            )}
        </div>
      </div>

      {selectedStock && (
        <StockDetailModal 
            stock={selectedStock} 
            onClose={() => setSelectedStock(null)} 
            onUpdate={handleStockUpdate}
        />
      )}
    </div>
  );
};

export default StockScreener;