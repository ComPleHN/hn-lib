import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export function ComponentsShell({
  title,
  children,
  hint,
}: {
  title: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="h-4 w-4" />
            返回想法实验室
          </Link>
          <h1 className="text-lg font-medium">{title}</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
      {hint ? (
        <p className="max-w-3xl mx-auto px-4 pb-8 text-xs text-muted-foreground text-center">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
