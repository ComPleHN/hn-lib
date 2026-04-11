import { notFound } from "next/navigation"
import { ToolsShell } from "@/components/tools/tools-shell"
import { Lucky } from "@/components/tools/lucky"
import { isToolSlug } from "@/lib/tools-meta"
import { TOOL_TITLES } from "@/lib/tools-meta"

const HINTS: Record<keyof typeof TOOL_TITLES, string> = {
    "lucky": "多选餐厅 · 菜品随机抽 · 方形跑马灯",
    "markdown-editor": "支持实时预览的极简写作工具",
    "image-compressor": "浏览器端图片压缩，保护隐私",
}

export default async function ToolsPage({
    params,
}: {
    params: Promise<{ slug: string }>
}) {
    const { slug } = await params
    if (!isToolSlug(slug)) notFound()

    const title = TOOL_TITLES[slug]
    const hint = HINTS[slug]

    return <ToolsShell title={title} hint={hint}>
        {slug === "lucky" && <Lucky />}
    </ToolsShell>
}
