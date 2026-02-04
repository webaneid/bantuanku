'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/atoms';
import { formatRupiahFull } from '@/lib/format';
import { useAuth } from '@/lib/auth';
import toast from 'react-hot-toast';
import Image from 'next/image';

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
    name?: string;
    nmid?: string;
    imageUrl?: string;
  };
}

interface Donation {
  id: string;
  referenceId: string;
  amount: number;
  campaign?: {
    id: string;
    title: string;
    pillar: string;
  };
}

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { user, isHydrated } = useAuth();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [availableMethods, setAvailableMethods] = useState<PaymentMethod[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !user) {
      if (isHydrated && !user) {
        router.push('/login');
      }
      return;
    }

    const methodType = sessionStorage.getItem('selectedMethodType');
    const pendingDonationsStr = sessionStorage.getItem('pendingDonations');

    if (!methodType || !pendingDonationsStr) {
      toast.error('Data pembayaran tidak ditemukan');
      router.push(`/account/donations/${params.id}`);
      return;
    }

    loadPaymentData(methodType, JSON.parse(pendingDonationsStr));
  }, [isHydrated, user, params.id, router]);

  const loadPaymentData = async (methodType: string, donationData: Array<{id: string, program: string}>) => {
    try {
      // Fetch donations
      const donationPromises = donationData.map(async (d) => {
        const response = await fetch(`${API_URL}/donations/${d.id}`);
        const data = await response.json();
        return data.data;
      });

      const fetchedDonations = await Promise.all(donationPromises);
      setDonations(fetchedDonations);

      // Get all programs from donation data
      const programs = [...new Set(donationData.map(d => d.program))];

      // Fetch payment methods
      const response = await fetch(`${API_URL}/payments/methods`);
      const data = await response.json();

      if (data.success) {
        const methods = data.data || [];

        // Filter by type
        const filteredByType = methods.filter(
          (m: PaymentMethod) => m.type === methodType
        );

        // Filter by program/pillar
        const filteredMethods = filterMethodsByPrograms(filteredByType, programs);

        setAvailableMethods(filteredMethods);

        // Auto-select first method if only one available
        if (filteredMethods.length === 1) {
          setSelectedMethod(filteredMethods[0]);
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
      toast.error('Gagal memuat data pembayaran');
    } finally {
      setIsLoading(false);
    }
  };

  const filterMethodsByPrograms = (methods: PaymentMethod[], programs: string[]) => {
    if (programs.length === 0) return methods;

    // Step 1: Find methods that specifically match the campaign programs (NOT general)
    const specificMatches = methods.filter((method) => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];

      // Skip if method is only general
      if (methodPrograms.length === 1 && methodPrograms[0] === 'general') {
        return false;
      }

      // Check if method's programs match any of the campaign programs
      return methodPrograms.some(methodProgram =>
        methodProgram !== 'general' && programs.includes(methodProgram.toLowerCase())
      );
    });

    // Step 2: If specific matches found, return only those
    if (specificMatches.length > 0) {
      return specificMatches;
    }

    // Step 3: If no specific matches, return general methods as fallback
    return methods.filter((method) => {
      const methodPrograms = method.programs && method.programs.length > 0
        ? method.programs
        : ['general'];
      return methodPrograms.includes('general');
    });
  };

  const getTotalAmount = () => {
    return donations.reduce((sum, d) => sum + d.amount, 0);
  };

  const handleDownloadQR = async () => {
    if (!selectedMethod?.details?.imageUrl) return;

    try {
      const response = await fetch(selectedMethod.details.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `qris-${selectedMethod.name.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('QR Code berhasil diunduh');
    } catch (error) {
      console.error('Error downloading QR code:', error);
      toast.error('Gagal mengunduh QR Code');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Hanya file gambar (JPG, PNG) atau PDF yang diperbolehkan');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Ukuran file maksimal 5MB');
      return;
    }

    setPaymentProof(file);

    // Create preview for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setProofPreview(null);
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      toast.error('Silakan pilih metode pembayaran');
      return;
    }

    if (!paymentProof) {
      toast.error('Silakan upload bukti pembayaran');
      return;
    }

    setIsConfirming(true);

    try {
      // Step 1: Confirm payment method for all donations
      await Promise.all(
        donations.map((donation) =>
          fetch(`${API_URL}/donations/${donation.id}/confirm-payment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentMethodId: selectedMethod.code,
            }),
          })
        )
      );

      // Step 2: Upload payment proof for all donations
      const uploadPromises = donations.map(async (donation) => {
        const formData = new FormData();
        formData.append('file', paymentProof);

        const response = await fetch(`${API_URL}/donations/${donation.id}/upload-proof`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload proof for donation ${donation.id}`);
        }

        return response.json();
      });

      await Promise.all(uploadPromises);

      // Clear session storage
      sessionStorage.removeItem('pendingDonations');
      sessionStorage.removeItem('selectedMethodType');
      sessionStorage.removeItem('donationReturnUrl');

      toast.success('Bukti pembayaran berhasil dikirim! Menunggu verifikasi admin.');

      // Redirect back to donation detail
      router.push(`/account/donations/${params.id}`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      toast.error('Gagal mengkonfirmasi pembayaran');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!isHydrated || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  const methodType = sessionStorage.getItem('selectedMethodType');
  const isBankTransfer = methodType === 'bank_transfer';
  const isQris = methodType === 'qris';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Detail Pembayaran
        </h1>
        <p className="text-gray-600">
          {isBankTransfer && 'Silakan transfer ke rekening berikut'}
          {isQris && 'Silakan scan QR Code dengan aplikasi e-wallet Anda'}
        </p>
      </div>

      {/* Payment Methods */}
      {availableMethods.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-8 text-center">
          <p className="text-gray-500">Tidak ada metode pembayaran yang tersedia untuk program ini</p>
          <Link href={`/account/donations/${params.id}/payment-method`} className="mt-4 inline-block">
            <Button variant="outline">Kembali</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Method Selection */}
          {availableMethods.length > 1 && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Pilih {isBankTransfer ? 'Rekening' : 'QR Code'}
              </h3>
              <div className="space-y-3">
                {availableMethods.map((method) => (
                  <button
                    key={method.code}
                    onClick={() => setSelectedMethod(method)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMethod?.code === method.code
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">{method.name}</div>
                    {isBankTransfer && method.details?.accountName && (
                      <div className="text-sm text-gray-600 mt-1">
                        a.n {method.details.accountName}
                      </div>
                    )}
                    {method.programs && method.programs.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {method.programs.join(', ')}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selected Method Details */}
          {selectedMethod && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                Detail {isBankTransfer ? 'Rekening' : 'QRIS'}
              </h3>

              {isBankTransfer && selectedMethod.details && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-600">Bank</label>
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedMethod.details.bankName || selectedMethod.name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Nomor Rekening</label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono font-semibold text-gray-900 text-lg">
                        {selectedMethod.details.accountNumber}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(selectedMethod.details?.accountNumber || '');
                          toast.success('Nomor rekening disalin');
                        }}
                        className="text-primary-600 hover:text-primary-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-600">Atas Nama</label>
                    <p className="font-semibold text-gray-900 text-lg">
                      {selectedMethod.details.accountName}
                    </p>
                  </div>
                </div>
              )}

              {isQris && selectedMethod.details?.imageUrl && (
                <div className="text-center">
                  <div className="inline-block bg-white p-4 rounded-lg border-2 border-gray-200">
                    <Image
                      src={selectedMethod.details.imageUrl}
                      alt="QR Code"
                      width={256}
                      height={256}
                      className="mx-auto"
                    />
                  </div>

                  {/* Download Button */}
                  <button
                    onClick={handleDownloadQR}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Simpan QR Code
                  </button>

                  <p className="text-sm text-gray-600 mt-4">
                    Scan QR Code dengan aplikasi e-wallet Anda
                  </p>
                  {selectedMethod.details.nmid && (
                    <p className="text-xs text-gray-500 mt-2">
                      NMID: {selectedMethod.details.nmid}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Total Amount */}
          <div className="bg-primary-50 rounded-lg p-6 border-2 border-primary-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-700 font-medium">Total Pembayaran</span>
              <span className="text-3xl font-bold text-primary-600 mono">
                {formatRupiahFull(getTotalAmount())}
              </span>
            </div>
            <p className="text-sm text-gray-600">
              Transfer tepat sesuai nominal untuk mempercepat verifikasi
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Instruksi Pembayaran</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
              {isBankTransfer && (
                <>
                  <li>Transfer ke rekening di atas sesuai total pembayaran</li>
                  <li>Simpan bukti transfer Anda</li>
                  <li>Upload bukti transfer di bawah ini</li>
                  <li>Pembayaran akan diverifikasi dalam 1x24 jam</li>
                </>
              )}
              {isQris && (
                <>
                  <li>Buka aplikasi e-wallet Anda (GoPay, OVO, Dana, dll)</li>
                  <li>Scan QR Code di atas</li>
                  <li>Pastikan nominal sesuai dengan total pembayaran</li>
                  <li>Upload screenshot bukti pembayaran di bawah ini</li>
                </>
              )}
            </ol>
          </div>

          {/* Upload Bukti Pembayaran */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Upload Bukti Pembayaran</h3>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-500 transition-colors">
                <input
                  type="file"
                  id="payment-proof"
                  accept="image/jpeg,image/jpg,image/png,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label htmlFor="payment-proof" className="cursor-pointer">
                  {proofPreview ? (
                    <div className="space-y-2">
                      <Image
                        src={proofPreview}
                        alt="Preview"
                        width={200}
                        height={200}
                        className="mx-auto rounded-lg"
                      />
                      <p className="text-sm text-gray-600">{paymentProof?.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPaymentProof(null);
                          setProofPreview(null);
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : paymentProof ? (
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                      <p className="text-sm text-gray-600">{paymentProof.name}</p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setPaymentProof(null);
                        }}
                        className="text-red-600 hover:text-red-700 text-sm"
                      >
                        Hapus
                      </button>
                    </div>
                  ) : (
                    <div>
                      <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <p className="mt-2 text-sm text-gray-600">
                        Klik untuk upload bukti pembayaran
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, atau PDF (Maks. 5MB)
                      </p>
                    </div>
                  )}
                </label>
              </div>

              {paymentProof && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-800">
                      File siap diupload. Klik &quot;Kirim Bukti Pembayaran&quot; untuk mengirim.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Link href={`/account/donations/${params.id}/payment-method`} className="flex-1">
              <Button variant="outline" size="lg" className="w-full" disabled={isConfirming}>
                Ganti Metode
              </Button>
            </Link>
            <Button
              onClick={handleConfirmPayment}
              size="lg"
              className="flex-1"
              disabled={!selectedMethod || !paymentProof || isConfirming}
            >
              {isConfirming ? 'Mengirim...' : 'Kirim Bukti Pembayaran'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
