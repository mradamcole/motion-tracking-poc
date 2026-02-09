import { describe, it, expect, beforeEach } from 'vitest';
import { DetectorStatus } from '../types';
import { ZoneDetector } from '../zone';
import { standingPose } from '../../test/mock-landmarks';
import type { ZoneRect } from '../../types';

const DEFAULT_ZONE: ZoneRect = { x1: 0.2, y1: 0.2, x2: 0.8, y2: 0.8 };

describe('ZoneDetector', () => {
  let detector: ZoneDetector;

  beforeEach(() => {
    detector = new ZoneDetector({ breachDuration: 3000 });
  });

  // Z1: No zone set returns OK
  it('Z1: no zone set returns OK', () => {
    // Zone is null by default
    const result = detector.update(standingPose(0.5, 0.5), 0);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // Z2: Person inside zone returns OK
  it('Z2: person inside zone returns OK', () => {
    detector.setZoneRect(DEFAULT_ZONE);
    const result = detector.update(standingPose(0.5, 0.5), 0);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // Z3: Person outside zone < 3s → WARNING
  it('Z3: person outside zone under breach duration returns WARNING', () => {
    detector.setZoneRect(DEFAULT_ZONE);

    detector.update(standingPose(0.1, 0.5), 0);
    const r1 = detector.update(standingPose(0.1, 0.5), 1000);
    const r2 = detector.update(standingPose(0.1, 0.5), 2000);

    expect(r1.status).toBe(DetectorStatus.WARNING);
    expect(r2.status).toBe(DetectorStatus.WARNING);
  });

  // Z4: Person outside zone >= 3s → ALERT
  it('Z4: person outside zone over breach duration returns ALERT', () => {
    detector.setZoneRect(DEFAULT_ZONE);

    detector.update(standingPose(0.1, 0.5), 0);
    detector.update(standingPose(0.1, 0.5), 1000);
    detector.update(standingPose(0.1, 0.5), 2000);
    const r3 = detector.update(standingPose(0.1, 0.5), 3000);
    const r4 = detector.update(standingPose(0.1, 0.5), 4000);

    expect(r3.status).toBe(DetectorStatus.ALERT);
    expect(r4.status).toBe(DetectorStatus.ALERT);
  });

  // Z5: Person returns inside zone resets timer
  it('Z5: person returning inside zone resets timer', () => {
    detector.setZoneRect(DEFAULT_ZONE);

    // Build up ALERT
    detector.update(standingPose(0.1, 0.5), 0);
    detector.update(standingPose(0.1, 0.5), 1000);
    detector.update(standingPose(0.1, 0.5), 2000);
    detector.update(standingPose(0.1, 0.5), 3000);
    detector.update(standingPose(0.1, 0.5), 4000);

    // Return inside
    const result = detector.update(standingPose(0.5, 0.5), 5000);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // Z6: null landmarks with zone set treated as outside
  it('Z6: null landmarks with zone set treated as outside', () => {
    detector.setZoneRect(DEFAULT_ZONE);

    detector.update(null, 0);
    detector.update(null, 1000);
    detector.update(null, 2000);
    const r3 = detector.update(null, 3000);
    const r4 = detector.update(null, 4000);

    expect(r3.status).toBe(DetectorStatus.ALERT);
    expect(r4.status).toBe(DetectorStatus.ALERT);
  });

  // Z7: Person on zone boundary is inside (inclusive)
  it('Z7: person on zone boundary is inside (inclusive)', () => {
    detector.setZoneRect(DEFAULT_ZONE);

    // Hip midpoint exactly at x1 boundary
    const result = detector.update(standingPose(0.2, 0.5), 0);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // Z8: Custom breach duration is respected
  it('Z8: custom breach duration is respected', () => {
    const fastDetector = new ZoneDetector({ breachDuration: 1000 });
    fastDetector.setZoneRect(DEFAULT_ZONE);

    fastDetector.update(standingPose(0.1, 0.5), 0);
    const r1 = fastDetector.update(standingPose(0.1, 0.5), 1000);
    const r1_5 = fastDetector.update(standingPose(0.1, 0.5), 1500);

    expect(r1.status).toBe(DetectorStatus.ALERT);
    expect(r1_5.status).toBe(DetectorStatus.ALERT);
  });
});
