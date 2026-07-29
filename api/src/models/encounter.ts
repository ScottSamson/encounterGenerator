import type Monster from "./monster.ts";

export default class Encounter {
    constructor(public monsters: Monster[], public xp: number, public challengeRating: string, public difficulty: string) {
        
    }
}