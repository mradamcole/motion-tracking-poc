import type { NormalizedLandmark } from '../types';
import { DetectorStatus, type DetectorResult, type Detector } from './types';

export interface InactivityDetectorConfig {
  duration: number; // ms, default 30000
}

// Dead-zone threshold per landmark — movement below this is treated as 0
const DEAD_ZONE = 0.002;

// Total movement score threshold for "meaningful movement"
const MOVEMENT_THRESHOLD = 0.01;

/**
 * Inactivity Detector
 *
 * Uses an elapsed-time accumulator that pauses during null frames.
 * Movement score: sum of Euclidean distances between current and
 * previous landmark positions, weighted by visibility.
 */
export class InactivityDetector implements Detector {
  private duration: number;
  private previousLandmarks: NormalizedLandmark[] | null = null;
  private lastUpdateTimestamp: number | null = null;
  private elapsedInactiveMs: number = 0;

  constructor(config: InactivityDetectorConfig) {
    this.duration = config.duration;
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

    if (movementScore >= MOVEMENT_THRESHOLD) {
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
      if (dist < DEAD_ZONE) continue;

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
