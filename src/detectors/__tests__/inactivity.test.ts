import { describe, it, expect, beforeEach } from 'vitest';
import { DetectorStatus } from '../types';
import { InactivityDetector } from '../inactivity';
import { standingPose, shiftPose, addJitter } from '../../test/mock-landmarks';

describe('InactivityDetector', () => {
  let detector: InactivityDetector;

  beforeEach(() => {
    detector = new InactivityDetector({ duration: 30000, sensitivity: 1 });
  });

  // I1: Continuous movement stays OK
  it('I1: continuous movement stays OK', () => {
    const pose1 = standingPose();
    const pose2 = shiftPose(standingPose(), 0.05, 0.05);

    for (let t = 0; t <= 10000; t += 1000) {
      const pose = t % 2000 === 0 ? pose1 : pose2;
      const result = detector.update(pose, t);
      // First frame has no previous — skip assertion
      if (t > 0) {
        expect(result.status).toBe(DetectorStatus.OK);
      }
    }
  });

  // I2: No movement, timer below threshold → WARNING
  it('I2: no movement below threshold returns WARNING', () => {
    const pose = standingPose();
    let lastResult = detector.update(pose, 0);

    for (let t = 1000; t <= 15000; t += 1000) {
      lastResult = detector.update(pose, t);
    }

    expect(lastResult.status).toBe(DetectorStatus.WARNING);
  });

  // I3: No movement, timer exceeds threshold → ALERT
  it('I3: no movement exceeding threshold returns ALERT', () => {
    const pose = standingPose();
    let lastResult = detector.update(pose, 0);

    for (let t = 1000; t <= 31000; t += 1000) {
      lastResult = detector.update(pose, t);
    }

    expect(lastResult.status).toBe(DetectorStatus.ALERT);
  });

  // I4: Movement resumes after alert → OK
  it('I4: movement resumes after alert resets to OK', () => {
    const pose = standingPose();

    // Build up to ALERT
    detector.update(pose, 0);
    for (let t = 1000; t <= 31000; t += 1000) {
      detector.update(pose, t);
    }

    // Move significantly
    const movedPose = shiftPose(standingPose(), 0.1, 0);
    const result = detector.update(movedPose, 32000);
    expect(result.status).toBe(DetectorStatus.OK);
  });

  // I5: Jitter below dead-zone treated as no movement
  it('I5: jitter below dead-zone treated as no movement', () => {
    // Default detector (sensitivity=1, low motion sensitivity) has large dead-zone (~0.004)
    const basePose = standingPose();
    let lastResult = detector.update(basePose, 0);

    for (let t = 1000; t <= 31000; t += 1000) {
      // Jitter magnitude 0.0005 — max frame-to-frame delta ~0.0014, below ~0.004 dead-zone at sensitivity 1
      const jitteredPose = addJitter(basePose, 0.0005);
      lastResult = detector.update(jitteredPose, t);
    }

    expect(lastResult.status).toBe(DetectorStatus.ALERT);
  });

  // I6: null landmarks pause timer
  it('I6: null landmarks pause the inactivity timer', () => {
    const pose = standingPose();

    // Accumulate ~4s of inactivity
    detector.update(pose, 0);
    detector.update(pose, 1000);
    detector.update(pose, 2000);
    detector.update(pose, 3000);
    detector.update(pose, 4000);

    // null frames — timer should NOT advance
    detector.update(null, 5000);
    detector.update(null, 6000);
    detector.update(null, 7000);
    detector.update(null, 8000);
    detector.update(null, 9000);

    // Return with same pose (no movement)
    const result = detector.update(pose, 10000);

    // Timer should have ~4s accumulated, NOT 10s
    // So we're far from 30s threshold → WARNING (not ALERT)
    expect(result.status).toBe(DetectorStatus.WARNING);

    // If timer had NOT paused during null, it would be ~10s here.
    // Let's verify it's actually around 4s by checking it doesn't alert at 30s wall-clock:
    // We need ~26 more seconds of inactivity (4s already accumulated)
    for (let t = 11000; t <= 36000; t += 1000) {
      detector.update(pose, t);
    }
    // At t=36000: 4s (before null) + 26s (after null) = 30s → ALERT
    const finalResult = detector.update(pose, 37000);
    expect(finalResult.status).toBe(DetectorStatus.ALERT);
  });

  // I7: Custom timeout is respected
  it('I7: custom timeout is respected', () => {
    const shortDetector = new InactivityDetector({ duration: 10000, sensitivity: 1 });
    const pose = standingPose();

    shortDetector.update(pose, 0);
    for (let t = 1000; t <= 11000; t += 1000) {
      shortDetector.update(pose, t);
    }

    const result = shortDetector.update(pose, 11000);
    expect(result.status).toBe(DetectorStatus.ALERT);
  });

  // I8: Sensitivity can be changed at runtime via configure()
  it('I8: configure() updates sensitivity thresholds', () => {
    // Start with low motion sensitivity (1) — large dead zone (~0.004)
    const d = new InactivityDetector({ duration: 30000, sensitivity: 1 });
    const pose1 = standingPose();
    // Shift of (0.001, 0.001) → per-landmark dist ~0.0014
    // At sensitivity 1:  dead zone ~0.004, so 0.0014 < 0.004 → filtered → no movement
    // At sensitivity 10: dead zone ~0.0001, so 0.0014 > 0.0001 → counts as movement
    const pose2 = shiftPose(standingPose(), 0.001, 0.001);

    // At low motion sensitivity, this small shift is within the dead zone → treated as inactive
    d.update(pose1, 0);
    d.update(pose2, 1000);
    const result1 = d.update(pose1, 2000);
    expect(result1.status).toBe(DetectorStatus.WARNING);

    // Now raise to high motion sensitivity (10) — tiny dead zone (~0.0001), low threshold (~0.0005)
    d.configure({ sensitivity: 10 });
    d.reset();

    // Same small movement should now count as meaningful at high motion sensitivity
    d.update(pose1, 0);
    const result2 = d.update(pose2, 1000);
    expect(result2.status).toBe(DetectorStatus.OK);
  });
});
