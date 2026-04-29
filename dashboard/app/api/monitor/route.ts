type Patient = {
  _id?: string;
  patient_id: string;
  name: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  ward: string;
  bed_number: string;
  notes?: string;
};

type SourceStatus = {
  ok: boolean;
  url: string;
  error?: string;
};

export const dynamic = "force-dynamic";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

async function readJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: "no-store" });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String(payload.error)
        : `Request failed with ${response.status}`;
    throw new Error(message);
  }

  return payload as T;
}

export async function GET() {
  const simUrl = trimTrailingSlash(process.env.SIM_API_URL || "http://127.0.0.1:3000");
  const coreUrl = trimTrailingSlash(process.env.CORE_API_URL || "http://127.0.0.1:8000");

  let patients: Patient[] = [];
  let results: Record<string, unknown> = {};
  const sources: { sim: SourceStatus; core: SourceStatus } = {
    sim: { ok: true, url: simUrl },
    core: { ok: true, url: coreUrl },
  };

  try {
    const payload = await readJson<Patient[]>(`${simUrl}/api/patients`);
    patients = Array.isArray(payload) ? payload : [];
  } catch (error) {
    sources.sim = {
      ok: false,
      url: simUrl,
      error: error instanceof Error ? error.message : "Unable to reach simulation API",
    };
  }

  try {
    const payload = await readJson<{ results?: Record<string, unknown> }>(`${coreUrl}/results`);
    results = payload.results || {};
  } catch (error) {
    sources.core = {
      ok: false,
      url: coreUrl,
      error: error instanceof Error ? error.message : "Unable to reach core API",
    };
  }

  return Response.json({
    generatedAt: Date.now(),
    sources,
    patients: patients.map((patient) => ({
      ...patient,
      result: results[patient.patient_id] || null,
    })),
  });
}
