import { expectErr, expectOk } from "@/lib/test-utils"
import { describe, test } from "bun:test"
import { adminQueryRoute } from "@/routes/admin/query"

describe("admin query 200", () => {
    const t = async (query: string, type: string, ignoreCost?: boolean) => {
        const result = await adminQueryRoute.$mock({ body: { query, type, ignoreCost } })
        expectOk(result)
        return result
    }

    test("SELECT 1", () => t("SELECT 1", "SELECT"))

    test("EXPLAIN", () => t("SELECT * FROM instance;", "EXPLAIN"))

    test("SELECT * ", () => t("SELECT * FROM instance_player LIMIT 10;", "SELECT"))

    test("SELECT with ignore cost ", () =>
        t("SELECT * FROM instance_player LIMIT 100000;", "SELECT", true))

    test(
        "Complex",
        () =>
            t(
                `
    SELECT 
        DENSE_RANK() OVER (ORDER BY date_completed ASC) AS rank,
        players_concatenated[1] AS player1,
        players_concatenated[2] AS player2,
        date_completed,
        EXTRACT(EPOCH FROM date_completed - first_value(date_completed) OVER (ORDER BY date_completed ASC)) AS time_after_first_completion_seconds
    FROM (
        SELECT 
            ARRAY_AGG(p.bungie_global_display_name ORDER BY p.bungie_global_display_name) AS players_concatenated,
            a.date_completed
        FROM 
            instance a 
        JOIN 
            instance_player pa ON a.instance_id = pa.instance_id
        JOIN 
            activity_version ah ON ah.hash = a.hash
        JOIN 
            player p ON p.membership_id = pa.membership_id
        WHERE 
            a.player_count = 2 AND a.flawless AND ah.activity_id = 13 
        GROUP BY 
            a.instance_id, a.date_completed
    ) AS subquery
    ORDER BY 
        date_completed ASC
    LIMIT 3;`,
                "SELECT"
            ),
        30000
    )
})

describe("admin query syntax error", () => {
    const t = async (query: string, type: string, ignoreCost?: boolean) => {
        const result = await adminQueryRoute.$mock({ body: { query, type, ignoreCost } })
        expectErr(result)
    }

    test("Bad table", () => t("SELECT * from fasdhfahfuiasdf", "SELECT"))

    test("Bad syntax", () => t("SELECT * FROM instance LIMIT 10 WHERE 1 = 1;", "EXPLAIN"))

    test("Bad keywords", () => t("SELECTFRO FROM abc;", "SELECT"))

    test("Bad keywords", () => t("", "SELECT"))
})
