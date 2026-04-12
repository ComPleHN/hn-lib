import { DUAL_TONE_GRID_SIZE } from "./constants"
import type { ParsedDualToneLevel, Tone } from "./types"

type Cell = {
  floor: Tone
  goal: boolean
  converter: boolean
}

type Entity = { r: number; c: number; tone: Tone }

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

function serialize(
  player: Entity,
  boxes: Entity[],
  pending: boolean,
): string {
  const bs = [...boxes].sort((a, b) => {
    if (a.r !== b.r) return a.r - b.r
    if (a.c !== b.c) return a.c - b.c
    return a.tone - b.tone
  })
  return `${player.r},${player.c},${player.tone}|${pending ? 1 : 0}|${bs.map((b) => `${b.r},${b.c},${b.tone}`).join(";")}`
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
    let pending = pendingConverter
    let p = nextPlayer
    if (cell.converter) {
      pending = true
    } else if (pending) {
      p = { ...p, tone: cell.floor }
      pending = false
    }
    return { player: p, boxes: nextBoxes, pending }
  }

  if (!box) {
    const dest = cells[nr][nc]
    const allowEnter =
      pendingConverter || dest.floor === player.tone || dest.converter
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
    p = { ...p, tone: landCell.floor }
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

/** BFS：判断从初始状态能否使全部箱子到达终点（步数无上限，状态去重） */
export function isParsedLevelSolvable(parsed: ParsedDualToneLevel): boolean {
  const cells = parsed.cells as Cell[][]
  const start = {
    player: { ...parsed.player },
    boxes: parsed.boxes.map((b) => ({ ...b })),
    pending: false,
  }

  const visited = new Set<string>()
  const queue: typeof start[] = [start]
  visited.add(serialize(start.player, start.boxes, start.pending))

  let qi = 0
  while (qi < queue.length) {
    const cur = queue[qi++]!
    if (isWin(cells, cur.boxes)) return true

    for (const [dr, dc] of DIRS) {
      const next = tryMoveOnce(cells, cur.player, cur.boxes, cur.pending, dr, dc)
      if (!next) continue
      const k = serialize(next.player, next.boxes, next.pending)
      if (visited.has(k)) continue
      visited.add(k)
      queue.push({
        player: next.player,
        boxes: next.boxes.map((b) => ({ ...b })),
        pending: next.pending,
      })
    }
  }

  return false
}
