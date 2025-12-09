"use client"

import { useEffect, useState } from "react"
import { CreditCard } from "lucide-react"

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

  useEffect(() => {
    if (!cardNumber || cardNumber.length < 6) {
      setBinData(null)
      return
    }

    const bin = cardNumber.replace(/\s/g, "").substring(0, 8)

    const fetchBinData = async () => {
      setLoading(true)
      try {
        // Using binlist.net API (free, no auth required)
        const response = await fetch(`https://binlist.net/json/${bin}`)

        if (response.ok) {
          const data = await response.json()
          setBinData({
            bank: data.bank?.name || data.bank?.city,
            type: data.type,
            brand: data.brand,
            scheme: data.scheme,
          })
        } else {
          setBinData(null)
        }
      } catch (error) {
        console.error("BIN lookup failed:", error)
        setBinData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchBinData()
  }, [cardNumber])

  return { binData, loading }
}

export function CreditCardMockup({ cardNumber, expiryDate, cvv, cardholderName }: CreditCardMockupProps) {
  const { binData, loading } = useBinLookup(cardNumber)

  const formatCardNumber = (num?: string) => {
    if (!num) return "•••• •••• •••• ••••"
    return num.replace(/(\d{4})/g, "$1 ").trim()
  }

  const getCardGradient = () => {
    const brand = binData?.brand?.toLowerCase() || binData?.scheme?.toLowerCase()

    switch (brand) {
      case "visa":
        return "from-blue-600 via-blue-500 to-blue-700"
      case "mastercard":
        return "from-orange-600 via-red-500 to-red-700"
      case "amex":
      case "american express":
        return "from-teal-600 via-teal-500 to-cyan-600"
      case "discover":
        return "from-orange-500 via-orange-600 to-yellow-600"
      default:
        return "from-primary via-chart-5 to-chart-4 text-white"
    }
  }

  const getCardTypeDisplay = () => {
    if (loading) return "جاري التحميل..."
    if (!binData) return "بطاقة ائتمان"

    const parts = []
    if (binData.brand) parts.push(binData.brand.toUpperCase())
    if (binData.type) {
      const typeMap: Record<string, string> = {
        debit: "مدين",
        credit: "ائتمان",
        prepaid: "مسبقة الدفع",
      }
      parts.push(typeMap[binData.type.toLowerCase()] || binData.type)
    }

    return parts.length > 0 ? parts.join(" - ") : "بطاقة ائتمان"
  }

  return (
    <div
      className={`w-full aspect-[1.586/1] bg-gradient-to-br ${getCardGradient()} rounded-xl p-4 text-primary-foreground shadow-xl relative overflow-hidden`}
    >
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 bg-white rounded-full blur-2xl" />
      </div>

      <div className="flex flex-col h-full justify-between relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 bg-warning/20 rounded-full flex items-center justify-center">
              <CreditCard className="w-3 h-3" />
            </div>
            {binData?.bank && (
              <div className="text-[8px] font-medium bg-white/20 px-1.5 py-0.5 rounded backdrop-blur-sm">
                {binData.bank}
              </div>
            )}
          </div>
          <span className="text-[8px] font-medium">{getCardTypeDisplay()}</span>
        </div>

        <div className="space-y-1.5">
          <div>
            <p className="text-[8px] opacity-70">رقم البطاقة</p>
            <p className="text-[11px] font-mono tracking-wider" dir="ltr">
              {formatCardNumber(cardNumber)}
            </p>
          </div>
          <div className="flex justify-between items-end">
            <div>
              <p className="text-[7px] opacity-70">الاسم</p>
              <p className="text-[9px] font-medium truncate max-w-[80px]">{cardholderName || "—"}</p>
            </div>
            <div className="text-left">
              <p className="text-[7px] opacity-70">انتهاء</p>
              <p className="text-[9px] font-mono" dir="ltr">
                {expiryDate || "••/••"}
              </p>
            </div>
            <div className="text-left">
              <p className="text-[7px] opacity-70">CVV</p>
              <p className="text-[9px] font-mono" dir="ltr">
                {cvv || "•••"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
