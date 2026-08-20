import type { ReactNode } from "react";

// Shared styling for every link this module (or a caller) renders — the
// article's own attribution links (source/source_link/url/category_link) use
// the same class as in-content auto-linked URLs so they read as one visual
// language.
export const ARTICLE_LINK_CLASS =
  "text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary transition-colors";

// Everything below builds an array of plain strings and React elements from
// user/scraper-supplied text — it never touches innerHTML, so it's XSS-safe
// by construction (React escapes string children automatically; there is no
// dangerouslySetInnerHTML anywhere in this file).

const URL_RE = /\bhttps?:\/\/[^\s<>"')\]]+/g;

const MONTHS = "January|February|March|April|May|June|July|August|September|October|November|December";
const DATE_RE = new RegExp(
  `\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+(?:${MONTHS})(?:\\s+\\d{4})?|(?:${MONTHS})\\s+\\d{1,2}(?:st|nd|rd|th)?,?\\s*\\d{0,4}|\\d{4}-\\d{2}-\\d{2})\\b`,
  "gi",
);

// e.g. "₹163 crore", "₹1,20,000"
const CURRENCY_RE = /₹\s?[\d,]+(?:\.\d+)?\s?(?:crore|lakh|million|billion|cr)?\b/gi;
// e.g. "2×25 kV", "160 km/h", "45%"
const MEASURE_RE = /\b\d+(?:\.\d+)?\s?(?:[×x]\s?\d+(?:\.\d+)?)?\s?(?:kV|MW|GW|km\/h|kms?|kg|%)\b/g;

// Common sentence-leading words that would otherwise produce false-positive
// "proper noun" matches like "The Government" — reject any match starting
// with one of these instead of highlighting it.
const LEADING_STOPWORDS = new Set([
  "The", "This", "That", "These", "Those", "It", "In", "On", "At", "A", "An",
  "And", "But", "For", "With", "From", "As", "Of", "Is", "Are", "Was", "Were",
  "He", "She", "They", "We", "You", "I", "Its", "His", "Her", "Their", "Will",
]);
// 2–4 consecutive Title-Case words — a conservative stand-in for proper
// nouns/organization names (e.g. "Indian Railways", "South Central Railway").
const PROPER_NOUN_RE = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g;

const MAX_MARKS_PER_PARAGRAPH = 5;

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type Segment = { text: string; kind: "text" | "link" | "mark" };

/** Splits `text` on every match of `re`, tagging matches with `kind`. An
 *  optional `accept` predicate can veto a match (left as plain text) without
 *  breaking the scan. */
function splitByRegex(text: string, re: RegExp, kind: Segment["kind"], accept?: (match: string) => boolean): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  re.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const matched = m[0];
    if (matched.length === 0) {
      re.lastIndex++;
      continue;
    }
    if (accept && !accept(matched)) continue;
    if (m.index > last) out.push({ text: text.slice(last, m.index), kind: "text" });
    out.push({ text: matched, kind });
    last = m.index + matched.length;
  }
  if (last < text.length) out.push({ text: text.slice(last), kind: "text" });
  return out;
}

function highlightPlainSegments(segments: Segment[], patterns: Array<{ re: RegExp; accept?: (m: string) => boolean }>, budget: { left: number }): Segment[] {
  let current = segments;
  for (const { re, accept } of patterns) {
    if (budget.left <= 0) break;
    const next: Segment[] = [];
    for (const seg of current) {
      if (seg.kind !== "text" || budget.left <= 0) {
        next.push(seg);
        continue;
      }
      const parts = splitByRegex(seg.text, re, "mark", accept);
      for (const part of parts) {
        if (part.kind === "mark" && budget.left > 0) {
          next.push(part);
          budget.left--;
        } else if (part.kind === "mark") {
          next.push({ ...part, kind: "text" });
        } else {
          next.push(part);
        }
      }
    }
    current = next;
  }
  return current;
}

/**
 * Renders one paragraph of plain-text article content with:
 *  - raw http(s) URLs always auto-linked (not subject to the highlight cap —
 *    this is link correctness, not decoration)
 *  - a conservative, capped set of highlighted terms per paragraph: the
 *    article's own tags[], currency/measurement values, dates, and
 *    proper-noun-looking phrases.
 */
export function renderHighlightedParagraph(text: string, tags: string[] = []): ReactNode[] {
  const urlSplit = splitByRegex(text, new RegExp(URL_RE), "link");

  const patterns: Array<{ re: RegExp; accept?: (m: string) => boolean }> = [];
  const validTags = (tags ?? []).filter((t) => typeof t === "string" && t.trim().length > 1);
  if (validTags.length > 0) {
    const alt = validTags.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|");
    patterns.push({ re: new RegExp(`\\b(?:${alt})\\b`, "gi") });
  }
  patterns.push(
    { re: new RegExp(CURRENCY_RE) },
    { re: new RegExp(MEASURE_RE) },
    { re: new RegExp(DATE_RE) },
    { re: new RegExp(PROPER_NOUN_RE), accept: (m) => !LEADING_STOPWORDS.has(m.split(" ")[0]) },
  );

  const budget = { left: MAX_MARKS_PER_PARAGRAPH };
  const finalSegments: Segment[] = [];
  for (const seg of urlSplit) {
    if (seg.kind === "link") {
      finalSegments.push(seg);
      continue;
    }
    finalSegments.push(...highlightPlainSegments([seg], patterns, budget));
  }

  return finalSegments.map((seg, i) => {
    if (seg.kind === "link") {
      return (
        <a key={i} href={seg.text} target="_blank" rel="noopener noreferrer" className={ARTICLE_LINK_CLASS}>
          {seg.text}
        </a>
      );
    }
    if (seg.kind === "mark") {
      return (
        <mark key={i} className="bg-accent-purple/10 text-foreground font-semibold rounded px-0.5">
          {seg.text}
        </mark>
      );
    }
    return seg.text;
  });
}

/** Splits raw article content (plain text, no HTML/markdown) into paragraphs. */
export function splitIntoParagraphs(content: string): string[] {
  return (content ?? "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
