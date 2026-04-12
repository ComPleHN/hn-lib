"use client"

import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, Play, Pencil, Upload } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DUAL_TONE_GRID_SIZE,
  DEFAULT_DUAL_TONE_TILE_CHARS,
  parseDualToneLevel,
  stringifyDualToneLevelDefJson,
  dualToneLevelDefToBuiltinTsItem,
  type DualToneLevelDef,
  type Tone,
} from "@/components/games/dual-tone-push"
import { DualTonePushGame } from "@/components/games/dual-tone-push-game"

import imgWhiteFloor from "@/components/games/assets/白色地块.png"
import imgBlackFloor from "@/components/games/assets/黑色地块.png"
import imgWhiteBox from "@/components/games/assets/白色箱子.png"
import imgBlackBox from "@/components/games/assets/黑色箱子.png"
import imgGoal from "@/components/games/assets/终点.png"
import imgConverter from "@/components/games/assets/转化方块.png"
import imgPlayerWhite from "@/components/games/assets/白色地块本体.png"
import imgPlayerBlack from "@/components/games/assets/黑色地块本体.png"

const EMPTY_ROW = ".".repeat(DUAL_TONE_GRID_SIZE)

function initialRows(): string[] {
  const rows = Array.from({ length: DUAL_TONE_GRID_SIZE }, () => EMPTY_ROW)
  const mid = Math.floor(DUAL_TONE_GRID_SIZE / 2)
  const line = rows[mid]
  rows[mid] = line.slice(0, mid) + "P" + line.slice(mid + 1)
  return rows
}

function rowsToMap(rows: string[]): string {
  return rows.join("\n")
}

function validateMap(map: string): { ok: true } | { ok: false; message: string } {
  try {
    parseDualToneLevel(map)
    return { ok: true }
  } catch (e) {
    return {
      ok: false,
      message: e instanceof Error ? e.message : String(e),
    }
  }
}

function floorImageSrc(floor: Tone) {
  return floor === 0 ? imgWhiteFloor : imgBlackFloor
}

/** 单字符 → 与棋盘渲染一致的分层数据（未知字符按白空地坪） */
function charLayers(ch: string): {
  floor: Tone
  goal: boolean
  converter: boolean
  player?: Tone
  box?: Tone
} {
  const t = DEFAULT_DUAL_TONE_TILE_CHARS[ch]
  if (!t) return { floor: 0, goal: false, converter: false }
  const { player: pt, box: bt, ...rest } = t
  return {
    floor: rest.floor as Tone,
    goal: rest.goal,
    converter: rest.converter,
    ...(pt !== undefined ? { player: pt as Tone } : {}),
    ...(bt !== undefined ? { box: bt as Tone } : {}),
  }
}

/**
 * 统一画笔：终点/转化按当前格地坪自动写 G|H、C|D；
 * 箱子仅允许异色（白格黑箱 x、黑格白箱 O），与游戏一致。
 */
export type EditorBrushId =
  | "floor0"
  | "floor1"
  | "goal"
  | "converter"
  | "player0"
  | "player1"
  | "box"

function resolveBrushChar(brushId: EditorBrushId, currentCh: string): string {
  const L = charLayers(currentCh)
  switch (brushId) {
    case "floor0":
      return "."
    case "floor1":
      return "#"
    case "goal":
      return L.floor === 0 ? "G" : "H"
    case "converter":
      return L.floor === 0 ? "C" : "D"
    case "player0":
      return "P"
    case "player1":
      return "Q"
    case "box":
      return L.floor === 0 ? "x" : "O"
    default:
      return currentCh
  }
}

const BRUSH_META: {
  id: EditorBrushId
  label: string
  /** 预览用字符（与 resolve 一致） */
  previewChar: string
  hint?: string
}[] = [
  { id: "floor0", label: "白地坪", previewChar: "." },
  { id: "floor1", label: "黑地坪", previewChar: "#" },
  {
    id: "goal",
    label: "终点",
    previewChar: "G",
    hint: "按格内地坪自动为 G（白）或 H（黑）",
  },
  {
    id: "converter",
    label: "转化",
    previewChar: "C",
    hint: "按格内地坪自动为 C（白）或 D（黑）",
  },
  { id: "player0", label: "本体·白", previewChar: "P" },
  { id: "player1", label: "本体·黑", previewChar: "Q" },
  {
    id: "box",
    label: "箱子",
    previewChar: "x",
    hint: "白格放黑箱(x)、黑格放白箱(O)，仅异色",
  },
]

/**
 * 与 `DualTonePushGame` 内棋盘同序：地坪 < 终点 < 转化 < 箱 < 本体
 */
function DualToneCharLayers({
  char: ch,
  className,
  imageSizes,
}: {
  char: string
  className?: string
  imageSizes: string
}) {
  const { floor, goal, converter, player, box } = charLayers(ch)
  const floorVis: Tone = goal || converter ? 0 : floor
  return (
    <div className={cn("relative flex min-h-0 min-w-0 items-center justify-center", className)}>
      <Image
        src={floorImageSrc(floorVis)}
        alt=""
        fill
        className="object-cover"
        sizes={imageSizes}
      />
      {goal ? (
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <Image src={imgGoal} alt="" fill className="object-contain p-0.5" sizes={imageSizes} />
        </div>
      ) : null}
      {converter ? (
        <div className="pointer-events-none absolute inset-0 z-[2]">
          <Image
            src={imgConverter}
            alt=""
            fill
            className="object-cover opacity-90"
            sizes={imageSizes}
          />
        </div>
      ) : null}
      {box !== undefined ? (
        <div className="pointer-events-none absolute inset-[10%] z-[3]">
          <Image
            src={box === 0 ? imgWhiteBox : imgBlackBox}
            alt=""
            fill
            className="object-contain"
            sizes={imageSizes}
          />
        </div>
      ) : null}
      {player !== undefined ? (
        <div className="pointer-events-none absolute inset-[12%] z-[4]">
          <Image
            src={player === 0 ? imgPlayerWhite : imgPlayerBlack}
            alt=""
            fill
            className="object-contain"
            sizes={imageSizes}
          />
        </div>
      ) : null}
    </div>
  )
}

export function DualTonePushLevelEditor() {
  const [mode, setMode] = useState<"edit" | "play">("edit")
  const [rows, setRows] = useState<string[]>(initialRows)
  const [brushId, setBrushId] = useState<EditorBrushId>("player0")
  const brushIdRef = useRef<EditorBrushId>(brushId)
  brushIdRef.current = brushId

  const [id, setId] = useState("custom-01")
  const [name, setName] = useState("自定义关卡")
  const [description, setDescription] = useState("")
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  /** 按住涂抹：拖拽 / 滑过连续格 */
  const paintingRef = useRef(false)
  const lastPaintedRef = useRef<string | null>(null)

  const map = useMemo(() => rowsToMap(rows), [rows])
  const validation = useMemo(() => validateMap(map), [map])

  const levelDef: DualToneLevelDef = useMemo(
    () => ({
      id: id.trim() || "custom",
      name: name.trim() || "未命名",
      ...(description.trim() ? { description: description.trim() } : {}),
      map,
    }),
    [id, name, description, map],
  )

  const paintCell = useCallback((r: number, c: number) => {
    const key = `${r},${c}`
    lastPaintedRef.current = key
    setRows((prev) => {
      const cur = prev[r]![c]!
      const nextCh = resolveBrushChar(brushIdRef.current, cur)
      if (nextCh === cur) return prev
      const line = prev[r]!
      const next = [...prev]
      next[r] = line.slice(0, c) + nextCh + line.slice(c + 1)
      return next
    })
  }, [])

  const paintCellIfNew = useCallback((r: number, c: number) => {
    const key = `${r},${c}`
    if (lastPaintedRef.current === key) return
    paintCell(r, c)
  }, [paintCell])

  useEffect(() => {
    const endPaint = () => {
      paintingRef.current = false
      lastPaintedRef.current = null
    }
    window.addEventListener("pointerup", endPaint)
    window.addEventListener("pointercancel", endPaint)
    return () => {
      window.removeEventListener("pointerup", endPaint)
      window.removeEventListener("pointercancel", endPaint)
    }
  }, [])

  /** 快速拖拽时 elementFromPoint 补涂 */
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!paintingRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const cell = el?.closest?.("[data-editor-cell]")
      if (!cell) return
      const r = Number((cell as HTMLElement).dataset.r)
      const c = Number((cell as HTMLElement).dataset.c)
      if (Number.isFinite(r) && Number.isFinite(c)) {
        paintCellIfNew(r, c)
      }
    }
    window.addEventListener("pointermove", onMove)
    return () => window.removeEventListener("pointermove", onMove)
  }, [paintCellIfNew])

  const exportJson = useCallback(() => {
    if (!validation.ok) return
    const text = stringifyDualToneLevelDefJson(levelDef)
    const blob = new Blob([text], { type: "application/json;charset=utf-8" })
    const a = document.createElement("a")
    const base = (id.trim() || "level").replace(/[^\w\u4e00-\u9fff-]+/g, "_")
    a.href = URL.createObjectURL(blob)
    a.download = `${base}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [levelDef, validation.ok, id])

  const copyJson = useCallback(async () => {
    if (!validation.ok) return
    await navigator.clipboard.writeText(stringifyDualToneLevelDefJson(levelDef))
  }, [levelDef, validation.ok])

  const exportBuiltinTsItem = useCallback(() => {
    if (!validation.ok) return
    const text = dualToneLevelDefToBuiltinTsItem(levelDef)
    const blob = new Blob([text + "\n"], { type: "text/plain;charset=utf-8" })
    const a = document.createElement("a")
    const base = (id.trim() || "level").replace(/[^\w\u4e00-\u9fff-]+/g, "_")
    a.href = URL.createObjectURL(blob)
    a.download = `${base}-builtin-level-item.ts`
    a.click()
    URL.revokeObjectURL(a.href)
  }, [levelDef, validation.ok, id])

  const copyBuiltinTsItem = useCallback(async () => {
    if (!validation.ok) return
    await navigator.clipboard.writeText(`${dualToneLevelDefToBuiltinTsItem(levelDef)}\n`)
  }, [levelDef, validation.ok])

  const onImportFile = useCallback(async (file: File | null) => {
    setImportMsg(null)
    if (!file) return
    try {
      const text = await file.text()
      const data = JSON.parse(text) as Partial<DualToneLevelDef>
      if (typeof data.map !== "string") {
        setImportMsg("JSON 中缺少字符串字段 map")
        return
      }
      const lines = data.map
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trimEnd())
        .filter((l) => l.length > 0)
      if (lines.length !== DUAL_TONE_GRID_SIZE) {
        setImportMsg(`map 须 ${DUAL_TONE_GRID_SIZE} 行，当前 ${lines.length}`)
        return
      }
      for (let i = 0; i < DUAL_TONE_GRID_SIZE; i++) {
        if (lines[i].length !== DUAL_TONE_GRID_SIZE) {
          setImportMsg(`第 ${i + 1} 行长度须为 ${DUAL_TONE_GRID_SIZE}`)
          return
        }
      }
      parseDualToneLevel(data.map)
      setRows(lines)
      if (typeof data.id === "string") setId(data.id)
      if (typeof data.name === "string") setName(data.name)
      if (typeof data.description === "string") setDescription(data.description)
      else setDescription("")
      setImportMsg("已导入")
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : "导入失败")
    }
  }, [])

  const goPlay = useCallback(() => {
    if (!validation.ok) return
    setMode("play")
  }, [validation.ok])

  return (
    <div className="space-y-8">
      <p className="text-sm text-muted-foreground leading-relaxed">
        9×9 格编辑：单击或<strong className="text-foreground">按住拖拽</strong>
        涂抹连续格。终点 / 转化在画面上与地坪同色，故各合并为一支笔，按格内
        <strong className="text-foreground">白/黑地坪</strong>
        自动写入 G/H、C/D。箱子仅支持异色组合（白格黑箱、黑格白箱），一支「箱子」笔按地坪自动写 x 或 O。导出字符表仍与{" "}
        <code className="text-xs text-foreground">parse.ts</code> 一致。
      </p>

      <div className="flex flex-wrap gap-2 border border-border bg-card/40 p-2">
        <button
          type="button"
          onClick={() => setMode("edit")}
          className={cn(
            "inline-flex items-center gap-2 rounded-none border px-3 py-2 text-sm transition-colors",
            mode === "edit"
              ? "border-foreground bg-secondary"
              : "border-border bg-background hover:bg-secondary/60",
          )}
        >
          <Pencil className="h-4 w-4" />
          编辑
        </button>
        <button
          type="button"
          onClick={goPlay}
          disabled={!validation.ok}
          className={cn(
            "inline-flex items-center gap-2 rounded-none border px-3 py-2 text-sm transition-colors",
            mode === "play"
              ? "border-foreground bg-secondary"
              : "border-border bg-background hover:bg-secondary/60",
            !validation.ok && "opacity-50 cursor-not-allowed",
          )}
        >
          <Play className="h-4 w-4" />
          试玩
        </button>
      </div>

      {mode === "edit" ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">id（文件名建议）</span>
              <input
                className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                value={id}
                onChange={(e) => setId(e.target.value)}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">名称</span>
              <input
                className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </label>
            <label className="sm:col-span-2 block space-y-1 text-sm">
              <span className="text-muted-foreground">说明（可选）</span>
              <input
                className="w-full rounded-none border border-border bg-background px-3 py-2 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="试玩时显示在棋盘上方"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">画笔</p>
            <div className="flex flex-wrap gap-2">
              {BRUSH_META.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  title={b.hint ? `${b.label}：${b.hint}` : b.label}
                  onClick={() => setBrushId(b.id)}
                  className={cn(
                    "inline-flex max-w-[220px] items-start gap-2 rounded-none border px-2 py-1.5 text-left text-xs transition-colors",
                    brushId === b.id
                      ? "border-foreground bg-secondary"
                      : "border-border bg-card hover:bg-secondary/50",
                  )}
                >
                  <DualToneCharLayers
                    char={b.previewChar}
                    className="h-9 w-9 shrink-0 border border-border/80"
                    imageSizes="36px"
                  />
                  <span className="min-w-0 leading-snug">
                    <span className="font-medium">{b.label}</span>
                    {b.hint ? (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{b.hint}</span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">地图（单击或按住拖拽涂抹）</p>
            <div
              className="mx-auto grid w-full max-w-md touch-none gap-0.5 border border-border bg-muted/30 p-2 select-none"
              style={{
                gridTemplateColumns: `repeat(${DUAL_TONE_GRID_SIZE}, minmax(0, 1fr))`,
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return
                e.preventDefault()
                paintingRef.current = true
                lastPaintedRef.current = null
                const t = e.target as HTMLElement
                const cell = t.closest?.("[data-editor-cell]")
                if (cell) {
                  const r = Number((cell as HTMLElement).dataset.r)
                  const c = Number((cell as HTMLElement).dataset.c)
                  if (Number.isFinite(r) && Number.isFinite(c)) paintCell(r, c)
                }
              }}
            >
              {rows.map((row, r) =>
                Array.from({ length: DUAL_TONE_GRID_SIZE }, (_, c) => {
                  const ch = row[c]
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      data-editor-cell=""
                      data-r={r}
                      data-c={c}
                      onPointerEnter={() => {
                        if (paintingRef.current) paintCellIfNew(r, c)
                      }}
                      className="relative aspect-square min-h-0 min-w-0 overflow-hidden rounded-none border border-border/80 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`第 ${r + 1} 行第 ${c + 1} 列，当前 ${ch}`}
                    >
                      <DualToneCharLayers
                        char={ch}
                        className="h-full w-full"
                        imageSizes="(max-width: 448px) 11vw, 48px"
                      />
                    </button>
                  )
                }),
              )}
            </div>
          </div>

          <p
            className={cn(
              "text-sm",
              validation.ok ? "text-emerald-600 dark:text-emerald-400" : "text-destructive",
            )}
          >
            {validation.ok ? "地图格式有效（含唯一本体 P 或 Q）" : validation.message}
          </p>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={exportJson}
              disabled={!validation.ok}
              className="inline-flex items-center gap-2 rounded-none border border-border bg-secondary px-3 py-2 text-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              导出 JSON
            </button>
            <button
              type="button"
              onClick={copyJson}
              disabled={!validation.ok}
              className="rounded-none border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              复制 JSON
            </button>
            <button
              type="button"
              onClick={exportBuiltinTsItem}
              disabled={!validation.ok}
              className="inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              导出内置关 TS 条目
            </button>
            <button
              type="button"
              onClick={copyBuiltinTsItem}
              disabled={!validation.ok}
              className="rounded-none border border-border bg-background px-3 py-2 text-sm disabled:opacity-50"
            >
              复制内置关 TS 条目
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-none border border-border bg-background px-3 py-2 text-sm"
            >
              <Upload className="h-4 w-4" />
              导入 JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              onClick={() => setRows(initialRows)}
              className="rounded-none border border-border bg-background px-3 py-2 text-sm"
            >
              重置为空白+P
            </button>
          </div>
          {importMsg ? (
            <p className="text-xs text-muted-foreground">{importMsg}</p>
          ) : null}
        </>
      ) : (
        <div className="space-y-4">
          <DualTonePushGame key={map} levels={[levelDef]} embedded />
          <button
            type="button"
            onClick={() => setMode("edit")}
            className="rounded-none border border-border bg-background px-3 py-2 text-sm"
          >
            返回编辑
          </button>
        </div>
      )}
    </div>
  )
}
