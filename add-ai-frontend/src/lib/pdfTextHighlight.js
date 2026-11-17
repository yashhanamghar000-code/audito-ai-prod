/**
 * REPLACE your existing src/lib/pdfTextHighlight.js with this file.
 *
 * v2 — sliding-window fuzzy word matching instead of raw substring search.
 *
 * Why the old version missed matches: it did an exact substring search
 * after only collapsing whitespace, so ANY difference between the backend
 * snippet and the PDF's extracted text layer (different punctuation
 * spacing, a hyphen pdf.js splits differently, quote-character encoding,
 * a stray table pipe character) caused zero matches. This version:
 *   1. Tokenizes both sides into words, stripping punctuation entirely
 *      (not just whitespace) so "report," and "report" compare equal.
 *   2. Slides a window the length of the snippet across the page's word
 *      list and scores each position by how many words agree — so it
 *      tolerates a few mismatched/missing words (OCR noise, hyphenation)
 *      instead of requiring a perfect match.
 *   3. Picks the best-scoring window above a similarity threshold, and
 *      highlights exactly the text items that window covers.
 */

const MIN_MATCH_SCORE = 0.55; // weighted fraction of snippet words that must be found

function normalizeWord(word) {
  return word.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function tokenize(text) {
  return text.split(/\s+/).map(normalizeWord).filter(Boolean);
}

/**
 * Builds a flat, page-ordered word list from pdf.js text items, where
 * each word remembers which item it came from.
 */
function buildPageWordIndex(textContent) {
  const words = [];
  textContent.items.forEach((item, itemIndex) => {
    const itemWords = tokenize(item.str || "");
    for (const w of itemWords) {
      words.push({ word: w, itemIndex });
    }
  });
  return words;
}

/**
 * Finds the best-matching region of the page for the given snippet.
 *
 * Scoring is order-tolerant: for each candidate window of page words we
 * count how many snippet words appear in it (as a multiset), plus a small
 * bonus for words that are also in the right relative position. This keeps
 * working when pdf.js emits text items in a different order than the chunk
 * text (tables, columns), when a word is split or dropped, or when
 * punctuation differs. The window is then trimmed to the first/last matched
 * word so only the cited passage is highlighted, not padding around it.
 *
 * Returns the sorted item indices to highlight, or [] if nothing scores
 * above MIN_MATCH_SCORE.
 */
export function findMatchingItemIndices(textContent, snippet) {
  if (!snippet || !textContent?.items?.length) return [];

  const snippetWords = tokenize(snippet);
  if (snippetWords.length < 2) return [];

  const pageWords = buildPageWordIndex(textContent);
  if (pageWords.length === 0) return [];

  const need = new Map();
  for (const w of snippetWords) need.set(w, (need.get(w) || 0) + 1);

  const n = snippetWords.length;
  const windowSize = Math.min(pageWords.length, Math.ceil(n * 1.5) + 2);

  let bestScore = 0;
  let bestStart = -1;

  for (let start = 0; start + windowSize <= pageWords.length || start === 0; start++) {
    const have = new Map();
    let overlap = 0;
    const end = Math.min(start + windowSize, pageWords.length);
    for (let i = start; i < end; i++) {
      const w = pageWords[i].word;
      const wanted = need.get(w) || 0;
      const got = have.get(w) || 0;
      if (got < wanted) overlap++;
      have.set(w, got + 1);
    }
    // Small bonus for the words that are also in the same relative order.
    let ordered = 0;
    for (let i = 0; i < n && start + i < pageWords.length; i++) {
      if (pageWords[start + i].word === snippetWords[i]) ordered++;
    }
    const score = overlap / n + 0.15 * (ordered / n);
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
    if (start + windowSize >= pageWords.length) break;
  }

  if (bestStart === -1 || bestScore < MIN_MATCH_SCORE) return [];

  // Trim to the tightest span that holds most of the matched words, so a stray
  // coincidental word (e.g. "deposit" in the line above a table) does not drag
  // the highlight outwards.
  const end = Math.min(bestStart + windowSize, pageWords.length);
  const remaining = new Map(need);
  const matchedPositions = [];
  for (let i = bestStart; i < end; i++) {
    const left = remaining.get(pageWords[i].word) || 0;
    if (left > 0) {
      remaining.set(pageWords[i].word, left - 1);
      matchedPositions.push(i);
    }
  }
  if (matchedPositions.length === 0) return [];

  const keep = Math.max(1, Math.ceil(matchedPositions.length * 0.8));
  let first = matchedPositions[0];
  let last = matchedPositions[matchedPositions.length - 1];
  let bestSpan = Infinity;
  for (let k = 0; k + keep - 1 < matchedPositions.length; k++) {
    const span = matchedPositions[k + keep - 1] - matchedPositions[k];
    if (span < bestSpan) {
      bestSpan = span;
      first = matchedPositions[k];
      last = matchedPositions[k + keep - 1];
    }
  }

  const itemIndices = new Set();
  for (let i = first; i <= last; i++) itemIndices.add(pageWords[i].itemIndex);
  return Array.from(itemIndices).sort((a, b) => a - b);
}

/**
 * Converts matched item indices into absolute-positioned CSS boxes drawn
 * on top of the page's canvas, using the same viewport transform pdf.js
 * used to render that canvas. Adjacent items on the SAME line are merged
 * into one continuous highlight bar instead of one box per word, so the
 * result reads as "this line is highlighted" rather than a row of
 * disconnected chips.
 */
export function computeHighlightRects(textContent, itemIndices, viewport) {
  const boxes = itemIndices
    .map((idx) => textContent.items[idx])
    .filter(Boolean)
    .map((item) => {
      const tx = viewport.transform;
      const m = item.transform;
      const combined = [
        m[0] * tx[0] + m[1] * tx[2],
        m[0] * tx[1] + m[1] * tx[3],
        m[2] * tx[0] + m[3] * tx[2],
        m[2] * tx[1] + m[3] * tx[3],
        m[4] * tx[0] + m[5] * tx[2] + tx[4],
        m[4] * tx[1] + m[5] * tx[3] + tx[5],
      ];
      const fontHeight = Math.hypot(combined[2], combined[3]);
      const width = item.width * Math.hypot(tx[0], tx[1]);
      return {
        left: combined[4],
        top: combined[5] - fontHeight,
        width: Math.max(width, 2),
        height: fontHeight * 1.15,
      };
    });

  if (boxes.length === 0) return [];

  // Merge boxes that sit on (roughly) the same line into single bars —
  // sort by vertical position, group by overlapping top/height, then
  // union each group's horizontal extent.
  boxes.sort((a, b) => a.top - b.top || a.left - b.left);

  const lineGroups = [];
  const LINE_TOLERANCE = 4; // px

  for (const box of boxes) {
    const lastGroup = lineGroups[lineGroups.length - 1];
    if (lastGroup && Math.abs(lastGroup.top - box.top) <= LINE_TOLERANCE) {
      lastGroup.left = Math.min(lastGroup.left, box.left);
      lastGroup.right = Math.max(lastGroup.right, box.left + box.width);
      lastGroup.bottom = Math.max(lastGroup.bottom, box.top + box.height);
      lastGroup.top = Math.min(lastGroup.top, box.top);
    } else {
      lineGroups.push({
        top: box.top,
        left: box.left,
        right: box.left + box.width,
        bottom: box.top + box.height,
      });
    }
  }

  return lineGroups.map((g) => ({
    left: g.left,
    top: g.top,
    width: g.right - g.left,
    height: g.bottom - g.top,
  }));
}
