import { req } from "./client";

/* ── Morning Brief (pre-market) ── */
export interface GlobalCue {
  symbol: string; name: string; group: string; why: string;
  value: number; change_pct: number; as_of: string;
}
export interface BriefCandidate {
  symbol: string;
  direction: "BUY" | "SELL";
  confidence: number;
  entry: number; target: number; stop: number;
  reward_risk: number | null;
  reasoning: string;
  indicators: Record<string, number>;
  global_context: {
    alignment_score: number;
    expected_move_pct: number | null;
    agrees_with_direction: boolean | null;
    reasons: string[];
  };
}
export interface MorningBrief {
  date: string;
  generatedAt: string;
  marketRead: {
    bias: "positive" | "negative" | "neutral";
    label: string;
    confidence: string;
    notes: string[];
    us_avg_pct: number | null;
    asia_avg_pct: number | null;
  };
  globalCues: GlobalCue[];
  narrative: string;
  candidates: BriefCandidate[];
  disclaimer: string;
}

export const getMorningBrief = () => req<MorningBrief | null>("/api/brief");
