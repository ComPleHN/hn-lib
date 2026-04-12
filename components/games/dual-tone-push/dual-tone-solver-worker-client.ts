import type { DualToneSolutionDir, DualToneSolverStartState } from "./solver"
import type { ParseDualToneOptions } from "./types"
import type {
  DualToneWorkerSolveRequest,
  DualToneWorkerSolveResponse,
} from "./dual-tone-solver-worker-messages"

let worker: Worker | null = null
let nextId = 0

type PendingEntry = {
  resolve: (v: DualToneSolutionDir[] | null) => void
  reject: (e: Error) => void
  timer: ReturnType<typeof setTimeout>
}

const pending = new Map<number, PendingEntry>()

function clearPendingEntry(id: number): void {
  const p = pending.get(id)
  if (!p) return
  clearTimeout(p.timer)
  pending.delete(id)
}

function getWorker(): Worker {
  if (typeof Worker === "undefined") {
    throw new Error("当前环境不支持 Web Worker")
  }
  if (!worker) {
    worker = new Worker(
      new URL("./dual-tone-solver.worker.ts", import.meta.url),
      { type: "module" },
    )
    worker.onmessage = (e: MessageEvent<DualToneWorkerSolveResponse>) => {
      const msg = e.data
      const p = pending.get(msg.id)
      if (!p) return
      clearTimeout(p.timer)
      pending.delete(msg.id)
      if (msg.ok) p.resolve(msg.path)
      else p.reject(new Error(msg.error))
    }
    worker.onerror = (ev) => {
      for (const [, pr] of pending) {
        clearTimeout(pr.timer)
        pr.reject(new Error(ev.message || "Worker 错误"))
      }
      pending.clear()
      worker = null
    }
  }
  return worker
}

const DEFAULT_SOLVE_TIMEOUT_MS = 120000

/**
 * 在后台线程求最短路径，不阻塞主线程 UI。
 * 与 `shortestSolution` 语义一致；仅用于浏览器客户端。
 * @param timeoutMs 超时后 reject 并清理 pending，避免界面一直「求解中」
 */
export function runShortestSolutionInWorker(
  opts: {
    map: string
    parseOptions?: ParseDualToneOptions
    start?: DualToneSolverStartState
  },
  timeoutMs: number = DEFAULT_SOLVE_TIMEOUT_MS,
): Promise<DualToneSolutionDir[] | null> {
  return new Promise((resolve, reject) => {
    const id = ++nextId
    const timer = setTimeout(() => {
      const p = pending.get(id)
      if (!p) return
      clearTimeout(p.timer)
      pending.delete(id)
      p.reject(
        new Error(
          `求解超时（>${Math.round(timeoutMs / 1000)}s），本关搜索空间可能过大`,
        ),
      )
    }, timeoutMs)

    pending.set(id, {
      resolve,
      reject,
      timer,
    })
    try {
      const w = getWorker()
      const req: DualToneWorkerSolveRequest = {
        id,
        type: "shortestSolution",
        map: opts.map,
        parseOptions: opts.parseOptions,
        start: opts.start,
      }
      w.postMessage(req)
    } catch (e) {
      clearPendingEntry(id)
      reject(e instanceof Error ? e : new Error(String(e)))
    }
  })
}

/** 释放 Worker（切页或不再需要时调用，避免重复创建） */
export function terminateDualToneSolverWorker(): void {
  if (worker) {
    worker.terminate()
    worker = null
    for (const [, pr] of pending) {
      clearTimeout(pr.timer)
      pr.reject(new Error("Worker 已终止"))
    }
    pending.clear()
  }
}
