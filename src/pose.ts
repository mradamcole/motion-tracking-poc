/**
 * PoseLandmarker wrapper — initializes MediaPipe and provides
 * a thin interface for detecting poses on video frames.
 */

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils,
} from '@mediapipe/tasks-vision';

const WASM_CDN = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.21/wasm';
const MODEL_URL = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

export type PoseResultCallback = (result: {
  landmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>>;
  worldLandmarks: Array<Array<{ x: number; y: number; z: number; visibility: number }>>;
}) => void;

let poseLandmarker: PoseLandmarker | null = null;
let drawingUtils: DrawingUtils | null = null;

/**
 * Initialize the PoseLandmarker. Call once at app startup.
 * Returns the DrawingUtils instance for skeleton rendering.
 */
export async function initPoseLandmarker(
  canvasCtx: CanvasRenderingContext2D,
): Promise<DrawingUtils> {
  const vision = await FilesetResolver.forVisionTasks(WASM_CDN);

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: 'GPU',
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  drawingUtils = new DrawingUtils(canvasCtx);
  return drawingUtils;
}

/**
 * Run pose detection on the current video frame.
 * Must be called from within a requestAnimationFrame loop.
 */
export function detectPose(
  video: HTMLVideoElement,
  timestamp: number,
  callback: PoseResultCallback,
): void {
  if (!poseLandmarker) return;

  poseLandmarker.detectForVideo(video, timestamp, (result) => {
    callback(result as Parameters<PoseResultCallback>[0]);
  });
}

export function getPoseLandmarker(): PoseLandmarker | null {
  return poseLandmarker;
}

export function getDrawingUtils(): DrawingUtils | null {
  return drawingUtils;
}

// Re-export for convenience
export { PoseLandmarker, DrawingUtils };
