"use client";

import { useRef, useState } from "react";
import { createIndicator, updateIndicator, type ApiIndicator, type ApiOhlcBar, type IndicatorPane } from "@/lib/api";
import { runPineIndicator } from "@/lib/api/pine";
import { INDICATOR_CATEGORIES } from "@/lib/indicators/catalog";
import { findErrorHint } from "@/lib/indicators/error-hints";

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

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  if (!open) return null;

  function syncGutterScroll() {
    if (gutterRef.current && textareaRef.current) gutterRef.current.scrollTop = textareaRef.current.scrollTop;
  }

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
  const lineCount = Math.max(source.split("\n").length, 1);
  const hint = test.status === "error" ? findErrorHint(source) : null;

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

          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>Pine source</span>
            <div
              className="flex border border-border bg-secondary/40 focus-within:border-primary"
              style={{ fontFamily: "var(--font-mono, monospace)" }}
            >
              {/* Line-number gutter -- a real code-editor feel, kept in sync
                  with the textarea's own scroll position. PineTS's own
                  errors carry no Pine-source line/column (confirmed: a
                  ReferenceError or TypeError with no position data), so this
                  is honest about what it is: line numbers for the text as
                  written, not a marker pointing at the failing line -- that
                  data doesn't exist to point with. */}
              <div
                ref={gutterRef}
                aria-hidden="true"
                className="select-none text-right py-2 pl-2 pr-2 text-[11px] text-muted-foreground/50 overflow-hidden shrink-0"
                style={{ lineHeight: "1.5" }}
              >
                {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                ref={textareaRef}
                value={source}
                onChange={(e) => { setSource(e.target.value); setTest({ status: "idle" }); }}
                onScroll={syncGutterScroll}
                spellCheck={false}
                rows={14}
                className="flex-1 min-w-0 bg-transparent px-2.5 py-2 text-[11px] text-foreground focus:outline-none resize-y"
                style={{ lineHeight: "1.5" }}
              />
            </div>
          </div>

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
          </div>

          {test.status === "error" && (
            <div
              role="alert"
              className="border px-3 py-2.5 flex flex-col gap-1.5"
              style={{
                borderColor: "color-mix(in oklch, var(--sell) 35%, var(--border))",
                background: "color-mix(in oklch, var(--sell) 6%, transparent)",
              }}
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--sell)" }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Script Error
              </div>
              <p className="text-xs whitespace-pre-wrap wrap-break-word text-foreground" style={{ fontFamily: "var(--font-mono, monospace)" }}>
                {test.message}
              </p>
              {hint && <p className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/50">{hint}</p>}
            </div>
          )}

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
