import { ObjectId } from "mongodb";

export default class Monster {
    constructor(public name:string, public xp: number, public challenge_rating: number, public type: string, public _id?: ObjectId) {}
}