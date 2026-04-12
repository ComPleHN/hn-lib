import { parseDualToneLevel } from "./parse"
import { shortestSolution } from "./solver"
import type { DualToneWorkerSolveRequest, DualToneWorkerSolveResponse } from "./dual-tone-solver-worker-messages"

self.onmessage = (e: MessageEvent<DualToneWorkerSolveRequest>) => {
  const data = e.data
  if (data.type !== "shortestSolution") return
  try {
    const parsed = parseDualToneLevel(data.map, data.parseOptions)
    const path = shortestSolution(parsed, data.start)
    const out: DualToneWorkerSolveResponse = { id: data.id, ok: true, path }
    self.postMessage(out)
  } catch (err) {
    const out: DualToneWorkerSolveResponse = {
      id: data.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    }
    self.postMessage(out)
  }
}
