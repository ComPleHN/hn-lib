import type { DualToneSolutionDir, DualToneSolverStartState } from "./solver"
import type { ParseDualToneOptions } from "./types"

/** 主线程 → Worker：求最短操作序列 */
export type DualToneWorkerSolveRequest = {
  id: number
  type: "shortestSolution"
  map: string
  parseOptions?: ParseDualToneOptions
  start?: DualToneSolverStartState
}

/** Worker → 主线程 */
export type DualToneWorkerSolveResponse =
  | { id: number; ok: true; path: DualToneSolutionDir[] | null }
  | { id: number; ok: false; error: string }
