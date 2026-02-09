/**
 * UI module — DOM bindings for status cards, settings panel, and controls.
 */

import { DetectorStatus, type DetectorResult } from './detectors/types';
import { DEFAULT_SETTINGS, type Settings } from './types';

const STORAGE_KEY = 'motion-tracking-settings';

// ============================================================
// Settings persistence
// ============================================================

export function loadSettings(): Settings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    }
  } catch {
    // ignore
  }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

// ============================================================
// Status card updates
// ============================================================

const STATUS_LABELS: Record<DetectorStatus, string> = {
  [DetectorStatus.OK]: 'OK',
  [DetectorStatus.WARNING]: 'WARNING',
  [DetectorStatus.ALERT]: 'ALERT',
};

export function updateStatusCard(
  cardId: string,
  result: DetectorResult,
  metricId?: string,
): void {
  const card = document.getElementById(cardId);
  if (!card) return;

  card.dataset.status = result.status;

  const badge = card.querySelector('.status-badge');
  if (badge) {
    badge.textContent = STATUS_LABELS[result.status];
  }

  if (metricId) {
    const metric = document.getElementById(metricId);
    if (metric) {
      metric.textContent = result.message;
    }
  }
}

export function setCardsOff(): void {
  const cards = document.querySelectorAll('.status-card');
  cards.forEach((card) => {
    (card as HTMLElement).dataset.status = 'off';
    const badge = card.querySelector('.status-badge');
    if (badge) badge.textContent = 'OFF';
    const metric = card.querySelector('.metric');
    if (metric) metric.textContent = '';
  });
}

// ============================================================
// Settings panel wiring
// ============================================================

export function initSettingsPanel(
  settings: Settings,
  onChange: (settings: Settings) => void,
): void {
  const fallSlider = document.getElementById('setting-fall-hold') as HTMLInputElement;
  const fallValue = document.getElementById('setting-fall-hold-value')!;
  const inactivitySlider = document.getElementById('setting-inactivity') as HTMLInputElement;
  const inactivityValue = document.getElementById('setting-inactivity-value')!;
  const zoneSlider = document.getElementById('setting-zone-breach') as HTMLInputElement;
  const zoneValue = document.getElementById('setting-zone-breach-value')!;
  const presenceSlider = document.getElementById('setting-presence') as HTMLInputElement;
  const presenceValue = document.getElementById('setting-presence-value')!;
  const muteCheckbox = document.getElementById('setting-mute') as HTMLInputElement;

  // Set initial values
  fallSlider.value = String(settings.fallHoldDuration);
  fallValue.textContent = `${(settings.fallHoldDuration / 1000).toFixed(1)}s`;
  inactivitySlider.value = String(settings.inactivityDuration);
  inactivityValue.textContent = formatDuration(settings.inactivityDuration);
  zoneSlider.value = String(settings.zoneBreachDuration);
  zoneValue.textContent = `${(settings.zoneBreachDuration / 1000).toFixed(1)}s`;
  presenceSlider.value = String(settings.presenceTimeout);
  presenceValue.textContent = `${(settings.presenceTimeout / 1000).toFixed(0)}s`;
  muteCheckbox.checked = settings.muted;

  // Listeners
  fallSlider.addEventListener('input', () => {
    settings.fallHoldDuration = Number(fallSlider.value);
    fallValue.textContent = `${(settings.fallHoldDuration / 1000).toFixed(1)}s`;
    saveSettings(settings);
    onChange(settings);
  });

  inactivitySlider.addEventListener('input', () => {
    settings.inactivityDuration = Number(inactivitySlider.value);
    inactivityValue.textContent = formatDuration(settings.inactivityDuration);
    saveSettings(settings);
    onChange(settings);
  });

  zoneSlider.addEventListener('input', () => {
    settings.zoneBreachDuration = Number(zoneSlider.value);
    zoneValue.textContent = `${(settings.zoneBreachDuration / 1000).toFixed(1)}s`;
    saveSettings(settings);
    onChange(settings);
  });

  presenceSlider.addEventListener('input', () => {
    settings.presenceTimeout = Number(presenceSlider.value);
    presenceValue.textContent = `${(settings.presenceTimeout / 1000).toFixed(0)}s`;
    saveSettings(settings);
    onChange(settings);
  });

  muteCheckbox.addEventListener('change', () => {
    settings.muted = muteCheckbox.checked;
    saveSettings(settings);
    onChange(settings);
  });
}

function formatDuration(ms: number): string {
  const seconds = ms / 1000;
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return remaining > 0 ? `${minutes}m ${remaining}s` : `${minutes}m`;
  }
  return `${seconds}s`;
}
