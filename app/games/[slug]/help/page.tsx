import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { GameShell } from "@/components/games/game-shell"
import { GAME_TITLES, isGameSlug, type GameSlug } from "@/lib/games-meta"
import { cn } from "@/lib/utils"

import imgWhiteFloor from "@/components/games/assets/白色地块.png"
import imgBlackFloor from "@/components/games/assets/黑色地块.png"
import imgWhiteBox from "@/components/games/assets/白色箱子.png"
import imgBlackBox from "@/components/games/assets/黑色箱子.png"
import imgGoal from "@/components/games/assets/终点.png"
import imgConverter from "@/components/games/assets/转化方块.png"
import imgPlayerWhite from "@/components/games/assets/白色地块本体.png"
import imgPlayerBlack from "@/components/games/assets/黑色地块本体.png"

const DUAL_TONE_SLUG = "dual-tone-push" as const satisfies GameSlug

function TilePreview({
  floor,
  goal,
  converter,
  boxTone,
  playerTone,
  className,
}: {
  floor: "white" | "black"
  goal?: boolean
  converter?: boolean
  boxTone?: 0 | 1
  playerTone?: 0 | 1
  className?: string
}) {
  const visFloor = goal || converter ? "white" : floor
  const floorSrc = visFloor === "white" ? imgWhiteFloor : imgBlackFloor

  return (
    <div
      className={cn(
        "relative h-11 w-11 shrink-0 overflow-hidden rounded-none border border-border bg-muted/30",
        className,
      )}
    >
      <Image src={floorSrc} alt="" fill className="object-cover" sizes="44px" />
      {goal ? (
        <div className="pointer-events-none absolute inset-0 z-[1]">
          <Image src={imgGoal} alt="" fill className="object-contain p-0.5" sizes="44px" />
        </div>
      ) : null}
      {converter ? (
        <div className="pointer-events-none absolute inset-0 z-[2]">
          <Image
            src={imgConverter}
            alt=""
            fill
            className="object-cover opacity-90"
            sizes="44px"
          />
        </div>
      ) : null}
      {playerTone !== undefined ? (
        <div className="pointer-events-none absolute inset-[10%] z-[3]">
          <Image
            src={playerTone === 0 ? imgPlayerWhite : imgPlayerBlack}
            alt=""
            fill
            className="object-contain"
            sizes="44px"
          />
        </div>
      ) : null}
      {boxTone !== undefined ? (
        <div className="pointer-events-none absolute inset-[10%] z-[3]">
          <Image
            src={boxTone === 0 ? imgWhiteBox : imgBlackBox}
            alt=""
            fill
            className="object-contain"
            sizes="44px"
          />
        </div>
      ) : null}
    </div>
  )
}

function DualToneHelpArticle() {
  return (
    <article className="prose prose-sm dark:prose-invert max-w-none text-foreground">
      <p className="text-muted-foreground not-prose text-sm leading-relaxed">
        关卡由9×9 字符地图描述；下表<strong className="text-foreground">以游戏内贴图</strong>
        对照各类格子（与 <code className="text-xs">parse.ts</code> 一致）。画面上<strong>终点与转化</strong>
        不区分黑白底图，但逻辑里仍有白/黑地坪之分（影响行走与翻面）。需要手写/导入地图时，类型名旁附有
        <span className="text-xs opacity-80">地图字符</span> 供对照。
      </p>

      <h2 className="text-base font-semibold mt-8 mb-3">胜负</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">胜利</strong>：场上<strong>每一只</strong>
          箱子都站在某一<strong>终点格</strong>上。
        </li>
        <li>
          <strong className="text-foreground">本体</strong>：整张地图有且仅有 <strong>一个</strong>
          （地图字符 <code className="text-xs">P</code> 或 <code className="text-xs">Q</code>）。
        </li>
      </ul>

      <h2 className="text-base font-semibold mt-8 mb-3">地块与元素</h2>
      <div className="not-prose overflow-x-auto rounded-none border border-border">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-2 font-medium w-[4.5rem]">图示</th>
              <th className="px-3 py-2 font-medium w-36">类型</th>
              <th className="px-3 py-2 font-medium">作用</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                白地坪
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">.</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">
                普通可走格。未「武装」时，本体仅能在与<strong>自身音色相同</strong>
                的地坪上移动（另有终点/转化、武装等例外见下）。
              </td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="black" />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                黑地坪
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">#</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">与白地坪相同规则，地坪色为黑（音色 1）。</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" goal />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                终点
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  白底 <code className="text-[0.7rem]">G</code> · 黑底 <code className="text-[0.7rem]">H</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">
                箱子到达即计为到位。本体<strong>任意音色</strong>均可走入；画面上不强调底图黑白，{" "}
                <code className="text-xs">H</code> 表示逻辑上的黑地坪终点。
              </td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" converter />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                转化
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  白底 <code className="text-[0.7rem]">C</code> · 黑底 <code className="text-[0.7rem]">D</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">
                本体<strong>任意音色</strong>可走入。踩上后进入「武装」：下一步可踏入{" "}
                <strong>任意色</strong>的空地块；随后仅在<strong>普通黑白地坪且格上无箱</strong>
                时，本体音色随该格地坪变色（终点/转化、叠在箱子上不变色）。
              </td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" playerTone={0} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                本体·白
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">P</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">玩家起点，音色为白（0）。</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="black" playerTone={1} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                本体·黑
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">Q</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle">玩家起点，音色为黑（1）。</td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" boxTone={0} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                白箱·白格
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">o</code>
                </span>
              </td>
              <td className="px-3 py-2 align-middle" rowSpan={4}>
                <strong className="text-foreground">箱子</strong>可与本体同占一格（同色叠入，不可推）。
                <strong className="text-foreground">异色</strong>则可推。推箱穿越地坪时：若箱色
                ≠ 离开格地坪且箱色 = 进入格地坪，则箱色翻面。常见设计是{" "}
                <strong className="text-foreground">白格放黑箱、黑格放白箱</strong>，便于推动；同色箱格仍合法但推法受限。
              </td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="black" boxTone={0} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                白箱·黑格
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">O</code>
                </span>
              </td>
            </tr>
            <tr className="border-b border-border/80">
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="white" boxTone={1} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                黑箱·白格
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">x</code>
                </span>
              </td>
            </tr>
            <tr>
              <td className="px-3 py-2 align-middle">
                <TilePreview floor="black" boxTone={1} />
              </td>
              <td className="px-3 py-2 text-foreground align-middle">
                黑箱·黑格
                <span className="block text-xs text-muted-foreground font-normal mt-0.5">
                  地图字符 <code className="text-[0.7rem]">X</code>
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="text-base font-semibold mt-8 mb-3">箱子与推动（小结）</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        <li>
          <strong className="text-foreground">同色</strong>本体与箱可叠入同一格，不可再推该箱。
        </li>
        <li>
          <strong className="text-foreground">异色</strong>则可推，前方须有空位且不被其他箱堵住。
        </li>
      </ul>

      <h2 className="text-base font-semibold mt-8 mb-3">操作</h2>
      <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
        <li>
          键盘：<strong className="text-foreground">方向键 / WASD</strong> 移动，<strong className="text-foreground">R</strong>{" "}
          重置本关。
        </li>
        <li>
          多关时：<strong className="text-foreground">[ / ]</strong> 上一关 / 下一关。
        </li>
        <li>小屏可使用界面上的方向按钮。</li>
      </ul>
    </article>
  )
}

export default async function GameHelpPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!isGameSlug(slug) || slug !== DUAL_TONE_SLUG) notFound()

  return (
    <GameShell title={`${GAME_TITLES[slug]} · 玩法说明`}>
      <div className="space-y-6">
        <Link
          href={`/games/${slug}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回游戏
        </Link>
        <DualToneHelpArticle />
      </div>
    </GameShell>
  )
}
