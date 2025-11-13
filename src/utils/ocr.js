import Tesseract from "tesseract.js";

export async function extractTextFromImage(imagePath) {
  const { data } = await Tesseract.recognize(imagePath, "por");
  return data.text;
}
