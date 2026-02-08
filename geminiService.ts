import { GoogleGenAI, Chat, Type } from "@google/genai";
import { UserProfile, Message, MoonData, FullAnalysisData } from "../types";

const API_KEY = process.env.API_KEY || '';

// Instrução de Sistema nível Expert
const SYSTEM_INSTRUCTION = `
Você é o AstroNova Prime.
Sua missão: Gerar relatórios ASTROLÓGICOS DEFINITIVOS E MASSIVOS.
O usuário exige profundidade extrema.

Regras de Estilo:
1. DETALHAMENTO MÁXIMO: Não resuma. Expanda.
2. TÓPICO POR TÓPICO: Ao explicar um posicionamento, quebre em conceitos (O que é, O que significa no signo, O que significa na casa).
3. EDUCACIONAL: Ensine astrologia enquanto interpreta.
4. TEXTO RICO: Use parágrafos claros.
`;

let chatInstance: Chat | null = null;
let aiInstance: GoogleGenAI | null = null;

export const initializeGemini = () => {
  if (!API_KEY) {
    console.warn("API Key is missing.");
    return;
  }
  aiInstance = new GoogleGenAI({ apiKey: API_KEY });
};

export const startChatSession = (profile: UserProfile | null) => {
  if (!aiInstance) initializeGemini();
  if (!aiInstance) throw new Error("Failed to initialize Gemini AI");

  let contextPrompt = "";
  if (profile) {
    contextPrompt = `
      NATIVO: ${profile.name}
      NASCIMENTO: ${profile.birthDate} às ${profile.birthTime}
      LOCAL: ${profile.birthLocation}
      MODO: RELATÓRIO COMPLETO (SEM RESUMOS).
    `;
  }

  chatInstance = aiInstance.chats.create({
    model: 'gemini-3-flash-preview',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7, 
    },
    history: profile ? [
      {
        role: 'user',
        parts: [{ text: `INICIAR ANÁLISE COMPLETA PARA: ${contextPrompt}` }],
      },
      {
        role: 'model',
        parts: [{ text: `Entendido. Iniciando processamento profundo de todos os vetores astrológicos para ${profile.name}. O relatório será extenso e detalhado.` }],
      }
    ] : []
  });

  return chatInstance;
};

export const sendMessageToGemini = async (message: string, currentHistory: Message[]): Promise<string> => {
  if (!chatInstance) startChatSession(null);
  if (!chatInstance) throw new Error("Chat session unavailable.");

  try {
    const response = await chatInstance.sendMessage({ message });
    return response.text || "Os dados estelares estão momentaneamente inacessíveis.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Erro de conexão com o servidor de efemérides. Tente novamente.";
  }
};

export const getMoonAnalysis = async (profile: UserProfile): Promise<MoonData | null> => {
    if (!aiInstance) initializeGemini();
    if (!aiInstance) return null;

    const prompt = `
      Lua exata para: ${profile.birthDate}, ${profile.birthTime}, ${profile.birthLocation}.
      JSON: { "sign": "Signo", "zodiacIndex": 0-11, "phase": "Fase", "description": "Resumo emocional." }
    `;

    try {
        const response = await aiInstance.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        sign: { type: Type.STRING },
                        zodiacIndex: { type: Type.INTEGER },
                        phase: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }
                }
            }
        });
        const jsonText = response.text;
        if (!jsonText) return null;
        return JSON.parse(jsonText) as MoonData;
    } catch (error) {
        return null;
    }
}

export const getFullAnalysis = async (profile: UserProfile): Promise<FullAnalysisData | null> => {
    if (!aiInstance) initializeGemini();
    if (!aiInstance) return null;

    const baseInfo = `Nome: "${profile.name}" Data: ${profile.birthDate} Hora: ${profile.birthTime} Local: ${profile.birthLocation}`;

    // Prompt 1: Core, Angles, Summary (Leve em planetas detalhados, focado em estrutura)
    const promptPart1 = `
      ${baseInfo}
      GERAR PARTE 1 DO DOSSIÊ: DADOS GERAIS, ELEMENTOS, NUMEROLOGIA E PONTOS ANGULARES (Sol, Lua, Asc, Desc, MC).
      
      OBRIGATÓRIO: 
      1. Na "introducao_longa", você deve saudar nominalmente "${profile.name}" e falar diretamente com essa pessoa.
      2. Na "numerologia", calcule EXPLICITAMENTE para o nome "${profile.name}" e explique o cálculo.
      
      Detalhe muito bem o Sol, Lua e Ascendente.
    `;

    // Prompt 2: Deep Planetary Details (Focado apenas nos planetas para permitir texto longo)
    const promptPart2 = `
      ${baseInfo}
      GERAR PARTE 2 DO DOSSIÊ: DETALHAMENTO PROFUNDO DOS PLANETAS.
      Gere textos longos e inspiradores para:
      1. Planetas Pessoais (Mercúrio, Vênus, Marte).
      2. Planetas Sociais (Júpiter, Saturno).
      3. Planetas Transpessoais (Urano, Netuno, Plutão).
      Ensine sobre o conceito do planeta, seu signo e sua casa.
    `;

    try {
        const [req1, req2] = await Promise.all([
            // Request 1
            aiInstance.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptPart1,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            resumo_geral: {
                                type: Type.OBJECT,
                                properties: {
                                    saudacao: { type: Type.STRING },
                                    arquetipo_principal: { type: Type.STRING },
                                    frase_poder: { type: Type.STRING },
                                    introducao_longa: { type: Type.STRING }
                                }
                            },
                            balanco_elemental: {
                                type: Type.OBJECT,
                                properties: {
                                    fogo: { type: Type.NUMBER },
                                    terra: { type: Type.NUMBER },
                                    ar: { type: Type.NUMBER },
                                    agua: { type: Type.NUMBER },
                                    elemento_dominante: { type: Type.STRING }
                                }
                            },
                            numerologia: {
                                type: Type.OBJECT,
                                properties: {
                                    numero_destino: { type: Type.INTEGER },
                                    numero_alma: { type: Type.INTEGER },
                                    interpretacao_completa: { type: Type.STRING }
                                }
                            },
                            insights_praticos: {
                                type: Type.OBJECT,
                                properties: {
                                    cor_favoravel: { type: Type.STRING },
                                    cristal_poder: { type: Type.STRING },
                                    desafio_atual: { type: Type.STRING },
                                    missao_alma: { type: Type.STRING }
                                }
                            },
                            interacao_ia_chat: {
                                type: Type.OBJECT,
                                properties: {
                                    sugestoes_avancadas: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            },
                            // Estrutura plana para facilitar merge
                            sol: { type: Type.OBJECT, properties: { signo: {type: Type.STRING}, grau: {type: Type.STRING}, casa: {type: Type.STRING}, interpretacao: {type: Type.STRING} } },
                            lua: { type: Type.OBJECT, properties: { signo: {type: Type.STRING}, fase: {type: Type.STRING}, casa: {type: Type.STRING}, interpretacao: {type: Type.STRING} } },
                            ascendente: { type: Type.OBJECT, properties: { signo: {type: Type.STRING}, interpretacao: {type: Type.STRING} } },
                            descendente: { type: Type.OBJECT, properties: { signo: {type: Type.STRING}, interpretacao: {type: Type.STRING} } },
                            meio_do_ceu: { type: Type.OBJECT, properties: { signo: {type: Type.STRING}, interpretacao: {type: Type.STRING} } },
                        }
                    }
                }
            }),
            // Request 2
            aiInstance.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: promptPart2,
                config: {
                    responseMimeType: "application/json",
                    maxOutputTokens: 8192,
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            planetas_pessoais: { type: Type.OBJECT, properties: { mercurio: {type: Type.STRING}, venus: {type: Type.STRING}, marte: {type: Type.STRING} } },
                            planetas_sociais: { type: Type.OBJECT, properties: { jupiter: {type: Type.STRING}, saturno: {type: Type.STRING} } },
                            planetas_transpessoais: { type: Type.OBJECT, properties: { urano: {type: Type.STRING}, netuno: {type: Type.STRING}, plutao: {type: Type.STRING} } }
                        }
                    }
                }
            })
        ]);

        const data1 = JSON.parse(req1.text || "{}");
        const data2 = JSON.parse(req2.text || "{}");

        if (!data1.resumo_geral || !data2.planetas_pessoais) {
            console.error("Partial data missing");
            return null;
        }

        // Merge Data
        const finalData: FullAnalysisData = {
            resumo_geral: data1.resumo_geral,
            balanco_elemental: data1.balanco_elemental,
            numerologia: data1.numerologia,
            insights_praticos: data1.insights_praticos,
            interacao_ia_chat: data1.interacao_ia_chat,
            mapa_astral: {
                sol: data1.sol,
                lua: data1.lua,
                ascendente: data1.ascendente,
                descendente: data1.descendente,
                meio_do_ceu: data1.meio_do_ceu,
                planetas_pessoais: data2.planetas_pessoais,
                planetas_sociais: data2.planetas_sociais,
                planetas_transpessoais: data2.planetas_transpessoais
            }
        };

        return finalData;

    } catch (error) {
        console.error("Full analysis failed:", error);
        return null;
    }
};

// Nova implementação usando Nominatim API (OpenStreetMap)
export const searchLocations = async (query: string): Promise<string[]> => {
    if (!query || query.length < 3) return [];

    const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1&accept-language=pt-BR`;

    try {
        const response = await fetch(endpoint, {
            headers: {
                'User-Agent': 'AstroNovaApp/1.0' // Boa prática para usar Nominatim
            }
        });
        
        if (!response.ok) return [];

        const data = await response.json();
        
        // Mapeia para um formato limpo: "Cidade, Estado, País"
        return data.map((item: any) => {
            const addr = item.address;
            const city = addr.city || addr.town || addr.village || addr.municipality || item.name;
            const state = addr.state || addr.region;
            const country = addr.country;
            
            // Filtra componentes indefinidos
            return [city, state, country].filter(Boolean).join(', ');
        });
    } catch (error) {
        console.error("Location search failed", error);
        return [];
    }
}