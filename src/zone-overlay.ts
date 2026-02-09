/**
 * Zone Overlay — manages the safe zone rectangle drawing and display.
 *
 * Owns the zone rect state. Handles mouse interaction for drawing.
 * The canvas is CSS-mirrored alongside the video, so offsetX/offsetY
 * from mouse events map directly to camera-space coordinates.
 */

import type { ZoneRect } from './types';
import { DetectorStatus } from './detectors/types';

let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let zoneRect: ZoneRect | null = null;
let currentStatus: DetectorStatus = DetectorStatus.OK;

// Drawing state
let isDrawing = false;
let drawStart: { x: number; y: number } | null = null;
let drawingModeActive = false;

// Callbacks
let onZoneChange: ((rect: ZoneRect | null) => void) | null = null;

export function initZoneOverlay(
  canvasEl: HTMLCanvasElement,
  onChange: (rect: ZoneRect | null) => void,
): void {
  canvas = canvasEl;
  ctx = canvasEl.getContext('2d')!;
  onZoneChange = onChange;

  canvasEl.addEventListener('mousedown', handleMouseDown);
  canvasEl.addEventListener('mousemove', handleMouseMove);
  canvasEl.addEventListener('mouseup', handleMouseUp);
}

export function setDrawingMode(active: boolean): void {
  drawingModeActive = active;
  if (canvas) {
    canvas.classList.toggle('drawing', active);
  }
}

export function getZoneRect(): ZoneRect | null {
  return zoneRect;
}

export function clearZone(): void {
  zoneRect = null;
  isDrawing = false;
  drawStart = null;
  onZoneChange?.(null);
  render();
}

export function updateZoneStatus(status: DetectorStatus): void {
  currentStatus = status;
  render();
}

function handleMouseDown(e: MouseEvent): void {
  if (!drawingModeActive || !canvas) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  drawStart = {
    x: e.offsetX / rect.width,
    y: e.offsetY / rect.height,
  };
  isDrawing = true;
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDrawing || !drawStart || !canvas) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const currentX = e.offsetX / rect.width;
  const currentY = e.offsetY / rect.height;

  // Preview
  renderPreview(drawStart.x, drawStart.y, currentX, currentY);
}

function handleMouseUp(e: MouseEvent): void {
  if (!isDrawing || !drawStart || !canvas) return;
  e.preventDefault();

  const rect = canvas.getBoundingClientRect();
  const endX = e.offsetX / rect.width;
  const endY = e.offsetY / rect.height;

  // Normalize rect so x1 <= x2, y1 <= y2
  zoneRect = {
    x1: Math.min(drawStart.x, endX),
    y1: Math.min(drawStart.y, endY),
    x2: Math.max(drawStart.x, endX),
    y2: Math.max(drawStart.y, endY),
  };

  isDrawing = false;
  drawStart = null;

  onZoneChange?.(zoneRect);
  render();
}

function renderPreview(x1: number, y1: number, x2: number, y2: number): void {
  if (!canvas || !ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  const px1 = x1 * canvas.width;
  const py1 = y1 * canvas.height;
  const pw = (x2 - x1) * canvas.width;
  const ph = (y2 - y1) * canvas.height;

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(px1, py1, pw, ph);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
  ctx.fillRect(px1, py1, pw, ph);

  ctx.restore();
}

function render(): void {
  if (!canvas || !ctx) return;

  // Sync canvas resolution
  const parent = canvas.parentElement;
  if (parent) {
    const { clientWidth, clientHeight } = parent;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!zoneRect) return;

  ctx.save();

  const x = zoneRect.x1 * canvas.width;
  const y = zoneRect.y1 * canvas.height;
  const w = (zoneRect.x2 - zoneRect.x1) * canvas.width;
  const h = (zoneRect.y2 - zoneRect.y1) * canvas.height;

  if (currentStatus === DetectorStatus.ALERT) {
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    ctx.fillStyle = 'rgba(239, 68, 68, 0.12)';
  } else if (currentStatus === DetectorStatus.WARNING) {
    ctx.strokeStyle = 'rgba(234, 179, 8, 0.9)';
    ctx.fillStyle = 'rgba(234, 179, 8, 0.08)';
  } else {
    ctx.strokeStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.fillStyle = 'rgba(34, 197, 94, 0.06)';
  }

  ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  ctx.restore();
}
