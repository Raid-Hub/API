import { expect, test } from "bun:test"
import { getPantheonCheckpointName, getVersionCheckpointNames } from "./checkpoint-names"

test("getPantheonCheckpointName drops trailing adjective", () => {
    expect(getPantheonCheckpointName("Oryx Exalted")).toBe("Oryx")
    expect(getPantheonCheckpointName("Atraks Sovereign")).toBe("Atraks")
    expect(getPantheonCheckpointName("Morgeth Surpassing")).toBe("Morgeth")
    expect(getPantheonCheckpointName("Insurrection Prime Revolutionary")).toBe("Insurrection Prime")
})

test("getVersionCheckpointNames maps pantheon version ids", () => {
    expect(
        getVersionCheckpointNames([129, 134], {
            129: { name: "Oryx Exalted" },
            134: { name: "Insurrection Prime Revolutionary" }
        })
    ).toEqual({
        129: "Oryx",
        134: "Insurrection Prime"
    })
})
