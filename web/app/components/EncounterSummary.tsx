import type { EncounterGroup } from "../types";

interface EncounterSummaryProps {
  encounters: EncounterGroup[];
  activeDifficulty: string | null;
  onSelectDifficulty: (difficulty: string) => void;
}

export default function EncounterSummary({ encounters, activeDifficulty, onSelectDifficulty }: EncounterSummaryProps) {
  return (
    <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
      <h2 className="text-2xl font-semibold">Your encounters</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {encounters.map((group) => (
          <button
            key={group.difficulty}
            type="button"
            onClick={() => onSelectDifficulty(group.difficulty)}
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

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {encounters.map((group) => (
          <div key={group.difficulty}>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-300">
              {group.difficulty}
            </h3>
            {group.encounter.length === 0 ? (
              <p className="mt-2 text-sm text-slate-400">No monsters found.</p>
            ) : (
              <ul className="mt-2 space-y-1 text-sm text-slate-300">
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
    </div>
  );
}
