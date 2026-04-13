"use client"

/**
 * 「羊了个羊」式叠层消除：不规则叠层、方形牌面、立体阴影；
 * 难度影响图案种数、牌张数与叠层纵深。
 */

import Image from "next/image"
import type { MouseEvent } from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { SHEEP_TILE_IMAGES } from "./sheep-tiles-assets"

const PLAY_W = 100
const PLAY_H = 100
/** 场地 width/height（与外层 aspect-ratio 一致），用于把「宽的 %」换算成竖向占位 */
const FIELD_WH_RATIO = 3 / 4
const SLOT_MAX = 7
const FLY_MS = 420

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
    /** 轻微旋转 ±deg，叠层更「乱」 */
    tiltDeg: number
  }
> = {
  easy: {
    label: "简单",
    hint: "4 种 × 每种 3 张，牌面较大",
    kinds: 4,
    perKind: 3,
    cardWPct: 26,
    tiltDeg: 5,
  },
  medium: {
    label: "标准",
    hint: "6 种 × 每种 6 张",
    kinds: 6,
    perKind: 6,
    cardWPct: 21,
    tiltDeg: 6,
  },
  hard: {
    label: "困难",
    hint: "8 种 × 每种 9 张，牌小层多",
    kinds: 8,
    perKind: 9,
    cardWPct: 17,
    tiltDeg: 8,
  },
  extreme: {
    label: "极限",
    hint: "13 种 × 每种 12 张（共 156 张），牌多密集",
    kinds: 13,
    perKind: 12,
    cardWPct: 14,
    tiltDeg: 10,
  },
}

type Rect = { l: number; t: number; w: number; h: number }

type BoardTile = {
  id: string
  kind: number
  /** 唯一叠放次序，越大越靠上 */
  z: number
  rect: Rect
  /** 轻微旋转（度） */
  rot: number
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

function rectsOverlap(a: Rect, b: Rect): boolean {
  const ax2 = a.l + a.w
  const ay2 = a.t + a.h
  const bx2 = b.l + b.w
  const by2 = b.t + b.h
  return !(ax2 <= b.l || a.l >= bx2 || ay2 <= b.t || a.t >= by2)
}

function isBlocked(tile: BoardTile, others: BoardTile[]): boolean {
  return others.some(
    (o) => o.id !== tile.id && o.z > tile.z && rectsOverlap(tile.rect, o.rect),
  )
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
 * 不规则叠层：每张牌随机平面位置 + 随机唯一 z 序（0…n-1），形成非网格堆叠。
 */
function buildBoard(seed: number, difficulty: SheepDifficulty): BoardTile[] {
  const rand = mulberry32(seed)
  const cfg = DIFFICULTY[difficulty]
  const hPct = cardHeightPct(cfg.cardWPct)
  const margin = 1.5

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
  const n = kinds.length

  const zOrder = shuffle(
    Array.from({ length: n }, (_, i) => i),
    rand,
  )

  const tiles: BoardTile[] = []
  for (let i = 0; i < n; i++) {
    const w = cfg.cardWPct
    const h = hPct
    const maxL = Math.max(0, PLAY_W - w - margin * 2)
    const maxT = Math.max(0, PLAY_H - h - margin * 2)
    const l = Math.round((margin + rand() * maxL) * 100) / 100
    const t = Math.round((margin + rand() * maxT) * 100) / 100
    const rot =
      Math.round((rand() - 0.5) * 2 * cfg.tiltDeg * 100) / 100

    tiles.push({
      id: `t-${seed}-${i}`,
      kind: kinds[i]!,
      z: zOrder[i]!,
      rot,
      rect: { l, t, w, h },
    })
  }
  return tiles
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
  const barDropTargetRef = useRef<HTMLDivElement | null>(null)
  const pickSeqRef = useRef(0)
  const nextCommitSeqRef = useRef(1)
  const pendingCommitRef = useRef<Map<number, { kind: number }>>(new Map())
  const flyTimersRef = useRef<
    Map<number, { timer: number; r1: number; r2: number }>
  >(new Map())

  const clearAllFlyTimers = useCallback(() => {
    flyTimersRef.current.forEach(({ timer, r1, r2 }) => {
      window.clearTimeout(timer)
      cancelAnimationFrame(r1)
      cancelAnimationFrame(r2)
    })
    flyTimersRef.current.clear()
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
    if (status !== "play") return
    if (board.length !== 0) return
    if (bar.length === 0) setStatus("win")
    else setStatus("stuck")
  }, [gameEpoch, flights.length, board.length, bar.length, status])

  const pick = useCallback(
    (tile: BoardTile, e: MouseEvent<HTMLButtonElement>) => {
      if (status !== "play") return
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
    [board, bar, status, tryFlushCommits],
  )

  const sortedForPaint = [...board].sort((a, b) => a.z - b.z)
  const cfg = DIFFICULTY[difficulty]

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <div className="space-y-2 rounded-none border border-border bg-card/50 p-3">
        <p className="text-xs font-medium text-foreground">难度</p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(DIFFICULTY) as SheepDifficulty[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => onDifficultyChange(d)}
              className={cn(
                "rounded-none border px-3 py-2 text-xs font-medium transition-colors",
                difficulty === d
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-muted/80",
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
        的方块；三张相同即消除。底栏最多 {SLOT_MAX} 张。
      </p>

      <div className="rounded-none border border-border bg-muted/40 p-2 shadow-inner">
        <div
          className="relative mx-auto w-full overflow-hidden rounded-lg bg-gradient-to-b from-emerald-950/30 via-muted/20 to-background"
          style={{ aspectRatio: "3 / 4", maxHeight: "min(72vh, 460px)" }}
        >
          {board.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              正在洗牌…
            </div>
          ) : null}
          {sortedForPaint.map((tile) => {
            const blocked = isBlocked(tile, board)
            const src = SHEEP_TILE_IMAGES[tile.kind]
            return (
              <button
                key={tile.id}
                type="button"
                disabled={status !== "play" || blocked}
                onClick={(ev) => pick(tile, ev)}
                aria-label={`卡片 ${tile.kind + 1}${blocked ? "（被遮挡）" : ""}`}
                className={cn(
                  "absolute overflow-hidden rounded-xl transition-[transform,box-shadow,filter] duration-150",
                  "ring-1 ring-black/15 dark:ring-white/10",
                  blocked
                    ? "cursor-not-allowed brightness-[0.58] saturate-[0.72] contrast-[1.02] ring-black/30 dark:ring-white/[0.08]"
                    : "cursor-pointer",
                  status !== "play" && "pointer-events-none",
                )}
                style={{
                  left: `${tile.rect.l}%`,
                  top: `${tile.rect.t}%`,
                  width: `${tile.rect.w}%`,
                  height: `${tile.rect.h}%`,
                  zIndex: 20 + tile.z,
                  transform: `rotate(${tile.rot}deg)`,
                  boxShadow: blocked
                    ? "0 2px 0 rgba(0,0,0,0.35), 0 6px 10px -2px rgba(0,0,0,0.55), inset 0 2px 8px rgba(0,0,0,0.28), inset 0 1px 0 rgba(255,255,255,0.12)"
                    : "0 4px 0 rgba(0,0,0,0.18), 0 14px 20px -6px rgba(0,0,0,0.55), 0 8px 12px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                {src ? (
                  <Image
                    src={src}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="128px"
                    draggable={false}
                  />
                ) : null}
              </button>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs text-muted-foreground">
            剩余 {board.length} 张 · 底栏 {bar.length}/{SLOT_MAX}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-none border border-border bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            新开一局
          </button>
        </div>
        <div
          className="relative flex min-h-[4.75rem] flex-wrap content-start gap-2 rounded-none border-2 border-dashed border-border bg-card/80 p-2"
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
              className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg object-cover ring-1 ring-black/15 dark:ring-white/10"
              style={{
                boxShadow:
                  "0 3px 0 rgba(0,0,0,0.2), 0 8px 12px -2px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.35)",
              }}
            >
              <Image
                src={SHEEP_TILE_IMAGES[kind]!}
                alt=""
                fill
                className="object-cover"
                sizes="48px"
                draggable={false}
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
        const flySrc = SHEEP_TILE_IMAGES[fly.kind]
        if (!flySrc) return null
        return (
          <div
            key={fly.seq}
            className="pointer-events-none fixed overflow-hidden rounded-xl ring-1 ring-black/20 dark:ring-white/15"
            style={{
              zIndex: 10000 + fly.seq,
              left: fly.moving ? fly.to.left : fly.from.left,
              top: fly.moving ? fly.to.top : fly.from.top,
              width: fly.moving ? fly.to.width : fly.from.width,
              height: fly.moving ? fly.to.height : fly.from.height,
              transform: `rotate(${fly.moving ? 0 : fly.fromRot}deg)`,
              transition: fly.moving
                ? "left 0.38s cubic-bezier(0.22, 1, 0.36, 1), top 0.38s cubic-bezier(0.22, 1, 0.36, 1), width 0.38s cubic-bezier(0.22, 1, 0.36, 1), height 0.38s cubic-bezier(0.22, 1, 0.36, 1), transform 0.38s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.38s ease"
                : "none",
              boxShadow: fly.moving
                ? "0 3px 0 rgba(0,0,0,0.2), 0 10px 16px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.35)"
                : "0 4px 0 rgba(0,0,0,0.18), 0 14px 20px -6px rgba(0,0,0,0.55), 0 8px 12px -4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.45)",
            }}
          >
            <Image
              src={flySrc}
              alt=""
              fill
              className="object-cover"
              sizes="128px"
              draggable={false}
            />
          </div>
        )
      })}
    </div>
  )
}
