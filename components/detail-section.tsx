"use client"

import type React from "react"

interface DetailSectionProps {
  icon: React.ElementType
  title: string
  badge?: React.ReactNode
  children: React.ReactNode
  delay?: number
  variant?: "default" | "success" | "warning" | "info"
}

export function DetailSection({ icon: Icon, title, badge, children, delay = 0, variant = "default" }: DetailSectionProps) {
  const variantStyles = {
    default: {
      border: "border-slate-700/50 hover:border-slate-600/80",
      iconBg: "bg-gradient-to-br from-slate-600 to-slate-700",
      glow: "",
    },
    success: {
      border: "border-emerald-500/20 hover:border-emerald-500/40",
      iconBg: "bg-gradient-to-br from-emerald-500 to-green-600",
      glow: "shadow-emerald-500/5",
    },
    warning: {
      border: "border-amber-500/20 hover:border-amber-500/40",
      iconBg: "bg-gradient-to-br from-amber-500 to-orange-600",
      glow: "shadow-amber-500/5",
    },
    info: {
      border: "border-blue-500/20 hover:border-blue-500/40",
      iconBg: "bg-gradient-to-br from-blue-500 to-indigo-600",
      glow: "shadow-blue-500/5",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div
      className={`relative bg-slate-900/70 backdrop-blur-sm rounded-lg border ${styles.border} p-2 transition-all hover:shadow-lg ${styles.glow} overflow-hidden`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <div className={`p-1 rounded ${styles.iconBg}`}>
            <Icon className="w-2.5 h-2.5 text-white" />
          </div>
          <h3 className="font-bold text-[10px] text-slate-200">{title}</h3>
        </div>
        {badge}
      </div>
      <div className="relative">{children}</div>
    </div>
  )
}
