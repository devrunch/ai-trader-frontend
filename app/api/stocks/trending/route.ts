import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

// Cache for 1 hour — avoids an Opus call on every dashboard load
export const revalidate = 3600;

async function isAuthenticated(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get("access_token")?.value;
  if (!cookie) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Cookie: `access_token=${cookie}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  if (!(await isAuthenticated(req))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system:
        "You are a trading algorithm. Your text response must be ONLY a valid JSON object — no preamble, no explanation, no markdown, no code fences. Just raw JSON.",
      messages: [
        {
          role: "user",
          content: `Return a JSON object with 6 currently trending Indian stocks. Use this exact structure:
{"picks":[{"ticker":"NSE_TICKER","name":"Full Company Name","signal":"BUY","buyZone":"₹2,840–2,860","target":"₹3,050","stopLoss":"₹2,780","upside":"+7.2%","risk":"Low","reason":"One sharp sentence explaining the key signal"}]}
Rules: signal = BUY | SELL | WATCH. risk = Low | Medium | High. Mix large-cap and mid-cap. No duplicates. Output raw JSON only.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new Error("No text block in response");
    }

    const stripped = textBlock.text.replace(/```[a-z]*\n?|\n?```/g, "").trim();
    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error(`No JSON object found. Raw: ${stripped.slice(0, 200)}`);

    const data = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(data.picks)) throw new Error("Invalid response shape");

    return Response.json(data);
  } catch (err) {
    console.error("[/api/stocks/trending]", err);
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
