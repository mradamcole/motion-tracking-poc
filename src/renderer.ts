/**
 * Skeleton renderer — draws pose landmarks and connections on the
 * skeleton canvas each frame using MediaPipe's DrawingUtils.
 */

import { PoseLandmarker, type DrawingUtils } from '@mediapipe/tasks-vision';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let utils: DrawingUtils | null = null;

// ============================================================
// Bounding box smoothing (EMA filter per person)
// ============================================================

interface SmoothedBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const smoothedBoxes: Map<number, SmoothedBox> = new Map();

// How aggressively to smooth: 0 = frozen, 1 = no smoothing.
// 0.15 gives a nice stable-but-responsive feel.
const SMOOTHING_FACTOR = 0.15;

// If all four edges move less than this (normalized coords), hold the box still.
const BOX_DEAD_ZONE = 0.004;

// Per-person color palette
const PERSON_COLORS = [
  { stroke: 'rgba(59, 130, 246, 0.9)',  fill: 'rgba(59, 130, 246, 0.4)',  line: 'rgba(59, 130, 246, 0.6)',  box: 'rgba(59, 130, 246, 0.7)',  label: '#3b82f6' },   // blue
  { stroke: 'rgba(168, 85, 247, 0.9)',   fill: 'rgba(168, 85, 247, 0.4)',  line: 'rgba(168, 85, 247, 0.6)',  box: 'rgba(168, 85, 247, 0.7)',  label: '#a855f7' },   // purple
  { stroke: 'rgba(34, 197, 94, 0.9)',    fill: 'rgba(34, 197, 94, 0.4)',   line: 'rgba(34, 197, 94, 0.6)',   box: 'rgba(34, 197, 94, 0.7)',   label: '#22c55e' },   // green
  { stroke: 'rgba(245, 158, 11, 0.9)',   fill: 'rgba(245, 158, 11, 0.4)',  line: 'rgba(245, 158, 11, 0.6)',  box: 'rgba(245, 158, 11, 0.7)',  label: '#f59e0b' },   // amber
  { stroke: 'rgba(236, 72, 153, 0.9)',   fill: 'rgba(236, 72, 153, 0.4)', line: 'rgba(236, 72, 153, 0.6)', box: 'rgba(236, 72, 153, 0.7)', label: '#ec4899' },   // pink
];

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

  for (let i = 0; i < landmarks.length; i++) {
    const poseLandmarks = landmarks[i];
    const colors = PERSON_COLORS[i % PERSON_COLORS.length];

    // Draw connections (lines)
    utils.drawConnectors(
      poseLandmarks,
      PoseLandmarker.POSE_CONNECTIONS,
      { color: colors.line, lineWidth: 2 },
    );

    // Draw landmarks (dots)
    utils.drawLandmarks(poseLandmarks, {
      color: colors.stroke,
      fillColor: colors.fill,
      radius: (data) => {
        const z = data.from?.z ?? 0;
        return lerp(z, -0.15, 0.1, 5, 1);
      },
    });

    // Draw bounding box + label
    drawBoundingBox(ctx, poseLandmarks, i, colors, canvas.width, canvas.height);
  }

  ctx.restore();
}

export function clearSkeleton(): void {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  smoothedBoxes.clear();
}

/** Draw a bounding box around a person with a "Person #N" label. */
function drawBoundingBox(
  ctx: CanvasRenderingContext2D,
  poseLandmarks: Array<{ x: number; y: number; z: number; visibility: number }>,
  index: number,
  colors: typeof PERSON_COLORS[number],
  canvasW: number,
  canvasH: number,
): void {
  let rawMinX = Infinity, rawMaxX = -Infinity;
  let rawMinY = Infinity, rawMaxY = -Infinity;

  for (const lm of poseLandmarks) {
    if (lm.visibility < 0.5) continue;
    if (lm.x < rawMinX) rawMinX = lm.x;
    if (lm.x > rawMaxX) rawMaxX = lm.x;
    if (lm.y < rawMinY) rawMinY = lm.y;
    if (lm.y > rawMaxY) rawMaxY = lm.y;
  }

  if (!isFinite(rawMinX)) return; // no visible landmarks

  // Add padding (~8%)
  const padX = (rawMaxX - rawMinX) * 0.08;
  const padY = (rawMaxY - rawMinY) * 0.08;
  rawMinX = Math.max(0, rawMinX - padX);
  rawMinY = Math.max(0, rawMinY - padY);
  rawMaxX = Math.min(1, rawMaxX + padX);
  rawMaxY = Math.min(1, rawMaxY + padY);

  // Smooth the bounding box with EMA + dead zone
  const prev = smoothedBoxes.get(index);
  let box: SmoothedBox;

  if (!prev) {
    // First frame for this person — snap immediately
    box = { minX: rawMinX, minY: rawMinY, maxX: rawMaxX, maxY: rawMaxY };
  } else {
    // Check if movement is within dead zone (hold still if so)
    const maxDelta = Math.max(
      Math.abs(rawMinX - prev.minX),
      Math.abs(rawMinY - prev.minY),
      Math.abs(rawMaxX - prev.maxX),
      Math.abs(rawMaxY - prev.maxY),
    );

    if (maxDelta < BOX_DEAD_ZONE) {
      box = prev; // no update — hold position
    } else {
      // EMA: smoothed = prev + factor * (raw - prev)
      box = {
        minX: prev.minX + SMOOTHING_FACTOR * (rawMinX - prev.minX),
        minY: prev.minY + SMOOTHING_FACTOR * (rawMinY - prev.minY),
        maxX: prev.maxX + SMOOTHING_FACTOR * (rawMaxX - prev.maxX),
        maxY: prev.maxY + SMOOTHING_FACTOR * (rawMaxY - prev.maxY),
      };
    }
  }

  smoothedBoxes.set(index, box);

  const px = box.minX * canvasW;
  const py = box.minY * canvasH;
  const pw = (box.maxX - box.minX) * canvasW;
  const ph = (box.maxY - box.minY) * canvasH;

  // Box
  ctx.strokeStyle = colors.box;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(px, py, pw, ph);
  ctx.setLineDash([]);

  // Label background + text
  // The canvas is CSS-mirrored (rotateY(180deg)) to match the webcam mirror.
  // Pre-flip the label so the CSS mirror cancels out and text reads correctly.
  const label = `Person #${index + 1}`;
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, sans-serif';
  const textMetrics = ctx.measureText(label);
  const textH = 18;
  const textPadX = 6;
  const labelW = textMetrics.width + textPadX * 2;

  ctx.save();
  const labelCenterX = px + labelW / 2;
  ctx.translate(labelCenterX, 0);
  ctx.scale(-1, 1);
  ctx.translate(-labelCenterX, 0);

  ctx.fillStyle = colors.box;
  ctx.beginPath();
  roundRect(ctx, px, py - textH - 2, labelW, textH, 4);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.fillText(label, px + textPadX, py - 6);
  ctx.restore();
}

/** Canvas roundRect polyfill for label backgrounds. */
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
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
