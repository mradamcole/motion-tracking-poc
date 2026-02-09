import { LANDMARK, type NormalizedLandmark } from '../types';
import { DetectorStatus, type DetectorResult, type Detector } from './types';

export interface FallDetectorConfig {
  holdDuration: number; // ms, default 2000
}

/**
 * Fall Detector
 *
 * Two conditions must be simultaneously true to count as "fallen posture":
 * 1. Shoulder-hip vertical distance collapsed: abs(shoulderMidY - hipMidY) < 0.05
 * 2. Bounding box is horizontal: width / height > 1.4
 *
 * State machine:
 * - BOTH met → start/continue confirmation timer
 * - EITHER not met → reset timer to 0
 * - OK: timer is 0
 * - WARNING: timer running but < holdDuration
 * - ALERT: timer >= holdDuration
 */
export class FallDetector implements Detector {
  private holdDuration: number;
  private fallenSince: number | null = null;

  constructor(config: FallDetectorConfig) {
    this.holdDuration = config.holdDuration;
  }

  update(landmarks: NormalizedLandmark[] | null, timestamp: number): DetectorResult {
    // null landmarks → can't evaluate posture → reset timer
    if (!landmarks) {
      this.fallenSince = null;
      return { status: DetectorStatus.OK, message: '' };
    }

    const isFallenPosture = this.checkFallenPosture(landmarks);

    if (!isFallenPosture) {
      this.fallenSince = null;
      return { status: DetectorStatus.OK, message: '' };
    }

    // Fallen posture detected
    if (this.fallenSince === null) {
      this.fallenSince = timestamp;
    }

    const elapsed = timestamp - this.fallenSince;

    if (elapsed >= this.holdDuration) {
      return {
        status: DetectorStatus.ALERT,
        message: `Fall detected (${(elapsed / 1000).toFixed(1)}s)`,
      };
    }

    return {
      status: DetectorStatus.WARNING,
      message: `Possible fall (${(elapsed / 1000).toFixed(1)}s)`,
    };
  }

  configure(config: Record<string, unknown>): void {
    if (typeof config.holdDuration === 'number') {
      this.holdDuration = config.holdDuration;
    }
  }

  reset(): void {
    this.fallenSince = null;
  }

  private checkFallenPosture(landmarks: NormalizedLandmark[]): boolean {
    // Condition 1: Shoulder-hip vertical distance collapsed
    const shoulderMidY = (landmarks[LANDMARK.LEFT_SHOULDER].y + landmarks[LANDMARK.RIGHT_SHOULDER].y) / 2;
    const hipMidY = (landmarks[LANDMARK.LEFT_HIP].y + landmarks[LANDMARK.RIGHT_HIP].y) / 2;
    const shoulderHipDist = Math.abs(shoulderMidY - hipMidY);

    if (shoulderHipDist >= 0.05) {
      return false;
    }

    // Condition 2: Bounding box is horizontal
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    for (const lm of landmarks) {
      if (lm.visibility < 0.5) continue;
      if (lm.x < minX) minX = lm.x;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.y > maxY) maxY = lm.y;
    }

    const width = maxX - minX;
    const height = maxY - minY;

    if (height <= 0) return false;

    return (width / height) > 1.4;
  }
}
