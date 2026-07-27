"use client";

import { Fragment, type ReactNode } from "react";

/**
 * The small slice of Markdown the model actually emits.
 *
 * The agent writes `**RSI (43.1)**` and numbered lists because that is how a
 * language model writes; the chat rendered it as literal asterisks, so the
 * answer looked broken in exactly the place it was being most useful.
 *
 * Hand-written rather than a library for two reasons. It renders to React
 * elements and never touches `dangerouslySetInnerHTML`, so model output — which
 * is untrusted text that can quote a user, a headline, or a symbol name — has
 * no path to executing anything. And a general Markdown parser would also bring
 * images, links and raw HTML, none of which belong in an answer about someone's
 * money.
 *
 * Supported: headings, ordered and unordered lists, bold, italic, inline code,
 * paragraphs. Everything else renders as the plain text it already was.
 */

export function Markdown({ text }: { text: string }) {
  return <div className="space-y-2">{renderBlocks(text)}</div>;
}

/** A blank line separates blocks; a single newline inside one is a soft break. */
function renderBlocks(text: string): ReactNode[] {
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  return blocks.flatMap((block, i) => {
    const trimmed = block.trim();
    if (!trimmed) return [];
    return <Block key={i} text={trimmed} />;
  });
}

const HEADING = /^(#{1,4})\s+(.*)$/;
const ORDERED = /^(\d+)[.)]\s+(.*)$/;
const BULLET = /^[-*•]\s+(.*)$/;
/** Nested list items arrive indented; keep them visually subordinate. */
const INDENTED_BULLET = /^\s{2,}[-*•]\s+(.*)$/;

function Block({ text }: { text: string }) {
  const lines = text.split("\n");

  const heading = lines[0].match(HEADING);
  if (heading && lines.length === 1) {
    return (
      <p className="font-semibold text-foreground">{inline(heading[2])}</p>
    );
  }

  if (lines.every((l) => ORDERED.test(l.trim()) || INDENTED_BULLET.test(l))) {
    return <List lines={lines} ordered />;
  }
  if (lines.every((l) => BULLET.test(l.trim()) || INDENTED_BULLET.test(l))) {
    return <List lines={lines} />;
  }

  return (
    <p className="leading-relaxed">
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          {inline(line)}
        </Fragment>
      ))}
    </p>
  );
}

function List({ lines, ordered = false }: { lines: string[]; ordered?: boolean }) {
  const items: { text: string; nested: boolean }[] = [];

  for (const line of lines) {
    const nested = line.match(INDENTED_BULLET);
    if (nested) {
      // Attached to the item above rather than opening a list of its own: the
      // model uses indentation for detail lines ("Below EMA20 (1297)"), not for
      // a genuinely separate list.
      items.push({ text: nested[1], nested: true });
      continue;
    }
    const t = line.trim();
    const m = ordered ? t.match(ORDERED) : t.match(BULLET);
    if (m) items.push({ text: ordered ? m[2] : m[1], nested: false });
  }

  const Tag = ordered ? "ol" : "ul";
  let counter = 0;

  return (
    <Tag className="space-y-1">
      {items.map((item, i) => {
        if (!item.nested) counter += 1;
        return (
          <li
            key={i}
            className={`flex gap-2 leading-relaxed ${item.nested ? "ml-4" : ""}`}
          >
            <span className="text-muted-foreground shrink-0 font-mono text-[11px] mt-[1px]">
              {item.nested ? "·" : ordered ? `${counter}.` : "–"}
            </span>
            <span className="min-w-0">{inline(item.text)}</span>
          </li>
        );
      })}
    </Tag>
  );
}

/**
 * Bold, italic and inline code, in one pass.
 *
 * One regex with alternation rather than three sequential passes: running them
 * in sequence would let a replacement's output be re-parsed by the next, so
 * `**a * b**` came out mangled.
 */
const INLINE = /(\*\*[^*]+\*\*|`[^`]+`|(?<![*\w])\*[^*\n]+\*(?!\w))/g;

function inline(text: string): ReactNode[] {
  const parts = text.split(INLINE).filter((p) => p !== undefined && p !== "");

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={i} className="font-mono text-[0.92em] bg-secondary border border-border px-1 py-px">
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
