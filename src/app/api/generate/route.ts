import Groq from "groq-sdk";

// POST /api/generate
// Body: { prompt: string }
// Returns: { code: string } where code is raw HTML/JSX snippet.
export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Missing prompt" }), {
        status: 400,
      });
    }
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GROQ_API_KEY not configured" }),
        { status: 500 }
      );
    }
    const client = new Groq({ apiKey });
    // Instruction to keep output concise and only include the snippet.
    const system = `You are an AI that outputs ONLY raw HTML or React JSX without backticks, no markdown fences, no explanations. Use minimal inline styles. Include a cohesive section based on the user prompt. If user gives JSX, refine it slightly but preserve structure.`;
    const completion = await client.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      temperature: 0.5,
      max_tokens: 900,
    });
    const content = completion.choices?.[0]?.message?.content || "";
    // Strip accidental code fences if present.
    const code = content.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();
    return Response.json({ code });
  } catch (e: any) {
    console.log(e);
    return new Response(
      JSON.stringify({ error: e.message || "Unknown error" }),
      { status: 500 }
    );
  }
}
