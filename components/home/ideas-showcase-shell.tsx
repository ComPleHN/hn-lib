import { Sparkles } from "lucide-react"

export function IdeasShowcaseShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
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

      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>

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
