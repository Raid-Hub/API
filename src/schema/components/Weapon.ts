import { registry } from "@/schema/registry"
import { zUInt32 } from "@/schema/util"
import { z } from "zod"

export type WeaponType = z.input<typeof zWeaponType>
export const zWeaponType = registry.register(
    "WeaponElement",
    z.enum([
        "Auto Rifle",
        "Shotgun",
        "Machine Gun",
        "Hand Cannon",
        "Rocket Launcher",
        "Fusion Rifle",
        "Sniper Rifle",
        "Pulse Rifle",
        "Scout Rifle",
        "Sidearm",
        "Sword",
        "Linear Fusion Rifle",
        "Grenade Launcher",
        "Submachine Gun",
        "Trace Rifle",
        "Bow",
        "Glaive"
    ])
)

export type WeaponElement = z.input<typeof zWeaponElement>
export const zWeaponElement = registry.register(
    "WeaponElement",
    z.enum(["Kinetic", "Solar", "Arc", "Void", "Stasis", "Strand"])
)

export type WeaponSlot = z.input<typeof zWeaponSlot>
export const zWeaponSlot = registry.register("WeaponSlot", z.enum(["Kinetic", "Energy", "Power"]))

export type WeaponAmmoType = z.input<typeof zWeaponAmmoType>
export const zWeaponAmmoType = registry.register(
    "WeaponAmmoType",
    z.enum(["Primary", "Special", "Heavy"])
)

export type WeaponRarity = z.input<typeof zWeaponRarity>
export const zWeaponRarity = registry.register(
    "WeaponRarity",
    z.enum(["Common", "Uncommon", "Rare", "Legendary", "Exotic"])
)

export type Weapon = z.input<typeof zWeapon>
export const zWeapon = registry.register(
    "Weapon",
    z.object({
        hash: zUInt32(),
        name: z.string(),
        iconPath: z.string(),
        weaponType: zWeaponType,
        element: zWeaponElement,
        slot: zWeaponSlot,
        ammoType: zWeaponAmmoType,
        rarity: zWeaponRarity
    })
)
