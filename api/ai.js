// api/ai.js (FULL) - Vercel Serverless Function (ESM)
import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { message, language, snapshot } = req.body || {};
    const userMsg = String(message || "").trim();
    if (!userMsg) return res.status(400).json({ error: "Missing message" });

    const lang = String(language || "en");
    const snap = snapshot || {};
    const data = snap.data || {};
    const sections = snap.sections || {};

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Strict schema we expect back
    const system = `
You are an AI coach for a CV builder.
You MUST respond ONLY with valid JSON (no markdown).
The JSON MUST have:
- "message": string (human explanation in the user's language)
- "changes": array of patch objects

Allowed patch objects:
- { "op": "set", "path": "...", "value": any }

Allowed paths (exactly):
data.name, data.title, data.email, data.phone, data.location, data.linkedin,
data.summary, data.education, data.licenses, data.clinicalSkills, data.coreCompetencies,
data.languages, data.experience, data.achievements, data.volunteer, data.custom1, data.custom2,

sections.summary.enabled, sections.summary.title,
sections.education.enabled, sections.education.title,
sections.licenses.enabled, sections.licenses.title,
sections.clinicalSkills.enabled, sections.clinicalSkills.title,
sections.coreCompetencies.enabled, sections.coreCompetencies.title,
sections.languages.enabled, sections.languages.title,
sections.experience.enabled, sections.experience.title,
sections.achievements.enabled, sections.achievements.title,
sections.volunteer.enabled, sections.volunteer.title,
sections.custom1.enabled, sections.custom1.title,
sections.custom2.enabled, sections.custom2.title

Rules:
- If user asks to fill a field (e.g. name), propose a change with that path.
- If user asks "where?" or vague, ask a short clarifying question in "message" and return changes: [].
- Never include extra keys. Never include code. Never include HTML.
`.trim();

    const userContext = {
      user_language: lang,
      user_request: userMsg,
      current_data: data,
      current_sections: sections
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      messages: [
        { role: "system", content: system },
        { role: "user", content: JSON.stringify(userContext) }
      ]
    });

    const raw = completion.choices?.[0]?.message?.content || "";

    // Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      // If model fails, return helpful error but no changes
      return res.status(200).json({
        message:
          lang === "no"
            ? "Jeg klarte ikke å returnere endringer i riktig format. Prøv igjen med en tydeligere forespørsel (f.eks. 'Sett navnet mitt til Katinka')."
            : "I couldn't return changes in the correct format. Try again with a clearer request (e.g. 'Set my name to Katinka').",
        changes: []
      });
    }

    // Validate shape
    if (
      !parsed ||
      typeof parsed.message !== "string" ||
      !Array.isArray(parsed.changes)
    ) {
      return res.status(200).json({
        message:
          lang === "no"
            ? "Responsen manglet 'message' og/eller 'changes'. Prøv igjen."
            : "The response was missing 'message' and/or 'changes'. Please try again.",
        changes: []
      });
    }

    return res.status(200).json({
      message: parsed.message,
      changes: parsed.changes
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
