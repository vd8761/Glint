import type { RichTextRun, TextElement } from '../types';

export type RichTextStylePatch = Partial<
  Pick<RichTextRun, 'color' | 'fontWeight' | 'fontStyle' | 'textDecoration'>
>;

const STYLE_KEYS: Array<keyof RichTextStylePatch> = ['color', 'fontWeight', 'fontStyle', 'textDecoration'];

const sameStyle = (a: RichTextRun, b: RichTextRun) =>
  STYLE_KEYS.every((key) => a[key] === b[key]);

export const plainTextFromRuns = (runs: RichTextRun[] | undefined) =>
  (runs ?? []).map((run) => run.text).join('');

export const normalizeRichTextRuns = (element: Pick<TextElement, 'text' | 'richText'>): RichTextRun[] => {
  if (element.richText?.length && plainTextFromRuns(element.richText) === element.text) {
    return element.richText;
  }
  return [{ text: element.text ?? '' }];
};

export const mergeRichTextRuns = (runs: RichTextRun[]) => {
  const merged: RichTextRun[] = [];

  for (const run of runs) {
    if (!run.text) continue;
    const previous = merged[merged.length - 1];
    if (previous && sameStyle(previous, run)) {
      previous.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }

  return merged;
};

const clampRange = (start: number, end: number, length: number) => ({
  start: Math.max(0, Math.min(length, Math.min(start, end))),
  end: Math.max(0, Math.min(length, Math.max(start, end))),
});

export const applyRichTextStyleToRange = (
  element: Pick<TextElement, 'text' | 'richText'>,
  start: number,
  end: number,
  patch: RichTextStylePatch,
): RichTextRun[] => {
  const range = clampRange(start, end, element.text.length);
  const runs = normalizeRichTextRuns(element);
  if (range.start === range.end) return runs;

  const nextRuns: RichTextRun[] = [];
  let cursor = 0;

  for (const run of runs) {
    const runStart = cursor;
    const runEnd = cursor + run.text.length;
    const overlapStart = Math.max(runStart, range.start);
    const overlapEnd = Math.min(runEnd, range.end);

    if (overlapStart >= overlapEnd) {
      nextRuns.push(run);
    } else {
      const beforeLength = overlapStart - runStart;
      const selectedLength = overlapEnd - overlapStart;

      if (beforeLength > 0) {
        nextRuns.push({ ...run, text: run.text.slice(0, beforeLength) });
      }

      nextRuns.push({
        ...run,
        ...patch,
        text: run.text.slice(beforeLength, beforeLength + selectedLength),
      });

      if (overlapEnd < runEnd) {
        nextRuns.push({ ...run, text: run.text.slice(beforeLength + selectedLength) });
      }
    }

    cursor = runEnd;
  }

  return mergeRichTextRuns(nextRuns);
};

/**
 * Re-map existing runs onto edited text so inline styling survives typing.
 *
 * The sidebar edits text through a plain `<textarea>`, so all we get is the old
 * and new strings. We keep the styling of the unchanged common prefix and
 * suffix, and let the inserted slice inherit the style at the edit boundary.
 * This replaces the old behaviour of dropping every run the moment the text
 * changed, which wiped mixed colors/bold/italic on the first keystroke.
 */
export const remapRichTextRuns = (
  previous: RichTextRun[] | undefined,
  oldText: string,
  newText: string,
): RichTextRun[] => {
  const runs =
    previous?.length && plainTextFromRuns(previous) === oldText
      ? previous
      : [{ text: oldText }];

  if (oldText === newText) return mergeRichTextRuns(runs.map((run) => ({ ...run })));

  // Per-character style of the old text.
  const styleAt: RichTextStylePatch[] = [];
  for (const run of runs) {
    const { text, ...style } = run;
    for (let i = 0; i < text.length; i += 1) styleAt.push(style);
  }

  // Longest common prefix, then longest common suffix that doesn't overlap it.
  let prefix = 0;
  const maxPrefix = Math.min(oldText.length, newText.length);
  while (prefix < maxPrefix && oldText[prefix] === newText[prefix]) prefix += 1;

  let suffix = 0;
  const maxSuffix = Math.min(oldText.length - prefix, newText.length - prefix);
  while (
    suffix < maxSuffix &&
    oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const insertedLength = newText.length - prefix - suffix;
  // Inserted text inherits the char just before the edit, else the char just after.
  const boundaryStyle: RichTextStylePatch =
    styleAt[prefix - 1] ?? styleAt[oldText.length - suffix] ?? {};

  const nextStyles: RichTextStylePatch[] = [];
  for (let i = 0; i < prefix; i += 1) nextStyles.push(styleAt[i] ?? {});
  for (let i = 0; i < insertedLength; i += 1) nextStyles.push(boundaryStyle);
  for (let i = oldText.length - suffix; i < oldText.length; i += 1) nextStyles.push(styleAt[i] ?? {});

  const rebuilt: RichTextRun[] = [];
  for (let i = 0; i < newText.length; i += 1) {
    rebuilt.push({ text: newText[i], ...nextStyles[i] });
  }

  return mergeRichTextRuns(rebuilt);
};

/** True when a run carries any styling that differs from the element defaults. */
export const runHasStyle = (run: RichTextRun): boolean =>
  Boolean(
    run.color ||
      (run.fontWeight && run.fontWeight !== 'normal') ||
      (run.fontStyle && run.fontStyle !== 'normal') ||
      (run.textDecoration && run.textDecoration !== 'none'),
  );

export const replacePlaceholders = (text: string, replacements: Record<string, string>) => {
  let value = text;
  for (const [key, replacement] of Object.entries(replacements)) {
    value = value.replaceAll(`{{${key}}}`, replacement);
  }
  return value;
};

export const resolveRichTextRuns = (
  element: Pick<TextElement, 'text' | 'richText'>,
  replacements: Record<string, string>,
) =>
  normalizeRichTextRuns(element).map((run) => ({
    ...run,
    text: replacePlaceholders(run.text, replacements),
  }));
