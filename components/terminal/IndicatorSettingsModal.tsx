"use client";

import { useState } from "react";
import type { PineInputMeta } from "@/lib/api/pine";
import type { PlotStyleOverride } from "@/lib/chart-adapter/types";
import { INTERVALS } from "@/lib/periods";

const SOURCE_PRESETS = ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4", "volume"];
const DEFAULT_SWATCH = "#8b8a9e";
const DEFAULT_LINE_WIDTH = 2;

export interface IndicatorVisibility {
  minInterval?: string;
  maxInterval?: string;
}

export interface IndicatorSettingsResult {
  params: Record<string, unknown>;
  style: Record<string, PlotStyleOverride>;
  visibility: IndicatorVisibility;
}

type Tab = "inputs" | "style" | "visibility";

/** TradingView-style settings popup: Inputs (the script's own input.*()
 *  declarations, real metadata from PineTS's Indicator.getInputsMeta() --
 *  see lib/api/pine.ts's PineInputMeta), Style (per-plot color/width/
 *  visibility, pure rendering, no sandbox re-run), and Visibility
 *  (resolution-based show/hide, scoped to this app's real fixed interval
 *  set rather than TradingView's open-ended tick/second/custom range,
 *  which this app has no chart state to match). One Save button applies
 *  whichever tabs were touched -- matches TradingView's own single-OK
 *  dialog rather than a per-tab save. */
export function IndicatorSettingsModal({ open, onClose, label, inputsMeta, plotNames, initialParams, initialStyle, initialVisibility, onSave }: {
  open: boolean;
  onClose: () => void;
  label: string;
  inputsMeta: PineInputMeta[];
  plotNames: string[];
  initialParams: Record<string, unknown>;
  initialStyle: Record<string, PlotStyleOverride>;
  initialVisibility: IndicatorVisibility;
  onSave: (result: IndicatorSettingsResult) => void;
}) {
  const [tab, setTab] = useState<Tab>("inputs");
  const fields = inputsMeta.filter((m): m is PineInputMeta & { varId: string } => !!m.varId);

  const [paramValues, setParamValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.varId] = initialParams[f.varId] ?? f.defval;
    return initial;
  });
  const [styleValues, setStyleValues] = useState<Record<string, PlotStyleOverride>>(() => ({ ...initialStyle }));
  const [visibility, setVisibility] = useState<IndicatorVisibility>(initialVisibility);

  if (!open) return null;

  function setParam(varId: string, value: unknown) {
    setParamValues((prev) => ({ ...prev, [varId]: value }));
  }
  function setStyle(plot: string, patch: PlotStyleOverride) {
    setStyleValues((prev) => ({ ...prev, [plot]: { ...prev[plot], ...patch } }));
  }
  function save() {
    onSave({ params: paramValues, style: styleValues, visibility });
    onClose();
  }

  const tabClass = (t: Tab) =>
    `px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
      tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
    }`;

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="indicator-settings-title"
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 pt-[10vh]"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border w-full max-w-sm max-h-[75vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 pb-0 border-b border-border flex items-center justify-between">
          <h2 id="indicator-settings-title" className="font-heading font-semibold text-base truncate">
            {label}
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="px-4 border-b border-border flex items-center gap-1">
          <button onClick={() => setTab("inputs")} className={tabClass("inputs")}>Inputs</button>
          <button onClick={() => setTab("style")} className={tabClass("style")}>Style</button>
          <button onClick={() => setTab("visibility")} className={tabClass("visibility")}>Visibility</button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
          {tab === "inputs" && (
            fields.length === 0 ? (
              <p className="text-xs text-muted-foreground">This script has no adjustable inputs.</p>
            ) : fields.map((f) => (
              <label key={f.varId} className="flex flex-col gap-1 text-xs text-muted-foreground">
                {f.title || f.varId}
                <InputField meta={f} value={paramValues[f.varId]} onChange={(v) => setParam(f.varId, v)} />
              </label>
            ))
          )}

          {tab === "style" && (
            plotNames.length === 0 ? (
              <p className="text-xs text-muted-foreground">This script has no plotted lines to style.</p>
            ) : plotNames.map((name) => {
              const s = styleValues[name];
              return (
                <div key={name} className="flex items-center gap-2 text-xs">
                  <span className="flex-1 truncate text-foreground">{name}</span>
                  <input
                    type="color"
                    value={s?.color ?? DEFAULT_SWATCH}
                    onChange={(e) => setStyle(name, { color: e.target.value })}
                    className="w-7 h-7 border border-border bg-transparent cursor-pointer"
                    aria-label={`${name} color`}
                  />
                  <select
                    value={s?.lineWidth ?? DEFAULT_LINE_WIDTH}
                    onChange={(e) => setStyle(name, { lineWidth: Number(e.target.value) })}
                    className="bg-secondary/40 border border-border px-1.5 py-1 text-foreground focus:outline-none focus:border-primary"
                    aria-label={`${name} line width`}
                  >
                    {[1, 2, 3, 4].map((w) => <option key={w} value={w}>{w}px</option>)}
                  </select>
                  <label className="flex items-center gap-1 text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={s?.visible !== false}
                      onChange={(e) => setStyle(name, { visible: e.target.checked })}
                      className="w-3.5 h-3.5"
                    />
                    Show
                  </label>
                </div>
              );
            })
          )}

          {tab === "visibility" && (
            <>
              <p className="text-xs text-muted-foreground">
                Only show this indicator when the chart&apos;s interval falls within this range.
              </p>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Minimum interval
                <select
                  value={visibility.minInterval ?? ""}
                  onChange={(e) => setVisibility((v) => ({ ...v, minInterval: e.target.value || undefined }))}
                  className="bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">No limit</option>
                  {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </label>
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Maximum interval
                <select
                  value={visibility.maxInterval ?? ""}
                  onChange={(e) => setVisibility((v) => ({ ...v, maxInterval: e.target.value || undefined }))}
                  className="bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">No limit</option>
                  {INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}
                </select>
              </label>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={save}
            className="px-3 py-1.5 text-xs font-semibold text-white transition-colors"
            style={{ background: "var(--buy)" }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

const FIELD_CLASS = "bg-secondary/40 border border-border px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:border-primary";

function InputField({ meta, value, onChange }: {
  meta: PineInputMeta;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  if (meta.type === "bool") {
    return (
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 self-start"
      />
    );
  }
  if (meta.type === "int" || meta.type === "float") {
    return (
      <input
        type="number"
        value={typeof value === "number" ? value : ""}
        min={meta.minval}
        max={meta.maxval}
        step={meta.step ?? (meta.type === "int" ? 1 : "any")}
        onChange={(e) => onChange(e.target.value === "" ? meta.defval : Number(e.target.value))}
        className={FIELD_CLASS}
      />
    );
  }
  if (meta.type === "enum" && meta.options && meta.options.length > 0) {
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS}>
        {meta.options.map((o) => <option key={String(o)} value={String(o)}>{String(o)}</option>)}
      </select>
    );
  }
  if (meta.type === "source") {
    const options = SOURCE_PRESETS.includes(String(value)) ? SOURCE_PRESETS : [String(value), ...SOURCE_PRESETS];
    return (
      <select value={String(value)} onChange={(e) => onChange(e.target.value)} className={FIELD_CLASS}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  // color/session/time/price/symbol/timeframe/text_area -- no dedicated
  // widget yet, a plain text field still lets a user override the value.
  return (
    <input
      type="text"
      value={typeof value === "string" ? value : String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD_CLASS}
    />
  );
}
