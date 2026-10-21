import type { EncounterGroup } from "../types";

interface EncounterSummaryProps {
  encounters: EncounterGroup[];
  activeDifficulty: string | null;
  onSelectDifficulty: (difficulty: string) => void;
}

export default function EncounterSummary({ encounters, activeDifficulty, onSelectDifficulty }: EncounterSummaryProps) {
  return (
    <div className="mt-6 card p-8 text-center">
      <h2 className="text-2xl font-semibold">Your encounters</h2>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {encounters.map((group) => (
          <button
            key={group.difficulty}
            type="button"
            onClick={() => onSelectDifficulty(group.difficulty)}
            className={`rounded-full px-4 py-2 text-sm font-medium capitalize transition ${
              activeDifficulty === group.difficulty
                ? "bg-accent text-on-accent"
                : "border border-edge-strong text-fg hover:bg-hover"
            }`}
          >
            {group.difficulty}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-3">
        {encounters.map((group, index) => {
          const lowerBound = index === 0 ? 0 : encounters[index - 1]!.xpThreshold + 1;
          return (
            <div key={group.difficulty}>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-accent-text">
                {group.difficulty}
              </h3>
              <p className="text-xs text-fg-faint">
                {lowerBound.toLocaleString()}–{group.xpThreshold.toLocaleString()} XP
              </p>
              {group.encounter.length === 0 ? (
                <p className="mt-2 text-sm text-fg-subtle">No monsters found.</p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-fg-muted">
                  {group.encounter.map((entry) => (
                    <li key={entry.monster.name}>
                      {entry.count}x {entry.monster.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
