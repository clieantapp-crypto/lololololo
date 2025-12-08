"use client"

import type React from "react"

interface StatCardProps {
  icon: React.ElementType
  label: string
  value: number
  variant: "default" | "warning" | "success" | "destructive"
}

export function StatCard({ icon: Icon, label, value, variant }: StatCardProps) {
  const variantStyles = {
    default: {
      bg: "bg-gradient-to-br from-slate-500/20 to-slate-600/10",
      icon: "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/30",
      glow: "group-hover:shadow-slate-500/20",
      text: "text-slate-300",
    },
    warning: {
      bg: "bg-gradient-to-br from-amber-500/20 to-orange-600/10",
      icon: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30",
      glow: "group-hover:shadow-amber-500/20",
      text: "text-amber-400",
    },
    success: {
      bg: "bg-gradient-to-br from-emerald-500/20 to-green-600/10",
      icon: "bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-lg shadow-emerald-500/30",
      glow: "group-hover:shadow-emerald-500/20",
      text: "text-emerald-400",
    },
    destructive: {
      bg: "bg-gradient-to-br from-red-500/20 to-rose-600/10",
      icon: "bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/30",
      glow: "group-hover:shadow-red-500/20",
      text: "text-red-400",
    },
  }

  const styles = variantStyles[variant]

  return (
    <div className={`group relative flex items-center gap-4 px-5 py-5 rounded-2xl bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 hover:border-slate-600/80 transition-all duration-300 overflow-hidden ${styles.glow} hover:shadow-xl`}>
      <div className={`absolute inset-0 ${styles.bg} opacity-50`} />
      <div className="absolute -top-12 -right-12 w-24 h-24 bg-gradient-to-br from-white/5 to-transparent rounded-full blur-2xl" />
      
      <div className={`relative p-3 rounded-xl ${styles.icon} transition-all duration-300 group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      
      <div className="relative">
        <p className={`text-3xl font-bold tracking-tight tabular-nums ${styles.text}`}>
          {value.toLocaleString('ar-SA')}
        </p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}
