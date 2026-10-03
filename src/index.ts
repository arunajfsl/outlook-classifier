import express, { Request, Response } from "express";
import OpenAI from "openai";

const app = express();
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Healthcheck
app.get("/", (req: Request, res: Response) => {
  res.json({ status: "✅ Classifier running" });
});

// Classification endpoint
app.post("/classify", async (req: Request, res: Response) => {
  try {
    const { from, subject, preview } = req.body;

    if (!subject) {
      return res.status(400).json({ error: "Missing subject" });
    }

    const prompt = `Classify this email into ONE category only:
- IMMEDIATE_ACTION: Needs response/decision within 24 hours
- TODAY: Important, should be done today
- FOLLOW_UP: Waiting for someone else's response
- MEETING_PREP: Contains agenda or prep needed
- FYI: Informational only, no action

From: ${from || "unknown"}
Subject: ${subject}
Preview: ${preview || ""}

Respond ONLY: CATEGORY|Reason (one line, no extra text)`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 60,
      temperature: 0.3,
    });

    const result = response.choices[0].message.content || "FYI|Unable to classify";
    const [category, reason] = result.split("|");

    const validCategories = [
      "IMMEDIATE_ACTION",
      "TODAY",
      "FOLLOW_UP",
      "MEETING_PREP",
      "FYI",
    ];

    const finalCategory = validCategories.includes(category.trim())
      ? category.trim()
      : "FYI";

    res.json({
      category: finalCategory,
      reason: (reason || "Classified").trim().substring(0, 100),
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      category: "FYI",
      reason: "Classifier unavailable",
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Running on port ${PORT}`));