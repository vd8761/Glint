/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * The camera: an infinite, pannable, zoomable plane with exactly one page on it.
 */

import { clamp } from './geometry';
import type { Box, Vec, Viewport } from './types';

export const MIN_ZOOM = 0.05;
export const MAX_ZOOM = 16;

/** Zoom stops for the `+` / `-` buttons and Ctrl+`+` / Ctrl+`-`. */
export const ZOOM_STOPS = [0.05, 0.1, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 8, 16];

export const IDENTITY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export const pageToScreen = (vp: Viewport, p: Vec): Vec => ({
  x: p.x * vp.zoom + vp.x,
  y: p.y * vp.zoom + vp.y,
});

export const screenToPage = (vp: Viewport, s: Vec): Vec => ({
  x: (s.x - vp.x) / vp.zoom,
  y: (s.y - vp.y) / vp.zoom,
});

export const panBy = (vp: Viewport, dx: number, dy: number): Viewport => ({
  ...vp,
  x: vp.x + dx,
  y: vp.y + dy,
});

/**
 * Zoom to `nextZoom` while keeping whatever page point is under `focus` (a point
 * in the viewport element's own coordinates) pinned exactly under `focus`.
 *
 * This is the whole trick behind Ctrl+scroll feeling right: solve
 * `focus = page * z' + offset'` for `offset'`, having read `page` off the *old*
 * transform.
 */
export function zoomAt(vp: Viewport, focus: Vec, nextZoom: number): Viewport {
  const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
  const page = screenToPage(vp, focus);
  return { zoom, x: focus.x - page.x * zoom, y: focus.y - page.y * zoom };
}

/** Multiplicative zoom, e.g. `zoomBy(vp, focus, 1.1)` for a 10% zoom in. */
export const zoomBy = (vp: Viewport, focus: Vec, factor: number): Viewport =>
  zoomAt(vp, focus, vp.zoom * factor);

/** The next stop above (`+1`) or below (`-1`) the current zoom. */
export function nextZoomStop(zoom: number, direction: 1 | -1): number {
  if (direction === 1) {
    return ZOOM_STOPS.find((s) => s > zoom + 1e-6) ?? MAX_ZOOM;
  }
  const below = ZOOM_STOPS.filter((s) => s < zoom - 1e-6);
  return below.length > 0 ? below[below.length - 1] : MIN_ZOOM;
}

/**
 * A wheel event's `deltaY` is in pixels, lines, or pages depending on the device
 * and browser. Normalize to something pixel-ish before using it.
 */
export function normalizeWheelDelta(delta: number, deltaMode: number): number {
  if (deltaMode === 1) return delta * 16; // DOM_DELTA_LINE
  if (deltaMode === 2) return delta * 400; // DOM_DELTA_PAGE
  return delta;
}

/**
 * Wheel delta -> zoom factor. Exponential so that zooming feels the same at 10%
 * as at 400%, and so that N notches in and N notches out returns you exactly
 * where you started.
 *
 * Clamped because a single flung trackpad event can carry a delta of several
 * hundred, which would otherwise teleport the camera.
 */
export function wheelZoomFactor(normalizedDeltaY: number, sensitivity = 0.0018): number {
  return Math.exp(-clamp(normalizedDeltaY, -400, 400) * sensitivity);
}

/** Center `rect` in a `width` × `height` viewport, scaled to fit inside `padding`. */
export function fitToRect(
  rect: Box,
  width: number,
  height: number,
  padding = 48,
  maxZoom = 1,
): Viewport {
  if (rect.width <= 0 || rect.height <= 0 || width <= 0 || height <= 0) {
    return IDENTITY_VIEWPORT;
  }
  const usableW = Math.max(1, width - padding * 2);
  const usableH = Math.max(1, height - padding * 2);
  const zoom = clamp(
    Math.min(usableW / rect.width, usableH / rect.height),
    MIN_ZOOM,
    Math.min(MAX_ZOOM, maxZoom),
  );
  return {
    zoom,
    x: width / 2 - (rect.x + rect.width / 2) * zoom,
    y: height / 2 - (rect.y + rect.height / 2) * zoom,
  };
}

/** Recenter on `rect` without changing the zoom. */
export function centerOn(rect: Box, width: number, height: number, zoom: number): Viewport {
  return {
    zoom,
    x: width / 2 - (rect.x + rect.width / 2) * zoom,
    y: height / 2 - (rect.y + rect.height / 2) * zoom,
  };
}
