import OpenAI from "openai";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { cvText, language } = req.body;

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a professional CV reviewer. 
          Always respond in the same language as the user (${language || "auto"}).
          Give structured suggestions and improvement ideas.`
        },
        {
          role: "user",
          content: `Review this CV:\n\n${cvText}`
        }
      ]
    });

    res.status(200).json({
      result: completion.choices[0].message.content
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI request failed" });
  }
}
