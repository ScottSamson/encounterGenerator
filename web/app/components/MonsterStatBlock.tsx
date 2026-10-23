import type { MonsterEntry, MonsterFeature } from "../types";

const ABILITY_KEYS = ["str", "dex", "con", "int", "wis", "cha"] as const;

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

function FeatureList({ title, features }: { title: string; features?: MonsterFeature[] }) {
  if (!features || features.length === 0) return null;
  return (
    <div className="mt-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-accent-text">{title}</h4>
      <ul className="mt-1 space-y-1 text-sm text-fg-muted">
        {features.map((feature) => (
          <li key={feature.name}>
            <span className="font-medium text-fg">{feature.name}.</span> {feature.description}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MonsterStatBlock({ entry }: { entry: MonsterEntry }) {
  const m = entry.monster;
  return (
    <div className="statblock p-5 text-left">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-lg font-semibold text-accent-text">
          {entry.count}x {m.name}
        </h3>
        <span className="text-xs text-fg-subtle">
          CR {m.challenge_rating} &middot; {m.xp} XP
          {m.xp_in_lair !== undefined && ` (${m.xp_in_lair} in lair)`}
        </span>
      </div>
      <p className="mt-1 text-sm capitalize text-fg-subtle">
        {m.size} {m.type}, {m.alignment}
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2 text-sm text-fg-muted sm:grid-cols-4">
        <div>AC {m.ac}</div>
        <div>
          HP {m.hp} ({m.hit_dice})
        </div>
        <div>Speed {m.speed_raw}</div>
        <div>Initiative {signed(m.initiative)}</div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
        {ABILITY_KEYS.map((key) => (
          <div key={key} className="rounded-lg border border-accent-text/40 py-1">
            <div className="uppercase text-fg-subtle">{key}</div>
            <div className="font-medium text-fg">
              {m.abilities[key].score} ({signed(m.abilities[key].mod)})
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 space-y-1 text-sm text-fg-muted">
        {m.skills_raw && (
          <p>
            <span className="text-fg-subtle">Skills:</span> {m.skills_raw}
          </p>
        )}
        {m.vulnerabilities && (
          <p>
            <span className="text-fg-subtle">Vulnerabilities:</span> {m.vulnerabilities}
          </p>
        )}
        {m.resistances && (
          <p>
            <span className="text-fg-subtle">Resistances:</span> {m.resistances}
          </p>
        )}
        {m.immunities && (
          <p>
            <span className="text-fg-subtle">Immunities:</span> {m.immunities}
          </p>
        )}
        <p>
          <span className="text-fg-subtle">Senses:</span> {m.senses}
        </p>
        <p>
          <span className="text-fg-subtle">Languages:</span> {m.languages}
        </p>
        {m.gear && (
          <p>
            <span className="text-fg-subtle">Gear:</span> {m.gear}
          </p>
        )}
        <p>
          <span className="text-fg-subtle">Proficiency Bonus:</span> +{m.proficiency_bonus}
        </p>
      </div>

      <FeatureList title="Traits" features={m.traits} />
      <FeatureList title="Actions" features={m.actions} />
      <FeatureList title="Bonus Actions" features={m.bonus_actions} />
      <FeatureList title="Reactions" features={m.reactions} />
    </div>
  );
}
