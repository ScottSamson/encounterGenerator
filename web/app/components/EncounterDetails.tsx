import type { EncounterGroup, MonsterEntry } from "../types";
import MonsterStatBlock from "./MonsterStatBlock";

interface EncounterDetailsProps {
  encounters: EncounterGroup[];
  activeDifficulty: string | null;
  inLair: boolean;
}

function totalXp(encounter: MonsterEntry[], inLair: boolean): number {
  return encounter.reduce((sum, entry) => {
    const xp = inLair ? (entry.monster.xp_in_lair ?? entry.monster.xp) : entry.monster.xp;
    return sum + entry.count * xp;
  }, 0);
}

export default function EncounterDetails({ encounters, activeDifficulty, inLair }: EncounterDetailsProps) {
  return (
    <div className="mt-6 card p-8 text-center">
      <h2 className="text-2xl font-semibold capitalize">{activeDifficulty} encounter details</h2>

      {encounters
        .filter((group) => group.difficulty === activeDifficulty)
        .map((group) => (
          <div key={group.difficulty}>
            {group.encounter.length > 0 && (
              <p className="mt-1 text-sm text-accent-text">
                Total XP: {totalXp(group.encounter, inLair).toLocaleString()}
              </p>
            )}
            <div className="mt-6 space-y-4">
              {group.encounter.length === 0 ? (
                <p className="text-sm text-fg-subtle">No monsters found for this difficulty.</p>
              ) : (
                group.encounter.map((entry) => <MonsterStatBlock key={entry.monster.name} entry={entry} />)
              )}
            </div>
          </div>
        ))}
    </div>
  );
}
