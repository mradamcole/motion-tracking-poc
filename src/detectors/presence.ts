import type { NormalizedLandmark } from '../types';
import { DetectorStatus, type DetectorResult, type Detector } from './types';

export interface PresenceDetectorConfig {
  timeout: number; // ms, default 10000
}

/**
 * Person Presence Detector
 *
 * Uses an elapsed-time accumulator for absence tracking.
 * When landmarks are null, accumulates absence time.
 * When landmarks return, resets the timer.
 */
export class PresenceDetector implements Detector {
  private timeout: number;
  private absenceElapsedMs: number = 0;
  private lastUpdateTimestamp: number | null = null;

  constructor(config: PresenceDetectorConfig) {
    this.timeout = config.timeout;
  }

  update(landmarks: NormalizedLandmark[] | null, timestamp: number): DetectorResult {
    const delta = this.lastUpdateTimestamp !== null
      ? timestamp - this.lastUpdateTimestamp
      : 0;

    this.lastUpdateTimestamp = timestamp;

    if (landmarks) {
      // Person detected → reset absence
      this.absenceElapsedMs = 0;
      return { status: DetectorStatus.OK, message: 'Person visible' };
    }

    // No person detected → accumulate absence
    this.absenceElapsedMs += delta;

    const seconds = Math.floor(this.absenceElapsedMs / 1000);

    if (this.absenceElapsedMs >= this.timeout) {
      return {
        status: DetectorStatus.ALERT,
        message: `Not seen for ${seconds}s`,
      };
    }

    if (this.absenceElapsedMs > 0) {
      return {
        status: DetectorStatus.WARNING,
        message: `Not seen for ${seconds}s`,
      };
    }

    return { status: DetectorStatus.OK, message: '' };
  }

  configure(config: Record<string, unknown>): void {
    if (typeof config.timeout === 'number') {
      this.timeout = config.timeout;
    }
  }

  reset(): void {
    this.absenceElapsedMs = 0;
    this.lastUpdateTimestamp = null;
  }
}
