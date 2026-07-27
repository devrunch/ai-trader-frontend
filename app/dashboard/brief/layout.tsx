import type { Metadata } from "next";

/* Page components here are client components, which cannot export
   metadata — hence this tiny server layout. Without it every route in
   the app shared a single browser-tab title. */
export const metadata: Metadata = {
  title: "Morning Brief",
  description: "Overnight global cues and the day's shortlist, before the open.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
