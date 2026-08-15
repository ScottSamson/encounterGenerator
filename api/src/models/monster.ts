import { ObjectId } from "mongodb";

export interface MonsterAction {
    name: string;
    description: string;
}

export default class Monster {
    constructor(
        public name: string,
        public xp: number,
        public challenge_rating: number,
        public type: string,
        public _id?: ObjectId,
        public xp_in_lair?: number,
        public vulnerabilities?: string,
        public immunities?: string,
        public senses?: string,
        public actions?: MonsterAction[],
        public proficiency_bonus?: number,
        public hp?: number,
        public hit_dice?: string,
        public initiative?: number,
        public ac?: number,
        public size?: string,
        public speed_raw?: string,
        public resistances?: string,
        public traits?: MonsterAction[],
    ) {}
}