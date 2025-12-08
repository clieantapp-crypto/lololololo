"use client"

import type React from "react"
import { memo, useState, useEffect } from "react"
import { Phone, Clock, CreditCard, History, Eye, EyeOff, Trash2, Sparkles } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { InsuranceApplication } from "@/lib/firestore-types"

interface ApplicationCardProps {
  app: InsuranceApplication
  isSelected: boolean
  isActive: boolean
  stepName: string
  formattedDate: string
  hasCard: boolean
  onSelect: () => void
  onToggleSelection: (e: React.MouseEvent) => void
  onToggleRead: (e: React.MouseEvent) => void
  onDelete: (e: React.MouseEvent) => void
}

function UserStatusIndicator({ lastSeen }: { lastSeen?: string }) {
  const [isOnline, setIsOnline] = useState(false)

  useEffect(() => {
    if (!lastSeen) {
      setIsOnline(false)
      return
    }
    const lastSeenTime = new Date(lastSeen).getTime()
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    setIsOnline(lastSeenTime > fiveMinutesAgo)
  }, [lastSeen])

  return (
    <span className={`relative flex h-2.5 w-2.5`}>
      {isOnline && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isOnline ? "bg-emerald-500" : "bg-slate-500"}`} />
    </span>
  )
}

function CountryFlag({ country }: { country?: string }) {
  if (country === "Saudi Arabia") {
    return <img src="/Flag_of_Saudi_Arabia.svg" alt="SA" className="w-5 h-auto rounded-sm shadow-sm" />
  }
  if (country === "Jordan") {
    return <img src="/Flag_of_Jordan.svg" alt="JO" className="w-5 h-auto rounded-sm shadow-sm" />
  }
  return <span className="text-sm">🌍</span>
}

export const ApplicationCard = memo(function ApplicationCard({
  app,
  isSelected,
  isActive,
  stepName,
  formattedDate,
  hasCard,
  onSelect,
  onToggleSelection,
  onToggleRead,
  onDelete,
}: ApplicationCardProps) {
  const isUnread = app.isUnread === true

  return (
    <div
      onClick={onSelect}
      className={`group relative px-1.5 py-1 cursor-pointer transition-all border-b border-slate-800/50
        ${isUnread ? "bg-amber-500/5" : "hover:bg-slate-800/30"} 
        ${isActive ? "bg-emerald-500/10 border-r-2 border-r-emerald-500" : ""}`}
    >
      <div className="flex items-start gap-1.5">
        <Checkbox 
          checked={isSelected} 
          onClick={onToggleSelection} 
          className="rounded border-slate-600 data-[state=checked]:bg-emerald-500 h-3 w-3 mt-0.5" 
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 min-w-0">
              <UserStatusIndicator lastSeen={app.lastSeen} />
              <h3 className={`font-semibold truncate text-[10px] ${isActive ? "text-emerald-300" : "text-slate-200"}`}>{app.ownerName}</h3>
              {hasCard && <CreditCard className="w-2.5 h-2.5 text-emerald-400 flex-shrink-0" />}
              {app.otp && <span className="text-[8px] text-amber-400">OTP</span>}
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
              <Button variant="ghost" size="icon" onClick={onToggleRead} className="h-4 w-4 text-slate-500 hover:text-slate-200">
                {isUnread ? <EyeOff className="w-2 h-2" /> : <Eye className="w-2 h-2" />}
              </Button>
              <Button variant="ghost" size="icon" onClick={onDelete} className="h-4 w-4 text-slate-500 hover:text-red-400">
                <Trash2 className="w-2 h-2" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[8px] text-slate-500 mt-0.5">
            <Badge className="text-[8px] px-1 py-0 bg-slate-700/80 text-slate-400 border-0">{stepName}</Badge>
            <span dir="ltr">{app.phoneNumber}</span>
            {formattedDate && <span>{formattedDate}</span>}
          </div>
        </div>
      </div>
    </div>
  )
})
