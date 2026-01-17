import React, { useState, useEffect } from 'react';
import { Stock } from '../types';
import { Flame, RefreshCcw, ShieldCheck, ChevronRight, ExternalLink } from 'lucide-react';
import { fetchDragonStocks, verifyRealTimeQuote, GroundingSource } from '../services/geminiService';
import StockDetailModal from './StockDetailModal';

const StockScreener: React.FC = () => {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [sources, setSources] = useState<GroundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  const loadStocks = async () => {
    setLoading(true);
    const res = await fetchDragonStocks();
    setStocks(res.data);
    setSources(res.sources);
    setLoading(false);
  };

  useEffect(() => { loadStocks(); }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2"><Flame className="text-ashare-red" size={20}/> 猎杀真龙</h2>
        <button onClick={loadStocks} className="bg-ashare-red p-2 rounded-full text-white"><RefreshCcw size={18} className={loading ? 'animate-spin' : ''}/></button>
      </div>

      <div className="bg-ashare-card border border-gray-700 rounded-xl overflow-hidden divide-y divide-gray-800">
        {loading ? Array.from({length: 4}).map((_, i) => <div key={i} className="h-16 animate-pulse bg-gray-800/50 m-2 rounded"></div>) : 
          stocks.map((stock, idx) => (
            <div key={stock.code} onClick={() => setSelectedStock(stock)} className="p-4 flex justify-between items-center hover:bg-gray-800/40 cursor-pointer transition">
              <div className="flex items-center gap-3">
                <span className="text-gray-500 font-mono text-xs">{idx + 1}</span>
                <div>
                  <div className="font-bold text-white">{stock.name}</div>
                  <div className="text-[10px] text-gray-500 font-mono">{stock.code}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-mono font-bold ${stock.changePercent > 0 ? 'text-ashare-red' : 'text-ashare-green'}`}>{stock.price.toFixed(2)}</div>
                <div className="text-[10px] text-gray-400">{stock.score}分</div>
              </div>
            </div>
          ))
        }
      </div>

      {sources.length > 0 && (
        <div className="p-3 bg-gray-800/20 rounded-lg border border-gray-800">
          <p className="text-[10px] text-gray-600 mb-2">情报来源 (Alpha Sources):</p>
          <div className="flex flex-wrap gap-2">
            {sources.map((s, i) => (
              <a key={i} href={s.uri} target="_blank" className="text-[9px] text-gray-400 bg-gray-800 px-2 py-0.5 rounded border border-gray-700 flex items-center gap-1 hover:text-white">
                {s.title} <ExternalLink size={8}/>
              </a>
            ))}
          </div>
        </div>
      )}

      {selectedStock && <StockDetailModal stock={selectedStock} onClose={() => setSelectedStock(null)} />}
    </div>
  );
};
export default StockScreener;