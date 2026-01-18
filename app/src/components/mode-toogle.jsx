"use client"

import React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark")
  }

  
  const isDark = theme === "dark"
  const icon = isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />
  const label = isDark ? "Light Mode" : "Dark Mode"

  return (
    <div
      role="menuitem"
      tabIndex={0}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          toggleTheme()
        }
      }}
      className="flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer select-none text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    >
      {icon}
      <span>{label}</span>
    </div>
  )
}
