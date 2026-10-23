"use client";

import { useRef, type ReactNode, type SubmitEvent } from "react";
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

// Fields that are always visible. Everything else lives in the collapsible section.
const BASIC_FIELDS: (keyof FormState)[] = ["partySize", "avgPlayerLevel", "maxMonsterProfiles", "name"];

function hasAdvancedFilters(form: FormState): boolean {
  return (Object.entries(form) as [keyof FormState, FormState[keyof FormState]][]).some(
    ([key, value]) =>
      !BASIC_FIELDS.includes(key) && (Array.isArray(value) ? value.length > 0 : value === true || (typeof value === "string" && value !== "")),
  );
}

function FieldGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="m-0 min-w-0 rounded-xl border border-edge bg-field/30 px-4 pb-4">
      <legend className="px-2 font-display text-sm uppercase tracking-wide text-accent-text">{title}</legend>
      <div className="mt-2 grid gap-5 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

export default function EncounterForm({ form, onFieldChange, onSubmit, loading, error }: EncounterFormProps) {
  const advancedRef = useRef<HTMLDetailsElement>(null);
  const advancedSet = hasAdvancedFilters(form);

  // A browser can't focus an invalid field inside a closed <details>, so it would block the
  // submit with no visible message. Open the section when one of its fields is invalid.
  function handleInvalid(e: React.FormEvent<HTMLFormElement>) {
    if (advancedRef.current?.contains(e.target as Node)) {
      advancedRef.current.open = true; 
    }
  }

  return (
    <div className="card p-8">
      <h2 className="text-2xl font-semibold">Generate an encounter</h2>
      <form onSubmit={onSubmit} onInvalidCapture={handleInvalid} className="mt-6 grid gap-5 sm:grid-cols-2">
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
          label="Max monster profiles"
          type="number"
          min={1}
          placeholder="Cap distinct stat blocks"
          value={form.maxMonsterProfiles}
          onChange={(value) => onFieldChange("maxMonsterProfiles", value)}
        />

        <FormField
          label="Monster name"
          type="text"
          placeholder="Optional search"
          value={form.name}
          onChange={(value) => onFieldChange("name", value)}
        />

        <details ref={advancedRef} className="group sm:col-span-2">
          <summary
            className={`flex cursor-pointer list-none items-center justify-between rounded-lg border px-4 py-3 font-display [&::-webkit-details-marker]:hidden ${
              advancedSet ? "border-accent bg-accent/10 text-accent-text" : "border-edge-strong bg-field text-fg"
            }`}
          >
            <span>
              Advanced options
              {advancedSet && <span className="sr-only"> (filters set)</span>}
            </span>
            <span className="text-accent-text transition group-open:rotate-180">▾</span>
          </summary>

          <div className="mt-5 space-y-4">
            <FieldGroup title="Monster">
              <MultiSelectDropdown
                label="Monster type"
                options={MONSTER_TYPES}
                selected={form.type}
                onChange={(value) => onFieldChange("type", value)}
              />

              <MultiSelectDropdown
                label="Size"
                options={MONSTER_SIZES}
                selected={form.size}
                onChange={(value) => onFieldChange("size", value)}
              />

              <FormField
                label="Max monster CR"
                type="text"
                placeholder="e.g. 1/2 or 3"
                value={form.monsterCR}
                onChange={(value) => onFieldChange("monsterCR", value)}
              />

              <FormField
                label="Max monster XP"
                type="number"
                min={0}
                placeholder="Optional"
                value={form.monsterXP}
                onChange={(value) => onFieldChange("monsterXP", value)}
              />

              <FormField
                label="Max total monsters"
                type="number"
                min={1}
                placeholder="Optional — cap total creature count"
                value={form.maxTotalMonsters}
                onChange={(value) => onFieldChange("maxTotalMonsters", value)}
              />

              <div className="group/lair relative w-fit self-end">
                <label className="flex items-center gap-3 border border-transparent py-2 text-sm text-fg-muted">
                  <input
                    type="checkbox"
                    checked={form.inLair ?? false}
                    onChange={(e) => onFieldChange("inLair", e.target.checked)}
                    aria-describedby="lair-tooltip"
                    className="h-4 w-4 rounded border-edge-strong bg-field accent-accent"
                  />
                  Encounter takes place in the monster&apos;s lair
                </label>
                <span
                  id="lair-tooltip"
                  role="tooltip"
                  className="pointer-events-none absolute bottom-full left-0 z-10 mb-1 w-max max-w-full rounded-md border border-edge-strong bg-page px-3 py-2 text-xs text-fg opacity-0 shadow-lg transition-opacity group-has-[:focus-visible]/lair:opacity-100 group-hover/lair:opacity-100"
                >
                  Lair actions and abilities increase difficulty
                </span>
              </div>
            </FieldGroup>

            <FieldGroup title="Damage">
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
            </FieldGroup>

            <FieldGroup title="Abilities">
              <FormField
                label="Senses"
                type="text"
                placeholder="darkvision or passive perception 15"
                value={form.senses}
                onChange={(value) => onFieldChange("senses", value)}
              />

              <FormField
                label="Attacks"
                type="text"
                placeholder="bite, rake, or multiattack"
                value={form.attacks}
                onChange={(value) => onFieldChange("attacks", value)}
              />

              <FormField
                label="Traits"
                type="text"
                placeholder="amphibious or flyby"
                value={form.traits}
                onChange={(value) => onFieldChange("traits", value)}
              />

              <FormField
                label="Speed"
                type="text"
                placeholder="60 ft or fly"
                value={form.speed}
                onChange={(value) => onFieldChange("speed", value)}
              />
            </FieldGroup>

            <FieldGroup title="Stat ranges">
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

              <RangeField
                label="AC"
                type="number"
                min={0}
                minValue={form.acMin}
                maxValue={form.acMax}
                onMinChange={(value) => onFieldChange("acMin", value)}
                onMaxChange={(value) => onFieldChange("acMax", value)}
              />

              <FormField
                label="Max initiative"
                type="number"
                placeholder="Optional"
                value={form.initiative}
                onChange={(value) => onFieldChange("initiative", value)}
              />
            </FieldGroup>
          </div>
        </details>

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-full btn-brass px-5 py-3 font-medium text-on-accent transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Generating..." : "Generate encounters"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-6 rounded-lg border border-danger-bright/30 bg-danger/10 px-4 py-3 text-sm text-danger-text">
          {error}
        </p>
      )}
    </div>
  );
}
