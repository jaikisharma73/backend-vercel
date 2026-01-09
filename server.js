import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

const genAI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

app.post("/generate", async (req, res) => {
  try {
    const { prompt, framework } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const fullPrompt = `
Generate a complete HTML page for a ${framework} UI component.

Rules:
- Include <!DOCTYPE html>, <html>, <head>, <body>
- Add all CSS inside <style> or CDN (Tailwind/Bootstrap)
- Return ONLY full HTML
- No markdown, no explanation

User request:
${prompt}
`;

    async function callGemini(model) {
      return await genAI.models.generateContent({
        model,
        contents: [
          { role: "user", parts: [{ text: fullPrompt }] }
        ],
      });
    }

    let response;

    try {
      // fast model
      response = await callGemini("gemini-2.5-flash");
    } catch (e) {
      console.log("⚠ Flash overloaded → switching to Pro");
      response = await callGemini("gemini-2.5-pro");
    }

    const result =
      response.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!result) {
      return res.status(500).json({ error: "No output from Gemini" });
    }

    res.json({ result });

  } catch (error) {
    console.error("🔥 Gemini Error:", error.message || error);
    res.status(500).json({ error: "AI service temporarily unavailable" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
