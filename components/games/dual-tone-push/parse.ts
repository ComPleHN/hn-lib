import { DUAL_TONE_GRID_SIZE } from "./constants"
import type { ParsedDualToneLevel, ParseDualToneOptions, RawTileCell, Tone } from "./types"

/** 默认 ASCII 字符 → 格数据，可在外部用 `parseDualToneLevel(map, { tileChars: { ... } })` 覆盖或扩展 */
export const DEFAULT_DUAL_TONE_TILE_CHARS: Readonly<Record<string, RawTileCell>> = {
  ".": { floor: 0, goal: false, converter: false },
  "#": { floor: 1, goal: false, converter: false },
  G: { floor: 0, goal: true, converter: false },
  H: { floor: 1, goal: true, converter: false },
  C: { floor: 0, goal: false, converter: true },
  D: { floor: 1, goal: false, converter: true },
  P: { floor: 0, goal: false, converter: false, player: 0 },
  Q: { floor: 1, goal: false, converter: false, player: 1 },
  o: { floor: 0, goal: false, converter: false, box: 0 },
  x: { floor: 0, goal: false, converter: false, box: 1 },
  O: { floor: 1, goal: false, converter: false, box: 0 },
  X: { floor: 1, goal: false, converter: false, box: 1 },
}

function buildCharLookup(options?: ParseDualToneOptions): Record<string, RawTileCell> {
  if (!options?.tileChars) {
    return { ...DEFAULT_DUAL_TONE_TILE_CHARS }
  }
  return { ...DEFAULT_DUAL_TONE_TILE_CHARS, ...options.tileChars }
}

function cellFromLookup(
  ch: string,
  lookup: Record<string, RawTileCell>,
): RawTileCell | null {
  const v = lookup[ch]
  return v ?? null
}

/**
 * 将关卡字符串解析为场地与实体（**仅** 9×9 可移动区，无界面边框格）。
 * 格式非法时抛出带说明的 Error。可通过 `options.tileChars` 扩展或覆盖字符。
 */
export function parseDualToneLevel(map: string, options?: ParseDualToneOptions): ParsedDualToneLevel {
  const size = options?.gridSize ?? DUAL_TONE_GRID_SIZE
  const lookup = buildCharLookup(options)

  const lines = map
    .trim()
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)

  if (lines.length !== size) {
    throw new Error(`关卡须恰好 ${size} 行，当前为 ${lines.length} 行`)
  }

  for (let i = 0; i < size; i++) {
    if (lines[i].length !== size) {
      throw new Error(`第 ${i + 1} 行长度须为 ${size}，当前为 ${lines[i].length}`)
    }
  }

  const cells: ParsedDualToneLevel["cells"] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => ({
      floor: 0 as Tone,
      goal: false,
      converter: false,
    })),
  )

  let player: ParsedDualToneLevel["player"] | null = null
  const boxes: ParsedDualToneLevel["boxes"] = []

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ch = lines[r][c]
      const parsed = cellFromLookup(ch, lookup)
      if (!parsed) {
        throw new Error(`第 ${r + 1} 行第 ${c + 1} 列非法字符: ${JSON.stringify(ch)}`)
      }

      const { player: pt, box: bt, ...rest } = parsed
      cells[r][c] = { ...rest }

      if (pt !== undefined) {
        if (player) throw new Error("地图中只能有一个本体 P 或 Q")
        player = { r, c, tone: pt }
      }
      if (bt !== undefined) {
        boxes.push({ r, c, tone: bt })
      }
    }
  }

  if (!player) {
    throw new Error("地图中须有一个本体：P（白）或 Q（黑）")
  }

  return { cells, player, boxes }
}
