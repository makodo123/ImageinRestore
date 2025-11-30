import { GoogleGenAI } from "@google/genai";
import { RestoreRequest } from "../types";
import { stripBase64Prefix } from "../utils/canvasUtils";

const API_KEY = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Sends the original image and a mask guide to Gemini to perform restoration.
 * We use a "Visual Prompting" strategy where we provide the original image
 * and a separate mask image, instructing the model to treat the second image as a mask.
 */
export const restoreImage = async (request: RestoreRequest): Promise<string> => {
  if (!API_KEY) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }

  const cleanImage = stripBase64Prefix(request.imageBase64);
  const cleanMask = stripBase64Prefix(request.maskBase64);
  const userPrompt = request.prompt ? request.prompt.trim() : '';

  try {
    const isEditing = userPrompt.length > 0;

    const restorationPrompt = `Perform a high-fidelity image restoration. 
            The first image is the source. 
            The second image is a black-and-white mask where white pixels indicate areas to be restored.
            
            Task:
            1. Remove all content in the source image that corresponds to the white areas in the mask (e.g., watermarks, text, objects).
            2. Inpaint the removed areas seamlessly, matching the surrounding texture, lighting, and context of the source image.
            3. Ensure the output is the same resolution and aspect ratio as the source.
            4. Do not alter areas outside the mask.
            
            Return ONLY the restored image.`;

    const editingPrompt = `Perform a high-fidelity image editing task.
            The first image is the source. 
            The second image is a black-and-white mask where white pixels indicate the active area for editing.
            
            Instruction: ${userPrompt}
            
            Task:
            1. Modify the content within the white masked area according to the Instruction.
            2. Ensure the edited area blends seamlessly with the surrounding pixels (lighting, texture, perspective).
            3. Maintain the original resolution and aspect ratio.
            4. Return ONLY the edited image.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanImage
            }
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanMask
            }
          },
          {
            text: isEditing ? editingPrompt : restorationPrompt
          }
        ]
      }
    });

    // Extract image from response
    // The model might return text + image or just image. We scan parts.
    const parts = response.candidates?.[0]?.content?.parts;
    if (!parts) {
      throw new Error("No content returned from Gemini.");
    }

    const imagePart = parts.find(p => p.inlineData);

    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType || 'image/png'};base64,${imagePart.inlineData.data}`;
    }

    throw new Error("Gemini did not return an image. It might have refused the request.");

  } catch (error) {
    console.error("Gemini Restoration Error:", error);
    throw error;
  }
};