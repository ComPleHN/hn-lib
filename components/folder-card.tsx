import Link from "next/link"
import { Folder, type ProjectType } from "@/lib/projects-data"
import { folderRoute } from "@/lib/folders-meta"
import { Gamepad2, Layers, FlaskConical, Wrench, Palette, ChevronRight } from "lucide-react"

const iconMap: Record<ProjectType, React.ComponentType<{ className?: string }>> = {
  game: Gamepad2,
  component: Layers,
  experiment: FlaskConical,
  tool: Wrench,
  design: Palette,
}

const colorMap: Record<ProjectType, string> = {
  game: "group-hover:text-emerald-400",
  component: "group-hover:text-sky-400",
  experiment: "group-hover:text-amber-400",
  tool: "group-hover:text-rose-400",
  design: "group-hover:text-fuchsia-400",
}

const bgColorMap: Record<ProjectType, string> = {
  game: "group-hover:bg-emerald-500/10",
  component: "group-hover:bg-sky-500/10",
  experiment: "group-hover:bg-amber-500/10",
  tool: "group-hover:bg-rose-500/10",
  design: "group-hover:bg-fuchsia-500/10",
}

interface FolderCardProps {
  folder: Folder
}

export function FolderCard({ folder }: FolderCardProps) {
  const Icon = iconMap[folder.icon]
  const hoverColor = colorMap[folder.icon]
  const bgHoverColor = bgColorMap[folder.icon]
  const href = folderRoute(folder.id)

  return (
    <Link
      href={href}
      className={`group block w-full text-left p-6 rounded-lg border border-border bg-card transition-all duration-300 hover:border-muted-foreground/30 ${bgHoverColor}`}
    >
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-lg bg-secondary transition-colors duration-300 ${bgHoverColor}`}>
          <Icon className={`h-6 w-6 text-muted-foreground transition-colors duration-300 ${hoverColor}`} />
        </div>
        <ChevronRight className="h-5 w-5 text-muted-foreground/50 group-hover:text-muted-foreground transition-all duration-300 group-hover:translate-x-1" />
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-medium text-foreground">{folder.name}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{folder.description}</p>
      </div>

      <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-1 rounded bg-secondary">{folder.projects.length} 个项目</span>
      </div>
    </Link>
  )
}
