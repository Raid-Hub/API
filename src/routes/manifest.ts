import express, { Request, Response } from "express"
import {
    ContestRaids,
    Difficulty,
    ListedRaid,
    ListedRaids,
    MasterRaids,
    PrestigeRaids,
    Raid,
    RaidHashes,
    ReprisedRaidDifficultyPairings,
    SunsetRaids
} from "../data"
import { success } from "../util"

export const manifestRouter = express.Router()

const raids: Record<Raid, string> = {
    [Raid.NA]: "N/A",
    [Raid.LEVIATHAN]: "Leviathan",
    [Raid.EATER_OF_WORLDS]: "Eater of Worlds",
    [Raid.SPIRE_OF_STARS]: "Spire of Stars",
    [Raid.LAST_WISH]: "Last Wish",
    [Raid.SCOURGE_OF_THE_PAST]: "Scourge of the Past",
    [Raid.CROWN_OF_SORROW]: "Crown of Sorrow",
    [Raid.GARDEN_OF_SALVATION]: "Garden of Salvation",
    [Raid.DEEP_STONE_CRYPT]: "Deep Stone Crypt",
    [Raid.VAULT_OF_GLASS]: "Vault of Glass",
    [Raid.VOW_OF_THE_DISCIPLE]: "Vow of the Disciple",
    [Raid.KINGS_FALL]: "King's Fall",
    [Raid.ROOT_OF_NIGHTMARES]: "Root of Nightmares",
    [Raid.CROTAS_END]: "Crota's End"
}
const difficulties: Record<Difficulty, string> = {
    [Difficulty.NA]: "N/A",
    [Difficulty.NORMAL]: "Normal",
    [Difficulty.GUIDEDGAMES]: "Guided Games",
    [Difficulty.PRESTIGE]: "Prestige",
    [Difficulty.MASTER]: "Master",
    [Difficulty.CHALLENGE_VOG]: "Challenge VOG",
    [Difficulty.CHALLENGE_KF]: "Challenge KF",
    [Difficulty.CHALLENGE_CROTA]: "Challenge Crota",
    [Difficulty.CONTEST]: "Contest"
}

const hashes = Object.fromEntries(
    Object.entries(
        RaidHashes as unknown as Record<ListedRaid, Partial<Record<Difficulty, string[]>>>
    )
        .map(([raid, difficultyDict]) =>
            Object.entries(difficultyDict).map(([difficulty, hashes]) =>
                hashes.map(
                    hash =>
                        [
                            hash,
                            {
                                raid: parseInt(raid) as ListedRaid,
                                difficulty: parseInt(difficulty) as Difficulty
                            }
                        ] as const
                )
            )
        )
        .flat(2)
)

manifestRouter.get("/", async (req: Request, res: Response) => {
    return res.status(200).json(
        success({
            raids,
            difficulties,
            hashes,
            listed: ListedRaids,
            sunset: SunsetRaids,
            contest: ContestRaids,
            master: MasterRaids,
            prestige: PrestigeRaids,
            reprisedChallengePairings: ReprisedRaidDifficultyPairings.map(([raid, difficulty]) => ({
                raid,
                difficulty
            }))
        })
    )
})
