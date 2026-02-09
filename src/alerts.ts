/**
 * Alert system — manages the alert log + audio notifications.
 *
 * AudioContext is created on the first user gesture (Start Camera click)
 * to satisfy browser autoplay policy.
 */

import { DetectorStatus } from './detectors/types';

let audioCtx: AudioContext | null = null;
let muted = false;

// Prevent repeated alerts from spamming sound
const lastAlertTime: Record<string, number> = {};
const ALERT_COOLDOWN_MS = 3000;

// ============================================================
// Audio
// ============================================================

export function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

export function setMuted(value: boolean): void {
  muted = value;
}

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine'): void {
  if (!audioCtx || muted) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + duration);
}

function playFallAlert(): void {
  // Rapid beeps
  playTone(880, 0.15, 'square');
  setTimeout(() => playTone(880, 0.15, 'square'), 200);
  setTimeout(() => playTone(880, 0.15, 'square'), 400);
}

function playInactivityAlert(): void {
  // Low tone
  playTone(220, 0.5, 'sine');
}

function playZoneAlert(): void {
  // Ascending tone
  playTone(440, 0.2, 'triangle');
  setTimeout(() => playTone(660, 0.2, 'triangle'), 250);
  setTimeout(() => playTone(880, 0.3, 'triangle'), 500);
}

function playPresenceAlert(): void {
  // Double boop
  playTone(330, 0.2, 'sine');
  setTimeout(() => playTone(330, 0.2, 'sine'), 300);
}

export function triggerAlertSound(type: string): void {
  const now = Date.now();
  if (lastAlertTime[type] && now - lastAlertTime[type] < ALERT_COOLDOWN_MS) return;
  lastAlertTime[type] = now;

  switch (type) {
    case 'fall': playFallAlert(); break;
    case 'inactivity': playInactivityAlert(); break;
    case 'zone': playZoneAlert(); break;
    case 'presence': playPresenceAlert(); break;
  }
}

// ============================================================
// Alert Log
// ============================================================

let logContainer: HTMLElement | null = null;

export function initAlertLog(container: HTMLElement): void {
  logContainer = container;
}

export function addAlertEntry(type: string, message: string): void {
  if (!logContainer) return;

  const entry = document.createElement('div');
  entry.className = `alert-entry ${type}`;

  const time = new Date().toLocaleTimeString();
  entry.innerHTML = `<span class="alert-time">${time}</span> ${message}`;

  // Newest on top
  logContainer.prepend(entry);

  // Limit log size
  while (logContainer.children.length > 100) {
    logContainer.removeChild(logContainer.lastChild!);
  }
}

export function clearAlertLog(): void {
  if (!logContainer) return;
  logContainer.innerHTML = '';
}

// ============================================================
// Unified alert handler
// ============================================================

const previousStatus: Record<string, DetectorStatus> = {};

export function handleDetectorAlert(
  detectorName: string,
  status: DetectorStatus,
  message: string,
): void {
  const prev = previousStatus[detectorName];
  previousStatus[detectorName] = status;

  // Only log on transition TO alert
  if (status === DetectorStatus.ALERT && prev !== DetectorStatus.ALERT) {
    addAlertEntry(detectorName, message);
    triggerAlertSound(detectorName);
  }
}
