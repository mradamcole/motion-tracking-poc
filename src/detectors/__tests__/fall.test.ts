import { describe, it, expect, beforeEach } from 'vitest';
import { DetectorStatus } from '../types';
import { FallDetector } from '../fall';
import { standingPose, fallenPose, sittingPose } from '../../test/mock-landmarks';

describe('FallDetector', () => {
  let detector: FallDetector;

  beforeEach(() => {
    detector = new FallDetector({ holdDuration: 2000 });
  });

  // F1: Standing posture returns OK
  it('F1: standing posture returns OK', () => {
    const result = detector.update(standingPose(), 0);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // F2: Sitting posture does NOT false-positive
  it('F2: sitting posture does NOT false-positive over 5s', () => {
    for (let t = 0; t <= 5000; t += 500) {
      const result = detector.update(sittingPose(), t);
      expect(result.status).toBe(DetectorStatus.OK);
    }
  });

  // F3: Fallen posture before confirmation hold → WARNING
  it('F3: fallen posture before confirmation hold returns WARNING', () => {
    detector.update(fallenPose(), 0);
    const r500 = detector.update(fallenPose(), 500);
    const r1000 = detector.update(fallenPose(), 1000);

    expect(r500.status).toBe(DetectorStatus.WARNING);
    expect(r1000.status).toBe(DetectorStatus.WARNING);
  });

  // F4: Fallen posture after confirmation hold → ALERT
  it('F4: fallen posture after confirmation hold returns ALERT', () => {
    let lastResult = detector.update(fallenPose(), 0);
    for (let t = 500; t <= 2500; t += 500) {
      lastResult = detector.update(fallenPose(), t);
    }
    expect(lastResult.status).toBe(DetectorStatus.ALERT);
  });

  // F5: Brief fallen posture then recovery resets timer
  it('F5: brief fallen posture then recovery resets timer', () => {
    detector.update(standingPose(), 0);
    const r500 = detector.update(fallenPose(), 500);
    const r1000 = detector.update(fallenPose(), 1000);
    const r1500 = detector.update(standingPose(), 1500);

    expect(r500.status).toBe(DetectorStatus.WARNING);
    expect(r1000.status).toBe(DetectorStatus.WARNING);
    expect(r1500.status).toBe(DetectorStatus.OK);
  });

  // F6: null landmarks reset confirmation timer
  it('F6: null landmarks reset confirmation timer', () => {
    detector.update(fallenPose(), 0);
    const r500 = detector.update(fallenPose(), 500);
    expect(r500.status).toBe(DetectorStatus.WARNING);

    // null resets timer
    detector.update(null, 1000);

    // Fallen posture returns — timer restarts from 0
    const r1500 = detector.update(fallenPose(), 1500);
    expect(r1500.status).toBe(DetectorStatus.WARNING);

    // Only 1s since restart — should NOT be ALERT yet
    const r2500 = detector.update(fallenPose(), 2500);
    expect(r2500.status).toBe(DetectorStatus.WARNING);

    // Now at 2s since restart (t=1500 to t=3500) — should be ALERT
    const r3500 = detector.update(fallenPose(), 3500);
    expect(r3500.status).toBe(DetectorStatus.ALERT);
  });

  // F7: Custom hold duration is respected
  it('F7: custom hold duration is respected', () => {
    const fastDetector = new FallDetector({ holdDuration: 1000 });

    fastDetector.update(fallenPose(), 0);
    const r500 = fastDetector.update(fallenPose(), 500);
    expect(r500.status).toBe(DetectorStatus.WARNING);

    const r1000 = fastDetector.update(fallenPose(), 1000);
    expect(r1000.status).toBe(DetectorStatus.ALERT);

    const r1500 = fastDetector.update(fallenPose(), 1500);
    expect(r1500.status).toBe(DetectorStatus.ALERT);
  });
});
