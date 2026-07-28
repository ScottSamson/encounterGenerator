import { collections } from "./database.service";

export async function generateEncounter (params?: any) {
    try {
        console.log("Generating encounter with params:", params);
        const monstersCollection = collections.monsters;
        if (!monstersCollection) {
            throw new Error("Monster collection is not initialized");
        }

        const conditions: any[] = [];
        if (params) {
            if (params.name) {
                conditions.push({ name: { $regex: params.name } });
            }
            if (params.challengeRating !== undefined) {
                var decimal = eval(params.challengeRating); 
                conditions.push({ challenge_rating: { $lte: decimal } });
            }
            if (params.xp !== undefined) {
                conditions.push({ xp: { $lte: params.xp } });
            }
            if (params.type) {
                conditions.push({ type: params.type });
            }
        }

        const query = conditions.length ? { $and: conditions } : {};
        console.log("Querying monsters with:", query);
        let monsters = await monstersCollection.find(query).toArray();
        return monsters;
    } catch (err) {
        console.log (err);
        throw new Error("Failed to generate encounter");
    }
}