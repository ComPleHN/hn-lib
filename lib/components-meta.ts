export const COMPONENT_SLUGS = ["calendar"] as const

export type ComponentSlug = (typeof COMPONENT_SLUGS)[number]

export const COMPONENT_TITLES: Record<ComponentSlug, string> = {
    "calendar": "日历",
}

export function isComponentSlug(s: string): s is ComponentSlug {
    return (COMPONENT_SLUGS as readonly string[]).includes(s)
}
