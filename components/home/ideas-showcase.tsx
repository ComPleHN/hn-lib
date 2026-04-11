import { folders } from "@/lib/projects-data"
import { FolderCard } from "../folder-card"
import { IdeasShowcaseShell } from "./ideas-showcase-shell"

export function IdeasShowcase() {
  return (
    <IdeasShowcaseShell>
      <div className="mb-8">
        <p className="text-muted-foreground">
          在这里你可以浏览我的各种项目和想法，就像翻阅文件夹一样。
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium text-foreground">所有文件夹</h2>
          <span className="text-sm text-muted-foreground">
            {folders.length} 个分类
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {folders.map((folder) => (
            <FolderCard key={folder.id} folder={folder} />
          ))}
        </div>
      </div>
    </IdeasShowcaseShell>
  )
}
