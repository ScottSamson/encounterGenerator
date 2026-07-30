import type { SubmitEvent } from "react";
import type { FormState } from "../types";

interface EncounterFormProps {
  form: FormState;
  onFieldChange: (field: keyof FormState, value: string) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}

export default function EncounterForm({ form, onFieldChange, onSubmit, loading, error }: EncounterFormProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-semibold">Generate an encounter</h2>
      <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Party size
          <input
            type="number"
            min={1}
            required
            value={form.partySize}
            onChange={(e) => onFieldChange("partySize", e.target.value)}
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
            onChange={(e) => onFieldChange("avgPlayerLevel", e.target.value)}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Max monster CR
          <input
            type="text"
            placeholder="e.g. 1/2 or 3"
            value={form.monsterCR}
            onChange={(e) => onFieldChange("monsterCR", e.target.value)}
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
            onChange={(e) => onFieldChange("monsterXP", e.target.value)}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Monster type
          <input
            type="text"
            placeholder="e.g. humanoid"
            value={form.type}
            onChange={(e) => onFieldChange("type", e.target.value)}
            className="rounded-lg border border-white/15 bg-slate-900 px-3 py-2 text-white outline-none focus:border-amber-400"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm text-slate-300">
          Monster name
          <input
            type="text"
            placeholder="Optional search"
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
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
  );
}
