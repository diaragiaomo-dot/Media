import { GoogleGenAI } from "@google/genai";

export async function generateImage(
  prompt: string
): Promise<{ imageUrl: string; base64: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("Chiave API mancante. Configura GEMINI_API_KEY nelle impostazioni di Vercel.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    console.log("Generating image with prompt:", prompt);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    console.log("Gemini generation response received:", response);

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("L'IA non ha prodotto alcun risultato. Riprova con un prompt diverso.");
    }

    const candidate = response.candidates[0];
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("La richiesta è stata bloccata dai filtri di sicurezza. Prova a usare termini più generici.");
    }

    for (const part of candidate.content.parts || []) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        return {
          imageUrl: `data:image/png;base64,${base64}`,
          base64: base64
        };
      }
    }
    
    if (response.text) {
      throw new Error(`L'IA ha risposto con del testo invece di un'immagine: "${response.text.substring(0, 100)}..."`);
    }

    throw new Error("Nessuna immagine trovata nella risposta.");
  } catch (error: any) {
    console.error("Error generating image:", error);
    throw error;
  }
}

export async function editImage(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<{ imageUrl: string; base64: string } | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'undefined') {
    throw new Error("Chiave API mancante. Configura GEMINI_API_KEY nelle impostazioni di Vercel.");
  }
  const ai = new GoogleGenAI({ apiKey });
  
  // Strip data URL prefix if present
  const cleanBase64 = base64Image.includes(',') ? base64Image.split(',')[1] : base64Image;
  
  try {
    console.log("Sending request to Gemini with prompt:", prompt);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: cleanBase64,
              mimeType: mimeType,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    console.log("Gemini response received:", response);

    if (!response.candidates || response.candidates.length === 0) {
      console.error("No candidates in response");
      return null;
    }

    for (const part of response.candidates[0].content.parts || []) {
      if (part.inlineData) {
        const base64 = part.inlineData.data;
        return {
          imageUrl: `data:image/png;base64,${base64}`,
          base64: base64
        };
      }
    }
    
    if (response.text) {
      console.warn("Gemini returned text instead of an image:", response.text);
      throw new Error(`L'IA ha risposto con del testo invece di un'immagine: ${response.text}`);
    }

    return null;
  } catch (error: any) {
    console.error("Error editing image:", error);
    throw error;
  }
}
