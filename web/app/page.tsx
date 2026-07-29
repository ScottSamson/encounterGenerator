"use client";

import { useState, type SubmitEvent } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface MonsterEntry {
  count: number;
  monster: {
    name: string;
    xp: number;
    challenge_rating: number;
    type: string;
  };
}

interface EncounterGroup {
  difficulty: string;
  encounter: MonsterEntry[];
}

interface FormState {
  partySize: string;
  avgPlayerLevel: string;
  monsterCR: string;
  monsterXP: string;
  type: string;
  name: string;
}

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
      <section className="mx-auto flex max-w-5xl flex-col items-center justify-center px-6 py-24 text-center">
        <span className="mb-4 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-sm text-amber-300">
          D&D Encounter Generator
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-6xl">
          Build memorable encounters in minutes.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-slate-300">
          A simple, polished single-page experience for planning encounters, balancing difficulty, and getting to the table faster.
        </p>
      </section>

      <section id="start" className="mx-auto max-w-3xl px-6 pb-20">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-2xl font-semibold">Generate an encounter</h2>
          <form onSubmit={handleSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Party size
              <input
                type="number"
                min={1}
                required
                value={form.partySize}
                onChange={(e) => updateField("partySize", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Average player level
              <input
                type="number"
                min={1}
                max={20}
                required
                value={form.avgPlayerLevel}
                onChange={(e) => updateField("avgPlayerLevel", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Max monster CR
              <input
                type="text"
                placeholder="e.g. 1/2 or 3"
                value={form.monsterCR}
                onChange={(e) => updateField("monsterCR", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Monster XP override
              <input
                type="number"
                min={0}
                placeholder="Optional"
                value={form.monsterXP}
                onChange={(e) => updateField("monsterXP", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Monster type
              <input
                type="text"
                placeholder="e.g. humanoid"
                value={form.type}
                onChange={(e) => updateField("type", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm text-slate-300">
              Monster name
              <input
                type="text"
                placeholder="Optional search"
                value={form.name}
                onChange={(e) => updateField("name", e.target.value)}
                className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
              />
            </label>

            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-amber-500 px-5 py-3 font-medium text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Generating..." : "Generate encounters"}
              </button>
            </div>
          </form>

          {error && (
            <p className="mt-6 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        {encounters && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
            <h2 className="text-2xl font-semibold">Your encounters</h2>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {encounters.map((group) => (
                <button
                  key={group.difficulty}
                  type="button"
                  onClick={() => setActiveDifficulty(group.difficulty)}
                  className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
                    activeDifficulty === group.difficulty
                      ? "bg-amber-500 text-slate-950"
                      : "border border-white/15 text-white hover:bg-white/10"
                  }`}
                >
                  {group.difficulty}
                </button>
              ))}
            </div>

            {encounters
              .filter((group) => group.difficulty === activeDifficulty)
              .map((group) => (
                <div key={group.difficulty} className="mt-6">
                  {group.encounter.length === 0 ? (
                    <p className="text-sm text-slate-400">No monsters found for this difficulty.</p>
                  ) : (
                    <ul className="space-y-1 text-sm text-slate-300">
                      {group.encounter.map((entry) => (
                        <li key={entry.monster.name}>
                          {entry.count}x {entry.monster.name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
          </div>
        )}
      </section>

      <section id="features" className="mx-auto max-w-5xl px-6 pb-20">
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Fast setup</h2>
            <p className="mt-2 text-slate-300">Create encounters quickly with a clean, focused flow.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Balanced pacing</h2>
            <p className="mt-2 text-slate-300">Design encounters that fit your party size and difficulty.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold">Ready to run</h2>
            <p className="mt-2 text-slate-300">Bring the setup to the table with confidence and clarity.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
