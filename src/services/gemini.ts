import { GoogleGenAI } from "@google/genai";

export async function generateImage(
  prompt: string
): Promise<{ imageUrl: string; base64: string } | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
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
    });

    console.log("Gemini generation response received:", response);

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
    console.error("Error generating image:", error);
    throw error;
  }
}

export async function editImage(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<{ imageUrl: string; base64: string } | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  
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
            text: prompt,
          },
        ],
      },
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
