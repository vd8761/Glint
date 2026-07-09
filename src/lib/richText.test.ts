import { describe, expect, it } from 'vitest';
import {
  applyRichTextStyleToRange,
  normalizeRichTextRuns,
  plainTextFromRuns,
  remapRichTextRuns,
  resolveRichTextRuns,
  runHasStyle,
} from './richText';

describe('rich text helpers', () => {
  it('splits runs around a selected range and preserves the plain text', () => {
    const runs = applyRichTextStyleToRange({ text: 'Certificate', richText: undefined }, 4, 8, {
      fontWeight: 'bold',
      color: '#ff0000',
    });

    expect(runs).toEqual([
      { text: 'Cert' },
      { text: 'ific', fontWeight: 'bold', color: '#ff0000' },
      { text: 'ate' },
    ]);
    expect(plainTextFromRuns(runs)).toBe('Certificate');
  });

  it('uses plain text when stale rich text does not match', () => {
    const runs = normalizeRichTextRuns({
      text: 'Updated',
      richText: [{ text: 'Old', fontStyle: 'italic' }],
    });

    expect(runs).toEqual([{ text: 'Updated' }]);
  });

  it('resolves placeholders without losing run styling', () => {
    const runs = resolveRichTextRuns(
      {
        text: 'Hello {{name}}',
        richText: [
          { text: 'Hello ' },
          { text: '{{name}}', fontStyle: 'italic' },
        ],
      },
      { name: 'Asha' },
    );

    expect(runs).toEqual([{ text: 'Hello ' }, { text: 'Asha', fontStyle: 'italic' }]);
  });

  it('keeps inline styling when text is edited in the middle', () => {
    // "Hello World" with "World" bold; user types "Brave " before "World".
    const runs = remapRichTextRuns(
      [{ text: 'Hello ' }, { text: 'World', fontWeight: 'bold' }],
      'Hello World',
      'Hello Brave World',
    );

    expect(runs).toEqual([
      { text: 'Hello Brave ' },
      { text: 'World', fontWeight: 'bold' },
    ]);
    expect(plainTextFromRuns(runs)).toBe('Hello Brave World');
  });

  it('keeps both colors when a character is inserted at the boundary', () => {
    const runs = remapRichTextRuns(
      [{ text: 'Red', color: '#ff0000' }, { text: 'Blue', color: '#0000ff' }],
      'RedBlue',
      'RedXBlue',
    );

    // The inserted "X" inherits the preceding (red) run; "Blue" stays blue.
    expect(runs).toEqual([
      { text: 'RedX', color: '#ff0000' },
      { text: 'Blue', color: '#0000ff' },
    ]);
  });

  it('drops runs entirely when the styled text is deleted', () => {
    const runs = remapRichTextRuns(
      [{ text: 'Hello ' }, { text: 'World', fontWeight: 'bold' }],
      'Hello World',
      'Hi',
    );
    expect(runs.some(runHasStyle)).toBe(false);
  });
});
