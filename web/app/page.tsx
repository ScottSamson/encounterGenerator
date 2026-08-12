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
  type: "",
  name: "",
  inLair: false,
};

export default function HomePage() {
  const [form, setForm] = useState<FormState>(initialForm);
  const { state, submit, selectDifficulty } = useEncounterRequest();

  function updateField(field: keyof FormState, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();

    const params = new URLSearchParams();
    params.set("partySize", form.partySize);
    params.set("avgPlayerLevel", form.avgPlayerLevel);
    if (form.monsterCR) params.set("monsterCR", form.monsterCR);
    if (form.monsterXP) params.set("monsterXP", form.monsterXP);
    if (form.type) params.set("type", form.type);
    if (form.name) params.set("name", form.name);
    if (form.inLair) params.set("inLair", "true");

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
