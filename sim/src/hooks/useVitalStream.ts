import { useEffect, useRef, useState } from 'react';
import { useSimulationStore, Vitals, DEFAULT_VITALS } from '@/store/useSimulationStore';
import { usePatientStore } from '@/store/usePatientStore';
import { applyAutoDrift, progressVitalsTowardTarget } from '@/lib/vitals-logic';

export const useVitalStream = () => {
  const { 
    allVitals, 
    targetVitals,
    isStreaming, 
    autoDrift, 
    deteriorationMode, 
    batchUpdateVitals, 
    batchUpdateTargetVitals,
    batchUpdateResults,
    setLastSent 
  } = useSimulationStore();
  const { patients } = usePatientStore();
  
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to avoid re-triggering the effect on every state change
  const stateRef = useRef({ allVitals, targetVitals, isStreaming, autoDrift, deteriorationMode, patients });
  
  useEffect(() => {
    stateRef.current = { allVitals, targetVitals, isStreaming, autoDrift, deteriorationMode, patients };
  }, [allVitals, targetVitals, isStreaming, autoDrift, deteriorationMode, patients]);

  // Main Simulation & Streaming Loop
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Using NEXT_PUBLIC_CORE_API_URL so it is exposed to the browser
    const apiUrl = process.env.NEXT_PUBLIC_CORE_API_URL || 'http://127.0.0.1:8000/vitals';

    intervalRef.current = setInterval(async () => {
      const { 
        allVitals: currentAllVitals, 
        targetVitals: currentTargets,
        isStreaming: streaming, 
        autoDrift: drift, 
        deteriorationMode: fatal, 
        patients: list 
      } = stateRef.current;
      
      if (!streaming || list.length === 0) {
        setIsConnected(false);
        return;
      }

      const updates: Record<string, Vitals> = {};
      const targetUpdates: Record<string, Vitals> = {};
      const results: Record<string, any> = {};
      let successfulSends = 0;

      // Use Promise.all to send requests concurrently instead of sequentially
      const promises = list.map(async (patient) => {
        const pId = patient.patient_id;
        const currentVitals = currentAllVitals[pId] || { ...DEFAULT_VITALS };
        let target = currentTargets[pId] || currentVitals;

        if (drift) {
          target = applyAutoDrift(target, fatal);
          targetUpdates[pId] = target;
        }

        const v = progressVitalsTowardTarget(currentVitals, target);
        updates[pId] = v;

        try {
          const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              patient_id: pId,
              timestamp: Math.floor(Date.now() / 1000),
              vitals: {
                ...v,
                hb: 14.0, // Default value for backend requirement
                age: patient.age || 70, // Fallback if age is not present
              },
            }),
          });
          if (response.ok) {
            successfulSends++;
            results[pId] = await response.json();
          }
        } catch (error) {
          // Silent catch to prevent console flooding
        }
      });

      await Promise.all(promises);

      if (Object.keys(updates).length > 0) {
        batchUpdateVitals(updates);
      }

      if (Object.keys(targetUpdates).length > 0) {
        batchUpdateTargetVitals(targetUpdates);
      }
      
      if (Object.keys(results).length > 0) {
        batchUpdateResults(results);
      }
      
      if (successfulSends > 0) {
        setIsConnected(true);
        setLastSent(Date.now());
      } else {
        setIsConnected(false);
      }
    }, 2000); // 2 seconds interval

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [batchUpdateVitals, batchUpdateTargetVitals, setLastSent]); // Only depend on stable actions

  return {
    isConnected,
  };
};
