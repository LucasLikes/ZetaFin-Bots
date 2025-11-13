import Tesseract from "tesseract.js";

// Função principal
export async function extractTextFromImage(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, "por");
  return data.text;
}

// Alias para processImage
export const processImage = extractTextFromImage;
