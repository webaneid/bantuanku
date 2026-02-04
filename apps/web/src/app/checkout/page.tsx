'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/lib/auth';
import { formatRupiahFull } from '@/lib/format';
import { Button, Input, Checkbox } from '@/components/atoms';
import { InputField, TextareaField } from '@/components/molecules/FormField';
import { Header, Footer } from '@/components/organisms';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

// Normalize phone number to standard format: 08521234567
function normalizePhone(input: string | null | undefined): string {
  if (!input) return '';

  let cleaned = input.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+62')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('62') && cleaned.length > 10) {
    cleaned = '0' + cleaned.substring(2);
  }

  if (cleaned && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }

  return cleaned;
}

interface Donatur {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
}

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  message: string;
  hideMyName: boolean;
  onBehalfOf: string; // For qurban orders
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getCartTotal, clearCart } = useCart();
  const { user, isHydrated } = useAuth();

  const [formData, setFormData] = useState<CheckoutFormData>({
    name: '',
    email: '',
    phone: '',
    whatsapp: '',
    message: '',
    hideMyName: false,
    onBehalfOf: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [donaturId, setDonaturId] = useState<string | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  // Redirect if cart is empty (but not during submission)
  useEffect(() => {
    if (items.length === 0 && !isSubmitting) {
      router.push('/keranjang-bantuan');
    }
  }, [items, router, isSubmitting]);

  // Auto-fill from logged-in user
  useEffect(() => {
    if (isHydrated && user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
        whatsapp: user.whatsappNumber || prev.whatsapp,
      }));
      setIsAutoFilled(true);
    }
  }, [user, isHydrated]);

  // Check if donatur exists based on email or phone (only for guests)
  const checkExistingDonatur = async (email?: string, phone?: string) => {
    // Skip if user is already logged in
    if (user) return;

    if (!email && !phone) return;

    try {
      const params = new URLSearchParams();
      if (email) params.append('email', email.toLowerCase().trim());
      if (phone) params.append('phone', normalizePhone(phone));

      const response = await fetch(`${API_URL}/donatur/search?${params.toString()}`);

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          const donatur: Donatur = data.data;

          // Auto-fill name if found
          setFormData(prev => ({
            ...prev,
            name: donatur.name || prev.name,
            phone: donatur.phone || prev.phone,
            whatsapp: donatur.whatsappNumber || prev.whatsapp,
          }));

          setDonaturId(donatur.id);
          setIsAutoFilled(true);
          toast.success('Data Anda ditemukan! Nama telah diisi otomatis.');
        }
      }
    } catch (error) {
      console.error('Error checking donatur:', error);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !isAutoFilled && !user) {
      checkExistingDonatur(formData.email, undefined);
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone && !isAutoFilled && !user) {
      checkExistingDonatur(undefined, formData.phone);
    }
  };

  const handleWhatsappFromPhone = () => {
    if (formData.phone && !formData.whatsapp) {
      setFormData(prev => ({
        ...prev,
        whatsapp: prev.phone,
      }));
      toast.success('WhatsApp diisi otomatis dari nomor telepon');
    }
  };

  const processCheckout = async () => {

    // Validation
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error('Nama lengkap harus diisi minimal 2 karakter');
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error('Email tidak valid');
      return;
    }

    if (!formData.phone || normalizePhone(formData.phone).length < 10) {
      toast.error('Nomor telepon tidak valid');
      return;
    }

    if (items.length === 0) {
      toast.error('Keranjang bantuan kosong');
      return;
    }

    // Check if there are qurban items and validate onBehalfOf
    const hasQurbanItems = items.some(item => item.itemType === 'qurban');
    if (hasQurbanItems && (!formData.onBehalfOf || formData.onBehalfOf.trim().length < 2)) {
      toast.error('Atas Nama harus diisi untuk pesanan qurban');
      return;
    }

    // Check minimum donation amount for campaign items
    const invalidCampaignItem = items.find(item => item.itemType === 'campaign' && item.amount < 10000);
    if (invalidCampaignItem) {
      toast.error(`Nominal donasi minimal Rp 10.000 untuk ${invalidCampaignItem.title}`);
      return;
    }

    // Check minimum amount for zakat items
    const invalidZakatItem = items.find(item => item.itemType === 'zakat' && item.amount < 10000);
    if (invalidZakatItem) {
      toast.error(`Nominal zakat minimal Rp 10.000 untuk ${invalidZakatItem.title}`);
      return;
    }

    setIsSubmitting(true);

    try {
      // Normalize contact data
      const normalizedPhone = normalizePhone(formData.phone);
      const normalizedWhatsapp = formData.whatsapp
        ? normalizePhone(formData.whatsapp)
        : normalizedPhone;
      const normalizedEmail = formData.email.toLowerCase().trim();

      // Separate campaign, zakat, and qurban items
      const campaignItems = items.filter(item => item.itemType === 'campaign');
      const zakatItems = items.filter(item => item.itemType === 'zakat');
      const qurbanItems = items.filter(item => item.itemType === 'qurban');

      const allResults: any[] = [];

      // Create donations for campaign items
      if (campaignItems.length > 0) {
        const donationPromises = campaignItems.map(async (item) => {
          const donationData = {
            campaignId: item.campaignId,
            amount: item.amount,
            donorName: formData.name.trim(),
            donorEmail: normalizedEmail,
            donorPhone: normalizedPhone,
            isAnonymous: formData.hideMyName,
            message: formData.message.trim() || undefined,
            userId: user?.id || undefined, // Link to user if logged in
            fidyahPersonCount: item.fidyahData?.personCount,
            fidyahDayCount: item.fidyahData?.dayCount,
          };

          const response = await fetch(`${API_URL}/donations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(donationData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create donation for ${item.title}`);
          }

          const result = await response.json();
          return {
            ...result,
            itemType: 'donation',
            programType: item.programType,
          };
        });

        const donationResults = await Promise.all(donationPromises);
        allResults.push(...donationResults);
      }

      // Create donations for zakat items
      if (zakatItems.length > 0) {
        // First, fetch zakat types to get zakatTypeId from slug
        const zakatTypesResponse = await fetch(`${API_URL}/admin/zakat/types?isActive=true&limit=100`);
        const zakatTypesData = await zakatTypesResponse.json();
        const zakatTypes = zakatTypesData?.data || [];

        // Create a mapping from zakatType to zakatTypeId
        const zakatTypeMap: Record<string, string> = {};
        zakatTypes.forEach((type: any) => {
          const slug = type.slug; // e.g., "zakat-fitrah"
          const shortSlug = slug.replace('zakat-', ''); // "fitrah"
          zakatTypeMap[shortSlug] = type.id;
        });

        const zakatPromises = zakatItems.map(async (item) => {
          const zakatTypeId = zakatTypeMap[item.zakatData?.zakatType || ''];

          if (!zakatTypeId) {
            throw new Error(`Zakat type not found for ${item.title}`);
          }

          const donationData = {
            zakatTypeId,
            donorName: formData.name.trim(),
            donorEmail: normalizedEmail,
            donorPhone: normalizedPhone,
            isAnonymous: formData.hideMyName,
            amount: item.amount,
            calculatorData: item.zakatData ? {
              zakatType: item.zakatData.zakatType,
              quantity: item.zakatData.quantity,
              pricePerUnit: item.zakatData.pricePerUnit,
            } : null,
            message: formData.message.trim() || undefined,
            paymentStatus: 'pending',
          };

          const response = await fetch(`${API_URL}/admin/zakat/donations`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(donationData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Failed to create zakat donation for ${item.title}`);
          }

          const result = await response.json();
          return {
            ...result,
            itemType: 'zakat',
            programType: item.programType,
          };
        });

        const zakatResults = await Promise.all(zakatPromises);
        allResults.push(...zakatResults);
      }

      // Create qurban orders for qurban items
      if (qurbanItems.length > 0) {
        const qurbanPromises = qurbanItems.map(async (item) => {
          if (!item.qurbanData) {
            throw new Error(`Qurban data missing for ${item.title}`);
          }

          const qurbanOrderData = {
            packagePeriodId: item.qurbanData.packagePeriodId, // Use packagePeriodId
            quantity: item.qurbanData.quantity,
            donorName: formData.name.trim(),
            donorEmail: normalizedEmail,
            donorPhone: normalizedPhone,
            onBehalfOf: formData.onBehalfOf.trim(),
            paymentMethod: 'full', // Default to full payment
            notes: formData.message.trim() || undefined,
            userId: user?.id || undefined, // Link to user if logged in
            adminFee: item.qurbanData.adminFee || 0, // Include admin fee
          };

          const response = await fetch(`${API_URL}/qurban/orders`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(qurbanOrderData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to create qurban order for ${item.title}`);
          }

          const result = await response.json();
          return {
            ...result,
            itemType: 'qurban',
            programType: 'qurban',
          };
        });

        const qurbanResults = await Promise.all(qurbanPromises);
        allResults.push(...qurbanResults);
      }

      // If donatur didn't exist, create one for future use
      if (!donaturId) {
        try {
          await fetch(`${API_URL}/donatur`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: formData.name.trim(),
              email: normalizedEmail,
              phone: normalizedPhone,
              whatsappNumber: normalizedWhatsapp,
            }),
          });
        } catch (error) {
          console.error('Error creating donatur record:', error);
          // Don't fail the whole transaction if donatur creation fails
        }
      }

      // Success message based on item types
      const hasQurban = qurbanItems.length > 0;
      const hasZakat = zakatItems.length > 0;
      const hasCampaign = campaignItems.length > 0;

      let successMessage = 'Transaksi berhasil dibuat!';
      if (hasQurban && (hasZakat || hasCampaign)) {
        successMessage = 'Donasi dan pesanan qurban berhasil dibuat!';
      } else if (hasQurban) {
        successMessage = 'Pesanan qurban berhasil dibuat!';
      } else if (hasZakat && hasCampaign) {
        successMessage = 'Zakat dan donasi berhasil dibuat!';
      } else if (hasZakat) {
        successMessage = 'Zakat berhasil dibuat!';
      } else if (hasCampaign) {
        successMessage = 'Donasi berhasil dibuat!';
      }

      toast.success(successMessage);

      // Store transaction IDs for payment
      const transactionData = allResults.map((r) => ({
        id: r.data.id,
        type: r.itemType, // 'donation' or 'qurban'
        program: r.programType.toLowerCase(),
        amount: r.data.amount || r.data.totalAmount || 0, // Include amount for payment pages
      })).filter(d => d.id);

      // Redirect to payment method selection
      if (transactionData.length > 0) {
        // Store in sessionStorage for payment page
        sessionStorage.setItem('pendingTransactions', JSON.stringify(transactionData));

        // Redirect to payment method (don't clear cart yet)
        router.push('/checkout/payment-method');
      } else {
        router.push('/');
      }

    } catch (error: any) {
      console.error('Error creating orders:', error);
      toast.error(error.message || 'Gagal membuat pesanan. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processCheckout();
  };

  if (items.length === 0) {
    return null; // Will redirect
  }

  const cartTotal = getCartTotal();

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="section-title text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              Lengkapi data Anda untuk melanjutkan ke pembayaran
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100">
                {/* Login Status */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  {user ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          Login sebagai: {user.name}
                        </p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      Sudah punya akun?{' '}
                      <Link
                        href="/login"
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        Login di sini
                      </Link>
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nama Lengkap */}
                  <div className="form-field">
                    <label className="form-label">
                      Nama Lengkap <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (user && e.target.value !== user.name) {
                          setIsAutoFilled(false);
                        }
                      }}
                      placeholder="Masukkan nama lengkap Anda"
                      required
                    />
                    {isAutoFilled && user && (
                      <p className="text-xs text-green-600 mt-1">
                        Data diisi otomatis dari akun Anda (dapat diubah)
                      </p>
                    )}
                    {isAutoFilled && !user && (
                      <p className="text-xs text-green-600 mt-1">
                        Data ditemukan dari riwayat donasi (dapat diubah)
                      </p>
                    )}
                  </div>

                  {/* Hide Name Checkbox */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="hideMyName"
                      checked={formData.hideMyName}
                      onChange={(e) => setFormData({ ...formData, hideMyName: e.target.checked })}
                    />
                    <label htmlFor="hideMyName" className="text-sm text-gray-700">
                      Sembunyikan nama saya (akan ditampilkan sebagai &ldquo;Hamba Allah&rdquo;)
                    </label>
                  </div>

                  {/* Email */}
                  <div className="form-field">
                    <label className="form-label">
                      Email <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      onBlur={handleEmailBlur}
                      placeholder="contoh@email.com"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Bukti donasi akan dikirim ke email ini
                    </p>
                  </div>

                  {/* Nomor Telepon */}
                  <div className="form-field">
                    <label className="form-label">
                      Nomor Telepon <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      onBlur={handlePhoneBlur}
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="form-field">
                    <label className="form-label">
                      Nomor WhatsApp
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder="08xxxxxxxxxx"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={handleWhatsappFromPhone}
                        disabled={!formData.phone}
                      >
                        Sama dengan No. HP
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Untuk notifikasi dan konfirmasi pembayaran
                    </p>
                  </div>

                  {/* Atas Nama - Only for Qurban */}
                  {items.some(item => item.itemType === 'qurban') && (
                    <div className="form-field">
                      <label className="form-label">
                        Atas Nama (untuk Qurban) <span className="text-red-600">*</span>
                      </label>
                      <Input
                        type="text"
                        value={formData.onBehalfOf}
                        onChange={(e) => setFormData({ ...formData, onBehalfOf: e.target.value })}
                        placeholder="Nama orang yang diwakafkan qurban ini"
                        required={items.some(item => item.itemType === 'qurban')}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Atas nama siapa qurban ini disembelih
                      </p>
                    </div>
                  )}

                  {/* Doa atau Catatan */}
                  <div className="form-field">
                    <label className="form-label">
                      Doa atau Catatan
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Tulis doa atau catatan untuk donasi Anda..."
                    />
                  </div>

                  {/* Benefits Info - Only show for guests */}
                  {!user && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="section-title text-blue-900 mb-2">
                        Manfaat Membuat Akun
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Lacak riwayat donasi Anda</li>
                        <li>• Checkout lebih cepat di lain waktu</li>
                        <li>• Dapatkan notifikasi perkembangan program</li>
                        <li>• Unduh bukti donasi kapan saja</li>
                      </ul>
                    </div>
                  )}

                  {/* Logged-in User Info */}
                  {user && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="section-title text-green-900 mb-1">
                            Donasi Tercatat di Akun Anda
                          </h4>
                          <p className="text-sm text-green-800">
                            Donasi ini akan tersimpan di riwayat akun Anda. Anda dapat melacak dan mengunduh bukti donasi kapan saja.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Buttons - desktop */}
                  <div className="hidden lg:flex gap-3 pt-6 border-t border-gray-200">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      onClick={() => router.push('/keranjang-bantuan')}
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      Kembali ke Keranjang
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting ? 'Memproses...' : 'Pilih Metode Pembayaran'}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-24">
                <h2 className="section-title text-gray-900 mb-6">
                  Ringkasan Donasi
                </h2>

                {/* Items List */}
                <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                  {items.map((item) => (
                    <div key={item.cartItemId}>
                      <div className="flex justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-600 truncate">
                            {item.title}
                          </p>
                          <span className="text-xs text-gray-500">
                            {item.programType === 'wakaf' ? 'Wakaf' :
                             item.programType === 'zakat' ? 'Zakat' :
                             item.programType === 'qurban' ? 'Qurban' : 'Donasi'}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 mono whitespace-nowrap">
                          {formatRupiahFull(item.amount)}
                        </span>
                      </div>
                      {/* Show quantity breakdown for zakat with quantity */}
                      {item.itemType === 'zakat' && item.zakatData?.quantity && item.zakatData?.pricePerUnit && (
                        <div className="text-xs text-gray-500 mt-1 ml-1">
                          {item.zakatData.quantity} x {formatRupiahFull(item.zakatData.pricePerUnit)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      Total Donasi
                    </span>
                    <span className="text-2xl font-bold text-primary-600 mono">
                      {formatRupiahFull(cartTotal)}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="pt-6 border-t border-gray-200">
                  <div className="flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-primary-600 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-xs text-gray-600" style={{ fontSize: '13px', lineHeight: '1.6' }}>
                        Setelah checkout, Anda akan mendapatkan instruksi pembayaran melalui email dan WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar */}
      {isMounted && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] p-4 lg:hidden">
          <div className="flex flex-col gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => router.push('/keranjang-bantuan')}
              disabled={isSubmitting}
              className="w-full"
            >
              Kembali ke Keranjang
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={processCheckout}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? 'Memproses...' : 'Pilih Metode Pembayaran'}
            </Button>
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
