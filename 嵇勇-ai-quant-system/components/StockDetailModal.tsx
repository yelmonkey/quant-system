import React, { useMemo, useEffect, useState } from 'react';
import { Stock } from '../types';
import { X, TrendingUp, TrendingDown, DollarSign, Activity, Newspaper, BarChart3, ExternalLink, Scale, ArrowDownCircle, ShieldCheck, RefreshCw, Clock, CandlestickChart, LineChart, Layers, Edit2, Check, Lock } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Bar, Line, Brush } from 'recharts';
import { fetchStockNews, fetchStockFinancials, verifyRealTimeQuote, fetchMarketLeaders } from '../services/geminiService';

interface StockDetailModalProps {
  stock: Stock;
  onClose: () => void;
  onUpdate?: (updatedStock: Stock) => void;
}

// Custom Shape for Candlestick (Red/Green)
const CustomCandle = (props: any) => {
  const { x, y, width, height, payload } = props;
  const { open, close, high, low } = payload;
  
  const range = high - low;
  const ratio = range === 0 ? 0 : height / range;
  
  const yHigh = y;
  const yOpen = yHigh + (high - open) * ratio;
  const yClose = yHigh + (high - close) * ratio;
  
  const isUp = close >= open;
  const color = isUp ? '#ef4444' : '#22c55e'; // Red up, Green down
  
  const bodyTop = Math.min(yOpen, yClose);
  const bodyHeight = Math.max(1, Math.abs(yOpen - yClose));
  const centerX = x + width / 2;

  // Handle flat line (Doji or limit up seal) visual
  const isFlat = open === close && high === low;
  
  return (
    <g stroke={color} fill={color} strokeWidth="1">
      {/* Wick */}
      {!isFlat && <line x1={centerX} y1={y} x2={centerX} y2={y + height} />}
      {/* Body */}
      <rect x={x} y={isFlat ? yOpen - 1 : bodyTop} width={width} height={isFlat ? 2 : bodyHeight} stroke="none" />
    </g>
  );
};

// Mini Sparkline Component for Market Context
const MiniSparkline = ({ change, color }: { change: number, color: string }) => {
    const data = useMemo(() => {
        const points = [0];
        let current = 0;
        const steps = 15;
        // Seed randomness based on change to be consistent but look random
        const seed = Math.abs(change * 100); 
        let randomState = seed;
        const random = () => {
            const x = Math.sin(randomState++) * 10000;
            return x - Math.floor(x);
        };

        for (let i = 0; i < steps; i++) {
            // Trend component: push towards the final change value
            // We want the final point to be `change`
            // Linear interpolation target for this step
            const progress = (i + 1) / (steps + 1);
            const target = change * progress;
            
            // Current trend pull
            const pull = (target - current) * 0.5;
            
            // Random volatility
            const volatility = Math.abs(change) * 0.2; 
            const noise = (random() - 0.5) * volatility;
            
            current += pull + noise;
            points.push(current);
        }
        points.push(change); 
        return points;
    }, [change]);

    const width = 60;
    const height = 24;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pointsStr = data.map((d, i) => {
        const x = (i / (data.length - 1)) * width;
        // Map data to height (padding 4px vertical)
        const y = height - 4 - ((d - min) / range) * (height - 8);
        return `${x},${y + 2}`; // +2 top padding
    }).join(' ');

    // Calculate Y for the last dot
    const lastY = height - 4 - ((data[data.length-1] - min) / range) * (height - 8) + 2;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
            <polyline 
                points={pointsStr} 
                fill="none" 
                stroke={color} 
                strokeWidth="1.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
            />
             <circle 
                cx={width} 
                cy={lastY} 
                r="1.5" 
                fill={color} 
            />
        </svg>
    );
};

// Simulated Intraday Data Generator
const generateIntradayData = (stock: Stock, currentPrice: number) => {
    const data = [];
    const now = new Date();
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // A-Share Trading Hours
    const amStart = new Date(today); amStart.setHours(9, 30);
    const amEnd = new Date(today); amEnd.setHours(11, 30);
    const pmStart = new Date(today); pmStart.setHours(13, 0);
    const pmEnd = new Date(today); pmEnd.setHours(15, 0);

    let endTimeLimit = now;
    if (now < amStart) endTimeLimit = amStart; 
    else if (now > pmEnd) endTimeLimit = pmEnd;

    // Calculate Previous Close (Base)
    const prevClose = stock.price / (1 + stock.changePercent / 100);

    // Limit Up / Limit Down Detection
    const isLimitUp = stock.status === 'LimitUp' || stock.changePercent > 9.5;
    
    // Pattern Recognition via Tags
    const isOneWord = stock.tags.some(t => t.includes("一字")); // One-word board
    const isWeakToStrong = stock.tags.some(t => t.includes("弱转强")); // Weak to Strong
    const isFloorToCeiling = stock.tags.some(t => t.includes("地天板") || t.includes("大长腿")); // Floor to Ceiling

    // Seeded Random
    const seed = stock.code.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) + today.getDate();
    let randState = seed;
    const random = () => {
            const x = Math.sin(randState++) * 10000;
            return x - Math.floor(x);
    };

    // Determine "Seal Time" (The minute step where price flattens)
    // Total steps approx 240 mins.
    let sealStep = 9999;
    if (isLimitUp) {
        if (isOneWord) {
            sealStep = 0;
        } else if (isWeakToStrong) {
            // Seals quickly: 5 to 30 mins
            sealStep = 5 + Math.floor(random() * 25);
        } else if (isFloorToCeiling) {
            // Seals late: Afternoon 14:00+ (approx step 180+)
            sealStep = 180 + Math.floor(random() * 40);
        } else {
            // Normal: Randomly weighted
            sealStep = random() > 0.4 ? Math.floor(random() * 60) : 150 + Math.floor(random() * 60);
        }
    }

    let cursor = new Date(amStart);
    const effectiveEnd = now > pmEnd ? pmEnd : (now < amStart ? amStart : now);
    
    // Determine Realistic Opening Price
    let lastClose = prevClose;
    if (isOneWord) {
        lastClose = currentPrice;
    } else if (isLimitUp) {
        if (isFloorToCeiling) {
            // Open Low: -4% to -8%
            lastClose = prevClose * (1 - 0.04 - random() * 0.04);
        } else if (isWeakToStrong) {
            // Open Flat or Slightly High: 0% to +3%
            lastClose = prevClose * (1 + random() * 0.03);
        } else {
            // Normal Strong Open: +2% to +6%
            lastClose = prevClose * (1 + 0.02 + random() * 0.04);
        }
    } else {
        // Normal random open
        lastClose = prevClose * (1 + (random() - 0.5) * 0.04);
    }

    // Safety clamp for Open so it doesn't exceed limit
    const limitPrice = prevClose * 1.105; // rough limit
    if (lastClose > currentPrice && isLimitUp) lastClose = currentPrice * 0.99; // Open below limit if not one word

    let rawPathVal = lastClose - prevClose; 
    let step = 0;

    while (cursor <= pmEnd) {
        // Lunch Break
        if (cursor > amEnd && cursor < pmStart) {
            cursor = new Date(pmStart);
            continue;
        }
        if (cursor > effectiveEnd && effectiveEnd < pmEnd) break;

        const timeStr = cursor.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

        // --- Logic for Limit Up Sealing ---
        if (isLimitUp && step >= sealStep) {
            // SEALED STATE: Flat line at currentPrice
            data.push({
                time: timeStr,
                price: Number(currentPrice.toFixed(2)),
                open: Number(currentPrice.toFixed(2)),
                close: Number(currentPrice.toFixed(2)),
                high: Number(currentPrice.toFixed(2)),
                low: Number(currentPrice.toFixed(2)),
                range: [Number(currentPrice.toFixed(2)), Number(currentPrice.toFixed(2))],
                volume: Math.floor(random() * 200) // Tiny volume when sealed
            });
        } else {
            // NORMAL TRADING / PRE-SEAL
            const volatilityBase = Math.abs(stock.changePercent) > 5 ? 0.005 : 0.002;
            let noise = (random() - 0.5) * (prevClose * volatilityBase);
            
            // If Limit Up but not sealed, drift upwards
            if (isLimitUp) noise += prevClose * 0.0005;

            rawPathVal += noise;
            let simClose = prevClose + rawPathVal;

            // Pattern Specific Guidance
            if (isFloorToCeiling && step < sealStep) {
                // Recover from dip logic handled by natural drift + correction below
            }

            // Correction towards Target
            // If we are getting close to SealStep, magnetism to Limit Price increases
            if (isLimitUp && step < sealStep) {
                 const distToSeal = sealStep - step;
                 if (distToSeal < 15) {
                     // Accelerate to limit
                     const gap = currentPrice - simClose;
                     simClose += gap * (1 / (distToSeal + 1));
                 }
            }

            // Clamp
            if (isLimitUp && simClose > currentPrice) simClose = currentPrice;

            const open = lastClose;
            const close = simClose;
            
            const candleVol = prevClose * 0.001 * (random() + 0.5);
            let high = Math.max(open, close) + candleVol;
            let low = Math.min(open, close) - candleVol;
            
            if (isLimitUp && high > currentPrice) high = currentPrice;

            data.push({
                time: timeStr,
                price: Number(close.toFixed(2)),
                open: Number(open.toFixed(2)),
                close: Number(close.toFixed(2)),
                high: Number(high.toFixed(2)),
                low: Number(low.toFixed(2)),
                range: [Number(low.toFixed(2)), Number(high.toFixed(2))],
                volume: Math.floor(random() * 20000 + 5000)
            });
            lastClose = close;
        }

        cursor.setMinutes(cursor.getMinutes() + 1);
        step++;
        if (data.length > 242) break;
    }

    if (data.length === 0) return [];

    // Force the LAST candle to match LIVE price exactly
    const lastIdx = data.length - 1;
    if (lastIdx >= 0) {
        const last = data[lastIdx];
        last.close = currentPrice;
        last.price = currentPrice;
        if (isLimitUp) {
             last.high = currentPrice;
             last.low = currentPrice;
             last.open = currentPrice; 
             last.range = [currentPrice, currentPrice];
        } else {
            if (last.high < currentPrice) last.high = currentPrice;
            if (last.low > currentPrice) last.low = currentPrice;
            last.range = [last.low, last.high];
        }
    }

    return data;
};

// ... (Mock generators remain same)
const generateMockFinancials = (stock: Stock) => {
    const seed = stock.code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    return {
        marketCap: (50 + rand(1) * 200).toFixed(1),
        floatCap: (10 + rand(2) * 50).toFixed(1),
        pe: (15 + rand(3) * 60).toFixed(1),
        pb: (1.5 + rand(4) * 6).toFixed(2),
        roe: (2 + rand(5) * 18).toFixed(2),
        debtRatio: (15 + rand(6) * 55).toFixed(1),
    };
};

const generateMockShortData = (stock: Stock) => {
    const seed = stock.code.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const rand = (offset: number) => {
        const x = Math.sin(seed + offset * 100) * 10000;
        return x - Math.floor(x);
    };

    return {
        marginBalance: (5 + rand(1) * 20).toFixed(2), 
        shortBalance: (0.1 + rand(2) * 2).toFixed(2), 
        netBuy: ((rand(3) - 0.5) * 5000).toFixed(0), 
        shortRatio: (rand(4) * 5).toFixed(2) 
    };
};

const StockDetailModal: React.FC<StockDetailModalProps> = ({ stock, onClose, onUpdate }) => {
  const [verifiedQuote, setVerifiedQuote] = useState<{price: number, change: number, time: string} | null>(stock.exactTime ? { price: stock.price, change: stock.changePercent, time: stock.exactTime } : null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [livePrice, setLivePrice] = useState(stock.price);
  const [liveChange, setLiveChange] = useState(stock.changePercent);
  const [currentTimeStr, setCurrentTimeStr] = useState("");
  const [chartType, setChartType] = useState<'line' | 'candle'>('line');
  
  // Manual Override State
  const [isEditing, setIsEditing] = useState(false);
  const [manualPriceInput, setManualPriceInput] = useState("");
  const [isManuallyOverridden, setIsManuallyOverridden] = useState(false);

  // Technical Indicator State
  const [showMA, setShowMA] = useState(false);
  const [showRSI, setShowRSI] = useState(false);

  // Market Context State
  const [marketLeaders, setMarketLeaders] = useState<{gainers: any[], losers: any[]} | null>(null);

  // Determine Board Count (Numeric)
  const boardNumber = useMemo(() => {
      const tag = stock.tags.find(t => /(\d+)连?板/.test(t) || /(\d+)板/.test(t));
      if (tag) {
          const m = tag.match(/(\d+)/);
          return m ? parseInt(m[1]) : 1;
      }
      if (stock.status === 'LimitUp' || stock.changePercent > 9.5) return 1;
      return 0;
  }, [stock.tags, stock.status, stock.changePercent]);

  const isLimitUp = stock.status === 'LimitUp' || liveChange > 9.5;

  useEffect(() => {
    if (verifiedQuote && !isManuallyOverridden) {
        setLivePrice(verifiedQuote.price);
        setLiveChange(verifiedQuote.change);
    }
  }, [verifiedQuote, isManuallyOverridden]);

  useEffect(() => {
    const priceInterval = setInterval(() => {
        if (isLimitUp || isManuallyOverridden) return; // Sealed or Locked

        setLivePrice(prev => {
            const rand = Math.random();
            let change = 0;
            if (rand > 0.8) change = 0;
            else if (rand > 0.4) change = 0.01;
            else change = -0.01;
            return Number((prev + change).toFixed(2));
        });
    }, 1000);

    const clockInterval = setInterval(() => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('zh-CN', {year: 'numeric', month: '2-digit', day: '2-digit'}).replace(/\//g, '-');
        const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
        const ms = now.getMilliseconds().toString().padStart(3, '0');
        setCurrentTimeStr(`${dateStr} ${timeStr}.${ms}`);
    }, 50);

    return () => {
        clearInterval(priceInterval);
        clearInterval(clockInterval);
    };
  }, [isLimitUp, isManuallyOverridden]);

  useEffect(() => {
     if (isManuallyOverridden) return; // Don't recalc change if manual
     if (isLimitUp) {
         setLiveChange(stock.changePercent);
     } else {
         const diff = livePrice - stock.price;
         setLiveChange(stock.changePercent + (diff / stock.price) * 100);
     }
  }, [livePrice, stock.price, stock.changePercent, isLimitUp, isManuallyOverridden]);

  const displayPrice = livePrice;
  const displayChange = liveChange;
  
  // Core Intraday Data + Indicators
  const intradayData = useMemo(() => {
      const rawData = generateIntradayData(stock, displayPrice);
      // ... (rest of logic same)
      let avgGain = 0;
      let avgLoss = 0;

      const processed = rawData.map((d, i, arr) => {
         const getSMA = (n: number) => {
             if (i < n - 1) return null;
             let sum = 0;
             for(let k=0; k<n; k++) sum += arr[i-k].close;
             return Number((sum / n).toFixed(2));
         };

         let rsi = null;
         if (i > 0) {
             const change = d.close - arr[i-1].close;
             const gain = change > 0 ? change : 0;
             const loss = change < 0 ? -change : 0;
             
             if (i < 14) {
                 avgGain += gain;
                 avgLoss += loss;
             } else {
                 if (i === 14) {
                     avgGain /= 14;
                     avgLoss /= 14;
                 } else {
                     avgGain = (avgGain * 13 + gain) / 14;
                     avgLoss = (avgLoss * 13 + loss) / 14;
                 }
                 const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
                 rsi = Number((100 - (100 / (1 + rs))).toFixed(2));
             }
         }

         return {
             ...d,
             ma5: getSMA(5),
             ma10: getSMA(10),
             ma20: getSMA(20),
             rsi: rsi
         };
      });
      return processed;
  }, [stock.id, displayPrice]); 

  const shortData = useMemo(() => generateMockShortData(stock), [stock.code]);
  const isUp = displayChange > 0;
  const color = isUp ? '#ef4444' : '#22c55e';
  
  const prevClose = useMemo(() => {
      return stock.price / (1 + stock.changePercent / 100);
  }, [stock.price, stock.changePercent]);

  const chartDomain = useMemo(() => {
      if (intradayData.length === 0) return ['auto', 'auto'];
      const lows = intradayData.map(d => d.low || d.price);
      const highs = intradayData.map(d => d.high || d.price);
      const min = Math.min(...lows, prevClose) * 0.995;
      const max = Math.max(...highs, prevClose) * 1.005;
      return [min, max];
  }, [intradayData, prevClose]);

  const [newsList, setNewsList] = useState<any[]>([]);
  const [newsSources, setNewsSources] = useState<any[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [financials, setFinancials] = useState<any>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
        setLoadingNews(true);
        setLoadingFinancials(true);
        if (!isManuallyOverridden) setIsVerifying(true);
        
        const newsPromise = fetchStockNews(stock.name, stock.code);
        const financialsPromise = fetchStockFinancials(stock.name, stock.code);
        // Skip verification if user has manually set price
        const verifyPromise = isManuallyOverridden ? Promise.resolve(null) : verifyRealTimeQuote(stock.code, stock.name);
        const leadersPromise = fetchMarketLeaders();
        
        const [newsResult, financialResult, verifyResult, leadersResult] = await Promise.all([newsPromise, financialsPromise, verifyPromise, leadersPromise]);

        if (mounted) {
            if (verifyResult && !isManuallyOverridden) {
                setVerifiedQuote(verifyResult);
                if (onUpdate) {
                    onUpdate({
                        ...stock,
                        price: verifyResult.price,
                        changePercent: verifyResult.change,
                        exactTime: verifyResult.time
                    });
                }
            }
            setIsVerifying(false);
            setNewsList(newsResult.news);
            setNewsSources(newsResult.sources);
            setLoadingNews(false);
            setMarketLeaders(leadersResult);
            if (financialResult) {
                setFinancials({
                    marketCap: Number(financialResult.marketCap).toFixed(1),
                    floatCap: Number(financialResult.floatCap).toFixed(1),
                    pe: Number(financialResult.pe).toFixed(1),
                    pb: Number(financialResult.pb).toFixed(2),
                    roe: Number(financialResult.roe).toFixed(2),
                    debtRatio: Number(financialResult.debtRatio).toFixed(1),
                });
            } else {
                setFinancials(generateMockFinancials(stock));
            }
            setLoadingFinancials(false);
        }
    };
    loadData();
    return () => { mounted = false; };
  }, [stock.id, stock.name, stock.code]); // Removing isManuallyOverridden to avoid re-loop, initial check handles it

  const handleManualSave = () => {
    const val = parseFloat(manualPriceInput);
    if (!isNaN(val)) {
        const impliedPrevClose = stock.price / (1 + stock.changePercent / 100);
        const newChange = ((val - impliedPrevClose) / impliedPrevClose) * 100;
        
        const newStockState = {
            price: val,
            change: newChange,
            time: `Manual ${new Date().toLocaleTimeString('zh-CN', {hour12:false})}`
        };

        setVerifiedQuote(newStockState);
        setLivePrice(val);
        setLiveChange(newChange);
        setIsManuallyOverridden(true);
        setIsEditing(false);

        if (onUpdate) {
            onUpdate({
                ...stock,
                price: val,
                changePercent: newChange,
                exactTime: newStockState.time
            });
        }
    }
  };

  const FinancialCard = ({ title, value, unit, redCondition = false }: any) => (
      <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 hover:border-gray-500 transition">
          <div className="text-xs text-gray-500 mb-1">{title}</div>
          {loadingFinancials ? (
              <div className="h-6 w-20 bg-gray-700/50 rounded animate-pulse"></div>
          ) : (
              <div className={`text-lg font-mono ${redCondition ? 'text-ashare-red' : 'text-white'}`}>
                  {value} <span className="text-xs text-gray-400">{unit}</span>
              </div>
          )}
      </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1e293b] w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-start p-6 border-b border-gray-700 sticky top-0 bg-[#1e293b] z-10 shadow-md">
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-white">{stock.name}</h2>
                    <span className="text-sm font-mono text-gray-400 bg-gray-800 px-2 py-1 rounded border border-gray-700">
                        {stock.code}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-900/30 text-blue-300 border border-blue-800">
                        {stock.concept}
                    </span>
                </div>
                <div className="flex items-end gap-4 mt-2">
                    {isEditing ? (
                         <div className="flex items-center gap-2 pb-2">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-mono">¥</span>
                                <input 
                                    type="number"
                                    value={manualPriceInput}
                                    onChange={(e) => setManualPriceInput(e.target.value)}
                                    className="w-40 bg-gray-900 border border-blue-500 rounded py-1 pl-6 pr-2 text-2xl font-bold font-mono text-white focus:outline-none"
                                    autoFocus
                                    placeholder={livePrice.toString()}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManualSave()}
                                />
                            </div>
                            <button onClick={handleManualSave} className="p-2 bg-green-600 hover:bg-green-500 rounded text-white transition">
                                <Check size={20} />
                            </button>
                            <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-700 hover:bg-gray-600 rounded text-white transition">
                                <X size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex items-center group">
                            <span className={`text-5xl font-bold font-mono tracking-tighter ${isUp ? 'text-ashare-red' : 'text-ashare-green'} ${isVerifying ? 'opacity-70' : ''}`}>
                                {displayPrice.toFixed(2)}
                            </span>
                             {/* Manual Edit Trigger */}
                            <button 
                                onClick={() => { setManualPriceInput(displayPrice.toString()); setIsEditing(true); }}
                                className="ml-4 opacity-0 group-hover:opacity-100 transition p-1.5 bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 text-gray-400 hover:text-white"
                                title="价格不对？手动修正 (Override Price)"
                            >
                                <Edit2 size={16} />
                            </button>

                            {isManuallyOverridden && (
                                <div className="absolute -top-4 left-0 flex items-center gap-1 bg-yellow-900/30 text-yellow-500 text-[10px] px-1.5 py-0.5 rounded border border-yellow-800/50 font-bold">
                                    <Lock size={8} /> 手动锁定
                                </div>
                            )}
                            
                            {/* Promotion Ladder Visual */}
                            {boardNumber > 0 && (
                                <div className="ml-3 flex flex-col justify-end h-10 pb-1 gap-0.5 group relative" title={`${boardNumber} 连板晋级`}>
                                    <div className="flex gap-1 items-end h-full">
                                        {Array.from({length: boardNumber}).map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-2 bg-gradient-to-t from-red-600 to-red-400 rounded-sm shadow-[0_0_5px_rgba(239,68,68,0.5)]" 
                                                style={{
                                                    height: `${Math.min(100, 40 + (i * (60/Math.max(boardNumber, 1))))}%`,
                                                    opacity: 0.8 + (i/boardNumber)*0.2
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                    <span className="text-[10px] font-bold text-red-400 leading-none text-center bg-red-900/30 px-1 rounded absolute -top-4 left-0 w-full border border-red-500/30">
                                        {boardNumber}板
                                    </span>
                                </div>
                            )}

                            {isVerifying && !isManuallyOverridden && (
                                <div className="absolute -right-6 top-1">
                                    <RefreshCw className="animate-spin text-gray-500" size={14}/>
                                </div>
                            )}
                            {/* Live Indicator */}
                            {!isManuallyOverridden && (
                                <div className="absolute -right-2 top-0 flex flex-col items-center">
                                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                                </div>
                            )}
                        </div>
                    )}
                   
                    {!isEditing && (
                        <div className="flex flex-col mb-1">
                            <div className={`flex items-center gap-1 text-xl font-medium ${isUp ? 'text-ashare-red' : 'text-ashare-green'}`}>
                                {isUp ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                                <span>{displayChange > 0 ? '+' : ''}{displayChange.toFixed(2)}%</span>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-mono text-gray-500 mt-1 bg-gray-900/50 px-2 py-0.5 rounded border border-gray-800">
                                <Clock size={10} className="text-gray-400"/>
                                <span>{currentTimeStr}</span>
                            </div>
                        </div>
                    )}

                    {verifiedQuote && !isVerifying && !isManuallyOverridden && !isEditing && (
                         <div className="mb-3 ml-4 flex items-center gap-1 px-3 py-1 rounded-full bg-teal-900/30 border border-teal-800/50 text-teal-400 text-xs animate-fade-in shadow-lg shadow-teal-900/20">
                            <ShieldCheck size={14} />
                            <span className="font-semibold">AI已核对实时数据</span>
                         </div>
                    )}
                </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition bg-gray-800 p-2 rounded-lg hover:bg-gray-700">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-8">
            {/* Chart Section */}
            <section>
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Activity size={16} /> 日内走势 (Real-time Intraday)
                    </h3>
                    
                    <div className="flex items-center gap-3">
                         {/* Indicator Toggles */}
                        <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                            <button 
                                onClick={() => setShowMA(!showMA)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition ${showMA ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <LineChart size={12}/> MA (均线)
                            </button>
                            <button 
                                onClick={() => setShowRSI(!showRSI)}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition ${showRSI ? 'bg-indigo-600 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Layers size={12}/> RSI (强弱)
                            </button>
                        </div>

                        {/* Chart Type Toggle */}
                        <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
                            <button 
                                onClick={() => setChartType('line')}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition ${chartType === 'line' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <Activity size={12}/> 分时
                            </button>
                            <button 
                                onClick={() => setChartType('candle')}
                                className={`flex items-center gap-1 px-3 py-1 rounded text-xs transition ${chartType === 'candle' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-gray-200'}`}
                            >
                                <CandlestickChart size={12}/> K线
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Main Chart */}
                <div className="relative">
                    <div className={`w-full bg-gray-900/50 rounded-t-xl border border-gray-800 p-2 relative ${showRSI ? 'h-64 rounded-b-none border-b-0' : 'h-80 rounded-b-xl'}`}>
                         {/* MA Legend */}
                         {showMA && (
                             <div className="absolute top-2 left-4 z-10 flex gap-4 text-[10px] font-mono pointer-events-none">
                                 <span className="text-yellow-500">MA5: {intradayData[intradayData.length-1]?.ma5 || '--'}</span>
                                 <span className="text-purple-400">MA10: {intradayData[intradayData.length-1]?.ma10 || '--'}</span>
                                 <span className="text-blue-500">MA20: {intradayData[intradayData.length-1]?.ma20 || '--'}</span>
                             </div>
                         )}
                        <ResponsiveContainer width="100%" height="100%">
                            {chartType === 'line' ? (
                                <AreaChart data={intradayData} syncId="stockDetailChart">
                                    <defs>
                                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <ReferenceLine y={prevClose} stroke="#64748b" strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="time" 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        minTickGap={40} 
                                        hide={showRSI}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        domain={chartDomain} 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={40} 
                                        tickFormatter={(val) => val.toFixed(2)}
                                    />
                                    <Tooltip 
                                        cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0', fontSize: '12px' }}
                                        formatter={(value: number) => [value.toFixed(2), 'Price']}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="price" 
                                        stroke={color} 
                                        strokeWidth={2} 
                                        fillOpacity={1} 
                                        fill="url(#colorPrice)" 
                                        isAnimationActive={false}
                                    />
                                    {showMA && <Line type="monotone" dataKey="ma5" stroke="#eab308" strokeWidth={1} dot={false} />}
                                    {showMA && <Line type="monotone" dataKey="ma10" stroke="#a78bfa" strokeWidth={1} dot={false} />}
                                    {showMA && <Line type="monotone" dataKey="ma20" stroke="#3b82f6" strokeWidth={1} dot={false} />}
                                    <Brush 
                                        dataKey="time" 
                                        height={15} 
                                        stroke="#334155" 
                                        fill="#0f172a" 
                                        tickFormatter={() => ''} 
                                        travellerWidth={6} 
                                        alwaysShowText={false}
                                    />
                                </AreaChart>
                            ) : (
                                <ComposedChart data={intradayData} syncId="stockDetailChart">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <ReferenceLine y={prevClose} stroke="#64748b" strokeDasharray="3 3" />
                                    <XAxis 
                                        dataKey="time" 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        minTickGap={40} 
                                        hide={showRSI}
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        domain={chartDomain} 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={40} 
                                        tickFormatter={(val) => val.toFixed(2)}
                                    />
                                    <Tooltip 
                                        cursor={{ stroke: '#64748b', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0', fontSize: '12px' }}
                                        labelStyle={{ color: '#94a3b8' }}
                                        content={({ active, payload, label }) => {
                                            if (active && payload && payload.length) {
                                                const data = payload[0].payload;
                                                return (
                                                    <div className="bg-[#0f172a] border border-gray-700 p-2 rounded shadow-xl text-xs z-50">
                                                        <p className="text-gray-400 mb-1">{label}</p>
                                                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                                            <span className="text-gray-500">Open:</span> <span className="font-mono text-white text-right">{data.open}</span>
                                                            <span className="text-gray-500">High:</span> <span className="font-mono text-ashare-red text-right">{data.high}</span>
                                                            <span className="text-gray-500">Low:</span> <span className="font-mono text-ashare-green text-right">{data.low}</span>
                                                            <span className="text-gray-500">Close:</span> <span className={`font-mono text-right ${data.close >= data.open ? 'text-ashare-red' : 'text-ashare-green'}`}>{data.close}</span>
                                                        </div>
                                                        {showMA && (
                                                            <div className="mt-2 pt-2 border-t border-gray-700 grid grid-cols-2 gap-x-4 gap-y-1">
                                                                <span className="text-yellow-500">MA5:</span> <span className="font-mono text-white text-right">{data.ma5}</span>
                                                                <span className="text-purple-400">MA10:</span> <span className="font-mono text-white text-right">{data.ma10}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            }
                                            return null;
                                        }}
                                    />
                                    <Bar 
                                        dataKey="range" 
                                        shape={<CustomCandle />} 
                                        isAnimationActive={false}
                                    />
                                    {showMA && <Line type="monotone" dataKey="ma5" stroke="#eab308" strokeWidth={1} dot={false} />}
                                    {showMA && <Line type="monotone" dataKey="ma10" stroke="#a78bfa" strokeWidth={1} dot={false} />}
                                    {showMA && <Line type="monotone" dataKey="ma20" stroke="#3b82f6" strokeWidth={1} dot={false} />}
                                    <Brush 
                                        dataKey="time" 
                                        height={15} 
                                        stroke="#334155" 
                                        fill="#0f172a" 
                                        tickFormatter={() => ''} 
                                        travellerWidth={6}
                                        alwaysShowText={false}
                                    />
                                </ComposedChart>
                            )}
                        </ResponsiveContainer>
                        
                        {/* Live Indicator Overlay */}
                        <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded backdrop-blur-sm pointer-events-none">
                            <div className={`w-1.5 h-1.5 rounded-full ${isLimitUp ? 'bg-red-500' : 'bg-green-400'} animate-pulse`}></div>
                            <span className="text-[10px] text-gray-300 font-mono">{isLimitUp ? 'SEALED' : 'LIVE TICK'}</span>
                        </div>
                    </div>

                    {/* RSI Chart */}
                    {showRSI && (
                        <div className="h-24 w-full bg-gray-900/50 rounded-b-xl border border-gray-800 border-t-0 p-2">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={intradayData} syncId="stockDetailChart">
                                    <defs>
                                        <linearGradient id="colorRsi" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                    <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="3 3" strokeOpacity={0.5} />
                                    <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="3 3" strokeOpacity={0.5} />
                                    <XAxis 
                                        dataKey="time" 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        minTickGap={40} 
                                        interval="preserveStartEnd"
                                    />
                                    <YAxis 
                                        domain={[0, 100]} 
                                        stroke="#94a3b8" 
                                        tick={{fontSize: 10}} 
                                        tickLine={false} 
                                        axisLine={false} 
                                        width={40} 
                                        ticks={[30, 70]}
                                    />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#e2e8f0', fontSize: '12px' }}
                                        formatter={(value: number) => [value, 'RSI(14)']}
                                        labelStyle={{ color: '#94a3b8' }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="rsi" 
                                        stroke="#10b981" 
                                        strokeWidth={1.5} 
                                        fillOpacity={1} 
                                        fill="url(#colorRsi)" 
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            </section>

            {/* Financials Grid */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <DollarSign size={16} /> 核心数据 (Key Financials)
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
                        <span className={`w-2 h-2 rounded-full ${loadingFinancials ? 'bg-blue-500 animate-pulse' : 'bg-green-500'}`}></span>
                        {loadingFinancials ? 'AI Syncing...' : 'Real-time Data'}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FinancialCard title="总市值 (Market Cap)" value={financials?.marketCap} unit="亿" />
                    <FinancialCard title="流通市值 (Float)" value={financials?.floatCap} unit="亿" />
                    <FinancialCard title="市盈率 (PE-TTM)" value={financials?.pe} />
                    <FinancialCard title="市净率 (PB Ratio)" value={financials?.pb} />
                    <FinancialCard title="ROE (净资产收益率)" value={financials?.roe} unit="%" redCondition={Number(financials?.roe) > 10} />
                    <FinancialCard title="资产负债率 (Debt/Asset)" value={financials?.debtRatio} unit="%" />
                    <FinancialCard title="换手率 (Turnover)" value={stock.turnoverRate} unit="%" redCondition={stock.turnoverRate > 10} />
                    <FinancialCard title="量比 (Vol Ratio)" value={stock.volumeRatio} redCondition={stock.volumeRatio > 1.5} />
                </div>
            </section>

             {/* Market Context Section */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <BarChart3 size={16} /> 全市场风向 (Market Context)
                    </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Gainers */}
                    <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <TrendingUp size={12} className="text-ashare-red"/> 领涨个股 (Top Gainers)
                        </div>
                        <div className="space-y-2">
                            {marketLeaders?.gainers && marketLeaders.gainers.length > 0 ? (
                                marketLeaders.gainers.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                                    <div className="flex flex-col w-1/3">
                                        <span className="text-gray-300 font-medium truncate">{s.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{s.code}</span>
                                    </div>
                                    <div className="w-1/3 flex justify-center">
                                         <MiniSparkline change={s.change} color="#ef4444" />
                                    </div>
                                    <div className="flex gap-2 items-center justify-end w-1/3">
                                        <span className="font-mono text-gray-400 text-xs">{s.price}</span>
                                        <span className="font-mono text-ashare-red font-bold text-xs bg-red-900/20 px-1 rounded min-w-[50px] text-right">+{s.change}%</span>
                                    </div>
                                </div>
                            ))) : (
                                <div className="text-xs text-gray-600 text-center py-2">{loadingFinancials ? 'Loading...' : '暂无数据'}</div>
                            )}
                        </div>
                    </div>
                    {/* Losers */}
                    <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                        <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 uppercase font-bold tracking-wider">
                            <TrendingDown size={12} className="text-ashare-green"/> 领跌个股 (Top Losers)
                        </div>
                        <div className="space-y-2">
                             {marketLeaders?.losers && marketLeaders.losers.length > 0 ? (
                                 marketLeaders.losers.map((s: any, i: number) => (
                                <div key={i} className="flex justify-between items-center text-sm border-b border-gray-700/50 pb-2 last:border-0 last:pb-0">
                                    <div className="flex flex-col w-1/3">
                                        <span className="text-gray-300 font-medium truncate">{s.name}</span>
                                        <span className="text-[10px] text-gray-500 font-mono">{s.code}</span>
                                    </div>
                                    <div className="w-1/3 flex justify-center">
                                         <MiniSparkline change={s.change} color="#22c55e" />
                                    </div>
                                    <div className="flex gap-2 items-center justify-end w-1/3">
                                        <span className="font-mono text-gray-400 text-xs">{s.price}</span>
                                        <span className="font-mono text-ashare-green font-bold text-xs bg-green-900/20 px-1 rounded min-w-[50px] text-right">{s.change}%</span>
                                    </div>
                                </div>
                            ))) : (
                                <div className="text-xs text-gray-600 text-center py-2">{loadingFinancials ? 'Loading...' : '暂无数据'}</div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

             {/* Short Selling / Margin Trading Section */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Scale size={16} /> 融资融券与做空数据 (Margin & Short Data)
                    </h3>
                    <div className="text-[10px] text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
                        Delayed ~1 Day
                    </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                     <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700 border-l-4 border-l-ashare-red">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                             融资余额 (Long)
                        </div>
                        <div className="text-lg font-mono text-white">
                            {shortData.marginBalance} <span className="text-xs text-gray-400">亿</span>
                        </div>
                     </div>

                     <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700 border-l-4 border-l-ashare-green">
                        <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                             <ArrowDownCircle size={10}/> 融券余额 (Short)
                        </div>
                        <div className="text-lg font-mono text-white">
                            {shortData.shortBalance} <span className="text-xs text-gray-400">亿</span>
                        </div>
                     </div>

                     <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">当日净买入 (Net Buy)</div>
                        <div className={`text-lg font-mono ${Number(shortData.netBuy) > 0 ? 'text-ashare-red' : 'text-ashare-green'}`}>
                            {Number(shortData.netBuy) > 0 ? '+' : ''}{shortData.netBuy} <span className="text-xs text-gray-400">万</span>
                        </div>
                     </div>

                     <div className="bg-gray-800/30 p-4 rounded-lg border border-gray-700">
                        <div className="text-xs text-gray-500 mb-1">融券卖出占比 (Short Ratio)</div>
                        <div className="text-lg font-mono text-yellow-500">
                            {shortData.shortRatio} <span className="text-xs text-gray-400">%</span>
                        </div>
                     </div>
                </div>
            </section>

             {/* News List */}
             <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                        <Newspaper size={16} /> 实时资讯 (Live News)
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 border border-gray-700 rounded-full px-2 py-0.5">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                        Powered by Google Search
                    </div>
                </div>
                
                <div className="space-y-3 min-h-[120px]">
                    {loadingNews ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex justify-between items-start p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 animate-pulse">
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-700/50 rounded w-3/4"></div>
                                    <div className="h-3 bg-gray-800 rounded w-16"></div>
                                </div>
                                <div className="h-3 bg-gray-700/50 rounded w-12 ml-4"></div>
                            </div>
                        ))
                    ) : newsList.length > 0 ? (
                        <>
                            {newsList.map((news, idx) => (
                                <div key={idx} className="flex justify-between items-start p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 hover:bg-gray-800 transition cursor-default">
                                    <div className="flex-1">
                                        <h4 className="text-sm text-gray-200 leading-snug">{news.title}</h4>
                                        <div className="mt-1 flex gap-2">
                                            <span className="text-xs text-gray-500 bg-gray-800 px-1 rounded border border-gray-700">{news.source}</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-gray-500 ml-4 whitespace-nowrap">{news.time}</span>
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className="text-center py-8 text-gray-500 text-sm">
                            暂无相关新闻
                        </div>
                    )}
                </div>

                {/* Grounding Sources */}
                {!loadingNews && newsSources.length > 0 && (
                     <div className="mt-4 pt-3 border-t border-gray-800">
                        <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">参考来源 (Search References)</div>
                        <div className="flex flex-wrap gap-2">
                            {newsSources.map((source, idx) => (
                                <a 
                                    key={idx} 
                                    href={source.uri} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 bg-blue-900/10 hover:bg-blue-900/20 px-2 py-1 rounded transition border border-blue-900/20"
                                >
                                    {source.title} <ExternalLink size={8} />
                                </a>
                            ))}
                        </div>
                     </div>
                )}
            </section>

            {/* Tags Footer */}
            <section className="pt-4 border-t border-gray-700">
                <div className="flex gap-2 flex-wrap">
                    {stock.tags.map(tag => (
                        <span key={tag} className="px-3 py-1 rounded-full text-xs font-medium bg-gray-800 text-gray-300 border border-gray-600">
                            #{tag}
                        </span>
                    ))}
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};

export default StockDetailModal;