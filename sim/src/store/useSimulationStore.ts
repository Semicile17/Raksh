import { create } from 'zustand';

export interface Vitals {
  hr: number;
  bp_sys: number;
  spo2: number;
  rr: number;
  temp: number;
}

interface SimulationState {
  allVitals: Record<string, Vitals>; // patient_id -> live vitals sent to core
  targetVitals: Record<string, Vitals>; // patient_id -> operator-set destination vitals
  backendResults: Record<string, any>; // patient_id -> latest backend output
  isStreaming: boolean;
  autoDrift: boolean;
  deteriorationMode: boolean;
  lastSent: number | null;
  
  setPatientVital: (patientId: string, key: keyof Vitals, value: number) => void;
  setPatientVitals: (patientId: string, vitals: Vitals) => void;
  toggleStreaming: () => void;
  toggleAutoDrift: () => void;
  toggleDeterioration: () => void;
  setLastSent: (timestamp: number) => void;
  initializePatient: (patientId: string) => void;
  batchUpdateVitals: (updates: Record<string, Vitals>) => void;
  batchUpdateTargetVitals: (updates: Record<string, Vitals>) => void;
  batchUpdateResults: (results: Record<string, any>) => void;
}

export const DEFAULT_VITALS: Vitals = {
  hr: 75,
  bp_sys: 120,
  spo2: 98,
  rr: 16,
  temp: 37.0,
};

export const useSimulationStore = create<SimulationState>((set) => ({
  allVitals: {},
  targetVitals: {},
  backendResults: {},
  isStreaming: false,
  autoDrift: false,
  deteriorationMode: false,
  lastSent: null,

  initializePatient: (patientId) => 
    set((state) => {
      const liveVitals = state.allVitals[patientId] || { ...DEFAULT_VITALS };
      const targetVitals = state.targetVitals[patientId] || { ...liveVitals };

      if (state.allVitals[patientId] && state.targetVitals[patientId]) return state;

      return {
        allVitals: { ...state.allVitals, [patientId]: liveVitals },
        targetVitals: { ...state.targetVitals, [patientId]: targetVitals },
      };
    }),

  setPatientVital: (patientId, key, value) =>
    set((state) => ({
      targetVitals: {
        ...state.targetVitals,
        [patientId]: {
          ...(state.targetVitals[patientId] || state.allVitals[patientId] || DEFAULT_VITALS),
          [key]: value,
        },
      },
    })),

  setPatientVitals: (patientId, vitals) =>
    set((state) => ({
      targetVitals: { ...state.targetVitals, [patientId]: { ...vitals } },
    })),

  batchUpdateVitals: (updates) => 
    set((state) => ({
      allVitals: { ...state.allVitals, ...updates }
    })),

  batchUpdateTargetVitals: (updates) =>
    set((state) => ({
      targetVitals: { ...state.targetVitals, ...updates }
    })),

  batchUpdateResults: (results) => 
    set((state) => ({
      backendResults: { ...state.backendResults, ...results }
    })),

  toggleStreaming: () => set((state) => ({ isStreaming: !state.isStreaming })),

  toggleAutoDrift: () => set((state) => ({ autoDrift: !state.autoDrift })),

  toggleDeterioration: () => set((state) => ({ deteriorationMode: !state.deteriorationMode })),

  setLastSent: (timestamp) => set({ lastSent: timestamp }),
}));
