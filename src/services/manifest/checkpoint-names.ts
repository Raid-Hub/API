/** Checkpoint encounter names for lowman tag labels. TODO: move to activity_definition. */
export const CHECKPOINT_NAMES: Readonly<Record<number, string>> = {
    1: "Calus",
    2: "Argos",
    3: "Val Ca'uor",
    4: "Queenswalk",
    5: "Insurrection Prime",
    6: "Gahlran",
    7: "Sanctified Mind",
    8: "Taniks",
    9: "Atheon",
    10: "Rhulk",
    11: "Oryx",
    12: "Nezarec",
    13: "Crota",
    14: "Witness",
    15: "Koregos",
    16: "Koregos"
}

export const getCheckpointNamesForRaids = (listedRaidIds: readonly number[]) =>
    Object.fromEntries(
        listedRaidIds
            .map(id => [id, CHECKPOINT_NAMES[id]] as const)
            .filter((entry): entry is [number, string] => entry[1] != null)
    )

/** Pantheon checkpoint labels drop the trailing difficulty adjective, e.g. "Oryx Exalted" -> "Oryx". */
export const getPantheonCheckpointName = (versionName: string): string | null => {
    const parts = versionName.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) {
        return null
    }
    if (parts.length === 1) {
        return parts[0]
    }
    return parts.slice(0, -1).join(" ")
}

export const getVersionCheckpointNames = (
    versionIds: readonly number[],
    versionDefinitions: Readonly<Record<number, { name: string }>>
) =>
    Object.fromEntries(
        versionIds
            .map(id => {
                const versionName = versionDefinitions[id]?.name
                if (!versionName) {
                    return null
                }
                const checkpointName = getPantheonCheckpointName(versionName)
                return checkpointName ? ([id, checkpointName] as const) : null
            })
            .filter((entry): entry is [number, string] => entry != null)
    )
