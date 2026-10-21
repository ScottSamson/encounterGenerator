export interface AbilityScore {
  score: number;
  mod: number;
  save: number;
}

export interface MonsterFeature {
  name: string;
  description: string;
}

export interface MonsterDetail {
  name: string;
  size: string;
  type: string;
  alignment: string;
  ac: number;
  initiative: number;
  hp: number;
  hit_dice: string;
  speed_raw: string;
  abilities: {
    str: AbilityScore;
    dex: AbilityScore;
    con: AbilityScore;
    int: AbilityScore;
    wis: AbilityScore;
    cha: AbilityScore;
  };
  skills_raw?: string;
  resistances?: string;
  vulnerabilities?: string;
  immunities?: string;
  senses: string;
  languages: string;
  xp_in_lair?: number;
  challenge_rating: number;
  xp: number;
  proficiency_bonus: number;
  gear?: string;
  traits?: MonsterFeature[];
  actions?: MonsterFeature[];
  bonus_actions?: MonsterFeature[];
  reactions?: MonsterFeature[];
}

export interface MonsterEntry {
  count: number;
  monster: MonsterDetail;
}

export interface EncounterGroup {
  difficulty: string;
  xpThreshold: number;
  encounter: MonsterEntry[];
}

export interface FormState {
  partySize: string;
  avgPlayerLevel: string;
  monsterCR: string;
  monsterXP: string;
  type: string[];
  name: string;
  inLair: boolean;
  vulnerabilities: string[];
  resistances: string[];
  immunities: string[];
  senses: string;
  attacks: string;
  traits: string;
  proficiencyBonusMin: string;
  proficiencyBonusMax: string;
  hpMin: string;
  hpMax: string;
  initiative: string;
  acMin: string;
  acMax: string;
  size: string[];
  speed: string;
  maxMonsterProfiles: string;
  maxTotalMonsters: string;
}
