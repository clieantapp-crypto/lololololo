import { CreditCard, Ship as Chip } from "lucide-react";

interface CreditCardMockupProps {
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  cardholderName?: string;
}

export function CreditCardMockup({
  cardNumber,
  expiryDate,
  cvv,
  cardholderName,
}: CreditCardMockupProps) {
  const formatCardNumber = (number = "") => {
    return number.replace(/(\d{4})/g, "$1 ").trim();
  };

  return (
    <div className="max-w-[400px]">
      {/* Front of Card */}
      <div className="relative aspect-[1.586/1] h-52 rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 p-6 shadow-2xl mb-4 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-32 translate-x-32"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-24 -translate-x-24"></div>
        </div>

        {/* Card Content */}
        <div className="relative h-full flex flex-col justify-between">
          {/* Top Section */}
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-2">
              <div className="w-12 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                <Chip className="w-6 h-6 text-amber-900" />
              </div>
            </div>
            <div className="text-white font-bold text-xl tracking-wider">
              BANK
            </div>
          </div>

          {/* Card Number */}
          <div>
            <div
              className="text-white font-mono text-xl tracking-[0.2em] mb-4"
              dir="ltr"
            >
              {cardNumber
                ? formatCardNumber(cardNumber)
                : "**** **** **** ****"}
            </div>
          </div>

          {/* Bottom Section */}
          <div className="flex justify-between items-end">
            <div>
              <div className="text-gray-400 text-xs mb-1 font-mono">CVV</div>
              <div
                className="text-white font-semibold text-sm tracking-wide"
                dir="ltr"
              >
                {cvv || "cvv"}
              </div>
            </div>

            <div>
              <div className="text-gray-400 text-xs mb-1 font-mono">
                صالحة حتى
              </div>
              <div
                className="text-white font-mono text-sm tracking-wider"
                dir="ltr"
              >
                {expiryDate || "MM/YY"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
