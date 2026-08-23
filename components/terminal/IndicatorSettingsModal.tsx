"use client";

import { useState } from "react";
import type { PineInputMeta } from "@/lib/api/pine";

const SOURCE_PRESETS = ["close", "open", "high", "low", "hl2", "hlc3", "ohlc4", "volume"];

/** TradingView-style settings gear popup: renders one form field per
 *  input.*() declaration the sandbox parsed out of the script (real
 *  metadata from PineTS's own Indicator.getInputsMeta(), not something this
 *  app infers from source text -- see lib/api/pine.ts's PineInputMeta).
 *  Fields without a varId can't be overridden (PineTS's own override
 *  mechanism is varId-keyed) and are skipped rather than shown read-only. */
export function IndicatorSettingsModal({ open, onClose, label, inputsMeta, initialParams, onSave }: {
  open: boolean;
  onClose: () => void;
  label: string;
  inputsMeta: PineInputMeta[];
  initialParams: Record<string, unknown>;
  onSave: (params: Record<string, unknown>) => void;
}) {
  const fields = inputsMeta.filter((m): m is PineInputMeta & { varId: string } => !!m.varId);
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const initial: Record<string, unknown> = {};
    for (const f of fields) initial[f.varId] = initialParams[f.varId] ?? f.defval;
    return initial;
  });

  if (!open) return null;

  function setValue(varId: string, value: unknown) {
    setValues((prev) => ({ ...prev, [varId]: value }));
  }

  function save() {
    onSave(values);
    onClose();
  }

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
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 id="indicator-settings-title" className="font-heading font-semibold text-base truncate">
            {label} Settings
          </h2>
          <button onClick={onClose} aria-label="Close" className="text-muted-foreground hover:text-foreground shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
          {fields.length === 0 && (
            <p className="text-xs text-muted-foreground">This script has no adjustable settings.</p>
          )}
          {fields.map((f) => (
            <label key={f.varId} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {f.title || f.varId}
              <SettingField meta={f} value={values[f.varId]} onChange={(v) => setValue(f.varId, v)} />
            </label>
          ))}
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

function SettingField({ meta, value, onChange }: {
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
