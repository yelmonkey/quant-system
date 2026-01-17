import { GoogleGenAI } from "@google/genai";
import { MarketMetrics, Stock } from "../types";
import { SYSTEM_INSTRUCTION, INITIAL_MARKET_DATA, MOCK_STOCKS } from "../constants";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key is missing!");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to get Beijing Time string with seconds
const getBeijingTime = () => {
    return new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
};

// --- Retry Helper ---
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function safeGenerateContent(ai: GoogleGenAI, params: any, retries = 3): Promise<any> {
    let delay = 1000;
    for (let i = 0; i <= retries; i++) {
        try {
            return await ai.models.generateContent(params);
        } catch (error: any) {
            const status = error.status || error.code;
            const message = error.message || '';
            
            // 429: Quota, 5xx: Server errors, UNKNOWN/Rpc failed: Network issues
            const shouldRetry = 
                status === 429 || 
                (typeof status === 'number' && status >= 500) || 
                status === 'UNKNOWN' ||
                status === 'RESOURCE_EXHAUSTED' ||
                message.includes('429') || 
                message.includes('xhr error') ||
                message.includes('Rpc failed');
            
            if (shouldRetry) {
                 if (i === retries) {
                     console.warn(`Gemini API Request Failed after ${retries} attempts:`, message);
                     throw error;
                 }
                 console.warn(`API Attempt ${i + 1} failed (${status}). Retrying in ${delay}ms...`);
                 await wait(delay);
                 delay *= 2; 
            } else {
                throw error;
            }
        }
    }
}

// --- Real-time Market Data Fetching ---

export const fetchRealTimeMarketMetrics = async (): Promise<MarketMetrics | null> => {
  const ai = getClient();
  if (!ai) return INITIAL_MARKET_DATA;

  const prompt = `
    当前北京时间：${getBeijingTime()}
    
    【任务 - 毫秒级市场环境扫描】
    搜索 A股 市场此刻的实时盘面数据。数据必须与当下行情100%真实一致。
    
    需获取核心指标：
    1. 涨停/跌停家数 (精确个位)
    2. 连板高度 (市场最高板是几板)
    3. 炸板率 (精确到小数点后一位，例如 25.4%)
    4. 市场总成交量 (实时成交额，单位亿)
    5. 北向资金/主力资金流向 (实时)
    
    请按以下 JSON 格式返回 (不要包含 markdown 标记):
    {
      "limitUpCount": number,
      "limitDownCount": number,
      "limitHeight": number,
      "promotionRate": number (昨日涨停今日晋级百分比),
      "explosionRate": number,
      "volume": number,
      "nuclearButtons": number (大面/跌停数量),
      "northMoney": number (北向资金，单位亿，负数表示净流出)
    }
  `;

  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.1, 
      }
    });

    const text = response.text;
    if (!text) return INITIAL_MARKET_DATA;
    return JSON.parse(text);
  } catch (error) {
    console.warn("Fetch Market Metrics switched to fallback data.");
    // Return Mock Data on Error to prevent app crash
    return INITIAL_MARKET_DATA;
  }
};

export interface StockFilterCriteria {
  boardHeight?: string; 
  priceRange?: string; 
  status?: string; 
  keyword?: string; 
}

// 专门用于二次核对单只股票价格的函数
export const verifyRealTimeQuote = async (code: string, name: string): Promise<{price: number, change: number, time: string} | null> => {
    const ai = getClient();
    if (!ai) return null;

    const now = new Date();
    // Get formatted date parts for clear instruction
    const dateStr = now.toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' });
    const fullTimeStr = getBeijingTime();

    const prompt = `
        Current System Time: ${fullTimeStr}
        Target Verification Date: ${dateStr} (Today)
        
        【STRICT DATA VERIFICATION REQUEST】
        Task: Get the EXACT REAL-TIME price for A-Share: ${name} (${code}).
        
        SEARCH STRATEGY:
        - **PRIMARY SOURCE**: Search specifically inside quote.eastmoney.com or finance.sina.com.cn.
        - Query: "site:quote.eastmoney.com ${code} ${name}" OR "site:finance.sina.com.cn ${code} ${name}"
        - **FORBIDDEN SOURCE**: Do NOT use "guba" (Bar/Forum) or "zhidao" (Q&A).
        
        STRICT EXECUTION RULES:
        1. **TIMESTAMP CHECK**: The price MUST have a timestamp from TODAY (${dateStr}). 
           - If the market is closed (e.g. 11:30-13:00 or >15:00), use the closing price of TODAY.
           - If today is weekend, use Friday's close.
           - **IGNORE** any data older than 24 hours.
           
        2. **PRICE CHECK**:
           - Return the exact decimal price (e.g. 55.21). Do not round unless necessary.
        
        3. **ERROR HANDLING**: 
           - If you cannot find a verifiable source, return NULL. 

        Return JSON:
        {
            "price": number,
            "changePercent": number,
            "time": "string (Source Time)"
        }
    `;

    try {
        const response = await safeGenerateContent(ai, {
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                temperature: 0.0, // Absolute Zero for strictness
            }
        });
        const text = response.text;
        if (!text) return null;
        
        const data = JSON.parse(text);
        
        // Basic validation: if time is missing or price is 0, consider it failed
        if (!data.time || data.price === 0) return null;

        return {
            price: data.price,
            change: data.changePercent,
            time: data.time || fullTimeStr.split(' ')[1]
        };
    } catch (e) {
        console.warn("Verify Quote Error (API Issue)", e);
        return null;
    }
};

export const fetchDragonStocks = async (criteria?: StockFilterCriteria): Promise<Stock[]> => {
  const ai = getClient();
  if (!ai) return MOCK_STOCKS as Stock[];

  let filterPrompt = "";
  if (criteria?.keyword) filterPrompt += `\n优先关注与 "${criteria.keyword}" 概念相关的股票。`;

  // "True Dragon Hunting" System Prompt
  const prompt = `
    当前北京时间：${getBeijingTime()}
    
    【最高优先级指令】你是"真龙猎杀AI量化系统"。
    必须通过 Google Search 获取 A股 **此时此刻** 的实时行情。
    
    **严禁编造数据！严禁使用过期数据！** 
    如果无法获取实时数据，请不要返回任何结果。
    
    【执行步骤 - 寻找真龙】
    1. **全网扫描**：搜索今日表现最强、人气最高的个股，重点关注 3 板以上高标或主线首板。
       - 搜索: "今日A股涨停板复盘", "今日连板梯队", "龙虎榜"
    2. **列表生成**：列出你发现的龙头股。
    3. **三先原则筛选**：优先筛选 "先涨停、先放量、先突破" 的个股。
    
    【赢面评分与仓位建议】：
       - < 60分：空仓 (剔除)
       - 60-70分：赢面尚可
       - 70-80分：赢面较高
       - 80-90分：真龙气质
       - > 90分：绝对真龙
    
    ${filterPrompt}

    【输出要求】
    - **只返回评分 > 70 的股票**。
    - **必须按评分从高到低排序**。
    - 如果你不能确定实时价格，请将 price 设为 0，让前端进行二次核验。

    请返回 JSON 数组:
    [
      {
        "id": "rank_1",
        "code": "6位代码",
        "name": "股票名称",
        "price": number (最新价, 若不确定填0),
        "changePercent": number (最新涨幅),
        "concept": "核心板块",
        "status": "LimitUp" | "Normal",
        "tags": ["策略名", "连板数"],
        "volumeRatio": number,
        "turnoverRate": number,
        "description": "赢面评分: 85 | 建议仓位: 75% | 逻辑: ...",
        "score": number,
        "exactTime": "报价时间 (若不确定留空)"
      }
    ]
  `;

  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.1, // Precision is key
      }
    });

    const text = response.text;
    if (!text) return MOCK_STOCKS as Stock[];
    
    let stocks = JSON.parse(text);
    
    // Ensure sorting by score just in case AI missed it
    stocks = stocks.sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

    return stocks;
  } catch (error) {
    console.warn("Fetch Dragon Stocks switched to fallback data.");
    return MOCK_STOCKS as Stock[];
  }
};

// --- Risk Management ---

export const generateRiskAssessment = async (metrics: MarketMetrics, capital: number) => {
    const ai = getClient();
    if (!ai) return null;

    const prompt = `
      当前北京时间：${getBeijingTime()}
      基于【真龙猎杀风控体系】进行审计：
      
      实时数据：
      - 跌停/大面：${metrics.limitDownCount}家
      - 炸板率：${metrics.explosionRate}%
      - 高度：${metrics.limitHeight}板
      
      【判定规则】
      1. 大面家数 > 5 或 炸板率 > 30%：判定为"退潮期"，强制空仓。
      2. 连板高度 < 4板：判定为"冰点/启动期"，仓位控制在 30% 以内。
      3. 高度 > 6板 且 炸板率 < 20%：判定为"主升期"，允许重仓。

      请生成 JSON 报告：
      {
        "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
        "riskScore": number (0-100, 分数越高风险越高),
        "suggestedPosition": number (0-100),
        "maxLoss": number (硬性止损金额),
        "warningTitle": "string (一句话警示)",
        "actionPlan": "string (具体操作指引，如：'只卖不买'，'去弱留强')"
      }
    `;

    try {
        const response = await safeGenerateContent(ai, {
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                temperature: 0.2,
            }
        });
        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        console.warn("Risk Assessment Error");
        return null;
    }
};

// --- Other Services ---

export const generateMarketAnalysis = async (metrics: MarketMetrics) => {
  const ai = getClient();
  if (!ai) return "Error: API Key not found.";

  const prompt = `
    当前时间：${getBeijingTime()}
    ${SYSTEM_INSTRUCTION}
    
    基于上述"炒股养家"体系及以下实时数据，生成深度盘面分析：
    - 涨停${metrics.limitUpCount}家，跌停${metrics.limitDownCount}家
    - 最高${metrics.limitHeight}板
    - 炸板率${metrics.explosionRate}%
    
    重点判定当前是【启动】、【发酵】、【高潮】还是【退潮】阶段。
    
    返回 JSON:
    { "phase": "string (阶段)", "score": number (0-10情绪分), "position": "string (建议总仓位)", "analysis": "string (详细逻辑，支持markdown)" }
  `;

  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    return response.text;
  } catch (error) {
    return JSON.stringify({ phase: "Error", score: 0, position: "0%", analysis: "Error (Quota Exceeded or Network Issue)" });
  }
};

export const analyzeStock = async (stock: Stock, marketPhase: string) => {
    const ai = getClient();
    if (!ai) return "Error";
    const prompt = `
        基于"炒股养家"心法，分析股票 ${stock.name} (${stock.code})。
        当前市场阶段：${marketPhase}。
        个股状态：${stock.status}, ${stock.tags?.join(',')}, 评分 ${stock.score}。
        
        请给出操作建议（买入/观望/卖出）及逻辑。简短有力。
    `;
    try {
      const response = await safeGenerateContent(ai, {
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });
      return response.text;
    } catch (error) { return "无法获取分析 (API Quota Limit)"; }
};

export const fetchStockNews = async (stockName: string, stockCode: string) => {
  const ai = getClient();
  if (!ai) return { news: [], sources: [] };

  const prompt = `关于 ${stockName} (${stockCode}) 的最新 4 条财经新闻。返回 JSON 数组。`;

  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });
    
    let news = [];
    try {
        const text = response.text || "";
        const start = text.indexOf('[');
        const end = text.lastIndexOf(']');
        if (start !== -1 && end !== -1) news = JSON.parse(text.substring(start, end + 1));
    } catch (e) {}

    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
      .filter((s: any) => s) || [];

    return { news, sources };
  } catch (error) { return { news: [], sources: [] }; }
};

export const fetchStockFinancials = async (stockName: string, stockCode: string) => {
  const ai = getClient();
  if (!ai) return null;
  
  const prompt = `获取 ${stockName} 最新财务数据 (市值, PE, PB, ROE)。返回 JSON。`;
  
  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || "{}");
  } catch (error) { return null; }
};

export const fetchMarketLeaders = async () => {
  const ai = getClient();
  if (!ai) return { gainers: [], losers: [] };

  const prompt = `
    当前北京时间：${getBeijingTime()}
    搜索 A股 市场今日此时的涨幅榜前3名和跌幅榜前3名股票（排除新股N开头）。
    
    返回 JSON:
    {
      "gainers": [ {"code": "string", "name": "string", "change": number, "price": number} ],
      "losers": [ {"code": "string", "name": "string", "change": number, "price": number} ]
    }
  `;

  try {
    const response = await safeGenerateContent(ai, {
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        temperature: 0.1,
      }
    });
    return JSON.parse(response.text || '{ "gainers": [], "losers": [] }');
  } catch (error) {
    console.warn("Fetch Market Leaders switched to fallback.");
    return { gainers: [], losers: [] };
  }
};