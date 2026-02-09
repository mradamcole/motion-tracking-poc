import { LANDMARK, type NormalizedLandmark, type ZoneRect } from '../types';
import { DetectorStatus, type DetectorResult, type Detector } from './types';

export interface ZoneDetectorConfig {
  breachDuration: number; // ms, default 3000
}

/**
 * Zone Boundary Detector
 *
 * Tracks how long the person's hip midpoint has been outside the safe zone.
 * Zone rect is set via setZoneRect() by main.ts when the overlay changes.
 * null landmarks with a zone set are treated as "outside".
 * Boundary is inclusive (on the edge = inside).
 */
export class ZoneDetector implements Detector {
  private breachDuration: number;
  private zoneRect: ZoneRect | null = null;
  private outsideElapsedMs: number = 0;
  private lastUpdateTimestamp: number | null = null;

  constructor(config: ZoneDetectorConfig) {
    this.breachDuration = config.breachDuration;
  }

  setZoneRect(rect: ZoneRect | null): void {
    this.zoneRect = rect;
    this.outsideElapsedMs = 0;
  }

  update(landmarks: NormalizedLandmark[] | null, timestamp: number): DetectorResult {
    // No zone set → always OK
    if (!this.zoneRect) {
      this.lastUpdateTimestamp = timestamp;
      return { status: DetectorStatus.OK, message: 'No zone set' };
    }

    const delta = this.lastUpdateTimestamp !== null
      ? timestamp - this.lastUpdateTimestamp
      : 0;

    const isInside = landmarks ? this.checkInside(landmarks) : false;

    if (isInside) {
      this.outsideElapsedMs = 0;
    } else {
      this.outsideElapsedMs += delta;
    }

    this.lastUpdateTimestamp = timestamp;

    if (isInside || this.outsideElapsedMs <= 0) {
      return { status: DetectorStatus.OK, message: 'Inside zone' };
    }

    const seconds = (this.outsideElapsedMs / 1000).toFixed(1);

    if (this.outsideElapsedMs >= this.breachDuration) {
      return {
        status: DetectorStatus.ALERT,
        message: `Outside zone for ${seconds}s`,
      };
    }

    return {
      status: DetectorStatus.WARNING,
      message: `Leaving zone (${seconds}s)`,
    };
  }

  configure(config: Record<string, unknown>): void {
    if (typeof config.breachDuration === 'number') {
      this.breachDuration = config.breachDuration;
    }
  }

  reset(): void {
    this.outsideElapsedMs = 0;
    this.lastUpdateTimestamp = null;
  }

  private checkInside(landmarks: NormalizedLandmark[]): boolean {
    if (!this.zoneRect) return true;

    // Hip midpoint
    const hipX = (landmarks[LANDMARK.LEFT_HIP].x + landmarks[LANDMARK.RIGHT_HIP].x) / 2;
    const hipY = (landmarks[LANDMARK.LEFT_HIP].y + landmarks[LANDMARK.RIGHT_HIP].y) / 2;

    // Inclusive boundary check
    return (
      hipX >= this.zoneRect.x1 &&
      hipX <= this.zoneRect.x2 &&
      hipY >= this.zoneRect.y1 &&
      hipY <= this.zoneRect.y2
    );
  }
}
