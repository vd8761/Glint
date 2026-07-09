/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useMemo, useRef, useState } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export interface History<T> {
  present: T;
  /** Change the present without recording an undo step. For drag frames. */
  update: (fn: (present: T) => T) => void;
  /** Change the present and record one undo step. For discrete edits. */
  commit: (fn: (present: T) => T) => void;
  /**
   * Record an undo step for a value captured earlier — the "before" of a drag
   * that was applied frame-by-frame with `update`. A no-op if nothing changed.
   */
  pushSnapshot: (snapshot: T) => void;
  /** Read the current present without subscribing. Safe inside event handlers. */
  peek: () => T;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}

/**
 * Undo/redo over an immutable document.
 *
 * The split between `update` and `commit` exists because a drag produces
 * hundreds of intermediate documents and exactly one undo step. The interaction
 * captures the document on pointerdown, calls `update` on every pointermove, and
 * hands the captured value to `pushSnapshot` on pointerup.
 */
export function useHistory<T>(initial: T, limit = 200): History<T> {
  const [state, setState] = useState<HistoryState<T>>({
    past: [],
    present: initial,
    future: [],
  });

  // Event handlers run outside render and would otherwise close over a stale
  // `present`. Everything below reads through this ref instead.
  const ref = useRef(state);
  ref.current = state;

  const update = useCallback((fn: (present: T) => T) => {
    setState((s) => {
      const present = fn(s.present);
      return present === s.present ? s : { ...s, present };
    });
  }, []);

  const commit = useCallback(
    (fn: (present: T) => T) => {
      setState((s) => {
        const present = fn(s.present);
        if (present === s.present) return s;
        return { past: [...s.past, s.present].slice(-limit), present, future: [] };
      });
    },
    [limit],
  );

  const pushSnapshot = useCallback(
    (snapshot: T) => {
      setState((s) => {
        if (snapshot === s.present) return s;
        return { past: [...s.past, snapshot].slice(-limit), present: s.present, future: [] };
      });
    },
    [limit],
  );

  const undo = useCallback(() => {
    setState((s) => {
      if (s.past.length === 0) return s;
      const present = s.past[s.past.length - 1];
      return {
        past: s.past.slice(0, -1),
        present,
        future: [s.present, ...s.future].slice(0, limit),
      };
    });
  }, [limit]);

  const redo = useCallback(() => {
    setState((s) => {
      if (s.future.length === 0) return s;
      return {
        past: [...s.past, s.present].slice(-limit),
        present: s.future[0],
        future: s.future.slice(1),
      };
    });
  }, [limit]);

  const peek = useCallback(() => ref.current.present, []);

  return useMemo(
    () => ({
      present: state.present,
      update,
      commit,
      pushSnapshot,
      peek,
      undo,
      redo,
      canUndo: state.past.length > 0,
      canRedo: state.future.length > 0,
    }),
    [state, update, commit, pushSnapshot, peek, undo, redo],
  );
}
