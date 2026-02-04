'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

interface PaymentMethod {
  id: string;
  code: string;
  name: string;
  type: string;
  programs: string[];
  details?: {
    accountName?: string;
    accountNumber?: string;
    bankName?: string;
    nmid?: string;
    imageUrl?: string;
  };
}

interface DonationData {
  id: string;
  program: string;
}

export default function ZakatPaymentMethodPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isHydrated } = useAuth();
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [filteredMethods, setFilteredMethods] = useState<PaymentMethod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        router.push('/login');
      }
      return;
    }

    // Check if there are pending donations
    const pendingDonations = sessionStorage.getItem('pendingDonations');
    if (!pendingDonations) {
      toast.error('Tidak ada donasi pending');
      router.push(`/account/zakat/${params.id}`);
      return;
    }

    loadData();
  }, [isHydrated, user, params.id, router]);

  const loadData = async () => {
    try {
      const pendingDonationsStr = sessionStorage.getItem('pendingDonations');
      if (!pendingDonationsStr) return;

      const donationData = JSON.parse(pendingDonationsStr) as DonationData[];

      // Fetch payment methods
      const methodsResponse = await fetch(`${API_URL}/payments/methods`);
      const methodsData = await methodsResponse.json();

      if (methodsData.success) {
        const allMethods = methodsData.data || [];
        setPaymentMethods(allMethods);

        // Filter methods for zakat program
        const filteredMethods = filterMethodsByPrograms(allMethods);
        setFilteredMethods(filteredMethods);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Gagal memuat data');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByPrograms = (methods: PaymentMethod[]): PaymentMethod[] => {
    const program = 'zakat';

    // Step 1: Find methods that specifically match zakat program (NOT general)
    const specificMatches = methods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      // Skip if method is only general
      if (methodPrograms.length === 1 && methodPrograms[0] === 'general') {
        return false;
      }

      // Check if method's programs include zakat
      return methodPrograms.some(methodProgram =>
        methodProgram !== 'general' && methodProgram.toLowerCase() === program
      );
    });

    // Step 2: If specific matches found, return only those
    if (specificMatches.length > 0) {
      return specificMatches;
    }

    // Step 3: If no specific matches, return general methods as fallback
    return methods.filter(method => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];
      return methodPrograms.includes('general');
    });
  };

  const handleSelectMethod = (methodType: string) => {
    if (methodType === 'bank_transfer' || methodType === 'qris') {
      // Store selected method type
      sessionStorage.setItem('selectedMethodType', methodType);
      router.push(`/account/zakat/${params.id}/payment-detail`);
    } else {
      // For payment gateway, will implement later
      toast('Payment gateway akan segera hadir');
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Group filtered payment methods by type
  const groupedMethods = filteredMethods.reduce((acc, method) => {
    if (!acc[method.type]) {
      acc[method.type] = [];
    }
    acc[method.type].push(method);
    return acc;
  }, {} as Record<string, PaymentMethod[]>);

  const hasBank = groupedMethods['bank_transfer']?.length > 0;
  const hasQris = groupedMethods['qris']?.length > 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Pilih Metode Pembayaran
        </h1>
        <p className="text-gray-600">
          Silakan pilih metode pembayaran yang Anda inginkan
        </p>
      </div>

      {/* Payment Methods */}
      <div className="space-y-4">
        {/* Bank Transfer */}
        {hasBank && (
          <button
            onClick={() => handleSelectMethod('bank_transfer')}
            className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center group-hover:bg-primary-200 transition-colors">
                  <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    Transfer Bank
                  </h3>
                  <p className="text-sm text-gray-600">
                    Transfer ke rekening bank kami
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* QRIS */}
        {hasQris && (
          <button
            onClick={() => handleSelectMethod('qris')}
            className="w-full bg-white rounded-lg shadow-sm border-2 border-gray-200 hover:border-primary-500 transition-all p-6 text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">
                    QRIS
                  </h3>
                  <p className="text-sm text-gray-600">
                    Scan QR Code dengan aplikasi e-wallet
                  </p>
                </div>
              </div>
              <svg className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        )}

        {/* Payment Gateway - Coming Soon */}
        <div className="bg-white rounded-lg shadow-sm border-2 border-gray-200 p-6 opacity-60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">
                  Payment Gateway
                </h3>
                <p className="text-sm text-gray-600">
                  Kartu Kredit / Virtual Account (Segera hadir)
                </p>
              </div>
            </div>
          </div>
        </div>

        {!hasBank && !hasQris && (
          <div className="text-center py-12">
            <p className="text-gray-500">Belum ada metode pembayaran tersedia</p>
          </div>
        )}
      </div>

      {/* Back Button */}
      <div>
        <Link href={`/account/zakat/${params.id}`}>
          <Button variant="outline" size="lg" className="w-full">
            Kembali ke Detail Zakat
          </Button>
        </Link>
      </div>
    </div>
  );
}
