import { GoogleGenAI } from "@google/genai";
import { SystemFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeFolderContent = async (
  files: SystemFile[],
  query: string
): Promise<string> => {
  try {
    const fileListString = files
      .map((f) => `- ${f.name} (Type: ${f.type}, Date: ${f.dateModified})`)
      .join("\n");

    const prompt = `
      You are an intelligent assistant for a file management system for "Yemot HaMashiach" (an IVR platform).
      User Query: "${query}"
      
      Here is the list of files in the current folder:
      ${fileListString}
      
      Please answer the user's question based on this list.
      If the user asks to summarize, describe what kind of content appears to be here based on filenames.
      Respond in Hebrew.
      Keep it concise and helpful.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
    });

    return response.text || "לא התקבלה תשובה מהמערכת.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "שגיאה בניתוח הבקשה. אנא וודא שמפתח ה-API מוגדר כראוי.";
  }
};
