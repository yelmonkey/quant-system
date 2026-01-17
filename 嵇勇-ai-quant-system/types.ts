export enum MarketPhase {
  Chaos = '启动期 (Chaos)',
  Fermentation = '发酵期 (Fermentation)',
  Climax = '高潮期 (Climax)',
  Decline = '退潮期 (Decline)',
}

export interface MarketMetrics {
  limitUpCount: number; // 涨停家数
  limitDownCount: number; // 跌停家数
  limitHeight: number; // 连板高度
  promotionRate: number; // 晋级率 (0-100)
  explosionRate: number; // 炸板率 (0-100)
  volume: number; // 成交量 (亿)
  nuclearButtons: number; // 大面数量
  northMoney: number; // 北向资金 (亿)
}

export interface Stock {
  id: string;
  code: string;
  name: string;
  price: number;
  changePercent: number;
  concept: string;
  status: 'LimitUp' | 'LimitDown' | 'Normal' | 'Broken';
  tags: string[]; // e.g., "Dragon", "First Board", "Weak to Strong"
  volumeRatio: number; // 量比
  turnoverRate: number; // 换手率
  description?: string;
  score?: number; // 推荐评分 (0-100)
  exactTime?: string; // 精确报价时间
}

export interface StrategySignal {
  type: 'Buy' | 'Sell' | 'Wait';
  confidence: number;
  reason: string;
  stopLoss: number;
}