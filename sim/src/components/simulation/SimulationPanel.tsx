'use client';

import React, { useEffect } from 'react';
import { usePatientStore } from '@/store/usePatientStore';
import { useSimulationStore, Vitals, DEFAULT_VITALS } from '@/store/useSimulationStore';
import { useVitalStream } from '@/hooks/useVitalStream';
import { Card, Button, Badge, Slider } from '@/components/ui';
import { VITAL_CONFIG, getStatusColor, PRESETS } from '@/lib/vitals-logic';
import { Play, Square, RefreshCcw, TrendingUp, Zap, Radio, Clock, Activity } from 'lucide-react';

export const SimulationPanel = () => {
  const { selectedPatient } = usePatientStore();
  const { 
    allVitals, 
    backendResults,
    setPatientVital, 
    isStreaming, 
    toggleStreaming, 
    autoDrift, 
    toggleAutoDrift, 
    deteriorationMode, 
    toggleDeterioration, 
    setPatientVitals,
    lastSent,
    initializePatient
  } = useSimulationStore();
  
  const { isConnected } = useVitalStream();

  // Initialize patient vitals when selected
  useEffect(() => {
    if (selectedPatient) {
      initializePatient(selectedPatient.patient_id);
    }
  }, [selectedPatient, initializePatient]);

  if (!selectedPatient) {
    return (
      <div className="flex h-full items-center justify-center text-slate-500 flex-col gap-4">
        <div className="p-6 rounded-full bg-slate-100 dark:bg-slate-800">
           <Activity className="h-12 w-12 opacity-20" />
        </div>
        <p className="text-lg font-medium">Select a patient to view individual controls</p>
      </div>
    );
  }

  const patientVitals = allVitals[selectedPatient.patient_id] || DEFAULT_VITALS;
  const result = backendResults[selectedPatient.patient_id];

  const getAlertColor = (level: string) => {
    if (level === 'CRITICAL') return 'bg-red-500 text-white';
    if (level === 'HIGH') return 'bg-orange-500 text-white';
    if (level === 'MODERATE') return 'bg-yellow-500 text-yellow-900';
    return 'bg-green-500 text-white';
  };

  return (
    <div className="flex h-full flex-col p-6 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedPatient.name}</h1>
            <Badge color="teal">{selectedPatient.patient_id}</Badge>
            {result && (
              <>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getAlertColor(result.alert_level)}`}>
                  {result.alert_level}
                </span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  Risk Score: {result.smoothed_score}
                </span>
              </>
            )}
          </div>
          <p className="text-slate-500 text-sm">
            Ward {selectedPatient.ward} • Bed {selectedPatient.bed_number} • {selectedPatient.age} years old
          </p>
          {result && result.reasons && result.reasons.length > 0 && (
            <p className="text-xs text-red-500 mt-1 max-w-xl truncate">
              ⚠ {result.reasons.join(', ')}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-4 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
            <span className="text-xs font-semibold uppercase tracking-wider">{isConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
          
          <Button 
            variant={isStreaming ? 'danger' : 'primary'}
            onClick={toggleStreaming}
            className="gap-2"
          >
            {isStreaming ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
            {isStreaming ? 'Stop Global Stream' : 'Start Global Stream'}
          </Button>
        </div>
      </div>

      {/* Controls Bar */}
      <Card className="p-4 mb-8 flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400 mr-2">Presets (Selected):</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(PRESETS).map((name) => (
              <Button 
                key={name} 
                variant="outline" 
                size="sm" 
                className={`px-3 h-8 text-[10px] font-bold ${name === 'Cardiac Arrest' ? 'hover:bg-red-500 hover:text-white border-red-200' : ''}`}
                onClick={() => setPatientVitals(selectedPatient.patient_id, PRESETS[name])}
              >
                {name}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group" onClick={toggleAutoDrift}>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${autoDrift ? 'bg-teal-600 shadow-[0_0_10px_rgba(13,148,136,0.3)]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${autoDrift ? 'translate-x-5' : ''}`} />
              </div>
              <span className={`text-sm font-bold ${autoDrift ? 'text-teal-600' : 'text-slate-500'}`}>Auto-Drift (All)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer" onClick={toggleDeterioration}>
              <div className={`w-10 h-5 rounded-full transition-colors relative ${deteriorationMode ? 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.3)]' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${deteriorationMode ? 'translate-x-5' : ''}`} />
              </div>
              <span className={`text-sm font-bold ${deteriorationMode ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
                {deteriorationMode ? 'CRITICAL: Deteriorating' : 'Global Deterioration'}
              </span>
            </label>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
             {lastSent && (
               <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                 <Clock className="h-3 w-3" />
                 SYNC: {new Date(lastSent).toLocaleTimeString()}
               </div>
             )}
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => setPatientVitals(selectedPatient.patient_id, DEFAULT_VITALS)} 
               className="h-8 px-2 text-[10px] font-bold text-slate-400"
             >
               <RefreshCcw className="h-3 w-3 mr-1" />
               RESET
             </Button>
          </div>
        </div>
      </Card>

      {/* Vitals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(Object.entries(VITAL_CONFIG) as [keyof Vitals, any][]).map(([key, config]) => (
          <VitalCard 
            key={key}
            vitalKey={key}
            config={config}
            value={patientVitals[key]}
            onChange={(val: number) => setPatientVital(selectedPatient.patient_id, key, val)}
          />
        ))}
      </div>
    </div>
  );
};

const VitalCard = ({ vitalKey, config, value, onChange }: any) => {
  const status = getStatusColor(vitalKey, value);
  const colorMap = {
    green: 'border-green-500 text-green-600 bg-green-50/10',
    yellow: 'border-yellow-500 text-yellow-600 bg-yellow-50/10',
    red: 'border-red-500 text-red-600 bg-red-50/10',
  };

  return (
    <Card className={`p-6 border-t-4 transition-all ${colorMap[status]}`}>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">{config.label}</h3>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black tracking-tight">{value}</span>
            <span className="text-slate-400 text-sm font-medium">{config.unit}</span>
          </div>
        </div>
        <div className={`p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800`}>
          {vitalKey === 'hr' && <TrendingUp className="h-5 w-5" />}
          {vitalKey === 'spo2' && <Zap className="h-5 w-5" />}
          {vitalKey === 'bp_sys' && <Activity className="h-5 w-5" />}
          {vitalKey === 'rr' && <Radio className="h-5 w-5" />}
          {vitalKey === 'temp' && <Clock className="h-5 w-5" />}
        </div>
      </div>

      <div className="space-y-4">
        <Slider 
          min={config.min} 
          max={config.max} 
          value={value} 
          onChange={onChange}
        />
        
        <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          <span>{config.min}</span>
          <span>Normal: {config.normal[0]}-{config.normal[1]}</span>
          <span>{config.max}</span>
        </div>

        {/* Gauge Simulation */}
        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              status === 'green' ? 'bg-green-500' : status === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${((value - config.min) / (config.max - config.min)) * 100}%` }}
          />
        </div>
      </div>
    </Card>
  );
};
