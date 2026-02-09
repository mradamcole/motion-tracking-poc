import { describe, it, expect, beforeEach } from 'vitest';
import { DetectorStatus } from '../types';
import { PresenceDetector } from '../presence';
import { standingPose } from '../../test/mock-landmarks';

describe('PresenceDetector', () => {
  let detector: PresenceDetector;

  beforeEach(() => {
    detector = new PresenceDetector({ timeout: 10000 });
  });

  // P1: Landmarks present returns OK
  it('P1: landmarks present returns OK', () => {
    const result = detector.update(standingPose(), 0);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // P2: null landmarks < 10s → WARNING with message
  it('P2: null landmarks under timeout returns WARNING with time message', () => {
    detector.update(standingPose(), 0);

    let lastResult = detector.update(null, 1000);
    for (let t = 2000; t <= 8000; t += 1000) {
      lastResult = detector.update(null, t);
    }

    expect(lastResult.status).toBe(DetectorStatus.WARNING);
    expect(lastResult.message).toMatch(/\d+s/); // contains seconds
  });

  // P3: null landmarks >= 10s → ALERT
  it('P3: null landmarks over timeout returns ALERT', () => {
    detector.update(standingPose(), 0);

    let lastResult = detector.update(null, 1000);
    for (let t = 2000; t <= 12000; t += 1000) {
      lastResult = detector.update(null, t);
    }

    expect(lastResult.status).toBe(DetectorStatus.ALERT);
  });

  // P4: Landmarks return after absence → OK
  it('P4: landmarks return after absence resets to OK', () => {
    detector.update(standingPose(), 0);

    // Go absent until ALERT
    for (let t = 1000; t <= 12000; t += 1000) {
      detector.update(null, t);
    }

    // Return
    const result = detector.update(standingPose(), 13000);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // P5: Custom timeout is respected
  it('P5: custom timeout is respected', () => {
    const fastDetector = new PresenceDetector({ timeout: 5000 });

    fastDetector.update(standingPose(), 0);
    fastDetector.update(null, 1000);
    fastDetector.update(null, 2000);
    fastDetector.update(null, 3000);
    fastDetector.update(null, 4000);
    fastDetector.update(null, 5000);

    const result = fastDetector.update(null, 6000);
    expect(result.status).toBe(DetectorStatus.ALERT);
  });

  // P6: Intermittent detection resets timer
  it('P6: intermittent detection resets absence timer', () => {
    detector.update(standingPose(), 0);

    // Go absent
    detector.update(null, 5000);

    // Return — resets timer
    detector.update(standingPose(), 8000);

    // Go absent again
    for (let t = 9000; t <= 17000; t += 1000) {
      detector.update(null, t);
    }
    // At t=17000: 8s of absence since last seen at t=8000 → WARNING
    const warningResult = detector.update(null, 17000);
    expect(warningResult.status).toBe(DetectorStatus.WARNING);

    // At t=18000: 9s of absence → still WARNING
    // At t=19000: 10s of absence → ALERT (10s since accumulation restarted at t=9000)
    const alertResult = detector.update(null, 18000);
    expect(alertResult.status).toBe(DetectorStatus.ALERT);
  });
});
