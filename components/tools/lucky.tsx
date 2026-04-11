"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

/** 五家餐厅：侧栏多选，只抽勾选店里的菜 */
const RESTAURANTS = [
  { id: "haitang", label: "海棠", tone: "text-rose-400" },
  { id: "dingxiang", label: "丁香", tone: "text-violet-400" },
  { id: "zhuyuan", label: "竹园", tone: "text-emerald-400" },
  { id: "xinzong", label: "新综", tone: "text-sky-400" },
  { id: "laozong", label: "老综", tone: "text-amber-400" },
] as const

type Restaurant = (typeof RESTAURANTS)[number]
type RestaurantId = Restaurant["id"]

/**
 * 抽奖池：每行 = 一家店 + 档口/品类 + 菜名 + 权重（数字越大越容易抽到）
 * 例：海棠 · 四川小炒 · 葱爆牛肉 · weight 15
 */
const DISHES = [
  { id: "ht1", restaurantId: "haitang" as const, category: "四川小炒", label: "葱爆牛肉", short: "葱爆牛肉", weight: 15 },
  { id: "ht2", restaurantId: "haitang" as const, category: "四川小炒", label: "鱼香肉丝", short: "鱼香肉丝", weight: 12 },
  { id: "ht3", restaurantId: "haitang" as const, category: "面食窗口", label: "牛肉面", short: "牛肉面", weight: 10 },
  { id: "ht4", restaurantId: "haitang" as const, category: "面食窗口", label: "麻辣烫", short: "麻辣烫", weight: 8 },
  { id: "dx1", restaurantId: "dingxiang" as const, category: "广式烧腊", label: "烧鸭饭", short: "烧鸭饭", weight: 14 },
  { id: "dx2", restaurantId: "dingxiang" as const, category: "广式烧腊", label: "叉烧饭", short: "叉烧饭", weight: 11 },
  { id: "dx3", restaurantId: "dingxiang" as const, category: "粥粉面", label: "皮蛋瘦肉粥", short: "皮蛋粥", weight: 9 },
  { id: "dx4", restaurantId: "dingxiang" as const, category: "粥粉面", label: "肠粉", short: "肠粉", weight: 10 },
  { id: "zy1", restaurantId: "zhuyuan" as const, category: "瓦罐煨汤", label: "排骨汤饭", short: "排骨汤", weight: 13 },
  { id: "zy2", restaurantId: "zhuyuan" as const, category: "江西风味", label: "南昌拌粉", short: "拌粉", weight: 12 },
  { id: "zy3", restaurantId: "zhuyuan" as const, category: "快餐", label: "两荤一素", short: "两荤一素", weight: 15 },
  { id: "xz1", restaurantId: "xinzong" as const, category: "韩式料理", label: "石锅拌饭", short: "拌饭", weight: 11 },
  { id: "xz2", restaurantId: "xinzong" as const, category: "日式定食", label: "咖喱蛋包饭", short: "咖喱饭", weight: 10 },
  { id: "xz3", restaurantId: "xinzong" as const, category: "轻食", label: "鸡胸沙拉", short: "沙拉", weight: 7 },
  { id: "lz1", restaurantId: "laozong" as const, category: "早餐铺", label: "煎饼果子", short: "煎饼", weight: 8 },
  { id: "lz2", restaurantId: "laozong" as const, category: "米线档", label: "过桥米线", short: "米线", weight: 12 },
  { id: "lz3", restaurantId: "laozong" as const, category: "炒饭炒面", label: "扬州炒饭", short: "炒饭", weight: 9 },
  { id: "lz4", restaurantId: "laozong" as const, category: "水煮鱼", label: "酸菜鱼套餐", short: "酸菜鱼", weight: 14 },
] as const

type Dish = (typeof DISHES)[number]

function restaurantById(id: RestaurantId): Restaurant {
  return RESTAURANTS.find((r) => r.id === id) ?? RESTAURANTS[0]!
}

/** 默认五家店全部参与筛选 */
function defaultPicked(): Record<RestaurantId, boolean> {
  return Object.fromEntries(RESTAURANTS.map((r) => [r.id, true])) as Record<RestaurantId, boolean>
}

/** 外圈格数 ≥ n，g≥3 留中间 */
function gridSizeForCount(n: number): number {
  if (n <= 0) return 3
  const need = Math.ceil(n / 4) + 1
  return Math.max(3, need)
}

function perimeterPath(g: number): { c: number; r: number }[] {
  const cells: { c: number; r: number }[] = []
  for (let c = 1; c <= g; c++) cells.push({ c, r: 1 })
  for (let r = 2; r <= g - 1; r++) cells.push({ c: g, r })
  for (let c = g; c >= 1; c--) cells.push({ c, r: g })
  for (let r = g - 1; r >= 2; r--) cells.push({ c: 1, r })
  return cells
}

/** 在「已勾选餐厅」且 weight>0 的菜里，按 weight 加权随机 */
function pickWeightedDish(picked: Record<RestaurantId, boolean>): Dish | null {
  const pool = DISHES.filter((d) => picked[d.restaurantId] && d.weight > 0)
  if (!pool.length) return null
  const total = pool.reduce((s, d) => s + d.weight, 0)
  if (total <= 0) return null
  let r = Math.random() * total
  for (const d of pool) {
    r -= d.weight
    if (r <= 0) return d
  }
  return pool[pool.length - 1]!
}

export function Lucky() {
  const [picked, setPicked] = useState<Record<RestaurantId, boolean>>(defaultPicked)
  const [highlight, setHighlight] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<Dish | null>(null)

  const timersRef = useRef<number[]>([])
  const highlightRef = useRef(0)

  /** 勾选店内、且菜品权重>0 的条目，与外圈/抽奖池一致 */
  const activeDishes = useMemo(() => {
    return DISHES.filter((d) => picked[d.restaurantId] && d.weight > 0)
  }, [picked])

  const gridG = useMemo(
    () => gridSizeForCount(Math.max(activeDishes.length, 1)),
    [activeDishes.length]
  )
  const perimeter = useMemo(() => perimeterPath(gridG), [gridG])
  const slotCount = perimeter.length
  const innerSpan = gridG - 2

  const dishAtSlot = useCallback(
    (i: number): Dish | null => {
      if (!activeDishes.length) return null
      return activeDishes[((i % activeDishes.length) + activeDishes.length) % activeDishes.length]!
    },
    [activeDishes]
  )

  const moveHighlight = useCallback(
    (i: number) => {
      const next = ((i % slotCount) + slotCount) % slotCount
      highlightRef.current = next
      setHighlight(next)
    },
    [slotCount]
  )

  useEffect(() => {
    const h = highlightRef.current % Math.max(1, slotCount)
    highlightRef.current = h
    setHighlight(h)
  }, [slotCount])

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id))
    timersRef.current = []
  }

  useEffect(() => () => clearTimers(), [])

  const selectedCount = useMemo(
    () => RESTAURANTS.filter((r) => picked[r.id]).length,
    [picked]
  )

  const canSpin = selectedCount > 0 && activeDishes.length > 0

  const runSpin = useCallback(() => {
    clearTimers()
    setSpinning(true)
    setResult(null)

    const target = pickWeightedDish(picked)
    if (!target) {
      setSpinning(false)
      return
    }

    const candidates: number[] = []
    for (let i = 0; i < slotCount; i++) {
      const d = dishAtSlot(i)
      if (d?.id === target.id) candidates.push(i)
    }
    const finalSlot = candidates.length
      ? candidates[Math.floor(Math.random() * candidates.length)]!
      : 0

    const start = highlightRef.current
    const laps = 2 + Math.floor(Math.random() * 2)
    const steps = laps * slotCount + ((finalSlot - start + slotCount) % slotCount)

    let step = 0
    let pos = start

    const tick = () => {
      if (step >= steps) {
        moveHighlight(finalSlot)
        setResult(target)
        setSpinning(false)
        return
      }
      pos = (pos + 1) % slotCount
      moveHighlight(pos)
      step++
      const delay = Math.min(320, 36 + step * 10 + step * step * 0.12)
      timersRef.current.push(window.setTimeout(tick, delay))
    }

    timersRef.current.push(window.setTimeout(tick, 80))
  }, [moveHighlight, picked, dishAtSlot, slotCount])

  const toggleRestaurant = (id: RestaurantId) => {
    setPicked((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectAll = () => setPicked(defaultPicked())
  const clearAll = () =>
    setPicked(Object.fromEntries(RESTAURANTS.map((r) => [r.id, false])) as Record<RestaurantId, boolean>)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <p className="text-center text-sm text-muted-foreground leading-relaxed">
        <strong className="text-foreground">吃饭抽签</strong>
        ：右侧 <strong className="text-foreground">多选餐厅</strong>
        （例如只勾海棠、丁香）；转盘上是菜品。每道菜有 <strong className="text-foreground">品类、菜名、权重</strong>
        ，按权重随机抽一道。
      </p>

      <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch lg:gap-8">
        <div className="min-w-0 flex-1 space-y-6">
          <div
            className={cn(
              "mx-auto w-full max-w-[min(100%,22rem)] rounded-3xl p-[5px] shadow-lg lg:mx-0",
              "bg-gradient-to-br from-emerald-400 via-amber-400 to-sky-500",
              "bg-[length:240%_240%] animate-lucky-marquee"
            )}
          >
            <div className="rounded-[1.15rem] bg-background p-3 sm:p-4">
              <div
                className="relative grid aspect-square w-full gap-1.5 sm:gap-2"
                style={{
                  gridTemplateColumns: `repeat(${gridG}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${gridG}, minmax(0, 1fr))`,
                }}
              >
                {perimeter.map(({ c, r }, i) => {
                  const d = dishAtSlot(i)
                  const on = highlight === i
                  return (
                    <div
                      key={`${c}-${r}-${gridG}`}
                      className={cn(
                        "flex min-h-0 flex-col items-center justify-center gap-0.5 rounded-lg border px-0.5 py-1.5 text-center transition-all duration-75 sm:py-2",
                        !d && "opacity-40",
                        on
                          ? "z-10 scale-105 border-accent bg-accent/20 shadow-[0_0_20px_rgba(52,211,153,0.45)] ring-2 ring-accent"
                          : "border-border/80 bg-secondary/40 text-muted-foreground"
                      )}
                      style={{ gridColumn: c, gridRow: r }}
                    >
                      {d ? (
                        <>
                          <span
                            className={cn(
                              "line-clamp-2 text-[9px] font-semibold leading-tight sm:text-[10px]",
                              on ? restaurantById(d.restaurantId).tone : ""
                            )}
                          >
                            {d.short}
                          </span>
                          <span className="text-[8px] tabular-nums text-muted-foreground sm:text-[9px]">
                            w{d.weight}
                          </span>
                        </>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  )
                })}
                <div
                  className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-secondary/25 px-2 py-3 text-center"
                  style={{
                    gridColumn: `2 / span ${innerSpan}`,
                    gridRow: `2 / span ${innerSpan}`,
                  }}
                >
                  {spinning ? (
                    <p className="text-xs text-muted-foreground">转转转…</p>
                  ) : result ? (
                    <>
                      <Sparkles className="h-7 w-7 text-accent" />
                      <p className="text-[10px] text-muted-foreground">今天就吃</p>
                      <p
                        className={cn(
                          "text-sm font-bold leading-tight sm:text-base",
                          restaurantById(result.restaurantId).tone
                        )}
                      >
                        {result.label}
                      </p>
                      <p className="text-[10px] leading-snug text-muted-foreground">
                        {restaurantById(result.restaurantId).label} · {result.category}
                      </p>
                      <p className="text-[10px] tabular-nums text-muted-foreground">权重 {result.weight}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-foreground">吃啥？</p>
                      <p className="text-[10px] text-muted-foreground">点下面开始</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={spinning || !canSpin}
            onClick={runSpin}
            className="mx-auto block w-full max-w-xs rounded-xl bg-accent px-6 py-3.5 text-sm font-semibold text-accent-foreground shadow-md transition-opacity hover:opacity-90 disabled:opacity-45 lg:mx-0"
          >
            {spinning
              ? "转动中…"
              : !canSpin
                ? selectedCount <= 0
                  ? "请至少选一家餐厅"
                  : "没有可选的菜"
                : "开始抽签"}
          </button>
        </div>

        <aside className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card/50 lg:w-[min(100%,22rem)]">
          <div className="border-b border-border bg-secondary/30 px-3 py-2.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-foreground">餐厅筛选（多选）</p>
                <p className="text-[11px] text-muted-foreground">
                  只抽勾选店里的菜；菜名与权重见下方表
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <button
                  type="button"
                  onClick={selectAll}
                  disabled={spinning}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium hover:bg-secondary/50 disabled:opacity-40"
                >
                  全选
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  disabled={spinning}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[10px] font-medium hover:bg-secondary/50 disabled:opacity-40"
                >
                  清空
                </button>
              </div>
            </div>
            <ul className="mt-3 space-y-2">
              {RESTAURANTS.map((r) => (
                <li key={r.id}>
                  <label
                    className={cn(
                      "flex cursor-pointer items-center gap-2 rounded-lg border border-transparent px-2 py-1.5 hover:bg-background/60",
                      picked[r.id] && "border-border/80 bg-background/40"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={picked[r.id]}
                      disabled={spinning}
                      onChange={() => toggleRestaurant(r.id)}
                      className="h-4 w-4 rounded border-border accent-accent"
                    />
                    <span className={cn("text-sm font-semibold", r.tone)}>{r.label}</span>
                  </label>
                </li>
              ))}
            </ul>
          </div>

          <div className="min-h-0 flex-1 border-t border-border">
            <div className="sticky top-0 bg-secondary/20 px-3 py-2 text-[11px] font-medium text-muted-foreground">
              菜品池（店 · 品类 · 菜名 · 权重）
            </div>
            <ul className="max-h-64 divide-y divide-border overflow-auto sm:max-h-80">
              {DISHES.map((d) => {
                const on = picked[d.restaurantId]
                const R = restaurantById(d.restaurantId)
                return (
                  <li
                    key={d.id}
                    className={cn(
                      "px-3 py-2 text-[11px] leading-snug sm:text-xs",
                      !on && "opacity-40"
                    )}
                  >
                    <span className={cn("font-semibold", R.tone)}>{R.label}</span>
                    <span className="text-muted-foreground"> · {d.category} · </span>
                    <span className="text-foreground">{d.label}</span>
                    <span className="float-right font-mono tabular-nums text-muted-foreground">
                      {d.weight}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>

          {!canSpin && selectedCount > 0 && (
            <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
              没有进入抽奖池的菜（检查是否误关店或权重为 0）。
            </p>
          )}
          {selectedCount <= 0 && (
            <p className="border-t border-border px-3 py-2 text-center text-xs text-destructive">
              请至少勾选一家餐厅。
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}
