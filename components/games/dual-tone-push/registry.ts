import type { DualToneLevelDef } from "./types"
import { BUILTIN_DUAL_TONE_LEVELS } from "./builtin-levels"

/** 默认关卡列表（与内置一致）；外部可 `mergeDualToneLevels(DEFAULT_DUAL_TONE_LEVELS, custom)` */
export const DEFAULT_DUAL_TONE_LEVELS: DualToneLevelDef[] = [...BUILTIN_DUAL_TONE_LEVELS]

/** 合并多组关卡（去重 id 由调用方保证；后者同名会保留在数组中的出现顺序） */
export function mergeDualToneLevels(...batches: DualToneLevelDef[][]): DualToneLevelDef[] {
  return batches.flat()
}

/** 按 id 查找；找不到返回 undefined */
export function findDualToneLevelById(
  levels: DualToneLevelDef[],
  id: string,
): DualToneLevelDef | undefined {
  return levels.find((l) => l.id === id)
}
