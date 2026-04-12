import type { DualToneLevelDef } from "./types"

/**
 * 与 `builtin-levels.ts` 中条目字段顺序一致：id → name → description（仅非空时）→ map
 */
export function dualToneLevelDefToOrderedJsonObject(
  def: DualToneLevelDef,
): Record<string, string> {
  const id = def.id
  const name = def.name
  const map = def.map
  const d = def.description?.trim()
  if (d) return { id, name, description: d, map }
  return { id, name, map }
}

/** 格式化的 `DualToneLevelDef` JSON（2 空格缩进） */
export function stringifyDualToneLevelDefJson(def: DualToneLevelDef): string {
  return JSON.stringify(dualToneLevelDefToOrderedJsonObject(def), null, 2)
}

/**
 * 生成可粘贴到 `builtin-levels.ts` 数组内的单关条目（风格与 01 入门等一致，含行尾逗号）。
 */
export function dualToneLevelDefToBuiltinTsItem(def: DualToneLevelDef): string {
  const mapNormalized = def.map.replace(/\r\n/g, "\n").trimEnd()
  const descPart = def.description?.trim()
    ? `    description: ${JSON.stringify(def.description.trim())},\n`
    : ""
  return [
    "  {",
    `    id: ${JSON.stringify(def.id)},`,
    `    name: ${JSON.stringify(def.name)},`,
    `${descPart}    map: \``,
    `${mapNormalized}`,
    `\`.trim(),`,
    "  },",
  ].join("\n")
}
