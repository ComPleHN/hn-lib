import { notFound } from "next/navigation"
import { GAME_TITLES, isGameSlug } from "@/lib/games-meta"
import { GameShell } from "@/components/games/game-shell"
import { PixelAdventureGame } from "@/components/games/pixel-adventure-game"
import { CardBattleGame } from "@/components/games/card-battle-game"
import { PuzzleBoxGame } from "@/components/games/puzzle-box-game"
import { ColorBlocksGame } from "@/components/games/color-blocks-game"
import { DualTonePushGame } from "@/components/games/dual-tone-push-game"
import { SheepTilesGame } from "@/components/games/sheep-tiles-game"

const HINTS: Record<keyof typeof GAME_TITLES, string> = {
  "pixel-adventure": "Canvas 像素风平台跳跃 · 触控与键盘",
  "card-battle": "组卡 → 回合战斗 · 能量与格挡",
  "puzzle-box": "WebGL · 轨道相机与简易刚体反弹",
  "color-blocks": "逻辑推理 · 仅提示「几个位置正确」",
  "dual-tone-push": "9×9 黑白推箱 · 素材格 · 转化与翻面",
  "sheep-tiles": "叠层选牌 · 三张相同消除 · 底栏 7 格",
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!isGameSlug(slug)) notFound()

  const title = GAME_TITLES[slug]
  const hint = HINTS[slug]

  return (
    <GameShell title={title} hint={hint}>
      {slug === "pixel-adventure" && <PixelAdventureGame />}
      {slug === "card-battle" && <CardBattleGame />}
      {slug === "puzzle-box" && <PuzzleBoxGame />}
      {slug === "color-blocks" && <ColorBlocksGame />}
      {slug === "dual-tone-push" && <DualTonePushGame />}
      {slug === "sheep-tiles" && <SheepTilesGame />}
    </GameShell>
  )
}
