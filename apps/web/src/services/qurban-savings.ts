import api from '@/lib/api';

export interface QurbanSavings {
  id: string;
  savingsNumber: string;
  donorName: string;
  targetPackagePeriodId?: string; // New field for package-period combination
  targetPeriodId: string; // Legacy field
  targetPackageId: string; // Legacy field
  targetAmount: number;
  currentAmount: number;
  installmentFrequency: 'weekly' | 'monthly' | 'custom';
  installmentCount: number;
  installmentAmount: number;
  installmentDay: number;
  startDate: string;
  status: 'active' | 'completed' | 'converted' | 'cancelled';
  convertedToOrderId?: string;
  createdAt: string;
  targetPackage?: {
    id: string;
    name: string;
  };
}

export interface SavingsTransaction {
  id: string;
  savingsId: string;
  transactionNumber: string;
  amount: number;
  paymentMethod: string;
  paymentChannel: string;
  paymentProof?: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
}

export async function getSavingsList(): Promise<QurbanSavings[]> {
  const response = await api.get('/qurban/savings');
  return response.data.data || response.data;
}

export async function getSavingsDetail(id: string): Promise<QurbanSavings> {
  const response = await api.get(`/qurban/savings/${id}`);
  return response.data.data || response.data;
}

export async function createSavings(data: {
  donorName: string;
  targetPeriodId: string;
  targetPackagePeriodId?: string; // New field for package-period combination
  targetPackageId?: string; // Legacy field (optional for backward compatibility)
  targetAmount: number;
  installmentFrequency: string;
  installmentCount: number;
  installmentAmount: number;
  installmentDay: number;
  startDate: string;
}): Promise<QurbanSavings> {
  const response = await api.post('/qurban/savings', data);
  return response.data.data || response.data;
}

export async function depositSavings(savingsId: string, data: {
  amount: number;
  paymentMethod: string;
  paymentChannel: string;
  paymentProof?: string;
  notes?: string;
}): Promise<SavingsTransaction> {
  const response = await api.post(`/qurban/savings/${savingsId}/deposit`, data);
  return response.data.data || response.data;
}

export async function getSavingsTransactions(savingsId: string): Promise<SavingsTransaction[]> {
  const response = await api.get(`/qurban/savings/${savingsId}/transactions`);
  return response.data.data || response.data;
}
