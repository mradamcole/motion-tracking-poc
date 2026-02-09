/**
 * Skeleton renderer — draws pose landmarks and connections on the
 * skeleton canvas each frame using MediaPipe's DrawingUtils.
 */

import { PoseLandmarker, type DrawingUtils } from '@mediapipe/tasks-vision';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let utils: DrawingUtils | null = null;

export function initRenderer(
  canvasEl: HTMLCanvasElement,
  drawingUtils: DrawingUtils,
): void {
  canvas = canvasEl;
  ctx = canvasEl.getContext('2d')!;
  utils = drawingUtils;
}

/**
 * Draw skeleton overlay for the current frame.
 * landmarks: array of arrays of landmarks (one per detected pose).
 */
export function drawSkeleton(
  landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>>,
  videoWidth: number,
  videoHeight: number,
): void {
  if (!canvas || !ctx || !utils) return;

  // Sync canvas resolution with video
  if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
    canvas.width = videoWidth;
    canvas.height = videoHeight;
  }

  ctx.save();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const poseLandmarks of landmarks) {
    // Draw connections first (lines)
    utils.drawConnectors(
      poseLandmarks,
      PoseLandmarker.POSE_CONNECTIONS,
      { color: 'rgba(59, 130, 246, 0.6)', lineWidth: 2 },
    );

    // Draw landmarks (dots)
    utils.drawLandmarks(poseLandmarks, {
      color: 'rgba(59, 130, 246, 0.9)',
      fillColor: 'rgba(59, 130, 246, 0.4)',
      radius: (data) => {
        // Scale radius by depth
        const z = data.from?.z ?? 0;
        return lerp(z, -0.15, 0.1, 5, 1);
      },
    });
  }

  ctx.restore();
}

export function clearSkeleton(): void {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

/** Linear interpolation clamped to [min, max] output range. */
function lerp(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const t = Math.max(0, Math.min(1, (value - inMin) / (inMax - inMin)));
  return outMin + t * (outMax - outMin);
}
