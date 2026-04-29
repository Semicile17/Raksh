"use client";

import { useEffect, useMemo, useState } from "react";

type AlertLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type FilterLevel = AlertLevel | "ALL" | "WAITING";
type Tone = "green" | "amber" | "red" | "slate";

type Patient = {
  _id?: string;
  patient_id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  ward: string;
  bed_number: string;
  notes?: string;
  result: RiskResult | null;
};

type RiskResult = {
  patient_id: string;
  reading_index: number;
  news_total: number;
  raw_score: number;
  smoothed_score: number;
  alert_level: AlertLevel;
  reasons: string[];
  trend_directions: Record<string, string>;
  shock_pattern: boolean;
  resp_pattern: boolean;
  vitals: Record<string, number>;
  timestamp: number;
};

type MonitorPayload = {
  generatedAt: number;
  sources: {
    sim: { ok: boolean; url: string; error?: string };
    core: { ok: boolean; url: string; error?: string };
  };
  patients: Patient[];
};

const alertOrder: Record<AlertLevel, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MODERATE: 2,
  LOW: 3,
};

const alertStyles: Record<AlertLevel | "WAITING", string> = {
  CRITICAL: "border-red-500 bg-red-50 text-red-800",
  HIGH: "border-orange-500 bg-orange-50 text-orange-800",
  MODERATE: "border-amber-500 bg-amber-50 text-amber-800",
  LOW: "border-emerald-500 bg-emerald-50 text-emerald-800",
  WAITING: "border-slate-300 bg-slate-100 text-slate-600",
};

const alertAccent: Record<AlertLevel | "WAITING", string> = {
  CRITICAL: "bg-red-600",
  HIGH: "bg-orange-500",
  MODERATE: "bg-amber-500",
  LOW: "bg-emerald-500",
  WAITING: "bg-slate-400",
};

const filters: FilterLevel[] = ["ALL", "CRITICAL", "HIGH", "MODERATE", "LOW", "WAITING"];

const vitalLabels: Record<string, { label: string; unit: string; normal: [number, number]; reverse?: boolean }> = {
  hr: { label: "Heart Rate", unit: "bpm", normal: [60, 100] },
  bp_sys: { label: "Systolic BP", unit: "mmHg", normal: [90, 140] },
  spo2: { label: "SpO2", unit: "%", normal: [95, 100], reverse: true },
  rr: { label: "Resp. Rate", unit: "/min", normal: [12, 20] },
  temp: { label: "Temperature", unit: "C", normal: [36.5, 37.5] },
  hb: { label: "Haemoglobin", unit: "g/dL", normal: [10, 17], reverse: true },
};

export function DoctorDashboard() {
  const [payload, setPayload] = useState<MonitorPayload | null>(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterLevel>("ALL");

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const response = await fetch("/api/monitor", { cache: "no-store" });
        const data = (await response.json()) as MonitorPayload;
        if (!response.ok) throw new Error("Dashboard API failed");

        if (active) {
          setPayload(data);
          setError("");
          if (!selectedId && data.patients[0]) setSelectedId(data.patients[0].patient_id);
        }
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Unable to refresh dashboard");
      }
    }

    load();
    const timer = window.setInterval(load, 2000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [selectedId]);

  const patients = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return [...(payload?.patients || [])]
      .filter((patient) => {
        const level = displayAlertLevel(patient);
        if (filter !== "ALL" && filter !== level) return false;
        if (!normalizedQuery) return true;

        return [patient.name, patient.patient_id, patient.ward, patient.bed_number]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .sort((a, b) => {
        const aLevel = displayAlertLevel(a);
        const bLevel = displayAlertLevel(b);
        const aRank = aLevel === "WAITING" ? 4 : alertOrder[aLevel];
        const bRank = bLevel === "WAITING" ? 4 : alertOrder[bLevel];
        return aRank - bRank || riskScore(b) - riskScore(a) || a.name.localeCompare(b.name);
      });
  }, [filter, payload, query]);

  const allPatients = payload?.patients || [];
  const selected = patients.find((patient) => patient.patient_id === selectedId)
    || allPatients.find((patient) => patient.patient_id === selectedId)
    || patients[0]
    || allPatients[0];
  const stats = buildStats(allPatients);
  const criticalCount = stats.critical + stats.high;

  return (
    <main className="min-h-screen bg-[#eef2f6] text-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-5 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-700 text-lg font-black text-white shadow-sm">
              R
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Raksh Clinical Command</p>
              <h1 className="text-2xl font-black tracking-tight">Doctor Monitoring Dashboard</h1>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs font-semibold sm:flex">
            <ConnectionBadge label="Simulation" ok={payload?.sources.sim.ok} detail={payload?.sources.sim.error} />
            <ConnectionBadge label="Core" ok={payload?.sources.core.ok} detail={payload?.sources.core.error} />
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500">
              Refresh {payload ? new Date(payload.generatedAt).toLocaleTimeString() : "starting"}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-4 p-4 xl:grid-cols-[380px_1fr]">
        <aside className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="grid grid-cols-5 gap-2">
              <Stat label="Crit" value={stats.critical} tone="red" />
              <Stat label="High" value={stats.high} tone="orange" />
              <Stat label="Mod" value={stats.moderate} tone="amber" />
              <Stat label="Low" value={stats.low} tone="green" />
              <Stat label="Wait" value={stats.waiting} tone="slate" />
            </div>

            <div className="mt-4 grid gap-3">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, ID, ward, bed"
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
              />
              <div className="flex flex-wrap gap-1.5">
                {filters.map((item) => (
                  <button
                    key={item}
                    onClick={() => setFilter(item)}
                    className={`rounded-md border px-2.5 py-1.5 text-[11px] font-black transition ${
                      filter === item
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-teal-400"
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="max-h-[calc(100vh-250px)] overflow-y-auto p-2">
            {patients.length === 0 ? (
              <div className="p-6 text-sm text-slate-500">No patients match the current view.</div>
            ) : (
              patients.map((patient) => (
                <PatientRow
                  key={patient.patient_id}
                  patient={patient}
                  selected={selected?.patient_id === patient.patient_id}
                  onSelect={() => setSelectedId(patient.patient_id)}
                />
              ))
            )}
          </div>
        </aside>

        <section className="space-y-4">
          {error && <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <TriageBanner count={criticalCount} />
          {selected ? <PatientDetail patient={selected} /> : <EmptyState />}
        </section>
      </div>
    </main>
  );
}

function PatientRow({ patient, selected, onSelect }: { patient: Patient; selected: boolean; onSelect: () => void }) {
  const level = displayAlertLevel(patient);
  const score = riskScore(patient);

  return (
    <button
      onClick={onSelect}
      className={`mb-2 grid w-full grid-cols-[4px_1fr] overflow-hidden rounded-md border text-left shadow-sm transition hover:border-teal-500 ${
        selected ? "border-teal-700 bg-teal-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className={alertAccent[level]} />
      <div className="p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-black">{patient.name}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {patient.patient_id} | Ward {patient.ward} | Bed {patient.bed_number}
            </p>
          </div>
          <AlertPill level={level} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            {patient.age}y | {patient.gender}
          </div>
          <div className="flex min-w-[116px] items-center gap-2">
            <RiskBar value={score} level={level} />
            <span className="w-8 text-right text-xs font-black text-slate-700">{patient.result ? score : "--"}</span>
          </div>
        </div>
      </div>
    </button>
  );
}

function TriageBanner({ count }: { count: number }) {
  if (count === 0) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
        No high-acuity patients in the current feed.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-800">
      {count} patient{count === 1 ? "" : "s"} need immediate review.
    </div>
  );
}

function PatientDetail({ patient }: { patient: Patient }) {
  const result = patient.result;
  const level = displayAlertLevel(patient);
  const score = riskScore(patient);

  return (
    <>
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className={`h-1.5 ${alertAccent[level]}`} />
        <div className="grid gap-5 p-5 xl:grid-cols-[1fr_360px]">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight">{patient.name}</h2>
              <AlertPill level={level} />
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2 lg:grid-cols-4">
              <PatientMeta label="Patient ID" value={patient.patient_id} />
              <PatientMeta label="Location" value={`Ward ${patient.ward}, Bed ${patient.bed_number}`} />
              <PatientMeta label="Age/Sex" value={`${patient.age}y, ${patient.gender}`} />
              <PatientMeta label="Last Core Read" value={result ? new Date(result.timestamp * 1000).toLocaleTimeString() : "Waiting"} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Metric label="Risk" value={result ? score : "--"} tone={level} />
            <Metric label="NEWS" value={result ? result.news_total : "--"} tone="WAITING" />
            <Metric label="Read" value={result ? result.reading_index : "--"} tone="WAITING" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1fr_420px]">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Live Vitals</h3>
            {result && <span className="text-xs font-bold text-slate-400">Raw {result.raw_score}</span>}
          </div>
          {result ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(vitalLabels).map(([key, meta]) => (
                <VitalTile key={key} label={meta.label} unit={meta.unit} value={result.vitals[key]} normal={meta.normal} reverse={meta.reverse} />
              ))}
            </div>
          ) : (
            <div className="mt-8 rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">
              Waiting for this patient to enter the core stream.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Core Assessment</h3>
            {result ? (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <Pattern label="Shock" active={result.shock_pattern} />
                  <Pattern label="Respiratory" active={result.resp_pattern} />
                </div>
                <TrendGrid trends={result.trend_directions} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No scoring data yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black uppercase tracking-[0.18em] text-slate-500">Risk Reasons</h3>
            {result && result.reasons.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {result.reasons.map((reason) => (
                  <li key={reason} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700">
                    {reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-slate-500">No active risk reasons.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function TrendGrid({ trends }: { trends: Record<string, string> }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-widest text-slate-400">Trends</p>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(trends).map(([key, value]) => (
          <div key={key} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold">
            <span className="uppercase text-slate-500">{key}</span>
            <span className={`float-right capitalize ${trendColor(value)}`}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function buildStats(patients: Patient[]) {
  return patients.reduce(
    (stats, patient) => {
      if (!patient.result) stats.waiting += 1;
      else if (displayAlertLevel(patient) === "CRITICAL") stats.critical += 1;
      else if (displayAlertLevel(patient) === "HIGH") stats.high += 1;
      else if (displayAlertLevel(patient) === "LOW") stats.low += 1;
      else stats.moderate += 1;
      return stats;
    },
    { critical: 0, high: 0, moderate: 0, low: 0, waiting: 0 },
  );
}

function riskScore(patient: Patient) {
  return Math.round(patient.result?.smoothed_score || 0);
}

function displayAlertLevel(patient: Patient): AlertLevel | "WAITING" {
  if (!patient.result) return "WAITING";

  const score = riskScore(patient);
  if (score >= 75) return "CRITICAL";
  if (score >= 55) return "HIGH";
  if (score >= 30) return "MODERATE";
  return "LOW";
}

function vitalTone(value: number | undefined, normal: [number, number], reverse?: boolean): Tone {
  if (typeof value !== "number") return "slate";
  const [low, high] = normal;
  if (value >= low && value <= high) return "green";
  const distance = reverse ? low - value : Math.max(value - high, low - value);
  if (distance > (high - low) * 0.75) return "red";
  return "amber";
}

function trendColor(value: string) {
  if (value === "worsening") return "text-red-700";
  if (value === "improving") return "text-emerald-700";
  return "text-slate-600";
}

function AlertPill({ level }: { level: AlertLevel | "WAITING" }) {
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${alertStyles[level]}`}>{level}</span>;
}

function ConnectionBadge({ label, ok, detail }: { label: string; ok?: boolean; detail?: string }) {
  const dotClass = ok === undefined ? "bg-slate-300" : ok ? "bg-emerald-500" : "bg-red-500";
  const textClass = ok === false ? "text-red-700" : "text-slate-600";

  return (
    <div title={detail || ""} className={`rounded-md border border-slate-200 bg-slate-50 px-3 py-2 ${textClass}`}>
      <span className={`mr-2 inline-block h-2 w-2 rounded-full ${dotClass}`} />
      {label}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "red" | "orange" | "amber" | "green" | "slate" }) {
  const tones = {
    red: "border-red-200 bg-red-50 text-red-700",
    orange: "border-orange-200 bg-orange-50 text-orange-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    slate: "border-slate-200 bg-white text-slate-700",
  };

  return (
    <div className={`rounded-md border p-2 text-center ${tones[tone]}`}>
      <p className="text-xl font-black">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string | number; tone: AlertLevel | "WAITING" }) {
  return (
    <div className={`rounded-md border px-4 py-3 text-center ${alertStyles[tone]}`}>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-wider opacity-70">{label}</p>
    </div>
  );
}

function PatientMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 font-bold text-slate-700">{value}</p>
    </div>
  );
}

function VitalTile({ label, value, unit, normal, reverse }: { label: string; value?: number; unit: string; normal: [number, number]; reverse?: boolean }) {
  const tone = vitalTone(value, normal, reverse);
  const styles: Record<Tone, string> = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
    slate: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <div className={`rounded-md border p-4 ${styles[tone]}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wider opacity-70">{label}</p>
        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-black">
          {normal[0]}-{normal[1]}
        </span>
      </div>
      <p className="mt-4 text-4xl font-black tracking-tight">
        {typeof value === "number" ? value : "--"} <span className="text-sm font-bold opacity-60">{unit}</span>
      </p>
    </div>
  );
}

function RiskBar({ value, level }: { value: number; level: AlertLevel | "WAITING" }) {
  return (
    <div className="h-2 flex-1 rounded-full bg-slate-200">
      <div className={`h-full rounded-full ${alertAccent[level]}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Pattern({ label, active }: { label: string; active: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-3 text-sm font-black ${active ? "border-red-300 bg-red-50 text-red-700" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
      <span className="block text-[10px] uppercase tracking-widest opacity-70">{label}</span>
      {active ? "Detected" : "Clear"}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">
      Start the simulation app and add patients to begin monitoring.
    </div>
  );
}
