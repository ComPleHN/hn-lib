import { notFound } from "next/navigation"
import { COMPONENT_TITLES, isComponentSlug } from "@/lib/components-meta"
import { GameShell } from "@/components/games/game-shell"
import { Calendar } from "@/components/components/calendar"

const HINTS: Record<keyof typeof COMPONENT_TITLES, string> = {
    "calendar": "可以编辑和拖拽的日历组件",
}

export default async function ComponentPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    if (!isComponentSlug(slug)) notFound()

    const title = COMPONENT_TITLES[slug]
    const hint = HINTS[slug]

    return (
        <GameShell title={title} hint={hint}>
            {slug === "calendar" && <Calendar />}
        </GameShell>
    )
}
