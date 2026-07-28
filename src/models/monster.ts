import { ObjectId } from "mongodb";

export default class Monster {
    constructor(public name:string, public _id?: ObjectId) {}
}