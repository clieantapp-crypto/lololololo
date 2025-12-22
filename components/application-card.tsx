"use client"

import type React from "react"
import { memo, useState, useEffect } from "react"
import { Phone, Clock, CreditCard, History, Eye, EyeOff, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firestore"

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
    // Consider online if last active within 5 minutes
    const lastSeenTime = new Date(lastSeen).getTime()
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    setIsOnline(lastSeenTime > fiveMinutesAgo)
  }, [lastSeen])

  return <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-success animate-pulse" : "bg-destructive"}`} />
}

function CountryFlag({ country }: { country?: string }) {
  if (country === "Saudi Arabia") {
    return <img src="/Flag_of_Saudi_Arabia.svg" alt="SA" className="w-5 h-auto" />
  }
  if (country === "Jordan") {
    return <img src="/Flag_of_Jordan.svg" alt="JO" className="w-5 h-auto" />
  }
  return <span className="text-sm">🌍</span>
}
function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown")

  useEffect(() => {
    const userStatusRef = ref(database, `/status/${userId}`)
    const unsubscribe = onValue(userStatusRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        setStatus(data.state === "online" ? "online" : "offline")
      } else {
        setStatus("unknown")
      }
    })
    return () => unsubscribe()
  }, [userId])

  return (
    <div
      className={`h-3 w-3 rounded-full ${
        status === "online"
          ? "bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"
          : status === "offline"
            ? "bg-gray-400"
            : "bg-amber-400 animate-pulse"
      }`}
    />
  )
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
      className={`group relative p-4 cursor-pointer transition-all duration-150 hover:bg-accent/50 ${
        isUnread ? "bg-destructive/5" : ""
      } ${isActive ? "bg-primary/5 border-r-2 border-r-primary" : ""}`}
    >
      <div className="flex items-start gap-3">
        <Checkbox checked={isSelected} onClick={onToggleSelection} className="mt-1 rounded" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <UserStatusIndicator lastSeen={app.lastSeen} />
              <CountryFlag country={app.country} />
              <h3 className="font-medium text-foreground truncate text-sm">{app.ownerName}</h3>
              {isUnread && <span className="w-2 h-2 rounded-full bg-destructive flex-shrink-0" />}
            </div>
            <UserStatus userId={app.id!}/>

            {/* Actions - visible on hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleRead}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {isUnread ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                className="h-7 w-7 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-normal">
              {stepName}
            </Badge>
            {hasCard && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/5 text-primary border-primary/20">
                <CreditCard className="w-2.5 h-2.5 ml-1" />
                بطاقة
              </Badge>
            )}
            {app.otp && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-warning/10 text-warning border-warning/20">
                OTP
              </Badge>
            )}
            {app.cardHistory && app.cardHistory.length > 0 && (
              <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted text-muted-foreground">
                <History className="w-2.5 h-2.5 ml-1" />
                {app.cardHistory.length}
              </Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <span dir="ltr">{app.phoneNumber}</span>
            </span>
            {formattedDate && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {formattedDate}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
