import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"

export interface BreadcrumbSegment {
  label: string
  href?: string
}

interface BreadcrumbProps {
  /** 首页之后的片段；首页固定为链到 `/` */
  segments: BreadcrumbSegment[]
}

export function Breadcrumb({ segments }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm flex-wrap" aria-label="面包屑">
      <Link
        href="/"
        className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4 shrink-0" />
        <span>首页</span>
      </Link>

      {segments.map((seg, index) => (
        <span key={`${seg.label}-${index}`} className="flex items-center gap-2 min-w-0">
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/50" />
          {seg.href ? (
            <Link
              href={seg.href}
              className="text-muted-foreground hover:text-foreground transition-colors truncate"
            >
              {seg.label}
            </Link>
          ) : (
            <span className="text-foreground truncate">{seg.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
