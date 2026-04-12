export const GAME_SLUGS = [
  "pixel-adventure",
  "card-battle",
  "puzzle-box",
  "color-blocks",
  "dual-tone-push",
] as const

export type GameSlug = (typeof GAME_SLUGS)[number]

export const GAME_TITLES: Record<GameSlug, string> = {
  "pixel-adventure": "像素冒险",
  "card-battle": "卡牌对决",
  "puzzle-box": "解谜盒子",
  "color-blocks": "五色暗码",
  "dual-tone-push": "双色推箱",
}

export function isGameSlug(s: string): s is GameSlug {
  return (GAME_SLUGS as readonly string[]).includes(s)
}
