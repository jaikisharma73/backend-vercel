import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",
    "https://vercel-frontend-ivory.vercel.app",
  ],
  methods: ["GET", "POST"],
  credentials: true,
}));

app.use(express.json());

if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY missing");
  process.exit(1);
}

// ✅ Correct Gemini client
const genAI = new GoogleGenAI(process.env.GEMINI_API_KEY);

app.post("/generate", async (req, res) => {
  try {
    const { prompt, framework } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const fullPrompt = `
Generate a complete ${framework} UI component.

Rules:
- Include <!DOCTYPE html>, <html>, <head>, <body>
- Include all CSS inside <style> or CDN
- Return ONLY raw HTML
- No markdown, no explanation

User request:
${prompt}
`;

    let result;

    try {
      const response = await genAI.models.generateContent({
        model: "models/gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      });

      result = response.candidates?.[0]?.content?.parts?.[0]?.text;
    } catch (e) {
      console.log("⚠ Flash failed → switching to Pro");

      const response = await genAI.models.generateContent({
        model: "models/gemini-2.5-pro",
        contents: [{ role: "user", parts: [{ text: fullPrompt }] }],
      });

      result = response.candidates?.[0]?.content?.parts?.[0]?.text;
    }

    if (!result) {
      return res.status(500).json({ error: "No output from Gemini" });
    }

    res.json({ result });

  } catch (error) {
    console.error("🔥 Gemini Error:", error);
    res.status(500).json({ error: "AI service failed" });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
