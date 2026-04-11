"use client"

import { useState } from "react"
import { folders, Folder } from "@/lib/projects-data"
import { FolderCard } from "../folder-card"
import { ProjectCard } from "../project-card"
import { Breadcrumb } from "../breadcrumb"
import { ArrowLeft, Sparkles } from "lucide-react"

export function IdeasShowcase() {
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)

  const handleBack = () => {
    setSelectedFolder(null)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/20">
              <Sparkles className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h1 className="text-xl font-medium text-foreground">想法实验室</h1>
              <p className="text-sm text-muted-foreground">探索创意，记录灵感</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <div className="mb-8">
          {selectedFolder ? (
            <Breadcrumb
              items={[
                { label: "首页", onClick: handleBack },
                { label: selectedFolder.name },
              ]}
            />
          ) : (
            <p className="text-muted-foreground">
              在这里你可以浏览我的各种项目和想法，就像翻阅文件夹一样。
            </p>
          )}
        </div>

        {/* Folder View */}
        {!selectedFolder && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium text-foreground">所有文件夹</h2>
              <span className="text-sm text-muted-foreground">
                {folders.length} 个分类
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {folders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  onClick={() => setSelectedFolder(folder)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Project List View */}
        {selectedFolder && (
          <div className="space-y-6">
            <button
              onClick={handleBack}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              返回所有文件夹
            </button>

            <div>
              <h2 className="text-2xl font-medium text-foreground">
                {selectedFolder.name}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {selectedFolder.description}
              </p>
            </div>

            <div className="space-y-3">
              {selectedFolder.projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>

            {selectedFolder.projects.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                这个文件夹暂时没有项目
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-auto">
        <div className="max-w-5xl mx-auto px-6 py-6">
          <p className="text-sm text-muted-foreground text-center">
            持续更新中 · 欢迎探索
          </p>
        </div>
      </footer>
    </div>
  )
}
