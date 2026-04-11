"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { Info, Sparkles } from "lucide-react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

/** 五座食堂：侧栏多选，只抽勾选食堂内的菜 */
const RESTAURANTS = [
    { id: "haitang", label: "海棠", tone: "text-rose-400" },
    { id: "dingxiang", label: "丁香", tone: "text-violet-400" },
    { id: "zhuyuan", label: "竹园", tone: "text-emerald-400" },
    { id: "xinzong", label: "新综", tone: "text-sky-400" },
    { id: "laozong", label: "老综", tone: "text-amber-400" },
] as const

type Restaurant = (typeof RESTAURANTS)[number]
type RestaurantId = Restaurant["id"]

/** 食堂层面：整栋楼/整个食堂的概况（营业时间、位置等） */
const CANTEEN_INFO: Record<
    RestaurantId,
    { summary: string; hours: string; location: string; tips?: string }
> = {
    haitang: {
        summary: "川味小炒与面食为主，出餐较快，饭点排队略多。",
        hours: "约 07:00–20:30",
        location: "海棠园食堂（示例位置）",
        tips: "重口可选四川小炒窗口；清淡试试面食档。",
    },
    dingxiang: {
        summary: "广式烧腊、粥粉面线，口味相对清淡。",
        hours: "约 06:30–20:00",
        location: "丁香园食堂（示例位置）",
        tips: "烧腊饭晚了可能售罄。",
    },
    zhuyuan: {
        summary: "瓦罐汤、江西风味与平价快餐。",
        hours: "约 07:00–20:00",
        location: "竹园食堂（示例位置）",
        tips: "瓦罐汤适合想喝汤的日子。",
    },
    xinzong: {
        summary: "偏融合：韩式、日式定食与轻食。",
        hours: "约 10:30–20:30",
        location: "新综合楼餐饮区（示例位置）",
        tips: "轻食窗口排队通常较短。",
    },
    laozong: {
        summary: "早餐、米线炒饭与水煮类，选择多。",
        hours: "约 06:30–21:00",
        location: "老综合楼餐饮区（示例位置）",
        tips: "早餐档口上午最热闹。",
    },
}

type StallDetail = { summary: string; location?: string; hours?: string; tips?: string }

/** 档口/店内窗口：`食堂 id + :: + category` 与 DISHES.category 一致 */
const STALL_DETAILS: Record<string, StallDetail> = {
    "haitang::四川小炒": {
        summary: "川味现炒，麻辣鲜香为主，适合配米饭。",
        location: "海棠食堂一层 · 中区偏南窗口",
        tips: "12:00 前后排队较久，可错峰。",
    },
    "haitang::面食窗口": {
        summary: "面条、粉类与麻辣烫同区，可自选配菜。",
        location: "海棠食堂一层 · 北区面食档",
        tips: "麻辣烫记得报辣度与忌口。",
    },
    "dingxiang::广式烧腊": {
        summary: "烧腊明档，烧鸭、叉烧、油鸡等配饭。",
        location: "丁香食堂一层 · 烧腊窗口",
        tips: "晚间烧腊可能售罄，宜早去。",
    },
    "dingxiang::粥粉面": {
        summary: "粥品、肠粉与汤面，口味偏清淡。",
        location: "丁香食堂一层 · 粥粉面区",
        tips: "肠粉现做需稍等。",
    },
    "zhuyuan::瓦罐煨汤": {
        summary: "瓦罐炖汤配饭，汤头为主、可单点配菜。",
        location: "竹园食堂一层 · 瓦罐区",
        tips: "汤品烫口，注意慢用。",
    },
    "zhuyuan::江西风味": {
        summary: "拌粉、炒粉等江西家常味。",
        location: "竹园食堂一层 · 赣味窗口",
        tips: "可加辣，和窗口说一声即可。",
    },
    "zhuyuan::快餐": {
        summary: "自选两荤一素等标准快餐，出餐快。",
        location: "竹园食堂一层 · 快餐线",
        tips: "饭点流水线移动较快，先选菜再结账。",
    },
    "xinzong::韩式料理": {
        summary: "拌饭、部队锅等韩式简餐。",
        location: "新综餐饮区 · 韩式档",
        tips: "石锅上桌很烫，勿碰锅边。",
    },
    "xinzong::日式定食": {
        summary: "咖喱、炸物定食等。",
        location: "新综餐饮区 · 日式档",
        tips: "可加饭/加酱，以现场为准。",
    },
    "xinzong::轻食": {
        summary: "沙拉、低油主食，适合清淡饮食。",
        location: "新综餐饮区 · 轻食柜",
        tips: "酱汁可自取，注意保质期标签。",
    },
    "laozong::早餐铺": {
        summary: "煎饼、豆浆、包子等早餐品类。",
        location: "老综餐饮区 · 早餐档",
        tips: "上午 9点前品种最全。",
    },
    "laozong::米线档": {
        summary: "过桥米线、小锅米线等。",
        location: "老综餐饮区 · 米线窗口",
        tips: "可先取号再找座。",
    },
    "laozong::炒饭炒面": {
        summary: "明火炒饭炒面，锅气足。",
        location: "老综餐饮区 · 炒档",
        tips: "现炒等待约 5–10 分钟属正常。",
    },
    "laozong::水煮鱼": {
        summary: "水煮、酸菜鱼等重口鱼类套餐。",
        location: "老综餐饮区 · 水煮鱼窗口",
        tips: "默认偏辣，可要求微辣/免辣。",
    },
}

function stallDetailKey(restaurantId: RestaurantId, category: string): string {
    return `${restaurantId}::${category}`
}

function getStallDetail(restaurantId: RestaurantId, category: string): StallDetail {
    const key = stallDetailKey(restaurantId, category)
    return (
        STALL_DETAILS[key] ?? {
            summary: `「${category}」档口，介绍待补充；请以现场指引为准。`,
        }
    )
}

/**
 * 抽奖池：食堂 + 档口(category) + 菜名（短字用于外圈格）
 * 在已勾选食堂内，每道菜被抽中概率相同。
 */
const DISHES = [
    { id: "ht1", restaurantId: "haitang" as const, category: "四川小炒", label: "葱爆牛肉", short: "葱爆牛肉" },
    { id: "ht2", restaurantId: "haitang" as const, category: "四川小炒", label: "鱼香肉丝", short: "鱼香肉丝" },
    { id: "ht3", restaurantId: "haitang" as const, category: "面食窗口", label: "牛肉面", short: "牛肉面" },
    { id: "ht4", restaurantId: "haitang" as const, category: "面食窗口", label: "麻辣烫", short: "麻辣烫" },
    { id: "dx1", restaurantId: "dingxiang" as const, category: "广式烧腊", label: "烧鸭饭", short: "烧鸭饭" },
    { id: "dx2", restaurantId: "dingxiang" as const, category: "广式烧腊", label: "叉烧饭", short: "叉烧饭" },
    { id: "dx3", restaurantId: "dingxiang" as const, category: "粥粉面", label: "皮蛋瘦肉粥", short: "皮蛋粥" },
    { id: "dx4", restaurantId: "dingxiang" as const, category: "粥粉面", label: "肠粉", short: "肠粉" },
    { id: "zy1", restaurantId: "zhuyuan" as const, category: "瓦罐煨汤", label: "排骨汤饭", short: "排骨汤" },
    { id: "zy2", restaurantId: "zhuyuan" as const, category: "江西风味", label: "南昌拌粉", short: "拌粉" },
    { id: "zy3", restaurantId: "zhuyuan" as const, category: "快餐", label: "两荤一素", short: "两荤一素" },
    { id: "xz1", restaurantId: "xinzong" as const, category: "韩式料理", label: "石锅拌饭", short: "拌饭" },
    { id: "xz2", restaurantId: "xinzong" as const, category: "日式定食", label: "咖喱蛋包饭", short: "咖喱饭" },
    { id: "xz3", restaurantId: "xinzong" as const, category: "轻食", label: "鸡胸沙拉", short: "沙拉" },
    { id: "lz1", restaurantId: "laozong" as const, category: "早餐铺", label: "煎饼果子", short: "煎饼" },
    { id: "lz2", restaurantId: "laozong" as const, category: "米线档", label: "过桥米线", short: "米线" },
    { id: "lz3", restaurantId: "laozong" as const, category: "炒饭炒面", label: "扬州炒饭", short: "炒饭" },
    { id: "lz4", restaurantId: "laozong" as const, category: "水煮鱼", label: "酸菜鱼套餐", short: "酸菜鱼" },
] as const

type Dish = (typeof DISHES)[number]

function restaurantById(id: RestaurantId): Restaurant {
    return RESTAURANTS.find((r) => r.id === id) ?? RESTAURANTS[0]!
}

/** 默认五座食堂全部参与筛选 */
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

/** 在已勾选餐厅的菜里均匀随机一道 */
function pickRandomDish(picked: Record<RestaurantId, boolean>): Dish | null {
    const pool = DISHES.filter((d) => picked[d.restaurantId])
    if (!pool.length) return null
    return pool[Math.floor(Math.random() * pool.length)]!
}

export function Lucky() {
    const [picked, setPicked] = useState<Record<RestaurantId, boolean>>(defaultPicked)
    const [highlight, setHighlight] = useState(0)
    const [spinning, setSpinning] = useState(false)
    const [result, setResult] = useState<Dish | null>(null)
    /** 详情弹窗：按抽中的菜定位「食堂 + 档口」 */
    const [detailDish, setDetailDish] = useState<Dish | null>(null)

    const timersRef = useRef<number[]>([])
    const highlightRef = useRef(0)

    /** 勾选店内的菜，与外圈/抽奖池一致 */
    const activeDishes = useMemo(() => {
        return DISHES.filter((d) => picked[d.restaurantId])
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

        const target = pickRandomDish(picked)
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

    const detailCanteen = detailDish ? restaurantById(detailDish.restaurantId) : null
    const detailCanteenInfo = detailDish ? CANTEEN_INFO[detailDish.restaurantId] : null
    const detailStall = detailDish ? getStallDetail(detailDish.restaurantId, detailDish.category) : null
    const detailStallMenu = useMemo(() => {
        if (!detailDish) return []
        return DISHES.filter(
            (d) => d.restaurantId === detailDish.restaurantId && d.category === detailDish.category
        )
    }, [detailDish])

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <p className="text-center text-sm text-muted-foreground leading-relaxed">
                <strong className="text-foreground">吃饭抽签</strong>
                ：右侧 <strong className="text-foreground">多选食堂</strong>
                ；转盘上是菜品。在勾选范围内 <strong className="text-foreground">每道菜概率相同</strong>。
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
                                                <span
                                                    className={cn(
                                                        "line-clamp-2 text-[9px] font-semibold leading-tight sm:text-[10px]",
                                                        on ? restaurantById(d.restaurantId).tone : ""
                                                    )}
                                                >
                                                    {d.short}
                                                </span>
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
                                            <button
                                                type="button"
                                                onClick={() => setDetailDish(result)}
                                                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-border bg-background/80 px-2.5 py-1 text-[10px] font-medium text-foreground shadow-sm transition-colors hover:bg-secondary/60"
                                            >
                                                <Info className="h-3.5 w-3.5" aria-hidden />
                                                查看食堂与档口详情
                                            </button>
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
                                    ? "请至少选一座食堂"
                                    : "没有可选的菜"
                                : "开始抽签"}
                    </button>
                </div>

                <aside className="flex w-full shrink-0 flex-col rounded-xl border border-border bg-card/50 lg:w-[min(100%,22rem)]">
                    <div className="border-b border-border bg-secondary/30 px-3 py-2.5">
                        <div className="flex items-start justify-between gap-2">
                            <div>
                                <p className="text-sm font-medium text-foreground">食堂筛选（多选）</p>
                                <p className="text-[11px] text-muted-foreground">只抽勾选食堂内的菜；列表见下方</p>
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
                            菜品池（食堂 · 档口 · 菜名）
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
                                    </li>
                                )
                            })}
                        </ul>
                    </div>

                    {!canSpin && selectedCount > 0 && (
                        <p className="border-t border-border px-3 py-2 text-center text-xs text-muted-foreground">
                            没有进入抽奖池的菜（检查是否误关食堂）。
                        </p>
                    )}
                    {selectedCount <= 0 && (
                        <p className="border-t border-border px-3 py-2 text-center text-xs text-destructive">
                            请至少勾选一座食堂。
                        </p>
                    )}
                </aside>
            </div>

            <Dialog
                open={detailDish !== null}
                onOpenChange={(open) => {
                    if (!open) setDetailDish(null)
                }}
            >
                <DialogContent className="max-h-[min(90vh,36rem)] gap-0 overflow-hidden p-0 sm:max-w-md">
                    {detailDish && detailCanteen && detailCanteenInfo && detailStall && (
                        <>
                            <DialogHeader className="border-b border-border px-5 py-4 text-left">
                                <p className="text-[11px] font-medium text-muted-foreground">抽中菜品 · 去哪吃</p>
                                <DialogTitle className="text-left text-lg leading-snug sm:text-xl">
                                    <span className={cn(detailCanteen.tone)}>{detailCanteen.label}</span>
                                    <span className="text-muted-foreground"> · </span>
                                    <span className="text-foreground">{detailDish.category}</span>
                                </DialogTitle>
                                <DialogDescription className="text-left">
                                    菜品：<span className="font-medium text-foreground">{detailDish.label}</span>
                                </DialogDescription>
                            </DialogHeader>
                            <div className="max-h-[min(65vh,28rem)] space-y-5 overflow-y-auto px-5 py-4 text-sm">
                                <section className="rounded-lg border border-border bg-secondary/15 p-3">
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        食堂
                                    </h3>
                                    <p className="text-foreground">{detailCanteenInfo.summary}</p>
                                    <dl className="mt-3 grid gap-2 text-muted-foreground">
                                        <div>
                                            <dt className="text-[10px] font-medium text-muted-foreground/90">营业时间</dt>
                                            <dd className="text-foreground">{detailCanteenInfo.hours}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-[10px] font-medium text-muted-foreground/90">位置</dt>
                                            <dd className="text-foreground">{detailCanteenInfo.location}</dd>
                                        </div>
                                        {detailCanteenInfo.tips && (
                                            <div>
                                                <dt className="text-[10px] font-medium text-muted-foreground/90">小贴士</dt>
                                                <dd className="text-foreground">{detailCanteenInfo.tips}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </section>

                                <section className="rounded-lg border border-border bg-secondary/15 p-3">
                                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                        档口（店）
                                    </h3>
                                    <p className="font-medium text-foreground">{detailDish.category}</p>
                                    <p className="mt-1 text-muted-foreground">{detailStall.summary}</p>
                                    <dl className="mt-3 grid gap-2 text-muted-foreground">
                                        {detailStall.location && (
                                            <div>
                                                <dt className="text-[10px] font-medium text-muted-foreground/90">窗口位置</dt>
                                                <dd className="text-foreground">{detailStall.location}</dd>
                                            </div>
                                        )}
                                        {detailStall.hours && (
                                            <div>
                                                <dt className="text-[10px] font-medium text-muted-foreground/90">档口时间</dt>
                                                <dd className="text-foreground">{detailStall.hours}</dd>
                                            </div>
                                        )}
                                        {detailStall.tips && (
                                            <div>
                                                <dt className="text-[10px] font-medium text-muted-foreground/90">档口提示</dt>
                                                <dd className="text-foreground">{detailStall.tips}</dd>
                                            </div>
                                        )}
                                    </dl>
                                </section>

                                <section>
                                    <p className="mb-2 text-[11px] font-medium text-muted-foreground">本档口菜单（配置表）</p>
                                    <ul className="max-h-36 space-y-1.5 overflow-y-auto rounded-md border border-border bg-secondary/20 p-2 text-xs">
                                        {detailStallMenu.map((d) => (
                                            <li
                                                key={d.id}
                                                className="border-b border-border/50 pb-1.5 text-foreground last:border-0 last:pb-0"
                                            >
                                                {d.label}
                                                {d.id === detailDish.id && (
                                                    <span className="ml-1.5 text-[10px] font-medium text-accent">← 本次</span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
