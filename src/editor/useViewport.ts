/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { Box, Vec, Viewport } from './types';
import {
  IDENTITY_VIEWPORT,
  MAX_ZOOM,
  centerOn,
  fitToRect,
  nextZoomStop,
  normalizeWheelDelta,
  panBy,
  screenToPage,
  wheelZoomFactor,
  zoomAt,
  zoomBy,
} from './viewport';

export interface ViewportController {
  containerRef: React.RefObject<HTMLDivElement | null>;
  viewport: Viewport;
  /** Live size of the scroll container, tracked with a ResizeObserver. */
  size: { width: number; height: number };
  zoomToFit: () => void;
  zoomToBox: (box: Box, maxZoom?: number) => void;
  /** Zoom to an absolute level, holding the container center fixed. */
  zoomTo: (zoom: number) => void;
  stepZoom: (direction: 1 | -1) => void;
  panBy: (dx: number, dy: number) => void;
  /** Convert a pointer event's client coordinates into page coordinates. */
  clientToPage: (client: { clientX: number; clientY: number }) => Vec;
}

/**
 * The camera and everything that drives it: wheel, trackpad, resize.
 *
 * `content` is the box the camera considers "the whole drawing" — the page —
 * used for the initial fit and for the Fit command.
 */
export function useViewport(content: Box): ViewportController {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewport, setViewport] = useState<Viewport>(IDENTITY_VIEWPORT);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // Read by the wheel listener, which is attached once and must not close over
  // stale props.
  const contentRef = useRef(content);
  contentRef.current = content;
  const sizeRef = useRef(size);
  sizeRef.current = size;

  /** Cheap and always current: the container's screen-space origin. */
  const originOf = useCallback((): Vec => {
    const rect = containerRef.current?.getBoundingClientRect();
    return { x: rect?.left ?? 0, y: rect?.top ?? 0 };
  }, []);

  const clientToPage = useCallback(
    (client: { clientX: number; clientY: number }): Vec => {
      const origin = originOf();
      return screenToPage(viewport, {
        x: client.clientX - origin.x,
        y: client.clientY - origin.y,
      });
    },
    [viewport, originOf],
  );

  const zoomToBox = useCallback((box: Box, maxZoom = MAX_ZOOM) => {
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;
    setViewport(fitToRect(box, width, height, 64, maxZoom));
  }, []);

  const zoomToFit = useCallback(() => {
    const { width, height } = sizeRef.current;
    if (width === 0 || height === 0) return;
    setViewport(fitToRect(contentRef.current, width, height, 64, 1));
  }, []);

  const zoomTo = useCallback((zoom: number) => {
    const { width, height } = sizeRef.current;
    setViewport((vp) => zoomAt(vp, { x: width / 2, y: height / 2 }, zoom));
  }, []);

  const stepZoom = useCallback((direction: 1 | -1) => {
    const { width, height } = sizeRef.current;
    setViewport((vp) => zoomAt(vp, { x: width / 2, y: height / 2 }, nextZoomStop(vp.zoom, direction)));
  }, []);

  const pan = useCallback((dx: number, dy: number) => {
    setViewport((vp) => panBy(vp, dx, dy));
  }, []);

  // Track the container's size. `useLayoutEffect` so the first measure lands
  // before paint and the page never flashes at the wrong zoom.
  const fittedRef = useRef(false);
  const prevSizeRef = useRef<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
    });
    observer.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (size.width === 0 || size.height === 0) return;

    if (!fittedRef.current) {
      fittedRef.current = true;
      prevSizeRef.current = size;
      setViewport(fitToRect(contentRef.current, size.width, size.height, 64, 1));
      return;
    }

    // A resize should not slide the drawing around: keep whatever page point sat
    // at the container's center pinned there. This is what makes the editor feel
    // stable when a sidebar opens or the window is dragged narrower.
    const prev = prevSizeRef.current;
    prevSizeRef.current = size;
    if (!prev || (prev.width === size.width && prev.height === size.height)) return;

    setViewport((vp) => {
      const centerPage = screenToPage(vp, { x: prev.width / 2, y: prev.height / 2 });
      return centerOn(
        { x: centerPage.x, y: centerPage.y, width: 0, height: 0 },
        size.width,
        size.height,
        vp.zoom,
      );
    });
  }, [size]);

  // The wheel. Attached natively rather than through React's onWheel because
  // React registers wheel listeners as passive, and a passive listener cannot
  // call preventDefault() — which we must, or Ctrl+scroll triggers the browser's
  // own page zoom instead of ours.
  //
  // It lives on the container, so it only fires while the pointer is over the
  // canvas. Scrolling anywhere else on the page behaves normally.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();

      const rect = el.getBoundingClientRect();
      const focus = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      const dx = normalizeWheelDelta(event.deltaX, event.deltaMode);
      const dy = normalizeWheelDelta(event.deltaY, event.deltaMode);

      // Trackpad pinch arrives as a wheel event with ctrlKey set, so pinch-to-zoom
      // falls out of this branch for free.
      if (event.ctrlKey || event.metaKey) {
        setViewport((vp) => zoomBy(vp, focus, wheelZoomFactor(dy)));
      } else if (event.shiftKey && dx === 0) {
        setViewport((vp) => panBy(vp, -dy, 0));
      } else {
        setViewport((vp) => panBy(vp, -dx, -dy));
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  return {
    containerRef,
    viewport,
    size,
    zoomToFit,
    zoomToBox,
    zoomTo,
    stepZoom,
    panBy: pan,
    clientToPage,
  };
}
