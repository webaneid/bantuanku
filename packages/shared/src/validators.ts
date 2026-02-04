import { z } from "zod";

export const emailSchema = z.string().email("Email tidak valid");

export const passwordSchema = z
  .string()
  .min(8, "Password minimal 8 karakter")
  .max(100, "Password maksimal 100 karakter");

export const phoneSchema = z
  .string()
  .regex(/^(\+62|62|0)8[1-9][0-9]{6,10}$/, "Nomor telepon tidak valid")
  .optional();

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(2, "Nama minimal 2 karakter").max(100),
  phone: phoneSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password wajib diisi"),
});

export const donationSchema = z.object({
  campaignId: z.string().min(1, "Campaign wajib dipilih"),
  amount: z.number().min(10000, "Donasi minimal Rp 10.000"),
  donorName: z.string().min(2, "Nama minimal 2 karakter"),
  donorEmail: emailSchema.optional(),
  donorPhone: phoneSchema,
  isAnonymous: z.boolean().default(false),
  message: z.string().max(500).optional(),
});

export const campaignSchema = z.object({
  title: z.string().min(5, "Judul minimal 5 karakter").max(200),
  description: z.string().min(20, "Deskripsi minimal 20 karakter"),
  content: z.string().optional(),
  imageUrl: z.string().url("URL gambar tidak valid"),
  images: z.array(z.string().url()).optional(),
  videoUrl: z.string().url().optional(),
  goal: z.number().min(100000, "Target minimal Rp 100.000"),
  category: z.string().min(1),
  categoryId: z.string().optional(),
  pillar: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isFeatured: z.boolean().optional(),
  isUrgent: z.boolean().optional(),
});

export const manualDonationSchema = donationSchema.extend({
  note: z.string().optional(),
});

export const zakatIncomeSchema = z.object({
  monthlyIncome: z.number().min(0, "Penghasilan tidak boleh negatif"),
  otherIncome: z.number().min(0).default(0),
  monthlyExpenses: z.number().min(0).default(0),
});

export const zakatMaalSchema = z.object({
  savings: z.number().min(0, "Tabungan tidak boleh negatif"),
  deposits: z.number().min(0).default(0),
  stocks: z.number().min(0).default(0),
  otherAssets: z.number().min(0).default(0),
  debts: z.number().min(0).default(0),
});

export const zakatGoldSchema = z.object({
  goldWeight: z.number().min(0, "Berat emas tidak boleh negatif"),
  goldPrice: z.number().min(0),
});

export const zakatFitrahSchema = z.object({
  numberOfPeople: z.number().min(1, "Minimal 1 jiwa"),
  pricePerPerson: z.number().min(0),
});

export const fidyahSchema = z.object({
  numberOfDays: z.number().min(1, "Minimal 1 hari"),
  pricePerDay: z.number().min(0),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type DonationInput = z.infer<typeof donationSchema>;
export type CampaignInput = z.infer<typeof campaignSchema>;
export type ManualDonationInput = z.infer<typeof manualDonationSchema>;
export type ZakatIncomeInput = z.infer<typeof zakatIncomeSchema>;
export type ZakatMaalInput = z.infer<typeof zakatMaalSchema>;
export type ZakatGoldInput = z.infer<typeof zakatGoldSchema>;
export type ZakatFitrahInput = z.infer<typeof zakatFitrahSchema>;
export type FidyahInput = z.infer<typeof fidyahSchema>;
