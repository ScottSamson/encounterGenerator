export interface ParametersInput {
    partySize: number;
    avgPlayerLevel: number;
    monsterCR: number | null;
    monsterXP: number | null;
    type: string[] | null;
    name: string | null;
    inLair: boolean;
    vulnerabilities: string[] | null;
    resistances: string[] | null;
    immunities: string[] | null;
    senses: string | null;
    attacks: string | null;
    traits: string | null;
    proficiencyBonusMin: number | null;
    proficiencyBonusMax: number | null;
    hpMin: number | null;
    hpMax: number | null;
    initiative: number | null;
    acMin: number | null;
    acMax: number | null;
    size: string[] | null;
    speed: string | null;
}

export default class Parameters {
    public partySize: number;
    public avgPlayerLevel: number;
    public monsterCR: number | null;
    public monsterXP: number | null;
    public type: string[] | null;
    public name: string | null;
    public inLair: boolean;
    public vulnerabilities: string[] | null;
    public resistances: string[] | null;
    public immunities: string[] | null;
    public senses: string | null;
    public attacks: string | null;
    public traits: string | null;
    public proficiencyBonusMin: number | null;
    public proficiencyBonusMax: number | null;
    public hpMin: number | null;
    public hpMax: number | null;
    public initiative: number | null;
    public acMin: number | null;
    public acMax: number | null;
    public size: string[] | null;
    public speed: string | null;

    constructor(input: ParametersInput) {
        this.partySize = input.partySize;
        this.avgPlayerLevel = input.avgPlayerLevel;
        this.monsterCR = input.monsterCR;
        this.monsterXP = input.monsterXP;
        this.type = input.type;
        this.name = input.name;
        this.inLair = input.inLair;
        this.vulnerabilities = input.vulnerabilities;
        this.resistances = input.resistances;
        this.immunities = input.immunities;
        this.senses = input.senses;
        this.attacks = input.attacks;
        this.traits = input.traits;
        this.proficiencyBonusMin = input.proficiencyBonusMin;
        this.proficiencyBonusMax = input.proficiencyBonusMax;
        this.hpMin = input.hpMin;
        this.hpMax = input.hpMax;
        this.initiative = input.initiative;
        this.acMin = input.acMin;
        this.acMax = input.acMax;
        this.size = input.size;
        this.speed = input.speed;
    }
}
