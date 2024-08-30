import { z } from "zod"
import { registry } from ".."
import { zNumericalRecordKey, zUInt32, zWholeNumber } from "../util"

export type WeaponMetric = z.input<typeof zWeaponMetric>
export const zWeaponMetric = registry.register(
    "WeaponMetric",
    z.object({
        hash: zUInt32(),
        totalUsage: zWholeNumber(),
        totalKills: zWholeNumber(),
        totalPrecisionKills: zWholeNumber()
    })
)

export type PopulationByRaidMetric = z.input<typeof zPopulationByRaidMetric>
export const zPopulationByRaidMetric = registry.register(
    "PopulationByRaidMetric",
    z.record(zNumericalRecordKey(), zWholeNumber()).openapi({
        description: "A map of each activity Id to its player count"
    })
)
