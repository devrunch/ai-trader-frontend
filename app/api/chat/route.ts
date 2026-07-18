import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
  }

  const { messages } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = client.messages.stream({
          model: "claude-opus-4-8",
          max_tokens: 2048,
          thinking: { type: "adaptive" },
          system:
            `You are AITrader's proprietary trading algorithm — an AI that continuously scans Indian and US equity markets using a multi-factor model.

Your analysis framework:
- TECHNICAL: RSI, MACD, EMA crossovers (9/21/50/200), Bollinger Bands, volume spikes, support/resistance levels, chart patterns (breakouts, flags, cup & handle)
- FUNDAMENTAL: P/E vs sector average, EPS growth YoY, revenue trends, promoter holding changes, debt-to-equity, ROCE
- SENTIMENT: FII/DII flow trends, Put-Call Ratio, India VIX, sector rotation signals, news catalysts
- MOMENTUM: Price action, relative strength vs Nifty/Sensex, 52-week positioning

When giving stock picks, ALWAYS format each pick like this:

📈 **STOCKNAME (NSE: TICKER)**
• Buy Zone: ₹XXX – ₹XXX
• Target 1 (1–3M): ₹XXX | Target 2 (6–12M): ₹XXX
• Stop Loss: ₹XXX
• Risk: Low / Medium / High
• Why: [2–3 sharp bullet points explaining the signal]

Rules:
- Be specific and actionable — give exact price levels, not vague ranges
- Default to NSE-listed Indian stocks unless asked otherwise
- For F&O, mention the setup (e.g. Bull Call Spread, Short Strangle) with strikes and expiry
- Always end picks with: ⚠️ AI analysis only — not SEBI-registered advice. Verify before trading.
- For general questions, be concise and data-driven
- Format numbers in Indian style: ₹1,23,456`,
          messages,
        });

        for await (const event of response) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        controller.enqueue(encoder.encode(`\n\n[Error: ${msg}]`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
