/**
 * Mock landmark factory for testing detectors.
 *
 * Each factory generates a 33-landmark array matching MediaPipe Pose output.
 * The `hipX`/`hipY` parameters position the hip midpoint (avg of landmarks 23+24).
 * All other landmarks are offset relative to the hips to form a plausible pose.
 */

import { LANDMARK, LANDMARK_COUNT, type NormalizedLandmark } from '../types';

// ============================================================
// Helper: create a single landmark
// ============================================================

function lm(x: number, y: number, z: number = 0, visibility: number = 0.99): NormalizedLandmark {
  return { x, y, z, visibility };
}

// ============================================================
// Standing Pose
// Upright person. Hips at (hipX, hipY), shoulders ~0.25 above.
// abs(shoulderMidY - hipMidY) ~= 0.25
// Bounding box: taller than wide
// ============================================================

export function standingPose(hipX: number = 0.5, hipY: number = 0.55): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(LANDMARK_COUNT);

  // Head / face — above shoulders
  const headY = hipY - 0.40;
  landmarks[LANDMARK.NOSE]            = lm(hipX, headY, -0.05);
  landmarks[LANDMARK.LEFT_EYE_INNER]  = lm(hipX - 0.01, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EYE]        = lm(hipX - 0.02, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EYE_OUTER]  = lm(hipX - 0.03, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_INNER] = lm(hipX + 0.01, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE]       = lm(hipX + 0.02, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_OUTER] = lm(hipX + 0.03, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EAR]        = lm(hipX - 0.05, headY - 0.01, 0.02);
  landmarks[LANDMARK.RIGHT_EAR]       = lm(hipX + 0.05, headY - 0.01, 0.02);
  landmarks[LANDMARK.MOUTH_LEFT]      = lm(hipX - 0.02, headY + 0.03, -0.04);
  landmarks[LANDMARK.MOUTH_RIGHT]     = lm(hipX + 0.02, headY + 0.03, -0.04);

  // Shoulders — ~0.25 above hips
  const shoulderY = hipY - 0.25;
  landmarks[LANDMARK.LEFT_SHOULDER]  = lm(hipX - 0.08, shoulderY, 0);
  landmarks[LANDMARK.RIGHT_SHOULDER] = lm(hipX + 0.08, shoulderY, 0);

  // Elbows — beside torso
  landmarks[LANDMARK.LEFT_ELBOW]  = lm(hipX - 0.10, hipY - 0.12, 0);
  landmarks[LANDMARK.RIGHT_ELBOW] = lm(hipX + 0.10, hipY - 0.12, 0);

  // Wrists — at hip level
  landmarks[LANDMARK.LEFT_WRIST]  = lm(hipX - 0.10, hipY, 0);
  landmarks[LANDMARK.RIGHT_WRIST] = lm(hipX + 0.10, hipY, 0);

  // Hands
  landmarks[LANDMARK.LEFT_PINKY]  = lm(hipX - 0.11, hipY + 0.02, 0);
  landmarks[LANDMARK.RIGHT_PINKY] = lm(hipX + 0.11, hipY + 0.02, 0);
  landmarks[LANDMARK.LEFT_INDEX]  = lm(hipX - 0.11, hipY + 0.03, 0);
  landmarks[LANDMARK.RIGHT_INDEX] = lm(hipX + 0.11, hipY + 0.03, 0);
  landmarks[LANDMARK.LEFT_THUMB]  = lm(hipX - 0.09, hipY + 0.01, 0);
  landmarks[LANDMARK.RIGHT_THUMB] = lm(hipX + 0.09, hipY + 0.01, 0);

  // Hips
  landmarks[LANDMARK.LEFT_HIP]  = lm(hipX - 0.06, hipY, 0);
  landmarks[LANDMARK.RIGHT_HIP] = lm(hipX + 0.06, hipY, 0);

  // Knees — below hips
  const kneeY = hipY + 0.18;
  landmarks[LANDMARK.LEFT_KNEE]  = lm(hipX - 0.05, kneeY, 0);
  landmarks[LANDMARK.RIGHT_KNEE] = lm(hipX + 0.05, kneeY, 0);

  // Ankles
  const ankleY = hipY + 0.35;
  landmarks[LANDMARK.LEFT_ANKLE]  = lm(hipX - 0.05, ankleY, 0);
  landmarks[LANDMARK.RIGHT_ANKLE] = lm(hipX + 0.05, ankleY, 0);

  // Feet
  landmarks[LANDMARK.LEFT_HEEL]       = lm(hipX - 0.05, ankleY + 0.02, 0.02);
  landmarks[LANDMARK.RIGHT_HEEL]      = lm(hipX + 0.05, ankleY + 0.02, 0.02);
  landmarks[LANDMARK.LEFT_FOOT_INDEX]  = lm(hipX - 0.05, ankleY + 0.04, -0.02);
  landmarks[LANDMARK.RIGHT_FOOT_INDEX] = lm(hipX + 0.05, ankleY + 0.04, -0.02);

  return landmarks;
}

// ============================================================
// Fallen Pose
// Person lying flat. Hips at (hipX, hipY), shoulders at nearly same y.
// abs(shoulderMidY - hipMidY) ~= 0.02
// Bounding box: wider than tall (width/height > 1.4)
// ============================================================

export function fallenPose(hipX: number = 0.5, hipY: number = 0.7): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(LANDMARK_COUNT);

  // Person is lying horizontally — spread along X axis, nearly constant Y
  const bodyY = hipY;
  const spread = 0.15; // half-width of horizontal body

  // Head — to the left
  landmarks[LANDMARK.NOSE]            = lm(hipX - spread - 0.15, bodyY - 0.01, -0.05);
  landmarks[LANDMARK.LEFT_EYE_INNER]  = lm(hipX - spread - 0.14, bodyY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EYE]        = lm(hipX - spread - 0.14, bodyY - 0.03, -0.05);
  landmarks[LANDMARK.LEFT_EYE_OUTER]  = lm(hipX - spread - 0.14, bodyY - 0.04, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_INNER] = lm(hipX - spread - 0.14, bodyY + 0.00, -0.05);
  landmarks[LANDMARK.RIGHT_EYE]       = lm(hipX - spread - 0.14, bodyY + 0.01, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_OUTER] = lm(hipX - spread - 0.14, bodyY + 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EAR]        = lm(hipX - spread - 0.16, bodyY - 0.03, 0.02);
  landmarks[LANDMARK.RIGHT_EAR]       = lm(hipX - spread - 0.16, bodyY + 0.01, 0.02);
  landmarks[LANDMARK.MOUTH_LEFT]      = lm(hipX - spread - 0.13, bodyY - 0.01, -0.04);
  landmarks[LANDMARK.MOUTH_RIGHT]     = lm(hipX - spread - 0.13, bodyY + 0.01, -0.04);

  // Shoulders — very close to hip Y (collapsed)
  landmarks[LANDMARK.LEFT_SHOULDER]  = lm(hipX - spread, bodyY - 0.01, 0);
  landmarks[LANDMARK.RIGHT_SHOULDER] = lm(hipX - spread, bodyY + 0.01, 0);

  // Elbows
  landmarks[LANDMARK.LEFT_ELBOW]  = lm(hipX - spread - 0.05, bodyY - 0.03, 0);
  landmarks[LANDMARK.RIGHT_ELBOW] = lm(hipX - spread - 0.05, bodyY + 0.03, 0);

  // Wrists
  landmarks[LANDMARK.LEFT_WRIST]  = lm(hipX - spread - 0.10, bodyY - 0.04, 0);
  landmarks[LANDMARK.RIGHT_WRIST] = lm(hipX - spread - 0.10, bodyY + 0.04, 0);

  // Hands
  landmarks[LANDMARK.LEFT_PINKY]  = lm(hipX - spread - 0.12, bodyY - 0.05, 0);
  landmarks[LANDMARK.RIGHT_PINKY] = lm(hipX + spread + 0.12, bodyY + 0.05, 0);
  landmarks[LANDMARK.LEFT_INDEX]  = lm(hipX - spread - 0.12, bodyY - 0.04, 0);
  landmarks[LANDMARK.RIGHT_INDEX] = lm(hipX + spread + 0.12, bodyY + 0.04, 0);
  landmarks[LANDMARK.LEFT_THUMB]  = lm(hipX - spread - 0.11, bodyY - 0.03, 0);
  landmarks[LANDMARK.RIGHT_THUMB] = lm(hipX + spread + 0.11, bodyY + 0.03, 0);

  // Hips — center of body
  landmarks[LANDMARK.LEFT_HIP]  = lm(hipX - 0.02, bodyY - 0.01, 0);
  landmarks[LANDMARK.RIGHT_HIP] = lm(hipX + 0.02, bodyY + 0.01, 0);

  // Knees — to the right
  landmarks[LANDMARK.LEFT_KNEE]  = lm(hipX + spread, bodyY - 0.01, 0);
  landmarks[LANDMARK.RIGHT_KNEE] = lm(hipX + spread, bodyY + 0.01, 0);

  // Ankles
  landmarks[LANDMARK.LEFT_ANKLE]  = lm(hipX + spread + 0.12, bodyY - 0.01, 0);
  landmarks[LANDMARK.RIGHT_ANKLE] = lm(hipX + spread + 0.12, bodyY + 0.01, 0);

  // Feet
  landmarks[LANDMARK.LEFT_HEEL]       = lm(hipX + spread + 0.14, bodyY - 0.01, 0.02);
  landmarks[LANDMARK.RIGHT_HEEL]      = lm(hipX + spread + 0.14, bodyY + 0.01, 0.02);
  landmarks[LANDMARK.LEFT_FOOT_INDEX]  = lm(hipX + spread + 0.16, bodyY - 0.01, -0.02);
  landmarks[LANDMARK.RIGHT_FOOT_INDEX] = lm(hipX + spread + 0.16, bodyY + 0.01, -0.02);

  return landmarks;
}

// ============================================================
// Sitting Pose
// Person sitting. Hips at (hipX, hipY), shoulders ~0.20 above.
// abs(shoulderMidY - hipMidY) ~= 0.20 (above fall threshold)
// Bounding box: wider than standing, but shoulder-hip distance large
// ============================================================

export function sittingPose(hipX: number = 0.5, hipY: number = 0.55): NormalizedLandmark[] {
  const landmarks: NormalizedLandmark[] = new Array(LANDMARK_COUNT);

  // Head
  const headY = hipY - 0.32;
  landmarks[LANDMARK.NOSE]            = lm(hipX, headY, -0.05);
  landmarks[LANDMARK.LEFT_EYE_INNER]  = lm(hipX - 0.01, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EYE]        = lm(hipX - 0.02, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EYE_OUTER]  = lm(hipX - 0.03, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_INNER] = lm(hipX + 0.01, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE]       = lm(hipX + 0.02, headY - 0.02, -0.05);
  landmarks[LANDMARK.RIGHT_EYE_OUTER] = lm(hipX + 0.03, headY - 0.02, -0.05);
  landmarks[LANDMARK.LEFT_EAR]        = lm(hipX - 0.05, headY - 0.01, 0.02);
  landmarks[LANDMARK.RIGHT_EAR]       = lm(hipX + 0.05, headY - 0.01, 0.02);
  landmarks[LANDMARK.MOUTH_LEFT]      = lm(hipX - 0.02, headY + 0.03, -0.04);
  landmarks[LANDMARK.MOUTH_RIGHT]     = lm(hipX + 0.02, headY + 0.03, -0.04);

  // Shoulders — ~0.20 above hips
  const shoulderY = hipY - 0.20;
  landmarks[LANDMARK.LEFT_SHOULDER]  = lm(hipX - 0.10, shoulderY, 0);
  landmarks[LANDMARK.RIGHT_SHOULDER] = lm(hipX + 0.10, shoulderY, 0);

  // Elbows — more forward (sitting with arms on lap)
  landmarks[LANDMARK.LEFT_ELBOW]  = lm(hipX - 0.12, hipY - 0.08, -0.05);
  landmarks[LANDMARK.RIGHT_ELBOW] = lm(hipX + 0.12, hipY - 0.08, -0.05);

  // Wrists — on lap
  landmarks[LANDMARK.LEFT_WRIST]  = lm(hipX - 0.08, hipY + 0.02, -0.08);
  landmarks[LANDMARK.RIGHT_WRIST] = lm(hipX + 0.08, hipY + 0.02, -0.08);

  // Hands
  landmarks[LANDMARK.LEFT_PINKY]  = lm(hipX - 0.07, hipY + 0.04, -0.08);
  landmarks[LANDMARK.RIGHT_PINKY] = lm(hipX + 0.07, hipY + 0.04, -0.08);
  landmarks[LANDMARK.LEFT_INDEX]  = lm(hipX - 0.06, hipY + 0.05, -0.08);
  landmarks[LANDMARK.RIGHT_INDEX] = lm(hipX + 0.06, hipY + 0.05, -0.08);
  landmarks[LANDMARK.LEFT_THUMB]  = lm(hipX - 0.05, hipY + 0.03, -0.08);
  landmarks[LANDMARK.RIGHT_THUMB] = lm(hipX + 0.05, hipY + 0.03, -0.08);

  // Hips
  landmarks[LANDMARK.LEFT_HIP]  = lm(hipX - 0.08, hipY, -0.04);
  landmarks[LANDMARK.RIGHT_HIP] = lm(hipX + 0.08, hipY, -0.04);

  // Knees — forward (legs bent at 90 degrees)
  landmarks[LANDMARK.LEFT_KNEE]  = lm(hipX - 0.08, hipY + 0.05, -0.15);
  landmarks[LANDMARK.RIGHT_KNEE] = lm(hipX + 0.08, hipY + 0.05, -0.15);

  // Ankles — below knees
  landmarks[LANDMARK.LEFT_ANKLE]  = lm(hipX - 0.07, hipY + 0.20, -0.05);
  landmarks[LANDMARK.RIGHT_ANKLE] = lm(hipX + 0.07, hipY + 0.20, -0.05);

  // Feet
  landmarks[LANDMARK.LEFT_HEEL]       = lm(hipX - 0.07, hipY + 0.22, -0.03);
  landmarks[LANDMARK.RIGHT_HEEL]      = lm(hipX + 0.07, hipY + 0.22, -0.03);
  landmarks[LANDMARK.LEFT_FOOT_INDEX]  = lm(hipX - 0.07, hipY + 0.23, -0.07);
  landmarks[LANDMARK.RIGHT_FOOT_INDEX] = lm(hipX + 0.07, hipY + 0.23, -0.07);

  return landmarks;
}

// ============================================================
// Utility: shift all landmarks by (dx, dy)
// ============================================================

export function shiftPose(pose: NormalizedLandmark[], dx: number, dy: number): NormalizedLandmark[] {
  return pose.map(l => ({
    x: l.x + dx,
    y: l.y + dy,
    z: l.z,
    visibility: l.visibility,
  }));
}

// ============================================================
// Utility: add random jitter to all landmarks
// ============================================================

export function addJitter(pose: NormalizedLandmark[], magnitude: number): NormalizedLandmark[] {
  return pose.map(l => ({
    x: l.x + (Math.random() - 0.5) * 2 * magnitude,
    y: l.y + (Math.random() - 0.5) * 2 * magnitude,
    z: l.z,
    visibility: l.visibility,
  }));
}
