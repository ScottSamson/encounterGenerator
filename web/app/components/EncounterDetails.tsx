import type { EncounterGroup } from "../types";
import MonsterStatBlock from "./MonsterStatBlock";

interface EncounterDetailsProps {
  encounters: EncounterGroup[];
  activeDifficulty: string | null;
}

export default function EncounterDetails({ encounters, activeDifficulty }: EncounterDetailsProps) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <h2 className="text-2xl font-semibold capitalize">{activeDifficulty} encounter details</h2>

      {encounters
        .filter((group) => group.difficulty === activeDifficulty)
        .map((group) => (
          <div key={group.difficulty} className="mt-6 space-y-4">
            {group.encounter.length === 0 ? (
              <p className="text-sm text-slate-400">No monsters found for this difficulty.</p>
            ) : (
              group.encounter.map((entry) => <MonsterStatBlock key={entry.monster.name} entry={entry} />)
            )}
          </div>
        ))}
    </div>
  );
}
