"use client"

/**
 * 双色推箱 — 客户端游戏组件
 *
 * 场地：9×9 格全部为逻辑格（见 dual-tone-push/constants）；外围 CSS 边框仅装饰。
 *
 * 核心规则摘要：
 * - 行走：默认同色地块可走；转化格任意本体色均可踏入；踩转化格「武装」后，下一步可踏入任意色空地块，落地本体色变为该格地坪色。
 * - 箱：异色可推；同色可叠入一格但不可推；穿越地块时按 B/F₁/F₂ 规则可能翻面。
 * - 胜：每只箱子都在某一终点格上。
 */

import Image from "next/image"
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

/** 地块贴图：白 / 黑 */
import imgWhiteFloor from "./assets/白色地块.png"
import imgBlackFloor from "./assets/黑色地块.png"
/** 箱子贴图：与本体异色时可推 */
import imgWhiteBox from "./assets/白色箱子.png"
import imgBlackBox from "./assets/黑色箱子.png"
import imgGoal from "./assets/终点.png"
import imgConverter from "./assets/转化方块.png"
/** 本体：随 player.tone 切换白/黑外观 */
import imgPlayerWhite from "./assets/白色地块本体.png"
import imgPlayerBlack from "./assets/黑色地块本体.png"

import {
  DEFAULT_DUAL_TONE_LEVELS,
  DUAL_TONE_GRID_SIZE,
  parseDualToneLevel,
  type DualToneLevelDef,
  type ParseDualToneOptions,
  type Tone,
} from "./dual-tone-push"

export type { Tone }

/** 组件对外可传参：自定义关卡、解析选项、关卡切换回调 */
export type DualTonePushGameProps = {
  /** 关卡列表；默认使用内置 `DEFAULT_DUAL_TONE_LEVELS` */
  levels?: DualToneLevelDef[]
  /** 初始选中关卡下标 */
  initialLevelIndex?: number
  /** 传给 `parseDualToneLevel`（扩展 `tileChars` 等） */
  levelParseOptions?: ParseDualToneOptions
  /** 切换关卡时回调 */
  onLevelIndexChange?: (index: number) => void
  /** 内嵌于工具页：隐藏长篇规则；单关时隐藏关卡选择与 [ ] 快捷键提示 */
  embedded?: boolean
}

/** 静态地图格：地坪色 + 是否终点 + 是否转化格（解析自关卡字符串） */
type Cell = {
  floor: Tone
  goal: boolean
  converter: boolean
}

/** 可移动实体：本体与箱子共用结构，tone 为白(0)或黑(1) */
type Entity = { r: number; c: number; tone: Tone }

function flipTone(t: Tone): Tone {
  return (1 - t) as Tone
}

/**
 * 推箱穿越时的翻面：箱色 B，离开格地坪 F₁，进入格 F₂。
 * 若 B≠F₁ 且 B=F₂，则翻面；否则保持。
 */
function boxToneAfterPush(boxTone: Tone, fromFloor: Tone, toFloor: Tone): Tone {
  if (boxTone !== fromFloor && boxTone === toFloor) return flipTone(boxTone)
  return boxTone
}

function cloneCells(c: Cell[][]): Cell[][] {
  return c.map((row) => row.map((cell) => ({ ...cell })))
}

/**
 * 从关卡定义解析出「当前关」的静态 cells + 初始 player/boxes。
 * cells 随关卡与 levelIndex 变化；对局中的箱子位置在 React state 里更新。
 */
function loadSnapshot(
  levels: DualToneLevelDef[],
  index: number,
  parseOptions?: ParseDualToneOptions,
): {
  cells: Cell[][]
  player: Entity
  boxes: Entity[]
} {
  const def = levels[index]
  if (!def) throw new Error(`关卡索引越界: ${index}`)
  const parsed = parseDualToneLevel(def.map, parseOptions)
  return {
    cells: parsed.cells as Cell[][],
    player: { ...parsed.player },
    boxes: parsed.boxes.map((b) => ({ ...b })),
  }
}

/** 查询 (r,c) 上是否有箱子（多只箱子不会同格，除与本体叠格规则外） */
function boxesAt(boxes: Entity[], r: number, c: number): Entity | undefined {
  return boxes.find((b) => b.r === r && b.c === c)
}

/** 胜利条件：每个箱子所在格均为终点 */
function isWin(cells: Cell[][], boxes: Entity[]): boolean {
  return boxes.every((b) => cells[b.r][b.c].goal)
}

function floorImage(floor: Tone) {
  return floor === 0 ? imgWhiteFloor : imgBlackFloor
}

function playerImage(tone: Tone) {
  return tone === 0 ? imgPlayerWhite : imgPlayerBlack
}

function measureGridLayout(el: HTMLElement | null): {
  cell: number
  gap: number
  pad: number
} {
  if (!el) return { cell: 0, gap: 0, pad: 0 }
  const cs = window.getComputedStyle(el)
  const padL = parseFloat(cs.paddingLeft) || 0
  const padR = parseFloat(cs.paddingRight) || 0
  const padT = parseFloat(cs.paddingTop) || 0
  const padB = parseFloat(cs.paddingBottom) || 0
  const gap =
    parseFloat(cs.columnGap || cs.gap || "0") ||
    parseFloat(cs.rowGap || "0") ||
    0
  const innerW = el.clientWidth - padL - padR
  const innerH = el.clientHeight - padT - padB
  const cellW = (innerW - 8 * gap) / 9
  const cellH = (innerH - 8 * gap) / 9
  const cell = Math.min(cellW, cellH)
  const pad = padL
  return { cell, gap, pad }
}

export function DualTonePushGame({
  levels: levelsProp = DEFAULT_DUAL_TONE_LEVELS,
  initialLevelIndex = 0,
  levelParseOptions,
  onLevelIndexChange,
  embedded = false,
}: DualTonePushGameProps) {
  const levels = levelsProp

  /** 初始关卡下标夹在 [0, length-1] */
  const startIdx = Math.min(
    Math.max(0, initialLevelIndex),
    Math.max(0, levels.length - 1),
  )

  const [levelIndex, setLevelIndex] = useState(startIdx)

  /** 父组件传入的 levels 数组变短或重绑时，当前下标不能超过新长度 */
  useEffect(() => {
    setLevelIndex((i) => Math.min(i, Math.max(0, levels.length - 1)))
  }, [levels])

  /** 当前关静态地图（不含动态箱子），用于渲染地坪/终点/转化格底图 */
  const cells = useMemo(() => {
    const p = loadSnapshot(levels, levelIndex, levelParseOptions)
    return cloneCells(p.cells)
  }, [levels, levelIndex, levelParseOptions])

  const [player, setPlayer] = useState<Entity>(() =>
    loadSnapshot(levels, startIdx, levelParseOptions).player,
  )
  const [boxes, setBoxes] = useState<Entity[]>(() =>
    loadSnapshot(levels, startIdx, levelParseOptions).boxes,
  )
  /**
   * 是否已踩转化格、尚未在「非转化格」上落地变色。
   * true：下一步走入任意色空地块时允许通行，落地后按该格 floor 更新本体色并清 false。
   */
  const [pendingConverter, setPendingConverter] = useState(false)
  const [won, setWon] = useState(false)
  const [moves, setMoves] = useState(0)

  const boardRef = useRef<HTMLDivElement>(null)
  const [gridLayout, setGridLayout] = useState({ cell: 0, gap: 0, pad: 0 })
  /** 重置/切关时关闭过渡，避免从 (0,0) 滑入 */
  const [teleport, setTeleport] = useState(true)

  useLayoutEffect(() => {
    const el = boardRef.current
    if (!el) return
    const apply = () => setGridLayout(measureGridLayout(el))
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    return () => ro.disconnect()
  }, [levelIndex])

  /** 换关或换解析选项：整关重置为初始快照 */
  useEffect(() => {
    setTeleport(true)
    const s = loadSnapshot(levels, levelIndex, levelParseOptions)
    setPlayer({ ...s.player })
    setBoxes(s.boxes.map((b) => ({ ...b })))
    setPendingConverter(false)
    setWon(false)
    setMoves(0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTeleport(false))
    })
  }, [levels, levelParseOptions, levelIndex])

  const applyLevelIndex = useCallback(
    (i: number) => {
      if (i < 0 || i >= levels.length) return
      setLevelIndex(i)
      onLevelIndexChange?.(i)
    },
    [levels.length, onLevelIndexChange],
  )

  /** 重置当前关：回到地图初始 player/boxes，不切换关卡下标 */
  const reset = useCallback(() => {
    setTeleport(true)
    const s = loadSnapshot(levels, levelIndex, levelParseOptions)
    setPlayer({ ...s.player })
    setBoxes(s.boxes.map((b) => ({ ...b })))
    setPendingConverter(false)
    setWon(false)
    setMoves(0)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTeleport(false))
    })
  }, [levels, levelIndex, levelParseOptions])

  /**
   * 单步移动 (dr,dc)。分支顺序：
   * 1) 前方越界 → 无效
   * 2) 前方无箱：可走条件见下方「武装转化」；落地处理转化/变色
   * 3) 前方有箱且与本体同色：叠入（不可推），仅移动本体
   * 4) 前方有箱且异色：推箱；更新箱位置与可能翻面；本体站到原箱格，处理转化武装与落地变色
   */
  const tryMove = useCallback(
    (dr: number, dc: number) => {
      if (won) return

      const nr = player.r + dr
      const nc = player.c + dc
      if (nr < 0 || nr >= DUAL_TONE_GRID_SIZE || nc < 0 || nc >= DUAL_TONE_GRID_SIZE) return

      const box = boxesAt(boxes, nr, nc)

      /** 本体落到 nextPlayer 所在格之后：转化格只武装；非转化且已武装则本体 tone = 该格 floor */
      const applyLanding = (nextPlayer: Entity, nextBoxes: Entity[]) => {
        const cell = cells[nextPlayer.r][nextPlayer.c]
        if (cell.converter) {
          setPendingConverter(true)
        } else if (pendingConverter) {
          nextPlayer = { ...nextPlayer, tone: cell.floor }
          setPendingConverter(false)
        }
        setPlayer(nextPlayer)
        setBoxes(nextBoxes)
        setMoves((m) => m + 1)
        if (isWin(cells, nextBoxes)) setWon(true)
      }

      // —— 走向空格子（无箱）——
      if (!box) {
        const dest = cells[nr][nc]
        // 转化格：任意本体色均可踏入（不要求与地坪同色）；未武装且非转化：仅同色可走；武装后：可进任意色空地块
        const allowEnter =
          pendingConverter || dest.floor === player.tone || dest.converter
        if (!allowEnter) return
        applyLanding({ ...player, r: nr, c: nc }, boxes)
        return
      }

      // —— 与箱同色：可叠入，不按推箱处理（无法把同色箱再推出）——
      if (box.tone === player.tone) {
        applyLanding({ ...player, r: nr, c: nc }, boxes)
        return
      }

      // —— 异色箱：尝试推动 ——
      const br = nr + dr
      const bc = nc + dc
      if (br < 0 || br >= DUAL_TONE_GRID_SIZE || bc < 0 || bc >= DUAL_TONE_GRID_SIZE) return
      if (boxesAt(boxes, br, bc)) return

      const fromFloor = cells[nr][nc].floor
      const toFloor = cells[br][bc].floor
      const newTone = boxToneAfterPush(box.tone, fromFloor, toFloor)
      const movedBox: Entity = { r: br, c: bc, tone: newTone }
      const nextBoxes = boxes.map((b) => (b === box ? movedBox : b))
      const nextPlayer: Entity = { ...player, r: nr, c: nc }

      // 本体站在「原箱所在格」：同样要处理转化武装与武装后的落地变色（与 applyLanding 语义对齐）
      const landCell = cells[nr][nc]
      let p = nextPlayer
      let pending = pendingConverter
      if (landCell.converter) {
        pending = true
      } else if (pending) {
        p = { ...p, tone: landCell.floor }
        pending = false
      }
      setPendingConverter(pending)
      setPlayer(p)
      setBoxes(nextBoxes)
      setMoves((m) => m + 1)
      if (isWin(cells, nextBoxes)) setWon(true)
    },
    [boxes, cells, pendingConverter, player, won],
  )

  /** 全局键盘：移动 / 重置 / 切关 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "w" || e.key === "W") {
        e.preventDefault()
        tryMove(-1, 0)
      } else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") {
        e.preventDefault()
        tryMove(1, 0)
      } else if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") {
        e.preventDefault()
        tryMove(0, -1)
      } else if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") {
        e.preventDefault()
        tryMove(0, 1)
      } else if (e.key === "r" || e.key === "R") {
        e.preventDefault()
        reset()
      } else if (e.key === "[" || e.key === "【") {
        e.preventDefault()
        applyLevelIndex(levelIndex - 1)
      } else if (e.key === "]" || e.key === "】") {
        e.preventDefault()
        applyLevelIndex(levelIndex + 1)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [tryMove, reset, applyLevelIndex, levelIndex])

  return (
    <div className="mx-auto max-w-lg space-y-6">
      {!embedded ? (
        <p className="text-center text-sm text-muted-foreground leading-relaxed">
          <strong className="text-foreground">9×9</strong> 为可移动范围，关卡地图仅含这 81
          格；外围线框为装饰，不参与逻辑。本体默认同色地块可走；转化格任意本体色均可踏入。异色箱可推，同色箱可叠入但不可推。踩
          <strong className="text-foreground">转化格</strong>
          后「武装」：下一步可踏入<strong className="text-foreground">任意色空地块</strong>
          ，落地本体变为该格地坪色。箱翻面：箱色 B，离开格 F₁，进入格 F₂；若 B≠F₁ 且 B=F₂ 则翻面。全部箱进终点即胜。
          扩展见{" "}
          <code className="text-xs text-foreground">components/games/dual-tone-push/</code>{" "}
          与 <code className="text-xs text-foreground">levels</code> /{" "}
          <code className="text-xs text-foreground">levelParseOptions</code>。
        </p>
      ) : null}
      {levels[levelIndex]?.description ? (
        <p className="text-center text-xs text-muted-foreground">
          本关：{levels[levelIndex].description}
        </p>
      ) : null}

      {/* 工具条：选关、步数、重置 */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {(!embedded || levels.length > 1) ? (
          <label className="flex items-center gap-2 rounded-none border border-border bg-card/60 px-3 py-2 text-sm">
            <span className="text-muted-foreground shrink-0">关卡</span>
            <select
              className="max-w-[min(100%,220px)] cursor-pointer rounded-none border border-border bg-background px-2 py-1 text-sm"
              value={levelIndex}
              onChange={(e) => applyLevelIndex(Number(e.target.value))}
              aria-label="选择关卡"
            >
              {levels.map((lv, i) => (
                <option key={lv.id} value={i}>
                  {lv.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="rounded-none border border-border bg-card/60 px-3 py-2 text-sm">
          步数：<span className="font-mono tabular-nums">{moves}</span>
        </div>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-none border border-border bg-secondary px-3 py-2 text-sm font-medium hover:bg-secondary/80 transition-colors"
        >
          <RotateCcw className="h-4 w-4" />
          重置
        </button>
      </div>

      {/* 外层：装饰性边框；静态格 + 覆盖层实体（left/top 过渡实现连续滑动） */}
      <div className="mx-auto w-full max-w-[min(100%,380px)] rounded-none border-2 border-zinc-300 bg-zinc-200/90 p-3 shadow-md dark:border-zinc-600 dark:bg-zinc-900/90">
        <div className="relative">
          <div
            ref={boardRef}
            className="grid aspect-square w-full gap-2 rounded-none bg-zinc-300/70 p-2 dark:bg-zinc-950/50"
            style={{
              gridTemplateColumns: `repeat(${DUAL_TONE_GRID_SIZE}, minmax(0, 1fr))`,
            }}
            role="application"
            aria-label="9×9 可移动场地"
          >
            {Array.from({ length: DUAL_TONE_GRID_SIZE * DUAL_TONE_GRID_SIZE }, (_, i) => {
              const r = Math.floor(i / DUAL_TONE_GRID_SIZE)
              const c = i % DUAL_TONE_GRID_SIZE
              const cell = cells[r][c]

              return (
                <div
                  key={`${r}-${c}`}
                  className="relative flex min-h-0 min-w-0 items-center justify-center overflow-hidden rounded-none"
                >
                  <Image
                    src={floorImage(cell.floor)}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 380px) 10vw, 40px"
                  />

                  {cell.goal ? (
                    <div className="pointer-events-none absolute inset-0 z-[1]">
                      <Image src={imgGoal} alt="" fill className="object-contain p-0.5" sizes="40px" />
                    </div>
                  ) : null}

                  {cell.converter ? (
                    <div className="pointer-events-none absolute inset-0 z-[2]">
                      <Image
                        src={imgConverter}
                        alt=""
                        fill
                        className="object-cover opacity-90"
                        sizes="40px"
                      />
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>

          {gridLayout.cell > 0 ? (
            <div
              className="pointer-events-none absolute inset-0 z-10 p-2"
              aria-hidden
            >
              {boxes.map((box, bi) => (
                <div
                  key={`box-${bi}`}
                  className={cn(
                    "absolute z-[3]",
                    !teleport &&
                      "transition-[left,top] duration-[220ms] ease-out motion-reduce:transition-none",
                  )}
                  style={{
                    left: gridLayout.pad + box.c * (gridLayout.cell + gridLayout.gap),
                    top: gridLayout.pad + box.r * (gridLayout.cell + gridLayout.gap),
                    width: gridLayout.cell,
                    height: gridLayout.cell,
                  }}
                >
                  <div className="absolute inset-[10%]">
                    <Image
                      src={box.tone === 0 ? imgWhiteBox : imgBlackBox}
                      alt=""
                      fill
                      className="object-contain"
                      sizes="40px"
                    />
                  </div>
                </div>
              ))}
              <div
                className={cn(
                  "absolute z-[4]",
                  !teleport &&
                    "transition-[left,top] duration-[220ms] ease-out motion-reduce:transition-none",
                )}
                style={{
                  left: gridLayout.pad + player.c * (gridLayout.cell + gridLayout.gap),
                  top: gridLayout.pad + player.r * (gridLayout.cell + gridLayout.gap),
                  width: gridLayout.cell,
                  height: gridLayout.cell,
                }}
              >
                <div className="absolute inset-[12%]">
                  <Image
                    src={playerImage(player.tone)}
                    alt=""
                    fill
                    className="object-contain"
                    sizes="40px"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* 小屏方向键，与键盘逻辑一致 */}
      <div className="flex flex-wrap justify-center gap-2 sm:hidden">
        {(
          [
            ["上", -1, 0],
            ["下", 1, 0],
            ["左", 0, -1],
            ["右", 0, 1],
          ] as const
        ).map(([label, dr, dc]) => (
          <button
            key={label}
            type="button"
            onClick={() => tryMove(dr, dc)}
            className="rounded-none border border-border bg-secondary px-4 py-2 text-sm"
          >
            {label}
          </button>
        ))}
      </div>

      {won ? (
        <p className="text-center text-base font-medium text-emerald-600 dark:text-emerald-400">
          全部箱子已到达终点！按 R 或点「重置」再玩一局。
        </p>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        键盘：方向键 / WASD 移动 · R 重置
        {!embedded || levels.length > 1 ? " · [ / ] 上一关 / 下一关" : ""}
      </p>
    </div>
  )
}
