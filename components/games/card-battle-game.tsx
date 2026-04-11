"use client"

import type { LucideIcon } from "lucide-react"
import {
  Bandage,
  Flame,
  Heart,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Wind,
  Zap,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

type CardDef = {
  id: string
  name: string
  cost: number
  damage?: number
  block?: number
  heal?: number
  desc: string
}

const POOL: CardDef[] = [
  { id: "strike", name: "打击", cost: 1, damage: 6, desc: "造成 6 点伤害" },
  { id: "heavy", name: "重击", cost: 2, damage: 11, desc: "造成 11 点伤害" },
  { id: "defend", name: "防御", cost: 1, block: 6, desc: "获得 6 点格挡" },
  { id: "barrier", name: "护盾", cost: 2, block: 12, desc: "获得 12 点格挡" },
  { id: "poke", name: "戳刺", cost: 0, damage: 3, desc: "造成 3 点伤害" },
  { id: "bash", name: "冲撞", cost: 2, damage: 8, block: 4, desc: "造成 8 点伤害并获得 4 格挡" },
  { id: "medkit", name: "包扎", cost: 1, heal: 5, desc: "回复 5 生命" },
  { id: "combo", name: "连击", cost: 1, damage: 4, desc: "造成 4 点伤害" },
  { id: "slam", name: "猛击", cost: 3, damage: 16, desc: "造成 16 点伤害" },
  { id: "brace", name: "戒备", cost: 1, block: 3, heal: 2, desc: "格挡 3 并回复 2" },
]

const CARD_THEME: Record<
  string,
  { gradient: string; border: string; icon: LucideIcon; accent: string }
> = {
  strike: {
    gradient: "from-rose-950/90 via-card to-amber-950/50",
    border: "border-rose-500/35",
    icon: Sword,
    accent: "text-rose-300",
  },
  heavy: {
    gradient: "from-orange-950/90 via-card to-red-950/60",
    border: "border-orange-500/35",
    icon: Swords,
    accent: "text-orange-300",
  },
  defend: {
    gradient: "from-sky-950/85 via-card to-cyan-950/45",
    border: "border-sky-500/35",
    icon: Shield,
    accent: "text-sky-300",
  },
  barrier: {
    gradient: "from-indigo-950/88 via-card to-blue-950/50",
    border: "border-indigo-400/35",
    icon: Shield,
    accent: "text-indigo-300",
  },
  poke: {
    gradient: "from-yellow-950/70 via-card to-amber-900/40",
    border: "border-yellow-500/30",
    icon: Zap,
    accent: "text-yellow-200",
  },
  bash: {
    gradient: "from-fuchsia-950/80 via-card to-rose-950/45",
    border: "border-fuchsia-500/35",
    icon: Flame,
    accent: "text-fuchsia-300",
  },
  medkit: {
    gradient: "from-emerald-950/85 via-card to-teal-950/45",
    border: "border-emerald-400/35",
    icon: Heart,
    accent: "text-emerald-300",
  },
  combo: {
    gradient: "from-violet-950/80 via-card to-purple-950/45",
    border: "border-violet-400/35",
    icon: Wind,
    accent: "text-violet-300",
  },
  slam: {
    gradient: "from-red-950/92 via-card to-zinc-950/70",
    border: "border-red-500/40",
    icon: Skull,
    accent: "text-red-300",
  },
  brace: {
    gradient: "from-teal-950/75 via-card to-emerald-950/40",
    border: "border-teal-400/35",
    icon: Bandage,
    accent: "text-teal-300",
  },
}

const DEFAULT_THEME = {
  gradient: "from-zinc-800/90 via-card to-zinc-900/60",
  border: "border-border",
  icon: Sparkles,
  accent: "text-muted-foreground",
}

function cardTheme(id: string) {
  return CARD_THEME[id] ?? DEFAULT_THEME
}

type BattleCard = CardDef & { uid: string }

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function drawUpTo(
  target: number,
  deck: BattleCard[],
  hand: BattleCard[],
  discard: BattleCard[]
) {
  let nextD = [...deck]
  let nextH = [...hand]
  let nextDis = [...discard]
  const need = Math.max(0, target - nextH.length)
  for (let i = 0; i < need; i++) {
    if (nextD.length === 0) {
      if (nextDis.length === 0) break
      nextD = shuffle(nextDis)
      nextDis = []
    }
    const c = nextD.pop()
    if (c) nextH.push(c)
  }
  return { deck: nextD, hand: nextH, discard: nextDis }
}

type Phase = "build" | "battle" | "over"

type FloatPop = {
  id: number
  side: "player" | "enemy"
  text: string
  sub?: string
  tone: "damage" | "heal" | "block" | "mitigate"
}

const P_MAX = 52
const E_MAX = 48
const BLOCK_BAR_CAP = 22

function HpBar({ current, max }: { current: number; max: number }) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100))
  const tone =
    pct > 55 ? "bg-emerald-500 shadow-[0_0_12px_rgba(52,211,153,0.35)]" : pct > 28 ? "bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]" : "bg-rose-500 shadow-[0_0_14px_rgba(244,63,94,0.45)]"
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>生命</span>
        <span className="font-mono text-foreground tabular-nums">
          {current} / {max}
        </span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full border border-border/80 bg-black/40">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500 ease-out", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BlockBar({ value, label = "格挡" }: { value: number; label?: string }) {
  const pct = Math.min(100, (value / BLOCK_BAR_CAP) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className="font-mono text-sky-200/90 tabular-nums">{value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full border border-sky-500/25 bg-sky-950/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-600 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.35)] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function BattleStatPanel({
  title,
  subtitle,
  hp,
  maxHp,
  block,
  align,
  shakeTick,
  flashTick,
  pops,
}: {
  title: string
  subtitle?: string
  hp: number
  maxHp: number
  block: number
  align: "left" | "right"
  shakeTick: number
  flashTick: number
  pops: FloatPop[]
}) {
  const shellRef = useRef<HTMLDivElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (shakeTick === 0) return
    const el = shellRef.current
    if (!el) return
    el.classList.remove("animate-card-battle-shake")
    void el.offsetWidth
    el.classList.add("animate-card-battle-shake")
  }, [shakeTick])

  useEffect(() => {
    if (flashTick === 0) return
    const el = flashRef.current
    if (!el) return
    el.classList.remove("animate-card-battle-flash")
    void el.offsetWidth
    el.classList.add("animate-card-battle-flash")
  }, [flashTick])

  const myPops = pops.filter((p) => p.side === (align === "left" ? "player" : "enemy"))

  return (
    <div
      ref={shellRef}
      className={cn(
        "relative overflow-hidden rounded-xl border bg-card p-4 shadow-inner",
        align === "left" ? "border-emerald-500/20" : "border-rose-500/25"
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: `
            linear-gradient(155deg, rgba(255,255,255,0.07) 0%, transparent 42%),
            repeating-linear-gradient(
              -12deg,
              transparent,
              transparent 6px,
              rgba(255,255,255,0.02) 6px,
              rgba(255,255,255,0.02) 7px
            )
          `,
        }}
      />
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0 rounded-xl bg-rose-500/50"
      />
      <div className="relative z-[1] space-y-3">
        <div className={cn("flex flex-col gap-0.5", align === "right" && "items-end text-right")}>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {subtitle ? <p className="text-[11px] text-muted-foreground/80">{subtitle}</p> : null}
        </div>
        <HpBar current={hp} max={maxHp} />
        <BlockBar value={block} />
      </div>
      <div className="pointer-events-none absolute inset-x-0 top-10 z-[2] flex min-h-[3rem] justify-center">
        {myPops.map((pop, i) => (
          <div
            key={pop.id}
            className="animate-card-battle-float absolute flex flex-col items-center"
            style={{
              left: `calc(50% + ${(i % 3) * 14 - 14}px)`,
            }}
          >
            <span
              className={cn(
                "font-bold tabular-nums drop-shadow-md",
                pop.tone === "damage" && "text-lg text-rose-300",
                pop.tone === "heal" && "text-lg text-emerald-300",
                pop.tone === "block" && "text-base text-sky-300",
                pop.tone === "mitigate" && "text-sm text-cyan-200/90"
              )}
            >
              {pop.text}
            </span>
            {pop.sub ? (
              <span className="text-[10px] font-medium text-cyan-200/80">{pop.sub}</span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

function EnergyOrbs({ energy }: { energy: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`能量 ${energy} / 3`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            "h-3 w-3 rounded-full border transition-all duration-300",
            i < energy
              ? "border-amber-400/80 bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.55)] scale-100"
              : "border-border bg-secondary/50 scale-90 opacity-40"
          )}
        />
      ))}
    </div>
  )
}

function PoolCardChrome({ cardId, name, cost, desc, selected }: { cardId: string; name: string; cost: number; desc: string; selected: boolean }) {
  const t = cardTheme(cardId)
  const Icon = t.icon
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute inset-0 bg-gradient-to-br opacity-95",
          t.gradient
        )}
      />
      <div className="pointer-events-none absolute inset-0 opacity-[0.2] bg-[radial-gradient(circle_at_30%_20%,white,transparent_55%)]" />
      <div className="relative z-[1] flex items-start gap-3">
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-black/25",
            t.border,
            t.accent
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{name}</span>
            <span className="rounded-md border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
              {cost} 费
            </span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{desc}</p>
        </div>
      </div>
      {selected ? (
        <div className="pointer-events-none absolute inset-0 z-[2] rounded-lg ring-2 ring-emerald-400/70 ring-inset" />
      ) : null}
    </>
  )
}

function HandCardChrome({ card, disabled, onClick }: { card: BattleCard; disabled: boolean; onClick: () => void }) {
  const t = cardTheme(card.id)
  const Icon = t.icon
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-200",
        t.border,
        disabled ? "cursor-not-allowed opacity-45" : "hover:-translate-y-1 hover:shadow-lg hover:shadow-black/30 active:translate-y-0"
      )}
    >
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br", t.gradient)} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] bg-[radial-gradient(circle_at_80%_0%,white,transparent_50%)]" />
      <div className="relative z-[1] space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className={cn("flex h-12 w-12 items-center justify-center rounded-lg border bg-black/30", t.border, t.accent)}>
            <Icon className="h-6 w-6" strokeWidth={1.6} />
          </div>
          <span className="rounded-lg border border-amber-400/45 bg-amber-500/20 px-2.5 py-1 text-xs font-bold text-amber-100 shadow-[0_0_12px_rgba(251,191,36,0.25)]">
            {card.cost}
          </span>
        </div>
        <div>
          <h4 className="font-semibold text-foreground">{card.name}</h4>
          <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{card.desc}</p>
        </div>
        {!disabled ? (
          <p className="text-[10px] font-medium text-emerald-400/80 opacity-0 transition-opacity group-hover:opacity-100">
            点击打出
          </p>
        ) : null}
      </div>
    </button>
  )
}

export function CardBattleGame() {
  const [phase, setPhase] = useState<Phase>("build")
  const [picked, setPicked] = useState<Set<string>>(() => new Set())

  const [pHp, setPHp] = useState(P_MAX)
  const [eHp, setEHp] = useState(E_MAX)
  const [pBlock, setPBlock] = useState(0)
  const [eBlock, setEBlock] = useState(0)
  const [energy, setEnergy] = useState(3)
  const [turn, setTurn] = useState(1)
  const [hand, setHand] = useState<BattleCard[]>([])
  const [deck, setDeck] = useState<BattleCard[]>([])
  const [discard, setDiscard] = useState<BattleCard[]>([])
  const [log, setLog] = useState<string[]>([])
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null)

  const [pShake, setPShake] = useState(0)
  const [eShake, setEShake] = useState(0)
  const [pFlash, setPFlash] = useState(0)
  const [eFlash, setEFlash] = useState(0)
  const [floats, setFloats] = useState<FloatPop[]>([])
  const floatId = useRef(0)

  const pushFloat = useCallback((pop: Omit<FloatPop, "id">) => {
    const id = ++floatId.current
    setFloats((f) => [...f, { ...pop, id }])
    window.setTimeout(() => {
      setFloats((f) => f.filter((x) => x.id !== id))
    }, 900)
  }, [])

  const snap = useRef({
    pHp,
    eHp,
    pBlock,
    eBlock,
    deck,
    hand,
    discard,
  })
  snap.current = { pHp, eHp, pBlock, eBlock, deck, hand, discard }

  const pushLog = useCallback((line: string) => {
    setLog((prev) => [line, ...prev].slice(0, 10))
  }, [])

  const startBattle = useCallback(() => {
    if (picked.size < 6 || picked.size > 10) {
      pushLog("请选择 6～10 张牌组成卡组。")
      return
    }
    const cards: BattleCard[] = POOL.filter((c) => picked.has(c.id)).map((c) => ({
      ...c,
      uid: uid(),
    }))
    const shuffled = shuffle(cards)
    const first = drawUpTo(5, shuffled, [], [])
    setDeck(first.deck)
    setHand(first.hand)
    setDiscard(first.discard)
    setPHp(P_MAX)
    setEHp(E_MAX)
    setPBlock(0)
    setEBlock(0)
    setEnergy(3)
    setTurn(1)
    setWinner(null)
    setFloats([])
    setPShake(0)
    setEShake(0)
    setPFlash(0)
    setEFlash(0)
    setPhase("battle")
    setLog(["对决开始"])
  }, [picked, pushLog])

  const playCard = (c: BattleCard) => {
    if (phase !== "battle" || winner) return
    if (c.cost > energy) return

    setEnergy((e) => e - c.cost)
    setHand((h) => h.filter((x) => x.uid !== c.uid))
    setDiscard((d) => [...d, c])

    const s = snap.current
    if (c.block) {
      setPBlock((b) => b + (c.block ?? 0))
      pushFloat({ side: "player", text: `+${c.block} 格挡`, tone: "block" })
    }
    if (c.heal) {
      setPHp((h) => Math.min(P_MAX, h + (c.heal ?? 0)))
      pushFloat({ side: "player", text: `+${c.heal} 生命`, tone: "heal" })
    }

    if (c.damage) {
      let dmg = c.damage
      const absorbed = Math.min(s.eBlock, dmg)
      const newEb = s.eBlock - absorbed
      dmg -= absorbed
      const nh = Math.max(0, s.eHp - dmg)
      setEBlock(newEb)
      setEHp(nh)

      setEShake((x) => x + 1)
      setEFlash((x) => x + 1)

      const hpLoss = s.eHp - nh
      if (hpLoss > 0) {
        pushFloat({
          side: "enemy",
          text: `-${hpLoss}`,
          sub: absorbed > 0 ? `护盾吸收 ${absorbed}` : undefined,
          tone: "damage",
        })
      } else if (absorbed > 0) {
        pushFloat({
          side: "enemy",
          text: "护盾吸收",
          sub: `${absorbed}`,
          tone: "mitigate",
        })
      }

      if (nh <= 0) {
        setWinner("player")
        setPhase("over")
        pushLog(`你使用「${c.name}」击败敌人`)
      } else {
        pushLog(`你使用「${c.name}」造成 ${c.damage} 点伤害`)
      }
    } else {
      pushLog(`你使用「${c.name}」`)
    }
  }

  const endPlayerTurn = () => {
    if (phase !== "battle" || winner) return

    const s = snap.current
    const card = POOL[Math.floor(Math.random() * POOL.length)]

    let pB = s.pBlock
    let pH = s.pHp
    let eB = s.eBlock
    let eH = s.eHp

    if (card.block) eB += card.block
    if (card.heal) eH = Math.min(E_MAX, eH + (card.heal ?? 0))

    let absorbed = 0
    let hpLoss = 0
    if (card.damage) {
      let dmg = card.damage
      absorbed = Math.min(pB, dmg)
      pB -= absorbed
      dmg -= absorbed
      const nextHp = Math.max(0, pH - dmg)
      hpLoss = pH - nextHp
      pH = nextHp
    }

    setPBlock(pB)
    setPHp(Math.max(0, pH))
    setEBlock(eB)
    setEHp(eH)

    if (card.damage) {
      setPShake((x) => x + 1)
      setPFlash((x) => x + 1)
      if (hpLoss > 0) {
        pushFloat({
          side: "player",
          text: `-${hpLoss}`,
          sub: absorbed > 0 ? `护盾吸收 ${absorbed}` : undefined,
          tone: "damage",
        })
      } else if (absorbed > 0) {
        pushFloat({
          side: "player",
          text: "护盾吸收",
          sub: `${absorbed}`,
          tone: "mitigate",
        })
      }
    }
    if (card.block) {
      pushFloat({ side: "enemy", text: `+${card.block} 格挡`, tone: "block" })
    }
    if (card.heal) {
      pushFloat({ side: "enemy", text: `+${card.heal} 生命`, tone: "heal" })
    }

    pushLog(`敌人使用「${card.name}」`)

    if (pH <= 0) {
      setWinner("enemy")
      setPhase("over")
      pushLog("你被击败了")
      return
    }

    setTurn((t) => t + 1)
    setEnergy(3)

    const drawn = drawUpTo(5, s.deck, s.hand, s.discard)
    setDeck(drawn.deck)
    setHand(drawn.hand)
    setDiscard(drawn.discard)
    pushLog(`—— 第 ${turn + 1} 回合 ——`)
  }

  const togglePick = (id: string) => {
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else if (next.size < 10) next.add(id)
      return next
    })
  }

  const poolCards = useMemo(() => POOL, [])

  if (phase === "build") {
    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          从牌池中点击选择 <strong className="text-foreground">6～10</strong>{" "}
          张牌，组成你的卡组后开始对决。
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {poolCards.map((c) => {
            const on = picked.has(c.id)
            const t = cardTheme(c.id)
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => togglePick(c.id)}
                className={cn(
                  "relative overflow-hidden rounded-xl border p-4 text-left transition-all hover:border-muted-foreground/25",
                  t.border
                )}
              >
                <PoolCardChrome cardId={c.id} name={c.name} cost={c.cost} desc={c.desc} selected={on} />
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted-foreground">已选 {picked.size} 张</span>
          <button
            type="button"
            onClick={startBattle}
            disabled={picked.size < 6}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            开始对决
          </button>
        </div>
      </div>
    )
  }

  if (phase === "over") {
    return (
      <div className="space-y-6 text-center">
        <p className="text-xl font-medium">
          {winner === "player" ? "胜利" : "失败"}
        </p>
        <button
          type="button"
          onClick={() => {
            setPhase("build")
            setPicked(new Set())
            setLog([])
            setFloats([])
          }}
          className="rounded-lg border border-border bg-secondary px-4 py-2 text-sm"
        >
          重新组卡
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BattleStatPanel
          title="你"
          subtitle="冒险者"
          hp={pHp}
          maxHp={P_MAX}
          block={pBlock}
          align="left"
          shakeTick={pShake}
          flashTick={pFlash}
          pops={floats}
        />
        <BattleStatPanel
          title="敌人"
          subtitle="暗影构造体"
          hp={eHp}
          maxHp={E_MAX}
          block={eBlock}
          align="right"
          shakeTick={eShake}
          flashTick={eFlash}
          pops={floats}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/80 bg-secondary/30 px-4 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">能量</span>
          <EnergyOrbs energy={energy} />
        </div>
        <span className="text-sm text-muted-foreground">
          回合 <strong className="text-foreground tabular-nums">{turn}</strong>
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hand.map((c) => (
          <HandCardChrome key={c.uid} card={c} disabled={c.cost > energy} onClick={() => playCard(c)} />
        ))}
      </div>

      <button
        type="button"
        onClick={endPlayerTurn}
        className="w-full rounded-xl border border-border bg-secondary py-3 text-sm font-medium shadow-sm transition-colors hover:bg-secondary/80"
      >
        结束回合（敌人行动并抽牌）
      </button>

      <ul className="space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
        {log.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
