"use client"

import { Copy, Check } from "lucide-react"
import { useState } from "react"

interface CardMockupProps {
  cardNumber?: string
  cardHolderName?: string
  expiryDate?: string
  cvv?: string
  cardType?: string
  bankInfo?: string | { name?: string; country?: string }
}

export function CardMockup({ cardNumber, cardHolderName, expiryDate, cvv, cardType, bankInfo }: CardMockupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  // Don't render if no card data
  if (!cardNumber && !cardHolderName && !expiryDate && !cvv) {
    return null
  }

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatCardNumber = (num?: string) => {
    if (!num) return "•••• •••• •••• ••••"
    return num.replace(/(\d{4})(?=\d)/g, "$1 ")
  }

  const bankName = bankInfo && typeof bankInfo === "object" ? bankInfo.name : bankInfo

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Card Front */}
      <div className="relative aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-black p-6 shadow-2xl">
        {/* Card Type Badge */}
        {cardType && (
          <div className="absolute top-4 right-4 text-white/80 text-xs font-semibold uppercase tracking-wider">
            {cardType}
          </div>
        )}

        {/* Bank Name */}
        {bankName && <div className="text-white/60 text-sm font-medium mb-8">{bankName}</div>}

        {/* Chip */}
        <div className="w-12 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-md mb-6 opacity-80" />

        {/* Card Number */}
        <div className="mb-6 group">
          <div className="flex items-center justify-between">
            <div className="text-white text-lg font-mono tracking-wider" dir="ltr">
              {formatCardNumber(cardNumber)}
            </div>
            {cardNumber && (
              <button
                onClick={() => copyToClipboard(cardNumber, "cardNumber")}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
              >
                {copiedField === "cardNumber" ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4 text-white/60" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Card Holder and Expiry */}
        <div className="flex justify-between items-end">
          {/* Card Holder */}
          <div className="group flex items-center gap-2">
            <div>
              <div className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Card Holder</div>
              <div className="text-white text-sm font-medium uppercase" dir="ltr">
                {cardHolderName || "NAME SURNAME"}
              </div>
            </div>
            {cardHolderName && (
              <button
                onClick={() => copyToClipboard(cardHolderName, "cardHolder")}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded self-end mb-0.5"
              >
                {copiedField === "cardHolder" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/60" />
                )}
              </button>
            )}
          </div>

          {/* Expiry */}
          <div className="group flex items-center gap-2">
            <div className="text-right">
              <div className="text-white/50 text-[10px] uppercase tracking-wide mb-1">Expires</div>
              <div className="text-white text-sm font-mono" dir="ltr">
                {expiryDate || "MM/YY"}
              </div>
            </div>
            {expiryDate && (
              <button
                onClick={() => copyToClipboard(expiryDate, "expiry")}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded self-end mb-0.5"
              >
                {copiedField === "expiry" ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3 text-white/60" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Decorative Pattern */}
        <div className="absolute inset-0 opacity-5 pointer-events-none">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-white rounded-full blur-3xl" />
        </div>
      </div>

      {/* CVV on separate card back visual */}
      {cvv && (
        <div className="mt-4 relative aspect-[1.586/1] rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 shadow-xl overflow-hidden">
          {/* Magnetic Strip */}
          <div className="w-full h-12 bg-black/60 mt-6" />

          {/* CVV Section */}
          <div className="p-6 mt-4">
            <div className="bg-white rounded px-4 py-2 flex items-center justify-between group">
              <div>
                <div className="text-slate-500 text-[10px] uppercase tracking-wide mb-0.5">CVV</div>
                <div className="text-slate-900 text-lg font-mono tracking-widest" dir="ltr">
                  {cvv}
                </div>
              </div>
              <button
                onClick={() => copyToClipboard(cvv, "cvv")}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-slate-100 rounded"
              >
                {copiedField === "cvv" ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-slate-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
