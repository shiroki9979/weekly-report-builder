import {
  MoonIcon,
  PanelLeftCloseIcon,
  PanelLeftOpenIcon,
  SunIcon,
} from "lucide-react"

import { useTheme } from "@/components/theme-provider"
import { Button } from "@/components/ui/button"
import type { Deck } from "@/lib/deck"

type WorkshopHeaderProps = {
  deck: Deck | null
  editorCollapsed: boolean
  onToggleEditor: () => void
}

const DARK_SCHEME_QUERY = "(prefers-color-scheme: dark)"

// system 主題沒有固定明暗，切換時以目前系統外觀決定翻到哪一邊
function useThemeToggle() {
  const { theme, setTheme } = useTheme()
  const systemIsDark = () => window.matchMedia(DARK_SCHEME_QUERY).matches
  const isDark = theme === "dark" || (theme === "system" && systemIsDark())
  const toggleTheme = () => setTheme(isDark ? "light" : "dark")
  return { isDark, toggleTheme }
}

export function WorkshopHeader({
  deck,
  editorCollapsed,
  onToggleEditor,
}: WorkshopHeaderProps) {
  const { isDark, toggleTheme } = useThemeToggle()
  return (
    <header className="flex shrink-0 items-center gap-3 border-b px-4 py-3">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={
          editorCollapsed ? "Expand editor panel" : "Collapse editor panel"
        }
        aria-pressed={editorCollapsed}
        onClick={onToggleEditor}
      >
        {editorCollapsed ? <PanelLeftOpenIcon /> : <PanelLeftCloseIcon />}
      </Button>
      <h1 className="text-sm font-medium">Weekly Report Builder</h1>
      <span className="text-xs text-muted-foreground">Workshop</span>
      {deck?.period ? (
        <span className="text-xs text-muted-foreground">
          {deck.period.start} – {deck.period.end}
        </span>
      ) : null}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="ml-auto"
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        onClick={toggleTheme}
      >
        {isDark ? <SunIcon /> : <MoonIcon />}
      </Button>
    </header>
  )
}
