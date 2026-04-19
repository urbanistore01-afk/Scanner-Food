import { GoogleGenAI, Type } from "@google/genai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

console.log("API KEY:", apiKey);

export interface FoodAnalysis {
  identificado_com_sucesso: boolean;
  nome_prato: string;
  calorias: number;
  proteinas: number;
  carboidratos: number;
  acucares: number;
  gorduras: number;
  porcao: string;
  confianca: number;
  micronutrientes: {
    fibras_g: number;
    sodio_mg: number;
    vitamina_c_mg: number;
    calcio_mg: number;
    ferro_mg: number;
  };
  insights: {
    dietas: string;
    alternativas_menos_caloricas: string;
    versoes_mais_saudaveis: string;
    recomendacao: string;
  };
}

export async function analyzeFoodImage(base64Image: string, mimeType: string, userProvidedName?: string): Promise<FoodAnalysis> {
  try {
    const promptText = userProvidedName 
      ? `Atue como um Nutricionista Clínico Especialista e Cientista de Alimentos. 
        O usuário informou que a imagem contém: "${userProvidedName}".
        Sua tarefa é fornecer uma análise nutricional EXTREMAMENTE PRECISA e FIEL à realidade para este alimento.
        Utilize como base tabelas nutricionais oficiais (como TACO - Tabela Brasileira de Composição de Alimentos, ou USDA).
        Não invente dados. Calcule os macronutrientes e micronutrientes com base em uma porção padrão realista para o alimento mostrado.
        Seja rigoroso com as calorias, proteínas, carboidratos, gorduras e micronutrientes.
        Retorne os dados ESTRITAMENTE no formato JSON especificado.`
      : `Atue como um Nutricionista Clínico Especialista e Cientista de Alimentos. 
        Sua tarefa é identificar o alimento na imagem e fornecer uma análise nutricional EXTREMAMENTE PRECISA e FIEL à realidade.
        Utilize como base tabelas nutricionais oficiais (como TACO - Tabela Brasileira de Composição de Alimentos, ou USDA).
        Não invente dados genéricos. Calcule os macronutrientes e micronutrientes com base em uma porção padrão realista para o alimento mostrado.
        Seja rigoroso com as calorias, proteínas, carboidratos, gorduras e micronutrientes.
        Se você não conseguir identificar o alimento com absoluta certeza, defina "identificado_com_sucesso" como false.
        Retorne os dados ESTRITAMENTE no formato JSON especificado.`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: promptText,
          },
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            identificado_com_sucesso: { type: Type.BOOLEAN, description: "True se a IA conseguiu identificar o alimento, False caso contrário" },
            nome_prato: { type: Type.STRING, description: "Nome claro e específico do alimento ou prato" },
            calorias: { type: Type.NUMBER, description: "Calorias estimadas na porção" },
            proteinas: { type: Type.NUMBER, description: "Proteínas em gramas" },
            carboidratos: { type: Type.NUMBER, description: "Carboidratos em gramas" },
            acucares: { type: Type.NUMBER, description: "Açúcares em gramas" },
            gorduras: { type: Type.NUMBER, description: "Gorduras totais em gramas" },
            porcao: { type: Type.STRING, description: "Tamanho da porção analisada (ex: 1 prato médio, 100g, 1 unidade)" },
            confianca: { type: Type.NUMBER, description: "Nível de confiança da IA nesta análise (0-100)" },
            micronutrientes: {
              type: Type.OBJECT,
              properties: {
                fibras_g: { type: Type.NUMBER, description: "Fibras em gramas" },
                sodio_mg: { type: Type.NUMBER, description: "Sódio em mg" },
                vitamina_c_mg: { type: Type.NUMBER, description: "Vitamina C em mg" },
                calcio_mg: { type: Type.NUMBER, description: "Cálcio em mg" },
                ferro_mg: { type: Type.NUMBER, description: "Ferro em mg" }
              },
              required: ["fibras_g", "sodio_mg", "vitamina_c_mg", "calcio_mg", "ferro_mg"]
            },
            insights: {
              type: Type.OBJECT,
              properties: {
                dietas: { type: Type.STRING, description: "Como se encaixa em dietas (hipertrofia, emagrecimento, low carb, etc)" },
                alternativas_menos_caloricas: { type: Type.STRING, description: "Sugestões de alternativas com menos calorias" },
                versoes_mais_saudaveis: { type: Type.STRING, description: "Sugestões de versões mais saudáveis ou menos processadas" },
                recomendacao: { type: Type.STRING, description: "Dica curta e acionável de consumo" }
              },
              required: ["dietas", "alternativas_menos_caloricas", "versoes_mais_saudaveis", "recomendacao"]
            }
          },
          required: [
            "identificado_com_sucesso", "nome_prato", "calorias", "proteinas", "carboidratos", 
            "acucares", "gorduras", "porcao", "confianca", "micronutrientes", "insights"
          ]
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    return JSON.parse(jsonStr) as FoodAnalysis;
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw new Error("Falha ao analisar a imagem. Verifique sua conexão ou tente novamente.");
  }
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

export async function chatWithNutritionist(history: ChatMessage[], newMessage: string): Promise<string> {
  try {
    const chat = ai.chats.create({
      model: "gemini-3-flash-preview",
      config: {
        systemInstruction: "Você é um nutricionista clínico especialista e cientista de alimentos do app Scanner Food. Responda de forma concisa, amigável e baseada em evidências científicas (tabelas TACO, USDA) sobre dieta, calorias e nutrição. Evite respostas muito longas, mas seja extremamente preciso e fiel à realidade.",
      },
    });

    // Filter out the initial model greeting if it's the first message, 
    // because Gemini API requires the conversation history to start with a 'user' role.
    const validHistory = history[0]?.role === 'model' ? history.slice(1) : history;

    const contents = [
      ...validHistory.map(msg => ({
        role: msg.role,
        parts: [{ text: msg.text }]
      })),
      { role: "user", parts: [{ text: newMessage }] }
    ];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: contents as any,
      config: {
        systemInstruction: "Você é um nutricionista clínico especialista e cientista de alimentos do app Scanner Food. Responda de forma concisa, amigável e baseada em evidências científicas (tabelas TACO, USDA) sobre dieta, calorias e nutrição. Evite respostas muito longas, mas seja extremamente preciso e fiel à realidade.",
      }
    });

    return response.text || "Desculpe, não consegui processar sua mensagem.";
  } catch (error) {
    console.error("Error in chat:", error);
    return "Desculpe, estou com problemas técnicos no momento. Tente novamente mais tarde.";
  }
}
