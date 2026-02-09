/**
 * Main entry point — wires everything together:
 * camera, PoseLandmarker, detectors, renderer, zone overlay, alerts, UI.
 */

import { initPoseLandmarker, detectPose } from './pose';
import { initRenderer, drawSkeleton, clearSkeleton } from './renderer';
import { initZoneOverlay, setDrawingMode, getZoneRect, updateZoneStatus } from './zone-overlay';
import { initAudio, setMuted, initAlertLog, clearAlertLog, handleDetectorAlert } from './alerts';
import { loadSettings, initSettingsPanel, updateStatusCard, setCardsOff } from './ui';
import { FallDetector } from './detectors/fall';
import { InactivityDetector } from './detectors/inactivity';
import { ZoneDetector } from './detectors/zone';
import { PresenceDetector } from './detectors/presence';
import type { NormalizedLandmark, Settings } from './types';

// ============================================================
// DOM Elements
// ============================================================

const video = document.getElementById('webcam') as HTMLVideoElement;
const skeletonCanvas = document.getElementById('skeleton-canvas') as HTMLCanvasElement;
const zoneCanvas = document.getElementById('zone-canvas') as HTMLCanvasElement;
const cameraError = document.getElementById('camera-error')!;
const loadingOverlay = document.getElementById('loading-overlay')!;

const btnCamera = document.getElementById('btn-camera') as HTMLButtonElement;
const btnDrawZone = document.getElementById('btn-draw-zone') as HTMLButtonElement;
const btnClearAlerts = document.getElementById('btn-clear-alerts') as HTMLButtonElement;
const btnSettings = document.getElementById('btn-settings') as HTMLButtonElement;
const alertLog = document.getElementById('alert-log')!;
const settingsPanel = document.getElementById('settings-panel') as HTMLDetailsElement;

// ============================================================
// State
// ============================================================

let settings = loadSettings();
let cameraRunning = false;
let drawingZone = false;
let lastVideoTime = -1;
let stream: MediaStream | null = null;

// ============================================================
// Detectors
// ============================================================

const fallDetector = new FallDetector({ holdDuration: settings.fallHoldDuration });
const inactivityDetector = new InactivityDetector({ duration: settings.inactivityDuration });
const zoneDetector = new ZoneDetector({ breachDuration: settings.zoneBreachDuration });
const presenceDetector = new PresenceDetector({ timeout: settings.presenceTimeout });

// ============================================================
// Settings change handler
// ============================================================

function onSettingsChange(newSettings: Settings): void {
  settings = newSettings;
  fallDetector.configure({ holdDuration: settings.fallHoldDuration });
  inactivityDetector.configure({ duration: settings.inactivityDuration });
  zoneDetector.configure({ breachDuration: settings.zoneBreachDuration });
  presenceDetector.configure({ timeout: settings.presenceTimeout });
  setMuted(settings.muted);
}

// ============================================================
// Camera
// ============================================================

async function startCamera(): Promise<void> {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
    });
    video.srcObject = stream;
    await video.play();
    cameraError.classList.add('hidden');
  } catch {
    cameraError.classList.remove('hidden');
    return;
  }

  // Show loading while model initializes
  loadingOverlay.classList.remove('hidden');

  try {
    const skeletonCtx = skeletonCanvas.getContext('2d')!;
    const drawingUtils = await initPoseLandmarker(skeletonCtx);
    initRenderer(skeletonCanvas, drawingUtils);
  } catch (e) {
    console.error('Failed to load PoseLandmarker:', e);
    loadingOverlay.textContent = 'Failed to load pose model. Please reload.';
    return;
  }

  loadingOverlay.classList.add('hidden');
  cameraRunning = true;
  lastVideoTime = -1;

  // Reset detectors
  fallDetector.reset();
  inactivityDetector.reset();
  zoneDetector.reset();
  presenceDetector.reset();

  // Enable buttons
  btnDrawZone.disabled = false;
  btnClearAlerts.disabled = false;
  btnSettings.disabled = false;
  btnCamera.textContent = 'Stop Camera';

  // Start render loop
  requestAnimationFrame(renderLoop);
}

function stopCamera(): void {
  cameraRunning = false;
  if (stream) {
    stream.getTracks().forEach(t => t.stop());
    stream = null;
  }
  video.srcObject = null;

  clearSkeleton();
  setCardsOff();

  btnDrawZone.disabled = true;
  btnClearAlerts.disabled = true;
  btnCamera.textContent = 'Start Camera';

  // Exit drawing mode
  if (drawingZone) {
    drawingZone = false;
    setDrawingMode(false);
    btnDrawZone.classList.remove('active');
  }
}

// ============================================================
// Render Loop
// ============================================================

function renderLoop(): void {
  if (!cameraRunning) return;

  if (video.currentTime !== lastVideoTime && video.readyState >= 2) {
    lastVideoTime = video.currentTime;
    const timestamp = performance.now();

    detectPose(video, timestamp, (result) => {
      // Draw skeleton
      drawSkeleton(result.landmarks, video.videoWidth, video.videoHeight);

      // Extract first pose or null
      const landmarks: NormalizedLandmark[] | null =
        result.landmarks.length > 0
          ? (result.landmarks[0] as NormalizedLandmark[])
          : null;

      // Update zone detector with current zone rect
      const zoneRect = getZoneRect();
      if (zoneRect) {
        zoneDetector.setZoneRect(zoneRect);
      }

      // Run all detectors
      const fallResult = fallDetector.update(landmarks, timestamp);
      const inactivityResult = inactivityDetector.update(landmarks, timestamp);
      const zoneResult = zoneDetector.update(landmarks, timestamp);
      const presenceResult = presenceDetector.update(landmarks, timestamp);

      // Update UI status cards
      updateStatusCard('card-fall', fallResult, 'metric-fall');
      updateStatusCard('card-inactivity', inactivityResult, 'metric-inactivity');
      updateStatusCard('card-zone', zoneResult, 'metric-zone');
      updateStatusCard('card-presence', presenceResult, 'metric-presence');

      // Update zone overlay visual
      updateZoneStatus(zoneResult.status);

      // Handle alerts (log + audio on transition to ALERT)
      handleDetectorAlert('fall', fallResult.status, fallResult.message);
      handleDetectorAlert('inactivity', inactivityResult.status, inactivityResult.message);
      handleDetectorAlert('zone', zoneResult.status, zoneResult.message);
      handleDetectorAlert('presence', presenceResult.status, presenceResult.message);
    });
  }

  requestAnimationFrame(renderLoop);
}

// ============================================================
// Init
// ============================================================

function init(): void {
  // Audio + alert log
  initAlertLog(alertLog);

  // Zone overlay
  initZoneOverlay(zoneCanvas, (rect) => {
    if (rect) {
      zoneDetector.setZoneRect(rect);
    }
  });

  // Settings panel
  initSettingsPanel(settings, onSettingsChange);
  setMuted(settings.muted);

  // Camera button
  btnCamera.addEventListener('click', () => {
    // Init audio on first user gesture
    initAudio();

    if (cameraRunning) {
      stopCamera();
    } else {
      startCamera();
    }
  });

  // Draw Zone toggle
  btnDrawZone.addEventListener('click', () => {
    drawingZone = !drawingZone;
    setDrawingMode(drawingZone);
    btnDrawZone.classList.toggle('active', drawingZone);
    btnDrawZone.textContent = drawingZone ? 'Finish Zone' : 'Draw Zone';
  });

  // Clear Alerts
  btnClearAlerts.addEventListener('click', () => {
    clearAlertLog();
  });

  // Settings toggle
  btnSettings.addEventListener('click', () => {
    settingsPanel.open = !settingsPanel.open;
  });

  // Set initial UI state
  setCardsOff();
}

init();
