import { pgReader } from "@/integrations/postgres"
import { expect } from "bun:test"

const isUndefinedRelationError = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "42P01"

/** True when migration 011 has been applied (CI may lag behind Services deploy). */
export async function isPantheonCustomRaceLeaderboardAvailable() {
    try {
        await pgReader.queryRow(`SELECT 1::int AS ok FROM team_pantheon_custom_race_leaderboard LIMIT 1`)
        return true
    } catch (error) {
        if (isUndefinedRelationError(error)) {
            return false
        }
        throw error
    }
}

/** Invariants for a slice returned from leaderboard SQL (`skip`, `take`). */
export function assertIndividualLeaderboardSlice(
    entries: readonly { position: number; rank: number; value: number }[],
    skip: number,
    take: number
) {
    expect(take).toBeGreaterThan(0)
    expect(entries.length).toBeLessThanOrEqual(take)
    for (const e of entries) {
        expect(e.position).toBeGreaterThan(skip)
        expect(e.position).toBeLessThanOrEqual(skip + take)
        expect(e.rank).toBeGreaterThan(0)
    }
}

/** Invariants for paginated individual leaderboard route responses. */
export function assertIndividualLeaderboardPage(payload: {
    count: number
    page: number
    entries: readonly { position: number; rank: number; value: number }[]
}) {
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.page).toBeGreaterThan(0)
    const skip = (payload.page - 1) * payload.count
    assertIndividualLeaderboardSlice(payload.entries, skip, payload.count)
}

/** Same pagination rules apply to team leaderboard payloads. */
export function assertTeamLeaderboardPage(payload: {
    count: number
    page: number
    entries: readonly { position: number; rank: number; value: number }[]
}) {
    expect(payload.count).toBeGreaterThan(0)
    expect(payload.page).toBeGreaterThan(0)
    const skip = (payload.page - 1) * payload.count
    assertIndividualLeaderboardSlice(payload.entries, skip, payload.count)
}

export function assertIndividualSearchIncludesMembership(
    entries: readonly { playerInfo: { membershipId: bigint | string } }[],
    membershipId: string
) {
    expect(entries.some(e => String(e.playerInfo.membershipId) === membershipId)).toBe(true)
}

export function assertTeamSearchIncludesMembership(
    entries: readonly { players: readonly { membershipId: bigint | string }[] }[],
    membershipId: string
) {
    expect(entries.some(e => e.players.some(p => String(p.membershipId) === membershipId))).toBe(
        true
    )
}

export function assertClanLeaderboardPage(
    entries: readonly { clan: { groupId: bigint | number } }[],
    pageSize: number
) {
    expect(entries.length).toBeLessThanOrEqual(pageSize)
    for (const e of entries) {
        expect(typeof e.clan.groupId === "bigint" || typeof e.clan.groupId === "number").toBe(true)
    }
}
