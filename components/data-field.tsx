"use client"

import type React from "react"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DataFieldProps {
  label: string
  value?: string | number
  mono?: boolean
  copyable?: boolean
  size?: "sm" | "md" | "lg"
  variant?: "default" | "highlight" | "success" | "warning"
}

export function DataField({ 
  label, 
  value, 
  mono = false, 
  copyable = false, 
  size = "md",
  variant = "default"
}: DataFieldProps) {
  const [copied, setCopied] = useState(false)

  if (!value) return null

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(String(value))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sizeClasses = {
    sm: "p-1",
    md: "p-1.5",
    lg: "p-2",
  }

  const textSizeClasses = {
    sm: "text-[10px]",
    md: "text-[11px]",
    lg: "text-xs",
  }

  const variantStyles = {
    default: "bg-slate-800/50 border-slate-700/50 hover:border-slate-600",
    highlight: "bg-gradient-to-br from-slate-800/80 to-slate-700/50 border-slate-600/50 hover:border-slate-500",
    success: "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/30 hover:border-emerald-500/50",
    warning: "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border-amber-500/30 hover:border-amber-500/50",
  }

  const textVariantStyles = {
    default: "text-slate-200",
    highlight: "text-white",
    success: "text-emerald-300",
    warning: "text-amber-300",
  }

  return (
    <div
      className={`group ${sizeClasses[size]} ${variantStyles[variant]} rounded-xl border backdrop-blur-sm transition-all duration-200`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{label}</p>
        {copyable && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-slate-700"
            onClick={handleCopy}
          >
            {copied ? (
              <Check className="w-3 h-3 text-emerald-400" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400" />
            )}
          </Button>
        )}
      </div>
      <p
        className={`${textSizeClasses[size]} font-semibold ${textVariantStyles[variant]} ${mono ? "font-mono tracking-wider" : ""}`}
        dir={mono ? "ltr" : "rtl"}
      >
        {value}
      </p>
    </div>
  )
}
