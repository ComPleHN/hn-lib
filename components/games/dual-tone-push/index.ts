/**
 * 双色推箱 — 可扩展模块
 *
 * - 9×9 = 可移动范围（关卡 `map` 仅含此 81 格；界面外框不计入逻辑）
 * - 类型：`types.ts`
 * - 网格：`constants.ts`
 * - 解析：`parse.ts`（支持 `tileChars` 扩展字符）
 * - 内置图：`builtin-levels.ts`
 * - 合并 / 默认表：`registry.ts`
 */

export { DUAL_TONE_GRID_SIZE } from "./constants"
export type { DualToneGridSize } from "./constants"

export type {
  DualToneLevelDef,
  ParsedDualToneLevel,
  ParseDualToneOptions,
  RawTileCell,
  Tone,
} from "./types"

export { DEFAULT_DUAL_TONE_TILE_CHARS, parseDualToneLevel } from "./parse"

export { BUILTIN_DUAL_TONE_LEVELS } from "./builtin-levels"

export {
  DEFAULT_DUAL_TONE_LEVELS,
  findDualToneLevelById,
  mergeDualToneLevels,
} from "./registry"

export {
  dualToneSolutionDirToDelta,
  isParsedLevelSolvable,
  shortestSolution,
  shortestSolutionLength,
} from "./solver"

export type {
  DualToneSolutionDir,
  DualToneSolverStartState,
} from "./solver"

export {
  dualToneLevelDefToBuiltinTsItem,
  dualToneLevelDefToOrderedJsonObject,
  stringifyDualToneLevelDefJson,
} from "./serialize-level-def"
