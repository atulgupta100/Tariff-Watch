
import { GoogleGenAI, Type } from "@google/genai";
import { ProductInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export interface TradeNewsItem {
  title: string;
  source: string;
  url: string;
  timestamp?: string;
}

export interface HtsClassificationOption {
  code: string;
  label: string;
  dutyRate: number;
  reasoning: string;
}

export interface TradeIntelligence {
  twelveMonthVolume: string;
  topOriginCountries: string[];
  importerProfile: string;
  marketRiskLevel: 'Low' | 'Medium' | 'High';
  summary: string;
}

export interface DutyBreakdownItem {
  label: string;
  rate: number;
  sourceUrl?: string;
}

export interface ReasoningStep {
  title: string;
  detail: string;
}

export const getLatestTradeNews = async (): Promise<TradeNewsItem[]> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Search for 5 specific latest news headlines regarding international trade tariffs, customs updates, or Section 301 for 2024-2025. Return ONLY a valid JSON array of objects. Each object MUST have 'title', 'source', and 'url'. Do not include markdown code blocks.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              source: { type: Type.STRING },
              url: { type: Type.STRING }
            },
            required: ["title", "source", "url"]
          }
        }
      }
    });

    if (!response.text) return [];
    
    const cleanText = response.text.replace(/```json|```/g, "").trim();
    const data = JSON.parse(cleanText);
    return Array.isArray(data) ? data : [];
  } catch (e) {
    console.error("Failed to fetch trade news:", e);
    return [
      { title: "Global Tariff Updates: 2025 Trade Policy Outlook", source: "Trade Watch", url: "https://hts.usitc.gov" },
      { title: "Section 301 Exclusions: Latest Review Results", source: "USTR", url: "https://ustr.gov" },
      { title: "EU Carbon Border Adjustment Mechanism (CBAM) Phase-In", source: "EU Commission", url: "https://taxation-customs.ec.europa.eu" }
    ];
  }
};

export const getHtsClassificationOptions = async (
  productName: string,
  origin: string,
  destination: string
): Promise<HtsClassificationOption[]> => {
  if (!productName || productName.length < 3) return [];

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as a customs broker. Identify the top 4 most likely HTS classifications for the product "${productName}" shipped from ${origin} to ${destination}. 
    Return as a JSON array of objects with 'code', 'label', 'dutyRate', and 'reasoning'.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            code: { type: Type.STRING },
            label: { type: Type.STRING },
            dutyRate: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          },
          required: ["code", "label", "dutyRate", "reasoning"]
        }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse HTS options", e);
    return [];
  }
};

export const getProductDutyInfo = async (
  query: string,
  originCountry: string,
  destinationCountry: string
): Promise<ProductInfo & { reasoningPathway: ReasoningStep[], breakdown: DutyBreakdownItem[] }> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Act as a senior customs analyst. Provide the HTS code and the TOTAL combined duty rate for "${query}" from ${originCountry} to ${destinationCountry}. 
    
    CRITICAL INSTRUCTIONS:
    1. Itemize the breakdown in a 'breakdown' array.
    2. MANDATORY: For each breakdown item (e.g., General MFN Rate, Section 301 China Duty), you MUST search the web and provide the 'sourceUrl' to the specific official government page or PDF (e.g. usitc.gov, ustr.gov, or local customs bureau).
    3. Provide a 'reasoningPathway' array explaining the legal classification logic.
    4. Format as JSON.`,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hsCode: { type: Type.STRING },
          description: { type: Type.STRING },
          dutyRate: { type: Type.NUMBER },
          countryOfOrigin: { type: Type.STRING },
          destinationCountry: { type: Type.STRING },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                label: { type: Type.STRING },
                rate: { type: Type.NUMBER },
                sourceUrl: { type: Type.STRING, description: "Direct URL to the official government source for this specific rate component." }
              },
              required: ["label", "rate", "sourceUrl"]
            }
          },
          reasoningPathway: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                detail: { type: Type.STRING }
              },
              required: ["title", "detail"]
            }
          }
        },
        required: ["hsCode", "description", "dutyRate", "countryOfOrigin", "destinationCountry", "breakdown", "reasoningPathway"]
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (error) {
    throw new Error("Unable to retrieve duty info.");
  }
};

export const getTradeIntelligence = async (htsCode: string, destination: string): Promise<TradeIntelligence> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze global trade data for HTS Code ${htsCode} entering ${destination} over the last 12 months. 
    Return as JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          twelveMonthVolume: { type: Type.STRING },
          topOriginCountries: { type: Type.ARRAY, items: { type: Type.STRING } },
          importerProfile: { type: Type.STRING },
          marketRiskLevel: { type: Type.STRING, enum: ["Low", "Medium", "High"] },
          summary: { type: Type.STRING }
        },
        required: ["twelveMonthVolume", "topOriginCountries", "importerProfile", "marketRiskLevel", "summary"]
      }
    }
  });

  return JSON.parse(response.text);
};

export const getDutyBreakdownOnly = async (htsCode: string, origin: string, destination: string): Promise<{breakdown: DutyBreakdownItem[], reasoningPathway: ReasoningStep[]}> => {
    const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide the itemized duty breakdown and official sourceUrl (e.g. from USITC or similar) for HTS Code ${htsCode} from ${origin} to ${destination}. Return JSON with 'breakdown' array and 'reasoningPathway' array.`,
    config: {
      responseMimeType: "application/json",
      tools: [{ googleSearch: {} }],
      responseSchema: {
          type: Type.OBJECT,
          properties: {
              breakdown: {
                  type: Type.ARRAY,
                  items: {
                      type: Type.OBJECT,
                      properties: {
                          label: { type: Type.STRING },
                          rate: { type: Type.NUMBER },
                          sourceUrl: { type: Type.STRING }
                      },
                      required: ["label", "rate", "sourceUrl"]
                  }
              },
              reasoningPathway: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        detail: { type: Type.STRING }
                    },
                    required: ["title", "detail"]
                }
              }
          },
          required: ["breakdown", "reasoningPathway"]
      }
    }
  });
  return JSON.parse(response.text);
};
