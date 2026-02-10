import type { NormalizedLandmark } from '../types';
import { DetectorStatus, type DetectorResult, type Detector } from './types';

export interface InactivityDetectorConfig {
  duration: number;      // ms, default 30000
  sensitivity?: number;  // 1-10, default 1
}

// Sensitivity range boundaries (linear interpolation from 1 to 10)
const SENSITIVITY_MIN = 1;
const SENSITIVITY_MAX = 10;

// "Motion Sensitivity" scale:
//   Low  (1)  → large thresholds → ignores small movements / noise
//   High (10) → small thresholds → picks up subtle movements
const DEAD_ZONE_AT_LOW = 0.004;          // sensitivity=1
const DEAD_ZONE_AT_HIGH = 0.0001;        // sensitivity=10

const MOVEMENT_THRESHOLD_AT_LOW = 0.02;  // sensitivity=1
const MOVEMENT_THRESHOLD_AT_HIGH = 0.0005; // sensitivity=10

/** Linearly interpolate from low→high end based on sensitivity (1-10). */
function lerp(atLow: number, atHigh: number, sensitivity: number): number {
  const t = (sensitivity - SENSITIVITY_MIN) / (SENSITIVITY_MAX - SENSITIVITY_MIN);
  return atLow + t * (atHigh - atLow);
}

/**
 * Inactivity Detector
 *
 * Uses an elapsed-time accumulator that pauses during null frames.
 * Movement score: sum of Euclidean distances between current and
 * previous landmark positions, weighted by visibility.
 */
export class InactivityDetector implements Detector {
  private duration: number;
  private deadZone: number;
  private movementThreshold: number;
  private previousLandmarks: NormalizedLandmark[] | null = null;
  private lastUpdateTimestamp: number | null = null;
  private elapsedInactiveMs: number = 0;

  constructor(config: InactivityDetectorConfig) {
    this.duration = config.duration;
    const sensitivity = config.sensitivity ?? 1;
    this.deadZone = lerp(DEAD_ZONE_AT_LOW, DEAD_ZONE_AT_HIGH, sensitivity);
    this.movementThreshold = lerp(MOVEMENT_THRESHOLD_AT_LOW, MOVEMENT_THRESHOLD_AT_HIGH, sensitivity);
  }

  update(landmarks: NormalizedLandmark[] | null, timestamp: number): DetectorResult {
    // null landmarks → pause timer, store timestamp
    if (!landmarks) {
      this.lastUpdateTimestamp = timestamp;
      return this.buildResult();
    }

    // First frame ever — store landmarks, no movement computation
    if (this.previousLandmarks === null) {
      this.previousLandmarks = landmarks;
      this.lastUpdateTimestamp = timestamp;
      return { status: DetectorStatus.OK, message: '' };
    }

    // Compute movement score
    const movementScore = this.computeMovementScore(this.previousLandmarks, landmarks);

    // Compute time delta (safe against null lastUpdateTimestamp)
    const delta = this.lastUpdateTimestamp !== null
      ? timestamp - this.lastUpdateTimestamp
      : 0;

    if (movementScore >= this.movementThreshold) {
      // Meaningful movement → reset
      this.elapsedInactiveMs = 0;
    } else {
      // No meaningful movement → accumulate
      this.elapsedInactiveMs += delta;
    }

    this.previousLandmarks = landmarks;
    this.lastUpdateTimestamp = timestamp;

    return this.buildResult();
  }

  configure(config: Record<string, unknown>): void {
    if (typeof config.duration === 'number') {
      this.duration = config.duration;
    }
    if (typeof config.sensitivity === 'number') {
      this.deadZone = lerp(DEAD_ZONE_AT_LOW, DEAD_ZONE_AT_HIGH, config.sensitivity);
      this.movementThreshold = lerp(MOVEMENT_THRESHOLD_AT_LOW, MOVEMENT_THRESHOLD_AT_HIGH, config.sensitivity);
    }
  }

  reset(): void {
    this.previousLandmarks = null;
    this.lastUpdateTimestamp = null;
    this.elapsedInactiveMs = 0;
  }

  private computeMovementScore(
    prev: NormalizedLandmark[],
    curr: NormalizedLandmark[],
  ): number {
    let score = 0;

    for (let i = 0; i < prev.length && i < curr.length; i++) {
      const visibility = Math.min(prev[i].visibility, curr[i].visibility);
      if (visibility < 0.5) continue;

      const dx = curr[i].x - prev[i].x;
      const dy = curr[i].y - prev[i].y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Dead-zone filter
      if (dist < this.deadZone) continue;

      score += dist * visibility;
    }

    return score;
  }

  private buildResult(): DetectorResult {
    if (this.elapsedInactiveMs <= 0) {
      return { status: DetectorStatus.OK, message: '' };
    }

    const seconds = (this.elapsedInactiveMs / 1000).toFixed(0);

    if (this.elapsedInactiveMs >= this.duration) {
      return {
        status: DetectorStatus.ALERT,
        message: `Inactive for ${seconds}s`,
      };
    }

    return {
      status: DetectorStatus.WARNING,
      message: `No movement for ${seconds}s`,
    };
  }
}
