import { DUAL_TONE_GRID_SIZE } from "./constants"
import type { ParsedDualToneLevel, Tone } from "./types"

type Cell = {
  floor: Tone
  goal: boolean
  converter: boolean
}

/** 与游戏一致：武装后仅纯地坪格落地变色 */
function isPlainFloorCell(c: Cell): boolean {
  return !c.goal && !c.converter
}

type Entity = { r: number; c: number; tone: Tone }

type SimState = {
  player: Entity
  boxes: Entity[]
  pending: boolean
}

function flipTone(t: Tone): Tone {
  return (1 - t) as Tone
}

function boxToneAfterPush(boxTone: Tone, fromFloor: Tone, toFloor: Tone): Tone {
  if (boxTone !== fromFloor && boxTone === toFloor) return flipTone(boxTone)
  return boxTone
}

function boxesAt(boxes: Entity[], r: number, c: number): Entity | undefined {
  return boxes.find((b) => b.r === r && b.c === c)
}

function isWin(cells: Cell[][], boxes: Entity[]): boolean {
  return boxes.every((b) => cells[b.r][b.c].goal)
}

function sortBoxes(boxes: Entity[]): Entity[] {
  return [...boxes].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r
    if (a.c !== b.c) return a.c - b.c
    return a.tone - b.tone
  })
}

const B0 = BigInt(0)
const B1 = BigInt(1)
const B7 = BigInt(7)
const B9 = BigInt(9)
/** 低 7 位：格 idx 0..80 */
const CELL_MASK = (B1 << B7) - B1

/**
 * V8 单个 `Set` 约有 ~2^24 条上限；第 9 关等大状态图会触发 `Set maximum size exceeded`。
 * 分片后每片远小于上限，总容量不受单 Set 限制。
 */
const VISIT_SHARD_COUNT = 16384
const B_SHARDS = BigInt(VISIT_SHARD_COUNT)

/** 用全键取模分片，避免仅靠低位导致大量状态挤在同一分片再次触发单 Set 上限 */
function visitShardIndex(k: bigint): number {
  let x = k % B_SHARDS
  if (x < 0) x += B_SHARDS
  return Number(x)
}

function createShardedVisited(): {
  has(k: bigint): boolean
  add(k: bigint): void
} {
  const shards: Set<bigint>[] = Array.from(
    { length: VISIT_SHARD_COUNT },
    () => new Set<bigint>(),
  )
  return {
    has(k: bigint) {
      return shards[visitShardIndex(k)]!.has(k)
    },
    add(k: bigint) {
      shards[visitShardIndex(k)]!.add(k)
    },
  }
}

/**
 * 紧凑状态键（bigint）：visited / BFS 队列用，避免每节点存对象+克隆数组导致内存爆炸。
 * 布局：玩家格 idx(7) + 音色(1) + pending(1) + 各箱 idx(7) + 音色(1) × N（箱按 sortBoxes 序）。
 */
function packStateKey(player: Entity, boxes: Entity[], pending: boolean): bigint {
  const sorted = sortBoxes(boxes)
  let k = BigInt(player.r * 9 + player.c)
  k |= BigInt(player.tone) << B7
  k |= (pending ? B1 : B0) << BigInt(8)
  let shift = B9
  for (const b of sorted) {
    k |= BigInt(b.r * 9 + b.c) << shift
    shift += B7
    k |= BigInt(b.tone) << shift
    shift += B1
  }
  return k
}

function unpackStateKey(k: bigint, numBoxes: number): SimState {
  let x = k
  const pIdx = Number(x & CELL_MASK)
  x >>= B7
  const playerTone = Number(x & B1) as Tone
  x >>= B1
  const pending = Number(x & B1) !== 0
  x >>= B1
  const boxes: Entity[] = []
  for (let i = 0; i < numBoxes; i++) {
    const idx = Number(x & CELL_MASK)
    x >>= B7
    const tone = Number(x & B1) as Tone
    x >>= B1
    boxes.push({ r: Math.floor(idx / 9), c: idx % 9, tone })
  }
  return {
    player: { r: Math.floor(pIdx / 9), c: pIdx % 9, tone: playerTone },
    boxes,
    pending,
  }
}

function tryMoveOnce(
  cells: Cell[][],
  player: Entity,
  boxes: Entity[],
  pendingConverter: boolean,
  dr: number,
  dc: number,
): { player: Entity; boxes: Entity[]; pending: boolean } | null {
  const nr = player.r + dr
  const nc = player.c + dc
  if (nr < 0 || nr >= DUAL_TONE_GRID_SIZE || nc < 0 || nc >= DUAL_TONE_GRID_SIZE) return null

  const box = boxesAt(boxes, nr, nc)

  const applyLanding = (nextPlayer: Entity, nextBoxes: Entity[]) => {
    const cell = cells[nextPlayer.r][nextPlayer.c]
    const landingOnBox = boxesAt(nextBoxes, nextPlayer.r, nextPlayer.c) !== undefined
    let pending = pendingConverter
    let p = nextPlayer
    if (cell.converter) {
      pending = true
    } else if (pending) {
      if (isPlainFloorCell(cell) && !landingOnBox) {
        p = { ...p, tone: cell.floor }
      }
      pending = false
    }
    return { player: p, boxes: nextBoxes, pending }
  }

  if (!box) {
    const dest = cells[nr][nc]
    const allowEnter =
      pendingConverter ||
      dest.floor === player.tone ||
      dest.converter ||
      dest.goal
    if (!allowEnter) return null
    return applyLanding({ ...player, r: nr, c: nc }, boxes)
  }

  if (box.tone === player.tone) {
    return applyLanding({ ...player, r: nr, c: nc }, boxes)
  }

  const br = nr + dr
  const bc = nc + dc
  if (br < 0 || br >= DUAL_TONE_GRID_SIZE || bc < 0 || bc >= DUAL_TONE_GRID_SIZE) return null
  if (boxesAt(boxes, br, bc)) return null

  const fromFloor = cells[nr][nc].floor
  const toFloor = cells[br][bc].floor
  const newTone = boxToneAfterPush(box.tone, fromFloor, toFloor)
  const movedBox: Entity = { r: br, c: bc, tone: newTone }
  const nextBoxes = boxes.map((b) => (b === box ? movedBox : b))
  const nextPlayer: Entity = { ...player, r: nr, c: nc }

  const landCell = cells[nr][nc]
  let p = nextPlayer
  let pending = pendingConverter
  if (landCell.converter) {
    pending = true
  } else if (pending) {
    if (isPlainFloorCell(landCell)) {
      p = { ...p, tone: landCell.floor }
    }
    pending = false
  }
  return { player: p, boxes: nextBoxes, pending }
}

const DIRS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
] as const

/** 与 `tryMoveOnce` / DIRS 顺序一致，用于输出最短路径 */
export type DualToneSolutionDir = "up" | "down" | "left" | "right"

const DIR_LABELS: DualToneSolutionDir[] = ["up", "down", "left", "right"]

/** 将求解器方向映射为与键盘/tryMove 一致的 (dr, dc) */
export function dualToneSolutionDirToDelta(
  d: DualToneSolutionDir,
): readonly [number, number] {
  switch (d) {
    case "up":
      return [-1, 0]
    case "down":
      return [1, 0]
    case "left":
      return [0, -1]
    case "right":
      return [0, 1]
  }
}

export type DualToneSolverStartState = {
  player: { r: number; c: number; tone: Tone }
  boxes: { r: number; c: number; tone: Tone }[]
  pending: boolean
}

function normalizeStart(
  parsed: ParsedDualToneLevel,
  start?: DualToneSolverStartState,
): SimState {
  if (!start) {
    return {
      player: { ...parsed.player },
      boxes: parsed.boxes.map((b) => ({ ...b })),
      pending: false,
    }
  }
  return {
    player: { ...start.player },
    boxes: start.boxes.map((b) => ({ ...b })),
    pending: start.pending,
  }
}

/**
 * 仅求最短步数：按层 BFS（frontier 仅存当前层），不建父链；
 * visited 用分片 Set，避免 V8 单 Set 大小上限。
 */
export function shortestSolutionLength(
  parsed: ParsedDualToneLevel,
  start?: DualToneSolverStartState,
): number {
  const cells = parsed.cells as Cell[][]
  const s0 = normalizeStart(parsed, start)
  const numBoxes = s0.boxes.length
  if (isWin(cells, s0.boxes)) return 0

  const visited = createShardedVisited()
  const startKey = packStateKey(s0.player, s0.boxes, s0.pending)
  let frontier: bigint[] = [startKey]
  visited.add(startKey)
  let d = 0

  while (frontier.length) {
    const next: bigint[] = []
    for (const curKey of frontier) {
      const cur = unpackStateKey(curKey, numBoxes)
      for (let di = 0; di < DIRS.length; di++) {
        const [dr, dc] = DIRS[di]!
        const mov = tryMoveOnce(cells, cur.player, cur.boxes, cur.pending, dr, dc)
        if (!mov) continue
        const k = packStateKey(mov.player, mov.boxes, mov.pending)
        if (visited.has(k)) continue
        if (isWin(cells, mov.boxes)) return d + 1
        visited.add(k)
        next.push(k)
      }
    }
    frontier = next
    d++
  }

  return -1
}

/**
 * 最短操作序列（每步一格）。`start` 省略时从关卡初始态、pending=false 开始。
 * 无解返回 `null`；已通关返回 `[]`。
 */
export function shortestSolution(
  parsed: ParsedDualToneLevel,
  start?: DualToneSolverStartState,
): DualToneSolutionDir[] | null {
  const cells = parsed.cells as Cell[][]
  const s0 = normalizeStart(parsed, start)
  const numBoxes = s0.boxes.length
  if (isWin(cells, s0.boxes)) return []

  const visited = createShardedVisited()
  const queue: bigint[] = [packStateKey(s0.player, s0.boxes, s0.pending)]
  const parent: number[] = [-1]
  const moveFromParent: (DualToneSolutionDir | null)[] = [null]
  visited.add(queue[0]!)

  function reconstructPath(endIdx: number): DualToneSolutionDir[] {
    const path: DualToneSolutionDir[] = []
    let i = endIdx
    while (parent[i] !== -1) {
      path.unshift(moveFromParent[i]!)
      i = parent[i]!
    }
    return path
  }

  let qi = 0
  while (qi < queue.length) {
    const curKey = queue[qi]!
    const cur = unpackStateKey(curKey, numBoxes)

    for (let di = 0; di < DIRS.length; di++) {
      const [dr, dc] = DIRS[di]!
      const next = tryMoveOnce(cells, cur.player, cur.boxes, cur.pending, dr, dc)
      if (!next) continue
      const k = packStateKey(next.player, next.boxes, next.pending)
      if (visited.has(k)) continue
      const dir = DIR_LABELS[di]!
      if (isWin(cells, next.boxes)) {
        return [...reconstructPath(qi), dir]
      }
      visited.add(k)
      parent.push(qi)
      moveFromParent.push(dir)
      queue.push(k)
    }
    qi++
  }

  return null
}

/** BFS：判断从初始状态能否使全部箱子到达终点（步数无上限，状态去重） */
export function isParsedLevelSolvable(parsed: ParsedDualToneLevel): boolean {
  return shortestSolutionLength(parsed) >= 0
}
