import { Loader2 } from "lucide-react"

export function RouteLoading() {
  return (
    <div
      className="flex min-h-[min(60vh,28rem)] w-full flex-col items-center justify-center gap-4 bg-background px-6 py-16"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 className="h-10 w-10 animate-spin text-accent" strokeWidth={2} />
      <p className="text-sm text-muted-foreground">页面加载中…</p>
    </div>
  )
}
