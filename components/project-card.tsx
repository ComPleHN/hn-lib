"use client"

import Link from "next/link"
import { Project, getTypeColor, getTypeLabel } from "@/lib/projects-data"
import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProjectCardProps {
  project: Project
}

const cardBase =
  "group relative block overflow-hidden p-5 rounded-lg border border-border bg-card transition-all duration-300"

const cardInteractive =
  "hover:bg-secondary/50 hover:border-muted-foreground/25 cursor-pointer"

const cardLocked = "cursor-default hover:bg-card"

function ProjectCardInner({ project }: { project: Project }) {
  return (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4
              className={cn(
                "font-medium transition-colors",
                project.link
                  ? "text-foreground group-hover:text-accent"
                  : "text-foreground"
              )}
            >
              {project.title}
            </h4>
            {project.isExternal && project.link ? (
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
            {project.description}
          </p>
        </div>
        <span className="text-xs text-muted-foreground/60 ml-4 shrink-0">
          {project.year}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(project.type)}`}>
          {getTypeLabel(project.type)}
        </span>
        {project.tags.map((tag) => (
          <span
            key={tag}
            className="text-xs px-2 py-1 rounded bg-secondary text-muted-foreground"
          >
            {tag}
          </span>
        ))}
      </div>

      {!project.link ? (
        <div
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80 opacity-0 backdrop-blur-[2px] transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden
        >
          <span className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-sm">
            未完成
          </span>
        </div>
      ) : null}
    </>
  )
}

export function ProjectCard({ project }: ProjectCardProps) {
  if (project.link && project.isExternal) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(cardBase, cardInteractive)}
      >
        <ProjectCardInner project={project} />
      </a>
    )
  }

  if (project.link) {
    return (
      <Link href={project.link} className={cn(cardBase, cardInteractive)}>
        <ProjectCardInner project={project} />
      </Link>
    )
  }

  return (
    <div className={cn(cardBase, cardLocked)} role="article">
      <ProjectCardInner project={project} />
    </div>
  )
}
