export default class Parameters {
    constructor(
        public partySize: number,
        public avgPlayerLevel: number,
        public monsterCR: number | null,
        public monsterXP: number | null,
        public type: string | null,
        public name: string | null,
    ) {}
}
