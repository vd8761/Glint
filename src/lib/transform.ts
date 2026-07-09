/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Shared CSS transform composition for positioned canvas elements.
 *
 * Every element (text, image, redaction, logo, signature, seal) is anchored by
 * its centre with `translate(-50%, -50%)` and then optionally rotated and/or
 * mirrored. Keeping the composition in one place guarantees the editor canvas,
 * the public certificate viewer, and the template thumbnail all render an
 * element's rotation and flip identically.
 *
 * Order matters: centre first, then rotate, then scale. Scale (the flip) is
 * applied last so a mirrored element still rotates about its own centre.
 */

/** The rotate/scale part of the transform, without the centring translate. */
export function elementTransformSuffix(rotation?: number, flipH?: boolean, flipV?: boolean): string {
  const parts: string[] = [];
  if (rotation) parts.push(`rotate(${rotation}deg)`);
  if (flipH || flipV) parts.push(`scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`);
  return parts.join(' ');
}

/** The full resting transform for an element centred at its `left`/`top` point. */
export function elementTransform(rotation?: number, flipH?: boolean, flipV?: boolean): string {
  const suffix = elementTransformSuffix(rotation, flipH, flipV);
  return suffix ? `translate(-50%, -50%) ${suffix}` : 'translate(-50%, -50%)';
}
