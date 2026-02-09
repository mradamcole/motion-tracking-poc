import type { NormalizedLandmark } from '../types';

// ============================================================
// Detector Status & Result
// ============================================================

export enum DetectorStatus {
  OK = 'ok',
  WARNING = 'warning',
  ALERT = 'alert',
}

export interface DetectorResult {
  status: DetectorStatus;
  message: string;
}

// ============================================================
// Base Detector Interface
// All detectors share the same update() signature so main.ts
// can call them uniformly in the render loop.
// ============================================================

export interface Detector {
  /** Process a frame's landmarks (or null if no person detected). */
  update(landmarks: NormalizedLandmark[] | null, timestamp: number): DetectorResult;

  /** Update configuration at runtime (e.g., when user changes settings). */
  configure(config: Record<string, unknown>): void;

  /** Reset internal state (e.g., when camera restarts). */
  reset(): void;
}
