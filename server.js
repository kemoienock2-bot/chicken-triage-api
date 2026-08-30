import express from "express";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

app.post("/api/triage", async (req, res) => {
  const { symptoms, notes } = req.body;

  if (!symptoms || !Array.isArray(symptoms) || symptoms.length === 0) {
    return res.status(400).json({ error: "Please select at least one symptom." });
  }

  const prompt = `You are a triage assistant for backyard poultry keepers, not a veterinarian.
A keeper has observed the following symptoms in one chicken: ${symptoms.join(", ")}.
${notes ? `Additional notes from the keeper: ${notes}` : ""}

Return ONLY a raw JSON object (no markdown fences, no preamble) with exactly these fields:
{
  "riskLevel": "Low" | "Medium" | "High" | "Urgent",
  "possibleConcerns": ["general concern category", "..."],
  "recommendedAction": "one short, concrete next step",
  "reasoning": "1-2 sentence explanation of the risk level",
  "disclaimer": "This is not a veterinary diagnosis. Consult a vet for anything serious or worsening."
}`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const result = JSON.parse(cleaned);

    res.json(result);
  } catch (err) {
    console.error("Triage error:", err);
    res.status(500).json({ error: "Triage assistant is unavailable right now. Try again in a moment." });
  }
});

app.get("/", (req, res) => {
  res.send("Chicken Triage API is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
