
import { GoogleGenAI, Type } from "@google/genai";
import { MarketMetrics, Stock } from "../types";
import { SYSTEM_INSTRUCTION, INITIAL_MARKET_DATA, MOCK_STOCKS } from "../constants";

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface ServiceResponse<T> {
  data: T;
  sources: GroundingSource[];
}

// Utility for safe JSON parsing from Gemini responses
const safeParseJSON = (text: string) => {
  try {
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.warn("JSON Parse Error, input was:", text);
    return null;
  }
};

// Utility to extract search grounding sources
const extractSources = (response: any): GroundingSource[] => {
  return response.candidates?.[0]?.groundingMetadata?.groundingChunks
    ?.map((c: any) => c.web ? { title: c.web.title, uri: c.web.uri } : null)
    .filter((s: any) => s) || [];
};

/**
 * Fetches real-time A-share market metrics using Google Search grounding.
 */
export const fetchRealTimeMarketMetrics = async (): Promise<ServiceResponse<MarketMetrics>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `实时搜索当前 A股 市场数据：1.涨跌停家数 2.最高连板高度 3.炸板率 4.成交量(亿) 5.北向流向 6.大面数量(核按钮)。
  返回 JSON: { "limitUpCount": number, "limitDownCount": number, "limitHeight": number, "promotionRate": number, "explosionRate": number, "volume": number, "nuclearButtons": number, "northMoney": number }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    return {
      data: safeParseJSON(response.text) || INITIAL_MARKET_DATA,
      sources: extractSources(response)
    };
  } catch (error) {
    return { data: INITIAL_MARKET_DATA, sources: [] };
  }
};

/**
 * Fetches potential "Dragon" stocks using current market leadership data.
 */
export const fetchDragonStocks = async (criteria?: any): Promise<ServiceResponse<Stock[]>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `搜索今日 A股 最强龙头个股（3板以上或主线首板）。
  返回 JSON 数组，包含 code, name, price, changePercent, concept, score, tags, description 等。`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      }
    });

    const data = safeParseJSON(response.text) || MOCK_STOCKS;
    return {
      data: data.sort((a: any, b: any) => (b.score || 0) - (a.score || 0)),
      sources: extractSources(response)
    };
  } catch (error) {
    return { data: MOCK_STOCKS as Stock[], sources: [] };
  }
};

/**
 * Generates high-level market strategy analysis.
 */
export const generateMarketAnalysis = async (metrics: MarketMetrics): Promise<ServiceResponse<any>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `${SYSTEM_INSTRUCTION}\n当前数据：涨停${metrics.limitUpCount}, 连板${metrics.limitHeight}, 炸板率${metrics.explosionRate}%。请分析当前市场阶段及对应仓位策略。
  返回 JSON: { "phase": "string", "position": "string", "analysis": "string" }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            phase: { type: Type.STRING },
            position: { type: Type.STRING },
            analysis: { type: Type.STRING }
          }
        }
      }
    });
    return {
      data: safeParseJSON(response.text),
      sources: []
    };
  } catch (error) {
    return { data: null, sources: [] };
  }
};

/**
 * Fixes the reported error: Implements generateRiskAssessment for RiskCalculator.
 */
export const generateRiskAssessment = async (metrics: MarketMetrics, totalCapital: number): Promise<any> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `基于以下 A股 实时数据进行风控评估：
  涨停家数: ${metrics.limitUpCount}, 跌停家数: ${metrics.limitDownCount}, 连板高度: ${metrics.limitHeight}, 晋级率: ${metrics.promotionRate}%, 炸板率: ${metrics.explosionRate}%, 大面家数(核按钮): ${metrics.nuclearButtons}。
  总资金: ${totalCapital}。
  请严格遵守“炒股养家”及短线风控铁律进行审计。
  返回 JSON: { "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "riskScore": number, "suggestedPosition": number, "maxLoss": number, "warningTitle": string, "actionPlan": string }`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            riskScore: { type: Type.NUMBER },
            suggestedPosition: { type: Type.NUMBER },
            maxLoss: { type: Type.NUMBER },
            warningTitle: { type: Type.STRING },
            actionPlan: { type: Type.STRING }
          },
          required: ["riskLevel", "riskScore", "suggestedPosition", "maxLoss", "warningTitle", "actionPlan"]
        }
      }
    });
    return safeParseJSON(response.text);
  } catch (error) {
    console.error("Risk Assessment Error:", error);
    return null;
  }
};

/**
 * Verifies a real-time stock quote.
 */
export const verifyRealTimeQuote = async (code: string, name: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = `获取 ${name}(${code}) 的最新实时价格和涨幅。返回 JSON: { "price": number, "changePercent": number, "time": "string" }`;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
    });
    return safeParseJSON(response.text);
  } catch (e) { return null; }
};

/**
 * Analyzes a specific stock based on market phase.
 */
export const analyzeStock = async (stock: Stock, phase: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `基于"${phase}"分析股票 ${stock.name}(${stock.code})。给出买卖建议。`,
  });
  return response.text;
};

/**
 * Fetches recent news for a specific stock.
 */
export const fetchStockNews = async (stockName: string, stockCode: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `搜索 ${stockName}(${stockCode}) 的最新财经新闻。返回 JSON 数组 [{title, source, time}]`,
    config: { tools: [{ googleSearch: {} }] }
  });
  return {
    news: safeParseJSON(response.text) || [],
    sources: extractSources(response)
  };
};

/**
 * Fetches financial indicators for a stock.
 */
export const fetchStockFinancials = async (stockName: string, stockCode: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `获取 ${stockName} 最新财务指标(市值, PE, ROE)。返回 JSON。`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return safeParseJSON(response.text);
};

/**
 * Fetches top gainers and losers.
 */
export const fetchMarketLeaders = async () => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `搜索今日 A股 涨跌幅榜前3名。返回 JSON: { "gainers": [], "losers": [] }`,
    config: { tools: [{ googleSearch: {} }], responseMimeType: "application/json" }
  });
  return safeParseJSON(response.text) || { gainers: [], losers: [] };
};
