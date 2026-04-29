import { Vitals } from '@/store/useSimulationStore';

export type StatusColor = 'green' | 'yellow' | 'red';

export const VITAL_CONFIG = {
  hr: { min: 0, max: 220, normal: [60, 100], unit: 'bpm', label: 'Heart Rate' },
  bp_sys: { min: 0, max: 250, normal: [90, 140], unit: 'mmHg', label: 'BP (Systolic)' },
  spo2: { min: 0, max: 100, normal: [95, 100], unit: '%', label: 'SpO₂' },
  rr: { min: 0, max: 80, normal: [12, 20], unit: '/min', label: 'Resp. Rate' },
  temp: { min: 30, max: 43, normal: [36.5, 37.5], unit: '°C', label: 'Temperature' },
};

export const getStatusColor = (key: keyof Vitals, value: number): StatusColor => {
  const config = VITAL_CONFIG[key];
  const [low, high] = config.normal;

  if (value >= low && value <= high) return 'green';
  
  if (key === 'spo2' && value < 85) return 'red';
  if (key === 'hr' && (value < 40 || value > 140)) return 'red';
  if (key === 'bp_sys' && (value < 70 || value > 180)) return 'red';
  if (key === 'rr' && (value < 8 || value > 35)) return 'red';
  if (key === 'temp' && (value < 35 || value > 39.5)) return 'red';

  return 'yellow';
};

export const applyAutoDrift = (vitals: Vitals, isDeteriorating: boolean): Vitals => {
  const drift = (min: number, max: number) => Math.random() * (max - min) + min;
  
  // Deterioration targets
  // HR -> Up, BP -> Down, SpO2 -> Down, RR -> Up, Temp -> Up (Fever) or Down (Shock)
  
  const nextVitals = { ...vitals };

  if (isDeteriorating) {
    nextVitals.hr = Math.min(VITAL_CONFIG.hr.max, nextVitals.hr + drift(0, 3));
    nextVitals.bp_sys = Math.max(VITAL_CONFIG.bp_sys.min, nextVitals.bp_sys - drift(0, 3));
    nextVitals.spo2 = Math.max(VITAL_CONFIG.spo2.min, nextVitals.spo2 - drift(0, 1.5));
    nextVitals.rr = Math.min(VITAL_CONFIG.rr.max, nextVitals.rr + drift(0, 1.5));
    nextVitals.temp = Number((nextVitals.temp + drift(-0.1, 0.2)).toFixed(1));
  } else {
    // Normal drift (slight oscillation)
    nextVitals.hr = Math.max(VITAL_CONFIG.hr.min, Math.min(VITAL_CONFIG.hr.max, nextVitals.hr + drift(-1, 1)));
    nextVitals.bp_sys = Math.max(VITAL_CONFIG.bp_sys.min, Math.min(VITAL_CONFIG.bp_sys.max, nextVitals.bp_sys + drift(-1, 1)));
    nextVitals.spo2 = Math.max(70, Math.min(100, nextVitals.spo2 + drift(-0.2, 0.2)));
    nextVitals.rr = Math.max(VITAL_CONFIG.rr.min, Math.min(VITAL_CONFIG.rr.max, nextVitals.rr + drift(-0.5, 0.5)));
    nextVitals.temp = Number((nextVitals.temp + drift(-0.02, 0.02)).toFixed(1));
  }

  // Ensure integers for appropriate values
  nextVitals.hr = Math.round(nextVitals.hr);
  nextVitals.bp_sys = Math.round(nextVitals.bp_sys);
  nextVitals.rr = Math.round(nextVitals.rr);
  nextVitals.spo2 = Math.round(nextVitals.spo2);

  return nextVitals;
};

const approach = (current: number, target: number, maxStep: number, precision = 1): number => {
  const delta = target - current;
  if (Math.abs(delta) <= maxStep) return Number(target.toFixed(precision));

  const next = current + Math.sign(delta) * maxStep;
  return Number(next.toFixed(precision));
};

export const progressVitalsTowardTarget = (current: Vitals, target: Vitals): Vitals => ({
  hr: approach(current.hr, target.hr, 0.7),
  bp_sys: approach(current.bp_sys, target.bp_sys, 0.8),
  spo2: approach(current.spo2, target.spo2, 0.3),
  rr: approach(current.rr, target.rr, 0.25),
  temp: approach(current.temp, target.temp, 0.035, 2),
});

export const PRESETS: Record<string, Vitals> = {
  Normal: { hr: 72, bp_sys: 118, spo2: 98, rr: 14, temp: 36.8 },
  Tachycardia: { hr: 145, bp_sys: 130, spo2: 96, rr: 24, temp: 37.2 },
  Bradycardia: { hr: 38, bp_sys: 95, spo2: 95, rr: 10, temp: 36.5 },
  'Hypotensive Shock': { hr: 125, bp_sys: 75, spo2: 88, rr: 32, temp: 35.8 },
  'Hypertensive Crisis': { hr: 105, bp_sys: 195, spo2: 94, rr: 20, temp: 37.0 },
  'Cardiac Arrest': { hr: 0, bp_sys: 0, spo2: 40, rr: 0, temp: 35.5 },
  'Severe Sepsis': { hr: 115, bp_sys: 85, spo2: 91, rr: 28, temp: 39.4 },
  'Respiratory Distress': { hr: 110, bp_sys: 140, spo2: 82, rr: 45, temp: 37.5 },
  'Hypothermia': { hr: 45, bp_sys: 100, spo2: 92, rr: 12, temp: 32.5 },
};
