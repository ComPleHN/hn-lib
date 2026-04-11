"use client"

import Link from "next/link"
import { Project, getTypeColor, getTypeLabel } from "@/lib/projects-data"
import { ExternalLink } from "lucide-react"

interface ProjectCardProps {
  project: Project
}

const cardClass =
  "group block p-5 rounded-lg border border-border bg-card hover:bg-secondary/50 transition-all duration-300"

export function ProjectCard({ project }: ProjectCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-foreground group-hover:text-accent transition-colors">
              {project.title}
            </h4>
            {project.isExternal && (
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            )}
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
    </>
  )

  if (project.link && project.isExternal) {
    return (
      <a
        href={project.link}
        target="_blank"
        rel="noopener noreferrer"
        className={cardClass}
      >
        {inner}
      </a>
    )
  }

  if (project.link) {
    return (
      <Link href={project.link} className={cardClass}>
        {inner}
      </Link>
    )
  }

  return <div className={cardClass}>{inner}</div>
}
