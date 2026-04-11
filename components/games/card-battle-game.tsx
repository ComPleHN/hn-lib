"use client"

import { useCallback, useMemo, useRef, useState } from "react"
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

export function CardBattleGame() {
  const [phase, setPhase] = useState<Phase>("build")
  const [picked, setPicked] = useState<Set<string>>(() => new Set())

  const [pHp, setPHp] = useState(52)
  const [eHp, setEHp] = useState(48)
  const [pBlock, setPBlock] = useState(0)
  const [eBlock, setEBlock] = useState(0)
  const [energy, setEnergy] = useState(3)
  const [turn, setTurn] = useState(1)
  const [hand, setHand] = useState<BattleCard[]>([])
  const [deck, setDeck] = useState<BattleCard[]>([])
  const [discard, setDiscard] = useState<BattleCard[]>([])
  const [log, setLog] = useState<string[]>([])
  const [winner, setWinner] = useState<"player" | "enemy" | null>(null)

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
    setPHp(52)
    setEHp(48)
    setPBlock(0)
    setEBlock(0)
    setEnergy(3)
    setTurn(1)
    setWinner(null)
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
    if (c.block) setPBlock((b) => b + (c.block ?? 0))
    if (c.heal) setPHp((h) => Math.min(52, h + (c.heal ?? 0)))

    if (c.damage) {
      let dmg = c.damage
      const absorbed = Math.min(s.eBlock, dmg)
      const newEb = s.eBlock - absorbed
      dmg -= absorbed
      const nh = Math.max(0, s.eHp - dmg)
      setEBlock(newEb)
      setEHp(nh)
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
    if (card.heal) eH = Math.min(48, eH + (card.heal ?? 0))

    if (card.damage) {
      let dmg = card.damage
      const absorbed = Math.min(pB, dmg)
      pB -= absorbed
      dmg -= absorbed
      pH -= dmg
      pushLog(`敌人使用「${card.name}」`)
    } else {
      pushLog(`敌人使用「${card.name}」`)
    }

    setPBlock(pB)
    setPHp(Math.max(0, pH))
    setEBlock(eB)
    setEHp(eH)

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
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => togglePick(c.id)}
                className={cn(
                  "text-left rounded-lg border p-4 transition-colors",
                  on
                    ? "border-emerald-500/50 bg-emerald-500/10"
                    : "border-border bg-card hover:bg-secondary/50"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">费用 {c.cost}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
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
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground">你</p>
          <p className="mt-1 text-lg font-medium">HP {pHp} / 52</p>
          <p className="text-muted-foreground">格挡 {pBlock}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-muted-foreground">敌人</p>
          <p className="mt-1 text-lg font-medium">HP {eHp} / 48</p>
          <p className="text-muted-foreground">格挡 {eBlock}</p>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span>
          能量 <strong className="text-foreground">{energy}</strong> / 3
        </span>
        <span className="text-muted-foreground">回合 {turn}</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {hand.map((c) => (
          <button
            key={c.uid}
            type="button"
            disabled={c.cost > energy}
            onClick={() => playCard(c)}
            className={cn(
              "text-left rounded-lg border p-4 transition-colors disabled:opacity-40",
              c.cost <= energy
                ? "border-border bg-card hover:bg-secondary/80"
                : "border-border bg-card"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.name}</span>
              <span className="text-xs text-amber-400/90">{c.cost} 费</span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{c.desc}</p>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={endPlayerTurn}
        className="w-full rounded-lg border border-border bg-secondary py-3 text-sm font-medium hover:bg-secondary/80"
      >
        结束回合（敌人行动并抽牌）
      </button>
      <ul className="text-xs text-muted-foreground space-y-1 border-t border-border pt-4">
        {log.map((line, i) => (
          <li key={`${i}-${line}`}>{line}</li>
        ))}
      </ul>
    </div>
  )
}
