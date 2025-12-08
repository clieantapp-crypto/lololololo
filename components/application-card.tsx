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
      className={`group relative px-2 py-2 cursor-pointer transition-all duration-200 border-b border-slate-800/50
        ${isUnread ? "bg-gradient-to-l from-amber-500/10 to-transparent" : "hover:bg-slate-800/30"} 
        ${isActive ? "bg-gradient-to-l from-emerald-500/15 to-slate-800/50 border-r-2 border-r-emerald-500" : ""}`}
    >
      {isUnread && (
        <div className="absolute top-2 left-2">
          <Sparkles className="w-2.5 h-2.5 text-amber-400 animate-pulse" />
        </div>
      )}
      
      <div className="flex items-start gap-2">
        <div className="mt-0.5">
          <Checkbox 
            checked={isSelected} 
            onClick={onToggleSelection} 
            className="rounded border-slate-600 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 h-3.5 w-3.5" 
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <UserStatusIndicator lastSeen={app.lastSeen} />
              <CountryFlag country={app.country} />
              <h3 className={`font-semibold truncate text-xs ${isActive ? "text-emerald-300" : "text-slate-200"}`}>
                {app.ownerName}
              </h3>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleRead}
                className="h-5 w-5 text-slate-500 hover:text-slate-200 hover:bg-slate-700/50"
              >
                {isUnread ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-5 w-5 text-slate-500 hover:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-2.5 h-2.5" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            <Badge className="text-[9px] px-1.5 py-0 font-medium bg-slate-700/80 text-slate-300 border-0">
              {stepName}
            </Badge>
            {hasCard && (
              <Badge className="text-[9px] px-1.5 py-0 font-medium bg-emerald-500/20 text-emerald-400 border-0">
                <CreditCard className="w-2 h-2 ml-0.5" />
                بطاقة
              </Badge>
            )}
            {app.otp && (
              <Badge className="text-[9px] px-1.5 py-0 font-medium bg-amber-500/20 text-amber-400 border-0">
                OTP
              </Badge>
            )}
            {app.cardHistory && app.cardHistory.length > 0 && (
              <Badge className="text-[9px] px-1.5 py-0 font-medium bg-slate-700/50 text-slate-400 border-0">
                <History className="w-2 h-2 ml-0.5" />
                {app.cardHistory.length}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2 text-[9px] text-slate-500">
            <span className="flex items-center gap-1">
              <Phone className="w-2.5 h-2.5" />
              <span dir="ltr">{app.phoneNumber}</span>
            </span>
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
