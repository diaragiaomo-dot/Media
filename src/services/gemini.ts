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
            text: `GENERATE_IMAGE: ${prompt}`,
          },
        ],
      },
      config: {
        systemInstruction: "You are an image generation model. Your task is to generate high-quality images based on the user's prompt. Do not respond with text unless you absolutely cannot generate the image.",
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
    
    // Check for safety ratings if possible
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("La richiesta è stata bloccata dai filtri di sicurezza dell'IA. Prova a cambiare le parole del prompt.");
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
      console.warn("Gemini returned text instead of an image:", response.text);
      throw new Error(`L'IA ha risposto con del testo invece di generare l'immagine: "${response.text.substring(0, 100)}..."`);
    }

    throw new Error("Impossibile trovare i dati dell'immagine nella risposta dell'IA.");
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
  
  try {
    console.log("Sending request to Gemini with prompt:", prompt);
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType,
            },
          },
          {
            text: `MODIFY_IMAGE: ${prompt}`,
          },
        ],
      },
      config: {
        systemInstruction: "You are an image editing model. Your task is to modify the provided image according to the user's request. Do not respond with text.",
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
