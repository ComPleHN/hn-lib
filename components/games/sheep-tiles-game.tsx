"use client"

/**
 * 叠层消除：一行 = 牌高的一半；牌身占 2 行×2 列（top = margin + rowTop×行高）。
 * rowTop 差 2 则上下边相接（紧挨）。遮挡：列/行 2 格区间任一行或一列相交即算压住 + z。阴影在盒外。
 *
 * 开局底部多渲染一行空带（一行牌高）：随机牌不占用，移回牌落在其上一格网行。
 * 性能：预计算遮挡；原生 img；小屏轻阴影；飞入 transform3d。
 */

import type { KeyboardEvent, MouseEvent } from "react"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { ArrowUpFromLine, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { SHEEP_TILE_IMAGES } from "./sheep-tiles-assets"
import { Button } from "../ui/button"

const PLAY_W = 100
const PLAY_H = 100
/** 场地 width/height（与外层 aspect-ratio 一致），用于把「宽的 %」换算成竖向占位 */
const FIELD_WH_RATIO = 3 / 4
/** 摆牌区相对地图边缘的内缩（百分比），避免贴边 */
const FIELD_MARGIN_PCT = 5.5
const SLOT_MAX = 7
const FLY_MS = 420
/** 初始牌面底部多留一行牌高（+少量留白），供移回牌落位且开局即显示空带 */
const BOTTOM_ROW_RESERVE_EXTRA_PCT = 1.25

function reservedBottomBandPct(cardHPct: number): number {
  return cardHPct + BOTTOM_ROW_RESERVE_EXTRA_PCT
}

type ScreenRect = { left: number; top: number; width: number; height: number }

function pickScreenRect(r: DOMRect): ScreenRect {
  return {
    left: r.left,
    top: r.top,
    width: r.width,
    height: r.height,
  }
}

export type SheepDifficulty = "easy" | "medium" | "hard" | "extreme"

const DIFFICULTY: Record<
  SheepDifficulty,
  {
    label: string
    hint: string
    /** 不同图案种数 */
    kinds: number
    /**
     * 每种图案张数，须为 3 的倍数（消除按每次 3 张同图，保证可清空）。
     * 例如 3、6、9、12…
     */
    perKind: number
    /** 单张牌宽度占场地宽度的百分比（方形，竖向按比例换算） */
    cardWPct: number
  }
> = {
  easy: {
    label: "简单",
    hint: "4 种 × 每种 3 张 · 2×2 格随机叠放",
    kinds: 4,
    perKind: 3,
    cardWPct: 26,
  },
  medium: {
    label: "标准",
    hint: "6 种 × 每种 6 张 · 2×2 格随机叠放",
    kinds: 6,
    perKind: 6,
    cardWPct: 21,
  },
  hard: {
    label: "困难",
    hint: "8 种 × 每种 9 张 · 2×2 格随机叠放",
    kinds: 8,
    perKind: 9,
    cardWPct: 17,
  },
  extreme: {
    label: "极限",
    hint: "13 种 × 每种 12 张 · 2×2 格随机叠放",
    kinds: 13,
    perKind: 12,
    cardWPct: 14,
  },
}

type Rect = { l: number; t: number; w: number; h: number }

type BoardTile = {
  id: string
  kind: number
  /** 唯一叠放次序，越大越靠上 */
  z: number
  rect: Rect
  /** 整齐摆放时为 0；飞入动画仍可读 */
  rot: number
  /** 2×2 格左上角列/行（行高 = 牌高一半） */
  colLeft: number
  rowTop: number
}

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
      ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** 方形牌：宽 w%（相对场地宽），高占场地高的百分比（与 FIELD_WH_RATIO 一致） */
function cardHeightPct(cardWPct: number): number {
  return cardWPct * FIELD_WH_RATIO
}

/** 两牌在列方向上的 2 列格区间是否相交 */
function colSpansOverlap(a: BoardTile, b: BoardTile): boolean {
  return !(a.colLeft + 1 < b.colLeft || b.colLeft + 1 < a.colLeft)
}

/** 两牌在行方向上的 2 行格区间是否相交（只压住一行也算压；再隔一整行则无交集） */
function rowSpansOverlap(a: BoardTile, b: BoardTile): boolean {
  return !(a.rowTop + 1 < b.rowTop || b.rowTop + 1 < a.rowTop)
}

function isBlocked(tile: BoardTile, others: BoardTile[]): boolean {
  return others.some(
    (o) =>
      o.id !== tile.id &&
      o.z > tile.z &&
      colSpansOverlap(o, tile) &&
      rowSpansOverlap(o, tile),
  )
}

/** 每局 board 变更时算一次，避免每张牌在每次 render 里 O(n) 扫全场 */
function blockedTileIds(board: BoardTile[]): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < board.length; i++) {
    const t = board[i]!
    if (isBlocked(t, board)) out.add(t.id)
  }
  return out
}

function resolveBar(bar: number[]): number[] {
  let b = [...bar]
  let changed = true
  while (changed) {
    changed = false
    const counts = new Map<number, number>()
    for (const x of b) counts.set(x, (counts.get(x) ?? 0) + 1)
    for (const [k, c] of counts) {
      if (c >= 3) {
        let left = 3
        b = b.filter((x) => {
          if (x === k && left > 0) {
            left--
            return false
          }
          return true
        })
        changed = true
        break
      }
    }
  }
  return b
}

/**
 * 每张牌在逻辑上占 2×2 格：格宽 w/2、格高 h/2（与牌面矩形 w×h 一致）。
 * 左上角落在整格 (gx,gy) 上随机取值；相邻格位会部分重叠，相隔两格则互不重叠。
 * 底部预留一行牌高，随机牌不摆入该带（与移回牌最底行一致）。
 */
function buildBoard(seed: number, difficulty: SheepDifficulty): BoardTile[] {
  const rand = mulberry32(seed)
  const cfg = DIFFICULTY[difficulty]
  const hPct = cardHeightPct(cfg.cardWPct)
  const margin = FIELD_MARGIN_PCT
  const w = cfg.cardWPct
  const h = hPct
  const maxW = PLAY_W - 2 * margin
  const maxH = PLAY_H - 2 * margin

  if (cfg.perKind % 3 !== 0 || cfg.perKind < 3) {
    throw new Error(
      `每种张数须为 ≥3 且为 3 的倍数，当前为 ${cfg.perKind}（难度 ${difficulty}）`,
    )
  }

  const pool = shuffle(
    SHEEP_TILE_IMAGES.map((_, i) => i),
    rand,
  ).slice(0, cfg.kinds)
  const deck: number[] = []
  for (const k of pool) {
    for (let c = 0; c < cfg.perKind; c++) deck.push(k)
  }
  const kinds = shuffle(deck, rand)

  const cellW = w / 2
  const cellH = h / 2
  const nxCells = Math.max(2, Math.floor(maxW / cellW))
  const nyCells = Math.max(2, Math.floor(maxH / cellH))
  const gxMax = Math.max(0, nxCells - 2)
  const gyMaxFull = Math.max(0, nyCells - 2)
  const reserveHPct = reservedBottomBandPct(h)
  const gyMaxSpawn = Math.max(
    0,
    Math.min(
      gyMaxFull,
      Math.floor((PLAY_H - reserveHPct - margin - h) / cellH + 1e-9),
    ),
  )

  const n = kinds.length
  const zRanks = shuffle([...Array(n).keys()], rand)

  const tiles: BoardTile[] = []
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(rand() * (gxMax + 1))
    const gy = Math.floor(rand() * (gyMaxSpawn + 1))
    const l = Math.round((margin + gx * cellW) * 100) / 100
    const t = Math.round((margin + gy * cellH) * 100) / 100
    tiles.push({
      id: `t-${seed}-${i}`,
      kind: kinds[i]!,
      z: zRanks[i]!,
      rot: 0,
      rect: { l, t, w, h },
      colLeft: gx,
      rowTop: gy,
    })
  }
  return tiles
}

/** 将底栏移出的三张摆回牌堆最底一行（尽量同一 rowTop 横排，格位与 buildBoard 一致） */
function layoutReturnRowTiles(cfg: { cardWPct: number }): Array<{
  colLeft: number
  rowTop: number
  rect: Rect
}> {
  const margin = FIELD_MARGIN_PCT
  const w = cfg.cardWPct
  const h = cardHeightPct(cfg.cardWPct)
  const cellW = w / 2
  const cellH = h / 2
  const maxW = PLAY_W - 2 * margin
  const maxH = PLAY_H - 2 * margin
  const nxCells = Math.max(2, Math.floor(maxW / cellW))
  const nyCells = Math.max(2, Math.floor(maxH / cellH))
  const gxMax = Math.max(0, nxCells - 2)
  const gyMax = Math.max(0, nyCells - 2)

  const cell = (
    gx: number,
    gy: number,
  ): { colLeft: number; rowTop: number; rect: Rect } => ({
    colLeft: gx,
    rowTop: gy,
    rect: {
      l: Math.round((margin + gx * cellW) * 100) / 100,
      t: Math.round((margin + gy * cellH) * 100) / 100,
      w,
      h,
    },
  })

  const out: Array<{ colLeft: number; rowTop: number; rect: Rect }> = []
  if (gxMax >= 4) {
    const startGx = Math.max(0, Math.floor((gxMax - 4) / 2))
    for (let i = 0; i < 3; i++) out.push(cell(startGx + i * 2, gyMax))
  } else if (gxMax >= 2) {
    out.push(cell(0, gyMax), cell(2, gyMax), cell(0, Math.max(0, gyMax - 1)))
  } else {
    for (let i = 0; i < 3; i++) out.push(cell(0, Math.max(0, gyMax - i)))
  }
  return out
}

function boardTileRectToScreen(field: DOMRect, rect: Rect): ScreenRect {
  return {
    left: field.left + (field.width * rect.l) / 100,
    top: field.top + (field.height * rect.t) / 100,
    width: (field.width * rect.w) / 100,
    height: (field.height * rect.h) / 100,
  }
}

/** 偏下方的「垫起」阴影，立体感 */
const SHADOW_PLAY =
  "0 5px 0 rgba(0,0,0,0.12), 0 12px 18px -4px rgba(0,0,0,0.42)"
const SHADOW_PLAY_LITE =
  "0 3px 0 rgba(0,0,0,0.14), 0 7px 12px rgba(0,0,0,0.3)"
const SHADOW_BLOCKED =
  "0 4px 0 rgba(0,0,0,0.18), 0 9px 14px -3px rgba(0,0,0,0.48)"
const SHADOW_BLOCKED_LITE =
  "0 3px 0 rgba(0,0,0,0.16), 0 6px 10px rgba(0,0,0,0.34)"
const SHADOW_BAR =
  "0 4px 0 rgba(0,0,0,0.14), 0 9px 14px -3px rgba(0,0,0,0.38)"
const SHADOW_BAR_LITE =
  "0 3px 0 rgba(0,0,0,0.12), 0 5px 10px rgba(0,0,0,0.28)"
const SHADOW_FLY_END =
  "0 4px 0 rgba(0,0,0,0.14), 0 11px 18px -4px rgba(0,0,0,0.45)"
const SHADOW_FLY_END_LITE =
  "0 3px 0 rgba(0,0,0,0.12), 0 7px 14px rgba(0,0,0,0.32)"
const SHADOW_FLY_START =
  "0 5px 0 rgba(0,0,0,0.12), 0 12px 18px -4px rgba(0,0,0,0.42)"
const SHADOW_FLY_START_LITE =
  "0 3px 0 rgba(0,0,0,0.13), 0 7px 12px rgba(0,0,0,0.3)"

/** 牌面、底栏、飞牌共用：同一比例内方框 + cover 铺满；底色须不透明，避免叠牌时半透明混色出「透边」 */
function SheepTileFace({
  src,
  liteFx,
  blocked = false,
}: {
  src: string
  liteFx: boolean
  blocked?: boolean
}) {
  return (
    <div className="pointer-events-none absolute overflow-hidden inset-[6%] rounded-lg">
      <img
        src={src}
        alt=""
        className={cn(
          "h-full w-full object-cover object-center select-none",
          blocked &&
          (liteFx
            ? "grayscale brightness-[0.35] contrast-[0.9]"
            : "grayscale brightness-[0.42] contrast-[0.85]"),
        )}
        decoding="async"
      />
    </div>
  )
}

export function SheepTilesGame() {
  const [difficulty, setDifficulty] = useState<SheepDifficulty>("medium")
  /** 同难度重开时递增，仅在客户端 effect 里发牌，避免 SSR 与客户端随机不一致导致 hydration 报错 */
  const [roundKey, setRoundKey] = useState(0)
  /** >0 表示本局已发过牌，避免首帧 board 空时误判通关 */
  const [gameEpoch, setGameEpoch] = useState(0)
  const [board, setBoard] = useState<BoardTile[]>([])
  const [bar, setBar] = useState<number[]>([])
  const [status, setStatus] = useState<"play" | "win" | "lose" | "stuck">("play")
  /** 多条飞入动画并行；按 seq（点击顺序）在落地时依次并入底栏 */
  const [flights, setFlights] = useState<
    Array<{
      seq: number
      kind: number
      from: ScreenRect
      to: ScreenRect
      fromRot: number
      moving: boolean
    }>
  >([])
  /** 底栏牌飞回牌面最底行 */
  const [returnFlights, setReturnFlights] = useState<
    Array<{
      id: number
      kind: number
      from: ScreenRect
      to: ScreenRect
      moving: boolean
    }>
  >([])
  const barDropTargetRef = useRef<HTMLDivElement | null>(null)
  const playFieldRef = useRef<HTMLDivElement | null>(null)
  const barCellRefs = useRef<(HTMLDivElement | null)[]>([])
  const returnFlySeqRef = useRef(0)
  const returnFlyTimersRef = useRef<
    Map<number, { timer: number; r1: number; r2: number }>
  >(new Map())
  const pickSeqRef = useRef(0)
  const nextCommitSeqRef = useRef(1)
  const pendingCommitRef = useRef<Map<number, { kind: number }>>(new Map())
  const flyTimersRef = useRef<
    Map<number, { timer: number; r1: number; r2: number }>
  >(new Map())

  /** 小屏或粗指针：减轻阴影与 filter，降低 GPU 合成成本 */
  const [liteFx, setLiteFx] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px), (pointer: coarse)")
    const apply = () => setLiteFx(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

  const blockedIds = useMemo(() => blockedTileIds(board), [board])
  const sortedForPaint = useMemo(
    () => [...board].sort((a, b) => a.z - b.z),
    [board],
  )

  const clearAllFlyTimers = useCallback(() => {
    flyTimersRef.current.forEach(({ timer, r1, r2 }) => {
      window.clearTimeout(timer)
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    })
    flyTimersRef.current.clear()
    returnFlyTimersRef.current.forEach(({ timer, r1, r2 }) => {
      window.clearTimeout(timer)
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    })
    returnFlyTimersRef.current.clear()
  }, [])

  const tryFlushCommits = useCallback(() => {
    const pending = pendingCommitRef.current
    let next = nextCommitSeqRef.current
    const batch: number[] = []
    while (pending.has(next)) {
      batch.push(pending.get(next)!.kind)
      pending.delete(next)
      next++
    }
    if (batch.length === 0) return
    nextCommitSeqRef.current = next
    setBar((prev) => {
      let b = prev
      for (const k of batch) {
        b = resolveBar([...b, k])
        if (b.length > SLOT_MAX) {
          setStatus("lose")
          break
        }
      }
      return b
    })
  }, [])

  useEffect(() => {
    const seed =
      (Date.now() ^
        (Math.random() * 0x100000000) ^
        (roundKey * 0x9e3779b9)) >>>
      0
    clearAllFlyTimers()
    setBoard(buildBoard(seed, difficulty))
    setBar([])
    setStatus("play")
    setFlights([])
    setReturnFlights([])
    pickSeqRef.current = 0
    nextCommitSeqRef.current = 1
    pendingCommitRef.current.clear()
    setGameEpoch((e) => e + 1)
  }, [difficulty, roundKey, clearAllFlyTimers])

  const reset = useCallback(() => {
    setRoundKey((k) => k + 1)
  }, [])

  const onDifficultyChange = useCallback((d: SheepDifficulty) => {
    setDifficulty(d)
  }, [])

  useEffect(() => {
    if (gameEpoch === 0) return
    if (flights.length > 0) return
    if (returnFlights.length > 0) return
    if (status !== "play") return
    if (board.length !== 0) return
    if (bar.length === 0) setStatus("win")
    else setStatus("stuck")
  }, [gameEpoch, flights.length, returnFlights.length, board.length, bar.length, status])

  const cfg = DIFFICULTY[difficulty]
  const reservedBandPct = reservedBottomBandPct(cardHeightPct(cfg.cardWPct))

  const pick = useCallback(
    (
      tile: BoardTile,
      e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    ) => {
      if (status !== "play") return
      if (returnFlights.length > 0) return
      if (isBlocked(tile, board)) return

      const dropEl = barDropTargetRef.current
      if (!dropEl) return

      const reduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches

      const newBoard = board.filter((t) => t.id !== tile.id)
      const boardRemaining = newBoard.length

      if (reduceMotion) {
        const newBar = resolveBar([...bar, tile.kind])
        setBoard(newBoard)
        setBar(newBar)
        if (newBar.length > SLOT_MAX) setStatus("lose")
        else if (boardRemaining === 0 && newBar.length === 0) setStatus("win")
        else if (boardRemaining === 0) setStatus("stuck")
        return
      }

      const seq = ++pickSeqRef.current
      const from = pickScreenRect(e.currentTarget.getBoundingClientRect())
      const to = pickScreenRect(dropEl.getBoundingClientRect())
      const kind = tile.kind
      const fromRot = tile.rot

      setBoard(newBoard)
      setFlights((prev) => [
        ...prev,
        { seq, kind, from, to, fromRot, moving: false },
      ])

      let r2 = 0
      const r1 = requestAnimationFrame(() => {
        r2 = requestAnimationFrame(() => {
          setFlights((prev) =>
            prev.map((f) => (f.seq === seq ? { ...f, moving: true } : f)),
          )
        })
      })
      const timer = window.setTimeout(() => {
        flyTimersRef.current.delete(seq)
        cancelAnimationFrame(r1)
        cancelAnimationFrame(r2)
        setFlights((prev) => prev.filter((f) => f.seq !== seq))
        pendingCommitRef.current.set(seq, { kind })
        tryFlushCommits()
      }, FLY_MS)
      flyTimersRef.current.set(seq, { timer, r1, r2 })
    },
    [board, bar, status, tryFlushCommits, returnFlights.length],
  )

  /** 移出底栏前三张重新回到牌堆最后一行 */
  const moveBarFrontToDock = useCallback(() => {
    if (status !== "play") return
    if (bar.length < 3) return
    if (flights.length > 0 || returnFlights.length > 0) return

    const kinds = bar.slice(0, 3)
    const cells = layoutReturnRowTiles(cfg)
    const baseZ = board.reduce((m, t) => Math.max(m, t.z), 0) + 1
    const idBatch = ++returnFlySeqRef.current
    const pendingTiles: BoardTile[] = kinds.map((kind, i) => {
      const c = cells[i]!
      return {
        id: `ret-${roundKey}-${idBatch}-${i}-${kind}`,
        kind,
        z: baseZ + i,
        rot: 0,
        rect: c.rect,
        colLeft: c.colLeft,
        rowTop: c.rowTop,
      }
    })

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    if (reduceMotion) {
      setBar((b) => b.slice(3))
      setBoard((b) => [...b, ...pendingTiles])
      setStatus((s) => (s === "stuck" ? "play" : s))
      return
    }

    const fromRects: ScreenRect[] = []
    for (let i = 0; i < 3; i++) {
      const el = barCellRefs.current[i]
      if (!el) return
      fromRects.push(pickScreenRect(el.getBoundingClientRect()))
    }
    const field = playFieldRef.current
    if (!field) return
    const fr = field.getBoundingClientRect()
    const toRects = pendingTiles.map((t) => boardTileRectToScreen(fr, t.rect))

    setBar((b) => b.slice(3))
    const idBase = idBatch
    setReturnFlights(
      kinds.map((kind, i) => ({
        id: idBase * 10 + i,
        kind,
        from: fromRects[i]!,
        to: toRects[i]!,
        moving: false,
      })),
    )

    let r2 = 0
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        setReturnFlights((prev) => prev.map((f) => ({ ...f, moving: true })))
      })
    })
    const timer = window.setTimeout(() => {
      returnFlyTimersRef.current.delete(idBase)
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
      setReturnFlights([])
      setBoard((b) => [...b, ...pendingTiles])
      setStatus((s) => (s === "stuck" ? "play" : s))
    }, FLY_MS)
    returnFlyTimersRef.current.set(idBase, { timer, r1, r2 })
  }, [
    status,
    bar,
    board,
    flights.length,
    returnFlights.length,
    cfg,
    roundKey,
  ])

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-2 rounded-none bg-card/50 p-3">
        <p className="text-xs font-medium text-foreground">难度</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIFFICULTY) as SheepDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDifficultyChange(d)}
              className={cn(
                "rounded-none px-3 py-2 text-xs font-medium transition-colors",
                difficulty === d
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted/80",
              )}
            >
              {DIFFICULTY[d].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">{cfg.hint}</p>
      </div>

      <p className="text-center text-sm text-muted-foreground leading-relaxed">
        点击<strong className="text-foreground">最上层未被压住</strong>
        的方块；三张相同即消除。底栏最多 {SLOT_MAX} 张；牌面最下有一行预留空带。
      </p>

      <div className="rounded-none bg-muted/40 p-2 shadow-inner [touch-action:manipulation]">
        <div
          ref={playFieldRef}
          className="relative mx-auto w-full overflow-hidden rounded-lg bg-gradient-to-b from-emerald-950/30 via-muted/20 to-background [contain:layout_paint]"
          style={{ aspectRatio: "3 / 4", maxHeight: "min(72vh, 460px)" }}
        >
          {board.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              正在洗牌…
            </div>
          ) : null}
          {sortedForPaint.map((tile) => {
            const blocked = blockedIds.has(tile.id)
            const src = SHEEP_TILE_IMAGES[tile.kind]?.src
            return (
              <div
                key={tile.id}
                aria-label={`卡片 ${tile.kind + 1}${blocked ? "（被遮挡）" : ""}`}
                className={cn(
                  "absolute  overflow-visible rounded-xl border-0 aspect-square bg-background outline-none [isolation:isolate]",
                  liteFx ? "" : "transition-transform duration-100",
                  status !== "play" && "pointer-events-none",
                )}
                style={{
                  left: `${tile.rect.l}%`,
                  top: `${tile.rect.t}%`,
                  width: `${tile.rect.w}%`,
                  height: `${tile.rect.h}%`,
                  zIndex: 20 + tile.z,
                  transform: `rotate(${tile.rot}deg)`,

                }}
                onClick={(ev) => {
                  if (status !== "play" || blocked) return
                  pick(tile, ev)
                }}
                onKeyDown={(ev) => {
                  if (status !== "play" || blocked) return
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault()
                    pick(tile, ev)
                  }
                }}
              >
                {src ? (
                  <SheepTileFace src={src} liteFx={liteFx} blocked={blocked} />
                ) : null}
              </div>
            )
          })}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[18] border-t border-dashed border-muted-foreground/30 bg-muted/15"
            style={{ height: `${reservedBandPct}%` }}
            aria-hidden
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-xs text-muted-foreground">
            剩余 {board.length} 张 · 底栏 {bar.length}/{SLOT_MAX}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={
                status !== "play" ||
                bar.length < 3 ||
                flights.length > 0 ||
                returnFlights.length > 0
              }
              title="将底栏前三张飞回牌面最底一行（辅助）"
              onClick={moveBarFrontToDock}
            >
              <ArrowUpFromLine className="size-4" />
              移出
            </Button>
            <Button variant="outline"
              onClick={reset}
            >
              <RotateCcw className="size-4" />
              新开一局
            </Button>
          </div>

        </div>
        <div
          className="relative flex min-h-[4.75rem] flex-wrap content-start gap-2 rounded-none bg-muted/50 p-2 [touch-action:manipulation]"
          aria-label="收纳栏"
        >
          {bar.length === 0 ? (
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center text-xs text-muted-foreground">
              已选方块会排在这里
            </span>
          ) : null}
          {bar.map((kind, i) => (
            <div
              key={`${i}-${kind}`}
              ref={(el) => {
                if (i < 3) barCellRefs.current[i] = el
              }}
              className="relative h-12 w-12 shrink-0 overflow-visible rounded-lg bg-card [isolation:isolate]"
              style={{
                boxShadow: liteFx ? SHADOW_BAR_LITE : SHADOW_BAR,
              }}
            >
              <SheepTileFace
                src={SHEEP_TILE_IMAGES[kind]!.src}
                liteFx={liteFx}
              />
            </div>
          ))}
          <div
            ref={barDropTargetRef}
            className="h-12 w-12 shrink-0 [visibility:hidden]"
            aria-hidden
          />
        </div>
      </div>

      {status === "win" ? (
        <p className="text-center text-base font-medium text-emerald-600 dark:text-emerald-400">
          全部清空，通关！
        </p>
      ) : null}
      {status === "lose" ? (
        <p className="text-center text-base font-medium text-destructive">
          底栏已满，挑战失败 — 请重开一局
        </p>
      ) : null}
      {status === "stuck" ? (
        <p className="text-center text-sm text-amber-700 dark:text-amber-400">
          牌面已空但栏内无法继续消除，本局无解 — 请重开一局
        </p>
      ) : null}

      {flights.map((fly) => {
        const flySrc = SHEEP_TILE_IMAGES[fly.kind]?.src
        if (!flySrc) return null
        const dx = fly.to.left - fly.from.left
        const dy = fly.to.top - fly.from.top
        const sx = fly.to.width / fly.from.width
        const sy = fly.to.height / fly.from.height
        const moving = fly.moving
        return (
          <div
            key={fly.seq}
            className="pointer-events-none fixed overflow-visible rounded-xl bg-card [isolation:isolate]"
            style={{
              zIndex: 10000 + fly.seq,
              left: fly.from.left,
              top: fly.from.top,
              width: fly.from.width,
              height: fly.from.height,
              transformOrigin: "0 0",
              transform: moving
                ? `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy}) rotate(0deg)`
                : `translate3d(0,0,0) scale(1,1) rotate(${fly.fromRot}deg)`,
              transitionProperty: moving ? "transform, box-shadow" : "none",
              transitionDuration: moving ? "380ms, 380ms" : "0ms",
              transitionTimingFunction: moving
                ? "cubic-bezier(0.22, 1, 0.36, 1), ease"
                : "ease",
              transitionDelay: "0ms",
              willChange: moving ? "transform" : "auto",
              boxShadow: moving
                ? liteFx
                  ? SHADOW_FLY_END_LITE
                  : SHADOW_FLY_END
                : liteFx
                  ? SHADOW_FLY_START_LITE
                  : SHADOW_FLY_START,
            }}
          >
            <SheepTileFace src={flySrc} liteFx={liteFx} />
          </div>
        )
      })}

      {returnFlights.map((fly) => {
        const flySrc = SHEEP_TILE_IMAGES[fly.kind]?.src
        if (!flySrc) return null
        const dx = fly.to.left - fly.from.left
        const dy = fly.to.top - fly.from.top
        const sx = fly.to.width / fly.from.width
        const sy = fly.to.height / fly.from.height
        const moving = fly.moving
        return (
          <div
            key={fly.id}
            className="pointer-events-none fixed overflow-visible rounded-xl bg-card [isolation:isolate]"
            style={{
              zIndex: 10050 + fly.id,
              left: fly.from.left,
              top: fly.from.top,
              width: fly.from.width,
              height: fly.from.height,
              transformOrigin: "0 0",
              transform: moving
                ? `translate3d(${dx}px, ${dy}px, 0) scale(${sx}, ${sy}) rotate(0deg)`
                : "translate3d(0,0,0) scale(1,1) rotate(0deg)",
              transitionProperty: moving ? "transform, box-shadow" : "none",
              transitionDuration: moving ? "380ms, 380ms" : "0ms",
              transitionTimingFunction: moving
                ? "cubic-bezier(0.22, 1, 0.36, 1), ease"
                : "ease",
              transitionDelay: "0ms",
              willChange: moving ? "transform" : "auto",
              boxShadow: moving
                ? liteFx
                  ? SHADOW_FLY_END_LITE
                  : SHADOW_FLY_END
                : liteFx
                  ? SHADOW_FLY_START_LITE
                  : SHADOW_FLY_START,
            }}
          >
            <SheepTileFace src={flySrc} liteFx={liteFx} />
          </div>
        )
      })}
    </div>
  )
}
