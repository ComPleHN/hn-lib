export const TOOL_SLUGS = [
    "lucky",
    "markdown-editor",
    "image-compressor",
] as const

export type ToolSlug = (typeof TOOL_SLUGS)[number]

export const TOOL_TITLES: Record<ToolSlug, string> = {
    "lucky": "吃饭抽签",
    "markdown-editor": "Markdown 编辑器",
    "image-compressor": "图片压缩器",
}

export function isToolSlug(s: string): s is ToolSlug {
    return (TOOL_SLUGS as readonly string[]).includes(s)
}
