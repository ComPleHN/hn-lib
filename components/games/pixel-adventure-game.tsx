"use client"

import { useEffect, useRef } from "react"

const W = 160
const H = 100

type Rect = { x: number; y: number; w: number; h: number }

const PLATFORMS: Rect[] = [
  { x: 0, y: 88, w: 160, h: 12 },
  { x: 30, y: 68, w: 36, h: 6 },
  { x: 78, y: 52, w: 28, h: 6 },
  { x: 22, y: 40, w: 22, h: 4 },
  { x: 118, y: 70, w: 28, h: 6 },
]

const GOAL: Rect = { x: 142, y: 76, w: 8, h: 12 }
const PLAYER_W = 6
const PLAYER_H = 10

function aabbOverlap(a: Rect, b: Rect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

export function PixelAdventureGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const keys = useRef({ left: false, right: false, jump: false })
  const playerRef = useRef({ x: 8, y: 70, vx: 0, vy: 0 })
  const wonRef = useRef(false)
  const rafRef = useRef(0)

  useEffect(() => {
    const onKey = (e: KeyboardEvent, down: boolean) => {
      if (e.code === "ArrowLeft" || e.code === "KeyA") keys.current.left = down
      if (e.code === "ArrowRight" || e.code === "KeyD") keys.current.right = down
      if (e.code === "ArrowUp" || e.code === "KeyW" || e.code === "Space") {
        if (down) e.preventDefault()
        keys.current.jump = down
      }
    }
    const kd = (e: KeyboardEvent) => onKey(e, true)
    const ku = (e: KeyboardEvent) => onKey(e, false)
    window.addEventListener("keydown", kd)
    window.addEventListener("keyup", ku)
    return () => {
      window.removeEventListener("keydown", kd)
      window.removeEventListener("keyup", ku)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = W
    canvas.height = H
    ctx.imageSmoothingEnabled = false

    let last = performance.now()
    const GRAVITY = 0.35
    const MOVE = 0.55
    const MAX_X = 1.85
    const JUMP = -4.25

    const tick = (now: number) => {
      const dt = Math.min(32, now - last) / 16
      last = now
      const p = playerRef.current

      if (!wonRef.current) {
        if (keys.current.left) p.vx -= MOVE * dt
        if (keys.current.right) p.vx += MOVE * dt
        p.vx *= Math.pow(0.88, dt)
        p.vx = Math.max(-MAX_X, Math.min(MAX_X, p.vx))

        let onGround = false
        const probeY = p.y + 0.5
        const probe: Rect = { x: p.x, y: probeY, w: PLAYER_W, h: PLAYER_H }
        for (const plat of PLATFORMS) {
          if (aabbOverlap(probe, plat) && p.vy >= -0.1) {
            const feet = p.y + PLAYER_H
            if (feet <= plat.y + 2) onGround = true
          }
        }
        if (keys.current.jump && onGround) p.vy = JUMP

        p.vy += GRAVITY * dt
        p.x += p.vx * dt
        p.y += p.vy * dt

        if (p.x < 0) {
          p.x = 0
          p.vx = 0
        }
        if (p.x + PLAYER_W > W) {
          p.x = W - PLAYER_W
          p.vx = 0
        }

        const playerRect: Rect = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }
        for (const plat of PLATFORMS) {
          if (!aabbOverlap(playerRect, plat)) continue
          const overlapX = Math.min(p.x + PLAYER_W - plat.x, plat.x + plat.w - p.x)
          const overlapY = Math.min(p.y + PLAYER_H - plat.y, plat.y + plat.h - p.y)
          if (overlapX < overlapY) {
            if (p.vx > 0) p.x = plat.x - PLAYER_W
            else if (p.vx < 0) p.x = plat.x + plat.w
            p.vx = 0
          } else {
            if (p.vy > 0) {
              p.y = plat.y - PLAYER_H
              p.vy = 0
            } else if (p.vy < 0) {
              p.y = plat.y + plat.h
              p.vy = 0
            }
          }
        }

        const pr: Rect = { x: p.x, y: p.y, w: PLAYER_W, h: PLAYER_H }
        if (aabbOverlap(pr, GOAL)) wonRef.current = true

        if (p.y > H + 24) {
          p.x = 8
          p.y = 70
          p.vx = 0
          p.vy = 0
        }
      }

      ctx.fillStyle = "#1a1c2e"
      ctx.fillRect(0, 0, W, H)
      ctx.fillStyle = "#3d4478"
      for (let i = 0; i < 24; i++) {
        ctx.fillRect((i * 19) % W, (i * 29 + 5) % (H - 24), 1, 1)
      }
      for (const plat of PLATFORMS) {
        ctx.fillStyle = "#566c86"
        ctx.fillRect(plat.x | 0, plat.y | 0, plat.w | 0, plat.h | 0)
        ctx.fillStyle = "#94a3b8"
        ctx.fillRect(plat.x | 0, plat.y | 0, plat.w | 0, 2)
      }
      ctx.fillStyle = "#f4b922"
      ctx.fillRect(GOAL.x | 0, GOAL.y | 0, GOAL.w | 0, GOAL.h | 0)
      ctx.fillStyle = "#ff77a8"
      ctx.fillRect(p.x | 0, p.y | 0, PLAYER_W, PLAYER_H)
      if (wonRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.45)"
        ctx.fillRect(0, 0, W, H)
        ctx.fillStyle = "#f8fafc"
        ctx.font = "bold 8px ui-monospace, monospace"
        ctx.textAlign = "center"
        ctx.fillText("通关!", W / 2, H / 2 - 2)
        ctx.font = "5px ui-monospace, monospace"
        ctx.fillText("点击重置", W / 2, H / 2 + 8)
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  const reset = () => {
    wonRef.current = false
    playerRef.current = { x: 8, y: 70, vx: 0, vy: 0 }
  }

  const bindHold = (key: "left" | "right" | "jump", active: boolean) => {
    keys.current[key] = active
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          onClick={() => {
            if (wonRef.current) reset()
          }}
          className="rounded-lg border border-border cursor-pointer max-w-full h-auto"
          style={{
            width: "min(100%, 640px)",
            aspectRatio: `${W} / ${H}`,
            imageRendering: "pixelated",
          }}
        />
      </div>
      <p className="text-center text-sm text-muted-foreground">
        键盘：A / D 或方向键移动，W、上方向键或空格跳跃。抵达右侧金色旗帜即通关；通关后点画面可重开。
      </p>
      <div className="flex justify-center gap-3 select-none touch-manipulation md:hidden">
        <button
          type="button"
          className="min-w-[4.5rem] rounded-lg border border-border bg-secondary px-4 py-3 text-sm active:bg-secondary/80"
          onPointerDown={(e) => {
            e.preventDefault()
            bindHold("left", true)
          }}
          onPointerUp={() => bindHold("left", false)}
          onPointerLeave={() => bindHold("left", false)}
        >
          左
        </button>
        <button
          type="button"
          className="min-w-[4.5rem] rounded-lg border border-border bg-secondary px-4 py-3 text-sm active:bg-secondary/80"
          onPointerDown={(e) => {
            e.preventDefault()
            bindHold("jump", true)
          }}
          onPointerUp={() => bindHold("jump", false)}
          onPointerLeave={() => bindHold("jump", false)}
        >
          跳
        </button>
        <button
          type="button"
          className="min-w-[4.5rem] rounded-lg border border-border bg-secondary px-4 py-3 text-sm active:bg-secondary/80"
          onPointerDown={(e) => {
            e.preventDefault()
            bindHold("right", true)
          }}
          onPointerUp={() => bindHold("right", false)}
          onPointerLeave={() => bindHold("right", false)}
        >
          右
        </button>
      </div>
    </div>
  )
}
