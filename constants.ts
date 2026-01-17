import { MarketPhase } from './types';

// Prompt Templates derived from the User's "True Dragon Hunting" specifications
export const SYSTEM_INSTRUCTION = `
1. 严格遵循炒股养家核心交易法则及配套AI分析体系，聚焦A股日内短线“真龙”猎杀，所有数据必须与当下A股实时行情100%真实一致，严禁任何虚构、假设或偏离实际数据的判断，确保毫秒级数据响应与精准同步。
2. 先执行市场环境实时分析：毫秒级抓取涨停家数/跌停家数、连板股数量及最高连板高度、市场整体换手率、主流板块涨停分布、炸板率，同步追踪主力资金（单日净流入≥2000万且占流通市值≥0.3%、连续3日递增净流入）、北向资金（连续5日净流入及逆势动向）实时流向，结合TF-IDF与BERT模型输出实时舆情情感倾向，生成动态市场情绪温度值。
3. 按“三先原则”（先涨停、先放量、先突破）+ 板块带动效应（所属板块涨停≥15家）筛选真龙候选股，实时校验个股封单强度、龙虎榜动态、涨幅榜排名稳定性，剔除虚假涨停、数据异常个股。
4. 毫秒级计算候选股交易赢面：联动实时量价数据（缩量≥20%、放量≥30%、量价背离情况）、分歧/转强信号（分歧时成交量≥前5日均值2倍、转强时成交量较分歧时减少≥30%、未破5/10日均线），输出精准赢面评分及对应仓位建议（＜60%空仓，60%-70%≤20%试错，70%-80%30%-50%，80%-90%75%，≥90%满仓且需满足上涨空间≥30%/下跌空间≤5%）。
5. 实时判定市场阶段（主升浪/退潮/启动），针对真龙股执行“买在分歧、卖在一致”策略，毫秒级推送首次分歧买点、首次加速卖点信号，同步触发严格止损提醒（无补仓机制），确保单股仓位不超20%，退潮期强制空仓或极小仓位。
6. 全程保持数据传输与分析的毫秒级精准，所有决策依据均锚定实时行情数据，禁止引用历史静态数据替代，若出现数据延迟、失真立即暂停输出并提示异常，确保交易决策的科学性、实时性与纪律性。
`;

export const MARKET_PHASE_THRESHOLDS = {
  [MarketPhase.Chaos]: { maxLimitHeight: 3, promotionRateMax: 40 },
  [MarketPhase.Fermentation]: { minLimitHeight: 4, promotionRateMin: 40 },
  [MarketPhase.Climax]: { minLimitHeight: 7, promotionRateMin: 60 },
  [MarketPhase.Decline]: { nuclearButtonsMin: 5, explosionRateMin: 40 },
};

// Mock Data for Initial State
export const INITIAL_MARKET_DATA = {
  limitUpCount: 45,
  limitDownCount: 2,
  limitHeight: 5,
  promotionRate: 42,
  explosionRate: 25,
  volume: 8500,
  nuclearButtons: 1,
  northMoney: 35,
};

export const MOCK_STOCKS = [
  {
    id: '1',
    code: '300986',
    name: '志特新材',
    price: 15.01,
    changePercent: 10.00,
    concept: '建筑材料',
    status: 'LimitUp',
    tags: ['龙头', '6连板', '放量'],
    volumeRatio: 2.1,
    turnoverRate: 18.5,
    description: '市场总龙头，连续6板，带动板块效应明显。'
  },
  {
    id: '2',
    code: '002907',
    name: '华森制药',
    price: 18.22,
    changePercent: 10.01,
    concept: '医药',
    status: 'LimitUp',
    tags: ['首板', '弱转强'],
    volumeRatio: 1.8,
    turnoverRate: 8.2,
    description: '昨日烂板，今日竞价高开，确认为弱转强。'
  },
  {
    id: '3',
    code: '600111',
    name: '北方稀土',
    price: 22.45,
    changePercent: -4.5,
    concept: '稀土永磁',
    status: 'Normal',
    tags: ['趋势'],
    volumeRatio: 0.8,
    turnoverRate: 2.1,
    description: '高位震荡，量能不足。'
  },
  {
    id: '4',
    code: '000625',
    name: '长安汽车',
    price: 14.30,
    changePercent: -9.98,
    concept: '汽车整车',
    status: 'LimitDown',
    tags: ['核按钮'],
    volumeRatio: 1.2,
    turnoverRate: 5.5,
    description: '退潮期杀跌，大单封死跌停。'
  }
];