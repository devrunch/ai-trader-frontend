"use client";

import { useState } from "react";
import { createIndicator, updateIndicator, type ApiIndicator, type ApiOhlcBar, type IndicatorPane } from "@/lib/api";
import { runPineIndicator } from "@/lib/api/pine";
import { INDICATOR_CATEGORIES } from "@/lib/indicators/catalog";

type TestResult =
  | { status: "idle" }
  | { status: "running" }
  | { status: "ok"; plotNames: string[] }
  | { status: "error"; message: string };

const DEFAULT_SOURCE = '//@version=5\nindicator("My Indicator")\nplot(ta.sma(close, 20), "SMA")';

/** Create or edit a custom Pine indicator. Save stays disabled until the
 *  pasted source has actually run successfully against real recent bars --
 *  the same "verify before it ships" discipline the built-in catalog itself
 *  was held to, now enforced in the UI instead of by hand before a commit.
 *  Editing the source after a successful test un-verifies it: the test
 *  result is for the exact text it ran, not whatever's in the box now. */
export function IndicatorEditorModal({ open, onClose, initial, bars, onSaved }: {
  open: boolean;
  onClose: () => void;
  initial?: ApiIndicator | null;
  bars: ApiOhlcBar[];
  onSaved: (indicator: ApiIndicator) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? INDICATOR_CATEGORIES[0]);
  const [pane, setPane] = useState<IndicatorPane>(initial?.pane ?? "main");
  const [source, setSource] = useState(initial?.source ?? DEFAULT_SOURCE);
  const [test, setTest] = useState<TestResult>({ status: "idle" });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!open) return null;

  async function runTest() {
    setTest({ status: "running" });
    if (bars.length === 0) {
      setTest({ status: "error", message: "No chart data loaded to test against -- open a symbol first." });
      return;
    }
    const result = await runPineIndicator(source, bars);
    if (result.ok && result.plots) {
      setTest({ status: "ok", plotNames: Object.keys(result.plots) });
    } else {
      setTest({ status: "error", message: result.error || "The sandbox rejected this script." });
    }
  }

  async function save() {
    setSaving(true);
    setSaveError(null);
    try {
      const input = { name: name.trim(), category, pane, source };
      const saved = initial ? await updateIndicator(initial.id, input) : await createIndicator(input);
      onSaved(saved);
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this indicator.");
    } finally {
      setSaving(false);
    }
  }

  const canSave = name.trim().length > 0 && test.status === "ok" && !saving;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="indicator-editor-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[6vh]"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-2xl max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 id="indicator-editor-title" className="font-heading font-semibold text-base">
            {initial ? "Edit Indicator" : "New Indicator"}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Name
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Indicator"
                className="bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
              >
                {INDICATOR_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground w-40">
            Pane
            <select
              value={pane}
              onChange={(e) => setPane(e.target.value as IndicatorPane)}
              className="bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              <option value="main">Overlay (main)</option>
              <option value="sub">Sub-pane</option>
              <option value="volume">On volume</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Pine source
            <textarea
              value={source}
              onChange={(e) => { setSource(e.target.value); setTest({ status: "idle" }); }}
              spellCheck={false}
              rows={12}
              className="bg-secondary/40 border border-border px-2.5 py-2 text-xs font-mono text-foreground focus:outline-none focus:border-primary resize-y"
            />
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={runTest}
              disabled={test.status === "running"}
              className="px-3 py-1.5 text-xs font-semibold border border-border hover:border-foreground/40 hover:text-foreground text-muted-foreground transition-colors disabled:opacity-50"
            >
              {test.status === "running" ? "Testing…" : "Test Run"}
            </button>
            {test.status === "ok" && (
              <span className="text-xs" style={{ color: "var(--buy)" }}>
                ✓ Ran cleanly — {test.plotNames.length} plot{test.plotNames.length === 1 ? "" : "s"}: {test.plotNames.join(", ")}
              </span>
            )}
            {test.status === "error" && (
              <span className="text-xs" style={{ color: "var(--sell)" }}>✗ {test.message}</span>
            )}
          </div>

          {saveError && <p className="text-xs" style={{ color: "var(--sell)" }}>{saveError}</p>}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            title={test.status !== "ok" ? "Run the script successfully first" : undefined}
            className="px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saving ? "Saving…" : initial ? "Save Changes" : "Create Indicator"}
          </button>
        </div>
      </div>
    </div>
  );
}
