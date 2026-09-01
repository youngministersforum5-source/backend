export type Gender = "male" | "female";
export type MemberStatus = "pending" | "approved" | "rejected";

export interface Admin {
  id: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminOTP {
  id: string;
  adminId: string;
  otpHash: string;
  expiresAt: Date;
  attempts: number;
  used: boolean;
  createdAt: Date;
}

export interface AdminSession {
  id: string;
  adminId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Subscriber {
  id: string;
  email: string;
  isActive: boolean;
  subscribedAt: Date;
}

export interface MemberGifts {
  writing: boolean;
  media: boolean;
  intercession: boolean;
  onGround: boolean;
}

export interface Member {
  id: string;
  fullName: string;
  whatsapp: string;
  email: string;
  location: string;
  gender: Gender;
  soundDoctrine: boolean;
  activeFellowship: boolean;
  intent: string;
  gifts: MemberGifts;
  giftOther: string | null;
  status: MemberStatus;
  createdAt: Date;
  updatedAt: Date;
}
