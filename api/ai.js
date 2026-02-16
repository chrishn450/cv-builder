import OpenAI from "openai";

function safeJsonParse(s) {
  try { return JSON.parse(s); } catch { return null; }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { mode, language, message, cv } = req.body || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const lang = language || "auto";

    const system = `
Du er en profesjonell CV-coach.
VIKTIG:
- Svar alltid på samme språk som brukeren (språk: ${lang}).
- Du må ALDRI gjøre endringer direkte. Du skal alltid foreslå endringer som "suggestions".
- Hver suggestion må være noe brukeren kan godkjenne (Accept) før det implementeres.
- Returner KUN gyldig JSON (ingen markdown, ingen forklaring utenfor JSON).

JSON-format:
{
  "reply": "tekstlig svar til bruker",
  "suggestions": [
    {
      "id": "s1",
      "title": "kort tittel",
      "why": "hvorfor dette hjelper",
      "changes": [
        {"op":"set","path":"summary","value":"..."},
        {"op":"set","path":"layout.padX","value":38}
      ],
      "preview": {"before":"...","after":"..."}
    }
  ]
}

Tillatte patch paths (op="set"):
- summary, clinicalSkills, coreCompetencies, languages, achievements, custom1, custom2
- name, title, email, phone, location, linkedin
- sections.<key>.title  (key: summary|education|licenses|clinicalSkills|coreCompetencies|languages|experience|achievements|volunteer|custom1|custom2)
- sections.<key>.enabled (true/false)
- layout.padX (number), layout.gap (number), layout.leftWidth (number)

Regler:
- Gi maks 6 suggestions per svar.
- Hvis bruker ber om layout/fordeling: foreslå layout.* endringer.
- Hvis bruker ber om rewrite: foreslå set på relevant felt.
`;

    const userPayload = {
      mode: mode || "chat",
      message: message || "",
      cvText: cv?.text || "",
      // we also pass some structure, but model can ignore
      hasDataKeys: Object.keys(cv?.data || {}),
      hasSectionsKeys: Object.keys(cv?.sections || {}),
      layout: cv?.layout || {}
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.35,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content:
            (mode === "review"
              ? `Gi en kort review av CV-en og konkrete forslag.\n\nDATA:\n${JSON.stringify(userPayload)}`
              : `Bruker-spørsmål: ${message}\n\nDATA:\n${JSON.stringify(userPayload)}`
            )
        }
      ]
    });

    const text = completion.choices?.[0]?.message?.content || "{}";
    const json = safeJsonParse(text);

    if (!json || typeof json !== "object") {
      // fallback: just return raw text as reply
      return res.status(200).json({ reply: text, suggestions: [] });
    }

    // enforce shape
    if (!Array.isArray(json.suggestions)) json.suggestions = [];
    if (typeof json.reply !== "string") json.reply = "";

    return res.status(200).json(json);

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "AI request failed" });
  }
}
