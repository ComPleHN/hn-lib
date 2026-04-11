import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ProjectCard } from "@/components/project-card"
import { Breadcrumb } from "@/components/breadcrumb"
import { IdeasShowcaseShell } from "@/components/home/ideas-showcase-shell"
import { getFolderById } from "@/lib/folders-meta"

export default async function FolderPage({
  params,
}: {
  params: Promise<{ folderId: string }>
}) {
  const { folderId } = await params
  const folder = getFolderById(folderId)
  if (!folder) notFound()

  return (
    <IdeasShowcaseShell>
      <div className="mb-8">
        <Breadcrumb segments={[{ label: folder.name }]} />
      </div>

      <div className="space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回所有文件夹
        </Link>

        <div>
          <h2 className="text-2xl font-medium text-foreground">{folder.name}</h2>
          <p className="mt-1 text-muted-foreground">{folder.description}</p>
        </div>

        <div className="space-y-3">
          {folder.projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>

        {folder.projects.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            这个文件夹暂时没有项目
          </div>
        ) : null}
      </div>
    </IdeasShowcaseShell>
  )
}
