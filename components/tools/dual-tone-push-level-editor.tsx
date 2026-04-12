"use client"

import Image from "next/image"
import { useCallback, useMemo, useRef, useState } from "react"
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

/** 画笔：与 `DEFAULT_DUAL_TONE_TILE_CHARS` 一致，含中文说明 */
const BRUSHES: { char: string; label: string }[] = [
  { char: ".", label: "白地坪" },
  { char: "#", label: "黑地坪" },
  { char: "G", label: "白·终点" },
  { char: "H", label: "黑·终点" },
  { char: "C", label: "白·转化" },
  { char: "D", label: "黑·转化" },
  { char: "P", label: "本体·白" },
  { char: "Q", label: "本体·黑" },
  { char: "o", label: "白箱·白格" },
  { char: "O", label: "白箱·黑格" },
  { char: "x", label: "黑箱·白格" },
  { char: "X", label: "黑箱·黑格" },
]

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
 * 与 `DualTonePushGame` 内棋盘同序：地坪 < 终点 < 转化 < 箱 < 本体
 */
function DualToneCharLayers({
  char: ch,
  className,
  imageSizes,
}: {
  char: string
  className?: string
  /** 传给 next/image 的 sizes，随格子大小调整 */
  imageSizes: string
}) {
  const { floor, goal, converter, player, box } = charLayers(ch)
  return (
    <div className={cn("relative flex min-h-0 min-w-0 items-center justify-center", className)}>
      <Image
        src={floorImageSrc(floor)}
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
  const [brush, setBrush] = useState("P")
  const [id, setId] = useState("custom-01")
  const [name, setName] = useState("自定义关卡")
  const [description, setDescription] = useState("")
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const paint = useCallback((r: number, c: number, ch: string) => {
    setRows((prev) => {
      const next = [...prev]
      const line = next[r]
      next[r] = line.slice(0, c) + ch + line.slice(c + 1)
      return next
    })
  }, [])

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
        在9×9 格上点选画笔绘制地块、终点、转化格、本体与箱子；棋盘与画笔预览使用与正式游戏相同的贴图，底层字符表与{" "}
        <code className="text-xs text-foreground">parse.ts</code> 一致。导出为{" "}
        <code className="text-xs text-foreground">DualToneLevelDef</code>：JSON 字段顺序为 id → name →
        description（有则输出）→ map，与{" "}
        <code className="text-xs text-foreground">builtin-levels.ts</code> 一致；亦可导出/复制与内置关相同的
        TypeScript 对象条目（map 为多行模板字符串并接 <code className="text-xs">.trim()</code>）以便粘贴进数组。
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
              {BRUSHES.map((b) => (
                <button
                  key={b.char}
                  type="button"
                  title={`${b.label}（字符 ${b.char}）`}
                  onClick={() => setBrush(b.char)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-none border px-2 py-1.5 text-xs transition-colors",
                    brush === b.char
                      ? "border-foreground bg-secondary"
                      : "border-border bg-card hover:bg-secondary/50",
                  )}
                >
                  <DualToneCharLayers
                    char={b.char}
                    className="h-9 w-9 shrink-0 border border-border/80"
                    imageSizes="36px"
                  />
                  <span>{b.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">地图（点击格子绘制）</p>
            <div
              className="mx-auto grid w-full max-w-md gap-0.5 border border-border p-2 bg-muted/30"
              style={{
                gridTemplateColumns: `repeat(${DUAL_TONE_GRID_SIZE}, minmax(0, 1fr))`,
              }}
            >
              {rows.map((row, r) =>
                Array.from({ length: DUAL_TONE_GRID_SIZE }, (_, c) => {
                  const ch = row[c]
                  return (
                    <button
                      key={`${r}-${c}`}
                      type="button"
                      onClick={() => paint(r, c, brush)}
                      className="relative aspect-square min-h-0 min-w-0 overflow-hidden rounded-none border border-border/80 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`第 ${r + 1} 行第 ${c + 1} 列，当前 ${ch}，点击绘制`}
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
          <DualTonePushGame
            key={map}
            levels={[levelDef]}
            embedded
          />
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
