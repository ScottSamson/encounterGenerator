import type { SubmitEvent } from "react";
import { DAMAGE_TYPES, IMMUNITY_OPTIONS, MONSTER_SIZES, MONSTER_TYPES } from "../constants";
import type { FormState } from "../types";
import FormField from "./FormField";
import RangeField from "./RangeField";
import MultiSelectDropdown from "./MultiSelectDropdown";

interface EncounterFormProps {
  form: FormState;
  onFieldChange: (field: keyof FormState, value: string | boolean | string[]) => void;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  loading: boolean;
  error: string | null;
}

export default function EncounterForm({ form, onFieldChange, onSubmit, loading, error }: EncounterFormProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-8">
      <h2 className="text-2xl font-semibold">Generate an encounter</h2>
      <form onSubmit={onSubmit} className="mt-6 grid gap-5 sm:grid-cols-2">
        <FormField
          label="Party size"
          type="number"
          min={1}
          required
          value={form.partySize}
          onChange={(value) => onFieldChange("partySize", value)}
        />

        <FormField
          label="Average player level"
          type="number"
          min={1}
          max={20}
          required
          value={form.avgPlayerLevel}
          onChange={(value) => onFieldChange("avgPlayerLevel", value)}
        />

        <FormField
          label="Max monster CR"
          type="text"
          placeholder="e.g. 1/2 or 3"
          value={form.monsterCR}
          onChange={(value) => onFieldChange("monsterCR", value)}
        />

        <FormField
          label="Monster XP override"
          type="number"
          min={0}
          placeholder="Optional"
          value={form.monsterXP}
          onChange={(value) => onFieldChange("monsterXP", value)}
        />

        <MultiSelectDropdown
          label="Monster type"
          options={MONSTER_TYPES}
          selected={form.type}
          onChange={(value) => onFieldChange("type", value)}
        />

        <FormField
          label="Monster name"
          type="text"
          placeholder="Optional search"
          value={form.name}
          onChange={(value) => onFieldChange("name", value)}
        />

        <MultiSelectDropdown
          label="Vulnerabilities"
          options={DAMAGE_TYPES}
          selected={form.vulnerabilities}
          onChange={(value) => onFieldChange("vulnerabilities", value)}
        />

        <MultiSelectDropdown
          label="Resistances"
          options={DAMAGE_TYPES}
          selected={form.resistances}
          onChange={(value) => onFieldChange("resistances", value)}
        />

        <MultiSelectDropdown
          label="Immunities"
          options={IMMUNITY_OPTIONS}
          selected={form.immunities}
          onChange={(value) => onFieldChange("immunities", value)}
        />

        <FormField
          label="Senses"
          type="text"
          placeholder="e.g. darkvision"
          value={form.senses}
          onChange={(value) => onFieldChange("senses", value)}
        />

        <FormField
          label="Attacks"
          type="text"
          placeholder="e.g. bite"
          value={form.attacks}
          onChange={(value) => onFieldChange("attacks", value)}
        />

        <FormField
          label="Traits"
          type="text"
          placeholder="e.g. amphibious"
          value={form.traits}
          onChange={(value) => onFieldChange("traits", value)}
        />

        <RangeField
          label="Proficiency bonus"
          type="number"
          min={0}
          minValue={form.proficiencyBonusMin}
          maxValue={form.proficiencyBonusMax}
          onMinChange={(value) => onFieldChange("proficiencyBonusMin", value)}
          onMaxChange={(value) => onFieldChange("proficiencyBonusMax", value)}
        />

        <RangeField
          label="HP"
          type="number"
          min={0}
          minValue={form.hpMin}
          maxValue={form.hpMax}
          onMinChange={(value) => onFieldChange("hpMin", value)}
          onMaxChange={(value) => onFieldChange("hpMax", value)}
        />

        <FormField
          label="Max initiative"
          type="number"
          placeholder="Optional"
          value={form.initiative}
          onChange={(value) => onFieldChange("initiative", value)}
        />

        <RangeField
          label="AC"
          type="number"
          min={0}
          minValue={form.acMin}
          maxValue={form.acMax}
          onMinChange={(value) => onFieldChange("acMin", value)}
          onMaxChange={(value) => onFieldChange("acMax", value)}
        />

        <MultiSelectDropdown
          label="Size"
          options={MONSTER_SIZES}
          selected={form.size}
          onChange={(value) => onFieldChange("size", value)}
        />

        <FormField
          label="Speed"
          type="text"
          placeholder="e.g. fly"
          value={form.speed}
          onChange={(value) => onFieldChange("speed", value)}
        />

        <FormField
          label="Max monster profiles"
          type="number"
          min={1}
          placeholder="Optional — cap distinct stat blocks"
          value={form.maxMonsterProfiles}
          onChange={(value) => onFieldChange("maxMonsterProfiles", value)}
        />

        <label className="flex items-center gap-3 text-sm text-slate-300 sm:col-span-2">
          <input
            type="checkbox"
            checked={form.inLair ?? false}
            onChange={(e) => onFieldChange("inLair", e.target.checked)}
            className="h-4 w-4 rounded border-white/15 bg-slate-900 accent-amber-500"
          />
          Encounter takes place in the monster&apos;s lair
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
