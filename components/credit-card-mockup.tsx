"use client"

import { useEffect, useState, useRef } from "react"
import {
  CreditCard,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"

interface CreditCardMockupProps {
  cardNumber?: string
  expiryDate?: string
  cvv?: string
  cardholderName?: string
}

interface BinLookupData {
  bank?: string
  type?: string
  brand?: string
  scheme?: string
}

function useBinLookup(cardNumber?: string) {
  const [binData, setBinData] = useState<BinLookupData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    setBinData(null)
    setError(null)
    if (!cardNumber) return

    const digits = cardNumber.replace(/\D/g, "")
    if (digits.length < 6) return

    const bin = digits.slice(0, 6)

    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const fetchBin = async () => {
      setLoading(true)
      try {
        const url = `https://bin-ip-checker.p.rapidapi.com/?bin=${bin}`

        const res = await fetch(url, {
          method: "GET",
          signal: controller.signal,
          headers: {
            "x-rapidapi-key": "e367ccd301mshf84b571123e23b0p178fafjsn8c72bcc63cbc",
            "x-rapidapi-host": "bin-ip-checker.p.rapidapi.com",
          },
        })

        if (!res.ok) {
          throw new Error(`BIN lookup failed (${res.status})`)
        }

        const result = await res.json()
        const data = result?.data

        setBinData({
          scheme: data?.scheme,
          type: data?.type,
          brand: data?.brand,
          bank: data?.bank?.name,
        })

        setError(null)
      } catch (e: any) {
        if (e.name === "AbortError") return
        console.error(e)
        setError("فشل جلب بيانات BIN")
        setBinData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBin()
    return () => controller.abort()
  }, [cardNumber])

  return { binData, loading, error }
}

export function CreditCardMockup({
  cardNumber,
  expiryDate,
  cvv,
  cardholderName,
}: CreditCardMockupProps) {
  const { binData, loading, error } = useBinLookup(cardNumber)
  const [copied, setCopied] = useState<null | "number" | "cvv" | "expiry" | "name">(null)

  const copyToClipboard = async (text?: string, field?: any) => {
    if (!text) return
    await navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 1500)
  }

  const formatCardNumber = (num?: string) => {
    if (!num) return "•••• •••• •••• ••••"
    return num.replace(/\D/g, "").replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const getCardGradient = () => {
    const brand = (binData?.brand || binData?.scheme || "").toLowerCase()
    if (brand.includes("visa")) return "from-blue-600 to-indigo-700"
    if (brand.includes("master")) return "from-orange-600 to-red-700"
    if (brand.includes("amex")) return "from-teal-600 to-cyan-700"
    return "from-slate-800 to-black"
  }

  const getCardTypeDisplay = () => {
    if (loading) return "جاري الفحص..."
    if (error) return "خطأ"
    if (!binData) return "بطاقة ائتمان"

    const map: Record<string, string> = {
      debit: "مدين",
      credit: "ائتمان",
      prepaid: "مسبقة الدفع",
    }

    return `${binData.scheme?.toUpperCase() || ""} ${
      map[binData.type || ""] || ""
    }`
  }

  return (
    <div className="max-w-[200px]">
      <div className="mb-1 text-[8px] flex justify-between text-slate-400">
        <span>{getCardTypeDisplay()}</span>
        <span>{binData?.bank || "—"}</span>
      </div>

      <div
        className={`relative rounded-lg p-3 aspect-[1.586/1] text-white bg-gradient-to-br ${getCardGradient()}`}
      >
        <div className="flex justify-between mb-2">
          <CreditCard className="w-4 h-4" />
          {loading && <Loader2 className="w-3 h-3 animate-spin" />}
          {binData && !loading && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
          {error && <AlertCircle className="w-3 h-3 text-red-400" />}
        </div>

        <div className="text-[10px] font-mono mb-1" dir="ltr">
          {formatCardNumber(cardNumber)}
        </div>

        <div className="flex justify-between text-[8px]">
          <div>
            <div className="opacity-70 text-[6px]">الاسم</div>
            {cardholderName || "—"}
          </div>

          <div>
            <div className="opacity-70 text-[6px]">انتهاء</div>
            {expiryDate || "••/••"}
          </div>

          <div>
            <div className="opacity-70 text-[6px]">CVV</div>
            {cvv || "•••"}
          </div>
        </div>

        <div className="absolute bottom-1.5 right-1.5 flex gap-1">
          <button onClick={() => copyToClipboard(cardNumber, "number")} className="p-0.5">
            {copied === "number" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>
    </div>
  )
}
