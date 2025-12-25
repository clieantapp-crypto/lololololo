"use client"

import { Copy, Check, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { useState, useEffect } from "react"
import { checkBIN } from "@/lib/bin-checker"

interface CardMockupProps {
  cardNumber?: string
  cardHolderName?: string
  expiryDate?: string
  cvv?: string
  cardType?: string
  bankInfo?: string | { name?: string; country?: string }
}

export function CardMockup({
  cardNumber,
  cardHolderName,
  expiryDate,
  cvv,
  cardType,
  bankInfo,
}: CardMockupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [binData, setBinData] = useState<any>(null)
  const [isCheckingBin, setIsCheckingBin] = useState(false)
  const [binError, setBinError] = useState<string | null>(null)

  useEffect(() => {
    if (cardNumber && cardNumber.replace(/\s/g, "").length >= 6) {
      setIsCheckingBin(true)
      setBinError(null)

      checkBIN(cardNumber).then((result) => {
        setIsCheckingBin(false)
        if (result.success && result.data) setBinData(result.data)
        else setBinError(result.error || "BIN check failed")
      })
    } else {
      setBinData(null)
      setBinError(null)
    }
  }, [cardNumber])

  if (!cardNumber && !cardHolderName && !expiryDate && !cvv) return null

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const formatCardNumber = (num?: string) =>
    num ? num.replace(/(\d{4})(?=\d)/g, "$1 ") : "•••• •••• •••• ••••"

  const bankName = bankInfo && typeof bankInfo === "object" ? bankInfo.name : bankInfo

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      {/* BIN INFO */}
      {cardNumber && (
        <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-3 text-xs shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300">BIN Verification</span>
            {isCheckingBin && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
            {!isCheckingBin && binData && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {!isCheckingBin && binError && <AlertCircle className="w-4 h-4 text-red-400" />}
          </div>

          {binError && <p className="text-red-400">{binError}</p>}

          {binData && (
            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              {binData.BIN?.brand && <p>Brand: <b>{binData.BIN.brand}</b></p>}
              {binData.BIN?.scheme && <p>Scheme: <b>{binData.BIN.scheme}</b></p>}
              {binData.type && <p>Type: <b>{binData.type}</b></p>}
              {binData.level && <p>Level: <b>{binData.level}</b></p>}
              {binData.bank?.name && (
                <p className="col-span-2">Bank: <b>{binData.bank.name}</b></p>
              )}
              {binData.country?.name && (
                <p className="col-span-2">
                  Country: <b>{binData.country.name} ({binData.country.A2})</b>
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* CARD FRONT */}
      <div className="relative aspect-[1.586/1] rounded-3xl p-6 overflow-hidden
        bg-gradient-to-br from-indigo-600 via-purple-700 to-slate-900
        shadow-[0_25px_60px_-15px_rgba(99,102,241,0.6)]
        transition-transform duration-300 hover:scale-[1.02]">

        {/* Glow */}
        <div className="absolute inset-0 bg-white/10 blur-2xl opacity-30" />

        {/* Brand */}
        {(binData?.BIN?.brand || cardType) && (
          <div className="absolute top-5 right-6 text-white/80 text-xs font-semibold tracking-widest uppercase">
            {binData?.BIN?.brand || cardType}
          </div>
        )}

        {/* Bank */}
        {(binData?.bank?.name || bankName) && (
          <div className="text-white/60 text-sm font-medium mb-8">
            {binData?.bank?.name || bankName}
          </div>
        )}

        {/* Chip */}
        <div className="w-14 h-10 rounded-lg bg-gradient-to-br from-yellow-300 via-amber-400 to-orange-500 shadow-md mb-6" />

        {/* Number */}
        <div className="flex justify-between items-center mb-6 group">
          <div className="text-white text-xl font-mono tracking-widest" dir="ltr">
            {formatCardNumber(cardNumber)}
          </div>
          {cardNumber && (
            <button
              onClick={() => copyToClipboard(cardNumber, "number")}
              className="opacity-0 group-hover:opacity-100 transition p-1 rounded hover:bg-white/10"
            >
              {copiedField === "number" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4 text-white/60" />
              )}
            </button>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-white/50 text-[10px] uppercase">Card Holder</p>
            <p className="text-white font-medium uppercase">
              {cardHolderName || "NAME SURNAME"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase">Expires</p>
            <p className="text-white font-mono">{expiryDate || "MM/YY"}</p>
          </div>
        </div>
      </div>

      {/* CARD BACK / CVV */}
      {cvv && (
        <div className="aspect-[1.586/1] rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 shadow-xl overflow-hidden">
          <div className="h-12 bg-black/70 mt-6" />
          <div className="p-6">
            <div className="bg-white rounded-lg px-4 py-2 flex justify-between items-center group">
              <div>
                <p className="text-[10px] text-slate-500 uppercase">CVV</p>
                <p className="font-mono text-lg tracking-widest">{cvv}</p>
              </div>
              <button
                onClick={() => copyToClipboard(cvv, "cvv")}
                className="opacity-0 group-hover:opacity-100 transition"
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
