import { create } from 'zustand';

export interface Patient {
  _id: string;
  patient_id: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  ward: string;
  bed_number: string;
  notes?: string;
}

interface PatientState {
  patients: Patient[];
  selectedPatient: Patient | null;
  isLoading: boolean;
  error: string | null;
  fetchPatients: () => Promise<void>;
  setSelectedPatient: (patient: Patient | null) => void;
  addPatient: (patient: Partial<Patient>) => Promise<void>;
  updatePatient: (id: string, patient: Partial<Patient>) => Promise<void>;
  deletePatient: (id: string) => Promise<void>;
}

export const usePatientStore = create<PatientState>((set, get) => ({
  patients: [],
  selectedPatient: null,
  isLoading: false,
  error: null,

  fetchPatients: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch('/api/patients');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch patients');
      }

      set({ patients: Array.isArray(data) ? data : [], isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false, patients: [] });
    }
  },

  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  addPatient: async (patient) => {
    try {
      const response = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to add patient');
      
      set((state) => ({ patients: [data, ...state.patients] }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  updatePatient: async (id, patient) => {
    try {
      const response = await fetch(`/api/patients/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patient),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update patient');

      set((state) => ({
        patients: state.patients.map((p) => (p._id === id ? data : p)),
        selectedPatient: state.selectedPatient?._id === id ? data : state.selectedPatient,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deletePatient: async (id) => {
    try {
      const response = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete patient');
      }

      set((state) => ({
        patients: state.patients.filter((p) => p._id !== id),
        selectedPatient: state.selectedPatient?._id === id ? null : state.selectedPatient,
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },
}));
