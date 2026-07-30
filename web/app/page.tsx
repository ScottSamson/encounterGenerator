"use client";

import { useState, type SubmitEvent } from "react";
import Banner from "./components/Banner";
import Features from "./components/Features";
import EncounterForm from "./components/EncounterForm";
import EncounterSummary from "./components/EncounterSummary";
import EncounterDetails from "./components/EncounterDetails";
import type { EncounterGroup, FormState } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const initialForm: FormState = {
  partySize: "4",
  avgPlayerLevel: "1",
  monsterCR: "",
  monsterXP: "",
  type: "",
  name: "",
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [encounters, setEncounters] = useState<EncounterGroup[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDifficulty, setActiveDifficulty] = useState<string | null>(null);

  function updateField(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setEncounters(null);
    setActiveDifficulty(null);

    const params = new URLSearchParams();
    params.set("partySize", form.partySize);
    params.set("avgPlayerLevel", form.avgPlayerLevel);
    if (form.monsterCR) params.set("monsterCR", form.monsterCR);
    if (form.monsterXP) params.set("monsterXP", form.monsterXP);
    if (form.type) params.set("type", form.type);
    if (form.name) params.set("name", form.name);

    try {
      const res = await fetch(`${API_BASE}/api/encounters/generate?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      const data: EncounterGroup[] = await res.json();
      setEncounters(data);
      setActiveDifficulty(data[0]?.difficulty ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate encounters");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Banner />

      <section id="start" className="mx-auto max-w-3xl px-6 pb-20">
        <EncounterForm form={form} onFieldChange={updateField} onSubmit={handleSubmit} loading={loading} error={error} />

        {encounters && (
          <EncounterSummary
            encounters={encounters}
            activeDifficulty={activeDifficulty}
            onSelectDifficulty={setActiveDifficulty}
          />
        )}

        {encounters && <EncounterDetails encounters={encounters} activeDifficulty={activeDifficulty} />}
      </section>

      <Features />
    </main>
  );
}
