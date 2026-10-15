import { SIZE } from '../config.js';

// All interaction distances remain in 480 × 800 world units.
export function renderFactor(width, height, dpr = 1, maxDimension = 4096) {
  const fit = Math.min(Math.max(1, width) / SIZE.width, Math.max(1, height) / SIZE.height);
  const requested = Math.ceil(fit * Math.min(2, dpr > 0 ? dpr : 1));
  const supported = Math.max(1, Math.floor(maxDimension / Math.max(SIZE.width, SIZE.height)));
  return Math.max(1, Math.min(4, supported, requested));
}
export function pointerToWorld(pointer, camera, out = {}) {
  return camera.getWorldPoint(pointer.x, pointer.y, out);
}
export function desktopRenderFactor(width, height, dpr = 1, maxDimension = 4096) {
  return Math.min(2, Math.max(1, dpr || 1), maxDimension / Math.max(1, width, height));
}
