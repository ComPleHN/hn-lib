"use client"

import { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { RotateCcw, Lock, Check } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

/** 定义颜色方块的样式 */
const COLOR_DEFS = [
  { id: 0, label: "红", className: "bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.45)]" },
  { id: 1, label: "蓝", className: "bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.45)]" },
  { id: 2, label: "绿", className: "bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.45)]" },
  { id: 3, label: "黄", className: "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]" },
  { id: 4, label: "紫", className: "bg-violet-500 shadow-[0_0_12px_rgba(139,92,246,0.45)]" },
] as const

/** 颜色方块的 ID */
type ColorId = (typeof COLOR_DEFS)[number]["id"]

/** 颜色方块的个数 */
const LEN = 5

/** 最大尝试次数 */
const MAX_ROUNDS = 12

/** 随机生成一个颜色方块的组合 */
function randomSolution(): ColorId[] {
  return Array.from({ length: LEN }, () => Math.floor(Math.random() * 5) as ColorId)
}

/** 计算两个颜色方块组合的精确匹配个数 */
function countExact(secret: ColorId[], guess: ColorId[]): number {
  let n = 0
  for (let i = 0; i < LEN; i++) {
    if (secret[i] === guess[i]) n++
  }
  return n
}

/** 获取颜色方块的样式类名 */
function colorClass(id: ColorId) {
  return COLOR_DEFS[id].className
}

/** 颜色方块游戏组件 */
export function ColorBlocksGame() {
  const [secret, setSecret] = useState<ColorId[]>(() => randomSolution())
  const [rounds, setRounds] = useState<{ guess: ColorId[]; exact: number }[]>([])
  const [current, setCurrent] = useState<(ColorId | null)[]>(() => Array(LEN).fill(null))
  const [selectedPalette, setSelectedPalette] = useState<ColorId>(0)
  const [won, setWon] = useState(false)

  /** 当前输入行是否已填满 */
  const filled = useMemo(() => current.every((c) => c !== null), [current])

  /** 是否已失败 */
  const lost = rounds.length >= MAX_ROUNDS && !won
  const revealed = won || lost

  /** 重置游戏 */
  const reset = useCallback(() => {
    setSecret(randomSolution())
    setRounds([])
    setCurrent(Array(LEN).fill(null))
    setWon(false)
  }, [])

  /** 填充颜色方块 */
  const paintSlot = (index: number) => {
    if (won || lost) return
    setCurrent((row) => {
      const next = [...row]
      next[index] = selectedPalette
      return next
    })
  }

  /** 清空当前输入行 */
  const clearCurrentRow = () => {
    if (won || lost) return
    setCurrent(Array(LEN).fill(null))
  }

  const submit = () => {
    if (!filled || won || lost) return
    const guess = current as ColorId[]
    const exact = countExact(secret, guess)
    setRounds((r) => [...r, { guess: [...guess], exact }])
    setCurrent(Array(LEN).fill(null))
    if (exact === LEN) setWon(true)
  }

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <p className="text-center text-sm text-muted-foreground leading-relaxed">
        在上方摆出 5 个颜色方块，与底部<strong className="text-foreground">隐藏答案</strong>
        一致。每次提交只会告诉你<strong className="text-foreground">有几个位置颜色完全正确</strong>
        ，不会标出是哪几格。
      </p>

      {/* 猜测历史 */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          尝试记录
        </h3>
        {rounds.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-6 text-center text-sm text-muted-foreground">
            尚无记录：先在下方选颜色，再点「当前摆放」里某一格填入或覆盖
          </p>
        ) : (
          <ul className="space-y-2">
            {rounds.map((r, i) => (
              <li
                key={`${i}-${r.guess.join("")}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/50 px-3 py-2"
              >
                <div className="flex gap-1.5">
                  {r.guess.map((c, j) => (
                    <div
                      key={j}
                      className={cn("h-9 w-9 rounded-md border border-white/10", colorClass(c))}
                      title={COLOR_DEFS[c].label}
                    />
                  ))}
                </div>
                <span className="shrink-0 rounded-md bg-secondary px-2 py-1 text-xs font-mono tabular-nums text-foreground">
                  {r.exact} / {LEN} 正确
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 当前输入行 */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          当前摆放
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
          {current.map((c, i) => (
            <button
              key={i}
              type="button"
              disabled={won || lost}
              onClick={() => paintSlot(i)}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border-2 border-dashed transition-all sm:h-14 sm:w-14",
                c === null
                  ? "border-muted-foreground/40 bg-secondary/30 hover:border-accent hover:bg-secondary/50"
                  : cn("border-transparent", colorClass(c)),
                (won || lost) && "opacity-80"
              )}
              title="用当前选中的颜色填入或覆盖此格"
            >
              {c === null ? (
                <span className="text-lg text-muted-foreground">+</span>
              ) : null}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            disabled={!filled || won || lost}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            提交猜测
          </button>
          <button
            type="button"
            onClick={clearCurrentRow}
            disabled={won || lost || current.every((c) => c === null)}
            className="rounded-lg border border-border px-3 py-2.5 text-sm text-muted-foreground hover:bg-secondary disabled:opacity-40"
          >
            清空本行
          </button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground hover:bg-secondary/80"
              >
                <RotateCcw className="h-4 w-4" />
                新一局
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>开始新一局？</AlertDialogTitle>
                <AlertDialogDescription>
                  当前进度、尝试记录与隐藏答案都会清空，并随机生成新的密码。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction onClick={reset}>确认新一局</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        {lost ? (
          <p className="text-center text-sm text-amber-400/90">
            已达 {MAX_ROUNDS} 次尝试，答案已在下方揭晓。点击「新一局」再挑战。
          </p>
        ) : null}
      </div>

      {/* 调色盘 */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          选颜色（点选后，再点「当前摆放」的格子填入或覆盖）
        </h3>
        <div className="flex flex-wrap justify-center gap-3">
          {COLOR_DEFS.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={won || lost}
              onClick={() => setSelectedPalette(c.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 p-2 transition-all",
                selectedPalette === c.id
                  ? "border-accent ring-2 ring-accent/40"
                  : "border-transparent hover:border-border"
              )}
            >
              <div className={cn("h-11 w-11 rounded-lg border border-white/10", c.className)} />
              <span className="text-[10px] text-muted-foreground">{c.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 底部隐藏答案 */}
      <div className="space-y-3 border-t border-border pt-8">
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>
            {revealed ? "答案" : "隐藏答案（猜对或用完次数后揭晓）"}
          </span>
        </div>
        <div className="flex justify-center gap-2 sm:gap-3">
          {secret.map((c, i) => (
            <div
              key={i}
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl border sm:h-14 sm:w-14",
                revealed
                  ? cn("border-transparent", colorClass(c))
                  : "border-border bg-muted/80 text-muted-foreground"
              )}
            >
              {!revealed ? (
                <span className="text-sm font-semibold">?</span>
              ) : null}
            </div>
          ))}
        </div>
        {won ? (
          <p className="text-center text-sm font-medium text-emerald-400">
            全部猜对！答案已揭晓。
          </p>
        ) : null}
        {lost ? (
          <p className="text-center text-sm text-muted-foreground">
            本次未猜中，可对照答案总结规律后再开新局。
          </p>
        ) : null}
      </div>
    </div>
  )
}
