"use client";

import { useState, type SubmitEvent } from "react";
import Banner from "./components/Banner";
import Features from "./components/Features";
import EncounterForm from "./components/EncounterForm";
import EncounterSummary from "./components/EncounterSummary";
import EncounterDetails from "./components/EncounterDetails";
import { useEncounterRequest } from "./useEncounterRequest";
import type { FormState } from "./types";

const initialForm: FormState = {
  partySize: "4",
  avgPlayerLevel: "1",
  monsterCR: "",
  monsterXP: "",
  type: [],
  name: "",
  inLair: false,
  vulnerabilities: [],
  resistances: [],
  immunities: [],
  senses: "",
  attacks: "",
  traits: "",
  proficiencyBonusMin: "",
  proficiencyBonusMax: "",
  hpMin: "",
  hpMax: "",
  initiative: "",
  acMin: "",
  acMax: "",
  size: [],
  speed: "",
  maxMonsterProfiles: "",
  maxTotalMonsters: "",
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const { state, submit, selectDifficulty } = useEncounterRequest();

  function updateField(field: keyof FormState, value: string | boolean | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const params = new URLSearchParams();
    params.set("partySize", form.partySize);
    params.set("avgPlayerLevel", form.avgPlayerLevel);
    if (form.monsterCR) params.set("monsterCR", form.monsterCR);
    if (form.monsterXP) params.set("monsterXP", form.monsterXP);
    if (form.type.length > 0) params.set("type", form.type.join(","));
    if (form.name) params.set("name", form.name);
    if (form.inLair) params.set("inLair", "true");
    if (form.vulnerabilities.length > 0) params.set("vulnerabilities", form.vulnerabilities.join(","));
    if (form.resistances.length > 0) params.set("resistances", form.resistances.join(","));
    if (form.immunities.length > 0) params.set("immunities", form.immunities.join(","));
    if (form.senses) params.set("senses", form.senses);
    if (form.attacks) params.set("attacks", form.attacks);
    if (form.traits) params.set("traits", form.traits);
    if (form.proficiencyBonusMin) params.set("proficiencyBonusMin", form.proficiencyBonusMin);
    if (form.proficiencyBonusMax) params.set("proficiencyBonusMax", form.proficiencyBonusMax);
    if (form.hpMin) params.set("hpMin", form.hpMin);
    if (form.hpMax) params.set("hpMax", form.hpMax);
    if (form.initiative) params.set("initiative", form.initiative);
    if (form.acMin) params.set("acMin", form.acMin);
    if (form.acMax) params.set("acMax", form.acMax);
    if (form.size.length > 0) params.set("size", form.size.join(","));
    if (form.speed) params.set("speed", form.speed);
    if (form.maxMonsterProfiles) params.set("maxMonsterProfiles", form.maxMonsterProfiles);
    if (form.maxTotalMonsters) params.set("maxTotalMonsters", form.maxTotalMonsters);

    submit(params);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <Banner />

      <section id="start" className="mx-auto max-w-3xl px-6 pb-20">
        <EncounterForm
          form={form}
          onFieldChange={updateField}
          onSubmit={handleSubmit}
          loading={state.status === "loading"}
          error={state.status === "error" ? state.message : null}
        />

        {state.status === "success" && (
          <EncounterSummary
            encounters={state.encounters}
            activeDifficulty={state.activeDifficulty}
            onSelectDifficulty={selectDifficulty}
          />
        )}

        {state.status === "success" && (
          <EncounterDetails
            encounters={state.encounters}
            activeDifficulty={state.activeDifficulty}
            inLair={state.inLair}
          />
        )}
      </section>

      <Features />
    </main>
  );
}
