'use client';

import React, { useEffect, useState } from 'react';
import { usePatientStore, Patient } from '@/store/usePatientStore';
import { Card, Button, Input, Badge } from '@/components/ui';
import { Plus, User, Trash2, Search, Activity } from 'lucide-react';

export const PatientList = () => {
  const { patients, selectedPatient, fetchPatients, setSelectedPatient, addPatient, deletePatient, isLoading, error } = usePatientStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newPatient, setNewPatient] = useState<Partial<Patient>>({
    name: '',
    age: 0,
    gender: 'Male',
    ward: '',
    bed_number: '',
  });

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const filteredPatients = Array.isArray(patients) 
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.patient_id.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    await addPatient(newPatient);
    setIsAdding(false);
    setNewPatient({ name: '', age: 0, gender: 'Male', ward: '', bed_number: '' });
  };

  return (
    <div className="flex h-full flex-col gap-4 border-r border-slate-200 p-4 dark:border-slate-800">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Activity className="h-5 w-5 text-teal-600" />
          Patients
        </h2>
        <Button size="sm" onClick={() => setIsAdding(true)} className="p-2 rounded-full h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search patients..."
          className="pl-9"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto space-y-2">
        {isLoading ? (
          <div className="text-center py-10 text-slate-500">Loading...</div>
        ) : error ? (
          <div className="text-center py-10 px-4">
            <p className="text-sm text-red-500 mb-2">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchPatients}>
              Retry
            </Button>
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-10 text-slate-500">No patients found</div>
        ) : (
          filteredPatients.map((patient) => (
            <div
              key={patient._id}
              onClick={() => setSelectedPatient(patient)}
              className={`group cursor-pointer rounded-xl border p-4 transition-all hover:border-teal-500/50 hover:bg-teal-50/10 ${
                selectedPatient?._id === patient._id
                  ? 'border-teal-600 bg-teal-50/20 dark:bg-teal-900/10'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${
                    selectedPatient?._id === patient._id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                  }`}>
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">{patient.name}</h3>
                    <p className="text-xs text-slate-500">{patient.patient_id}</p>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm('Delete patient?')) deletePatient(patient._id);
                  }}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge color="slate">{patient.age}y</Badge>
                <Badge color="slate">{patient.ward}</Badge>
                <Badge color="teal">Bed {patient.bed_number}</Badge>
              </div>
            </div>
          ))
        )}
      </div>

      {isAdding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">Add New Patient</h3>
            <form onSubmit={handleAddPatient} className="space-y-4">
              <Input
                placeholder="Full Name"
                required
                value={newPatient.name}
                onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  placeholder="Age"
                  required
                  value={newPatient.age || ''}
                  onChange={(e) => setNewPatient({ ...newPatient, age: Number(e.target.value) })}
                />
                <select
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                  value={newPatient.gender}
                  onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value as any })}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="Ward"
                  required
                  value={newPatient.ward}
                  onChange={(e) => setNewPatient({ ...newPatient, ward: e.target.value })}
                />
                <Input
                  placeholder="Bed Number"
                  required
                  value={newPatient.bed_number}
                  onChange={(e) => setNewPatient({ ...newPatient, bed_number: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <Button variant="secondary" type="button" onClick={() => setIsAdding(false)}>Cancel</Button>
                <Button variant="primary" type="submit">Create Patient</Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};
