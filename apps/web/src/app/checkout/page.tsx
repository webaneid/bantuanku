'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/lib/auth';
import { Button, Input, Checkbox } from '@/components/atoms';
import { InputField, TextareaField } from '@/components/molecules/FormField';
import { GoogleSignInButton } from '@/components/molecules/GoogleSignInButton';
import { CartSummaryCard } from '@/components/molecules/CartSummaryCard';
import { Header } from '@/components/organisms/Header';
import { Footer } from '@/components/organisms/Footer';
import toast from '@/lib/feedback-toast';
import { getReferralCode } from '@/lib/referral';
import * as fbPixel from '@/lib/fbPixel';
import { useI18n } from '@/lib/i18n/provider';

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

// Read Meta click/browser IDs from cookies for CAPI signal matching
function getMetaCookies(): { meta_fbc?: string; meta_fbp?: string } {
  if (typeof document === 'undefined') return {};
  const cookies = document.cookie.split(';').reduce((acc, c) => {
    const [key, ...val] = c.trim().split('=');
    acc[key] = val.join('=');
    return acc;
  }, {} as Record<string, string>);
  const result: { meta_fbc?: string; meta_fbp?: string } = {};
  if (cookies['_fbc']) result.meta_fbc = cookies['_fbc'];
  if (cookies['_fbp']) result.meta_fbp = cookies['_fbp'];
  return result;
}

type IdentifyState = 'idle' | 'checking' | 'registered' | 'new';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CheckoutFormData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  message: string;
  hideMyName: boolean;
  onBehalfOf: string; // For qurban and zakat donations
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, getCartTotal, clearCart, isLoaded: isCartLoaded } = useCart();
  const { user, token, isHydrated, mergeUser } = useAuth();
  const { t, locale } = useI18n();
  const activeLocale = locale === 'id' ? 'id-ID' : 'en-US';

  const formatAmount = (amount: number | null | undefined) =>
    new Intl.NumberFormat(activeLocale, {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));

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
  // Satu isian (email/HP) lalu tombol Lanjutkan: terdaftar -> tanpa isian identitas; belum -> form lengkap
  const [identifier, setIdentifier] = useState('');
  const [identifyState, setIdentifyState] = useState<IdentifyState>('idle');
  const [registeredHasAccount, setRegisteredHasAccount] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [fundraiserRefCode, setFundraiserRefCode] = useState<string | null>(null);
  const [whatsappSameAsPhone, setWhatsappSameAsPhone] = useState(true);

  useEffect(() => {
    setIsMounted(true);
    // Track InitiateCheckout when page loads with items (single trigger point)
    if (items.length > 0) {
      fbPixel.initiateCheckout({
        content_ids: items.map(i => i.campaignId || i.cartItemId),
        num_items: items.length,
        value: getCartTotal(),
        eventID: fbPixel.generateEventId('ic'),
      });
    }
  }, []);

  // Capture fundraiser referral code from sessionStorage
  useEffect(() => {
    const stored = getReferralCode();
    if (stored) {
      setFundraiserRefCode(stored);
    }
  }, []);

  // Redirect if cart is empty (but not during submission or after successful checkout).
  // Tunggu keranjang selesai dibaca dari localStorage: sebelum itu items kosong dan redirect salah
  // (mis. saat halaman dimuat penuh atau kompilasi dev memicu reload) melempar user ke keranjang.
  useEffect(() => {
    if (isCartLoaded && items.length === 0 && !isSubmitting && !checkoutSuccess) {
      router.push('/keranjang-bantuan');
    }
  }, [isCartLoaded, items, router, isSubmitting, checkoutSuccess]);

  // Segarkan profil user login sekali saat checkout dibuka: store login menyimpan salinan nama/HP/WhatsApp
  // dari SAAT LOGIN, jadi nomor yang dilengkapi di profil sesudahnya tidak muncul. Memakai fetch (bukan axios `api`)
  // karena interceptor `api` melempar ke /login saat 401; di sini kegagalan cukup diabaikan.
  const profileRefreshed = useRef(false);
  useEffect(() => {
    if (!isHydrated || !user || !token || profileRefreshed.current) return;
    profileRefreshed.current = true;

    fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        const profile = json?.data;
        if (!profile) return;
        mergeUser({
          ...(profile.name ? { name: profile.name } : {}),
          phone: profile.phone || null,
          whatsappNumber: profile.whatsappNumber || null,
        });
      })
      .catch(() => {});
  }, [isHydrated, user, token]);

  // Auto-fill from logged-in user
  useEffect(() => {
    if (isHydrated && user) {
      const userPhone = user.phone || '';
      const userWa = user.whatsappNumber || '';
      const waSame = !userWa || normalizePhone(userWa) === normalizePhone(userPhone);

      setFormData(prev => ({
        ...prev,
        name: user.name || prev.name,
        email: user.email || prev.email,
        phone: userPhone || prev.phone,
        whatsapp: waSame ? '' : userWa,
      }));
      setWhatsappSameAsPhone(waSame);
      setIsAutoFilled(true);
    }
  }, [user, isHydrated]);

  // Pengguna login memakai form berisi data akun; tamu harus melalui langkah "Lanjutkan" dulu
  const registeredMode = !user && identifyState === 'registered';
  const showIdentityFields = !!user || identifyState === 'new';
  const showOptionalFields = !!user || identifyState === 'new' || identifyState === 'registered';

  // Pesan error validasi data donatur (null = lengkap). Donatur terdaftar tidak perlu data identitas.
  const getDonorDataErrorKey = (): string | null => {
    if (registeredMode) return null;
    if (!formData.name || formData.name.trim().length < 2) return 'checkout.main.validation.invalidName';
    if (!formData.email || !EMAIL_PATTERN.test(formData.email)) return 'checkout.main.validation.invalidEmail';
    if (!formData.phone || normalizePhone(formData.phone).length < 10) return 'checkout.main.validation.invalidPhone';
    if (!whatsappSameAsPhone && (!formData.whatsapp || normalizePhone(formData.whatsapp).length < 10)) {
      return 'checkout.main.validation.invalidWhatsapp';
    }
    return null;
  };

  // Tombol bar bawah "Pilih Metode Pembayaran" hanya muncul bila data donatur sudah siap:
  // terdaftar (data dari profil), atau data donatur baru/akun login sudah lengkap
  const isDonorReady = user
    ? getDonorDataErrorKey() === null
    : identifyState === 'registered' || (identifyState === 'new' && getDonorDataErrorKey() === null);

  // Tombol "Lanjutkan" hilang setelah donatur terverifikasi atau saat mulai mengisi data donatur baru
  const identifierIsEmail = identifier.includes('@');
  const newDonorStarted =
    identifyState === 'new' &&
    (formData.name.trim() !== '' ||
      (identifierIsEmail ? formData.phone.trim() !== '' : formData.email.trim() !== ''));
  const showContinueButton = identifyState !== 'registered' && !newDonorStarted;

  // Setelah Lanjutkan (mobile): gulir ke hasilnya supaya "Anda telah terdaftar" dan isian di bawahnya terlihat
  useEffect(() => {
    if (identifyState !== 'registered' && identifyState !== 'new') return;
    if (typeof window === 'undefined' || window.innerWidth >= 1024) return;
    const timer = setTimeout(() => {
      document.getElementById('identify-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => clearTimeout(timer);
  }, [identifyState]);

  const handleIdentify = async () => {
    const value = identifier.trim();
    const isEmail = value.includes('@');
    const valid = isEmail ? EMAIL_PATTERN.test(value) : normalizePhone(value).replace(/\D/g, '').length >= 10;
    if (!valid) {
      toast.error(t('checkout.main.toasts.identifyInvalid'));
      return;
    }

    const normalized = isEmail ? value.toLowerCase() : normalizePhone(value);
    setIdentifyState('checking');

    try {
      const response = await fetch(`${API_URL}/donatur/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: normalized }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result?.message || t('checkout.main.toasts.identifyFailed'));
        setIdentifyState('idle');
        return;
      }

      if (result.data.registered) {
        // Data donatur tidak dikirim ke browser sama sekali; server memakainya saat transaksi dibuat
        setRegisteredHasAccount(Boolean(result.data.hasAccount));
        setIdentifyState('registered');
        return;
      }

      // Belum terdaftar: tampilkan form lengkap dengan isian tadi terisi di kolom yang sesuai
      if (isEmail) {
        setFormData(prev => ({ ...prev, email: normalized }));
      } else {
        setFormData(prev => ({ ...prev, phone: normalized }));
        setWhatsappSameAsPhone(true);
      }
      setIdentifyState('new');
    } catch (error) {
      console.error('Error checking donatur:', error);
      toast.error(t('checkout.main.toasts.identifyFailed'));
      setIdentifyState('idle');
    }
  };

  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    // Mengubah isian setelah dicek mengembalikan ke langkah awal
    if (identifyState !== 'idle') {
      setIdentifyState('idle');
      setRegisteredHasAccount(false);
    }
  };

  const processCheckout = async () => {

    // Tamu wajib melewati langkah "Lanjutkan" (cek email/HP) dulu
    if (!user && identifyState !== 'registered' && identifyState !== 'new') {
      toast.error(t('checkout.main.toasts.identifyFirst'));
      document.getElementById('checkout-identifier')?.focus();
      return;
    }

    // Validation (identitas tidak diisi/divalidasi untuk donatur terdaftar: server memakai profilnya)
    const donorErrorKey = getDonorDataErrorKey();
    if (donorErrorKey) {
      toast.error(t(donorErrorKey));
      return;
    }

    if (items.length === 0) {
      toast.error(t('checkout.main.validation.emptyCart'));
      return;
    }


    // Check minimum donation amount for campaign items
    const invalidCampaignItem = items.find(item => item.itemType === 'campaign' && item.amount < 1000);
    if (invalidCampaignItem) {
      toast.error(
        t('checkout.main.validation.minDonation', { title: invalidCampaignItem.title })
      );
      return;
    }

    // Check minimum amount for zakat items
    const invalidZakatItem = items.find(item => item.itemType === 'zakat' && item.amount < 1000);
    if (invalidZakatItem) {
      toast.error(
        t('checkout.main.validation.minZakat', { title: invalidZakatItem.title })
      );
      return;
    }

    setIsSubmitting(true);

    try {
      // Identitas donatur: terdaftar -> hanya isian email/HP, server mengambil datanya dari profil;
      // selain itu data yang diketik. user_id/donatur_id tidak dikirim (server menentukan sendiri).
      const donorFields = registeredMode
        ? { use_registered_donatur: true, donor_identifier: identifier.trim() }
        : {
            donor_name: formData.name.trim(),
            donor_email: formData.email.toLowerCase().trim(),
            donor_phone: normalizePhone(formData.phone),
          };
      // Token ikut dikirim agar server menautkan transaksi ke akun (user_id diambil dari token, bukan body);
      // token kedaluwarsa/rusak diabaikan server (auth opsional), jadi transaksi tetap dibuat sebagai tamu
      const transactionHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      // "Atas nama" kosong: pakai nama donatur bila diketik; untuk donatur terdaftar dibiarkan kosong
      // (server tidak membuka nama aslinya ke data publik transaksi)
      const behalfOf = formData.onBehalfOf.trim() || (registeredMode ? undefined : formData.name.trim());

      // Read Meta cookies for CAPI signal matching
      const metaCookies = getMetaCookies();

      // Separate campaign, zakat, and qurban items
      const campaignItems = items.filter(item => item.itemType === 'campaign');
      const zakatItems = items.filter(item => item.itemType === 'zakat');
      const qurbanItems = items.filter(item => item.itemType === 'qurban');

      const allResults: any[] = [];
      const refCode = fundraiserRefCode || undefined;

      // Create donations for campaign items
      if (campaignItems.length > 0) {
        const donationPromises = campaignItems.map(async (item) => {
          const metaEventId = fbPixel.generateEventId('purchase_campaign');
          const transactionData = {
            product_type: 'campaign',
            product_id: item.campaignId,
            product_name: item.title,
            ...donorFields,
            is_anonymous: formData.hideMyName,
            quantity: 1,
            unit_price: item.amount,
            admin_fee: 0,
            total_amount: item.amount,
            message: formData.message.trim() || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: {
              ...metaCookies,
              meta_event_id: metaEventId,
              ...(item.fidyahData ? {
                fidyah_person_count: item.fidyahData.personCount,
                fidyah_day_count: item.fidyahData.dayCount,
              } : {}),
            },
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: transactionHeaders,
            body: JSON.stringify(transactionData),
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
            useUniversalInvoice: true,
          };
        });

        const donationResults = await Promise.all(donationPromises);
        allResults.push(...donationResults);
      }

      // Create donations for zakat items
      if (zakatItems.length > 0) {
        // First, fetch zakat types to get zakatTypeId from slug
        const zakatTypesResponse = await fetch(`${API_URL}/zakat/types`);
        const zakatTypesData = await zakatTypesResponse.json();
        const zakatTypes = zakatTypesData?.data || [];

        // Create mappings for zakat type lookup.
        const zakatTypeMap: Record<string, string> = {};
        zakatTypes.forEach((type: any) => {
          const slug = type.slug; // e.g., "zakat-fitrah"
          const shortSlug = slug.replace('zakat-', ''); // "fitrah"
          zakatTypeMap[shortSlug] = type.id;
          zakatTypeMap[slug] = type.id;
        });

        console.log('DEBUG zakatItems:', JSON.stringify(zakatItems, null, 2));

        const zakatPromises = zakatItems.map(async (item) => {
          const metaEventId = fbPixel.generateEventId('purchase_zakat');
          const zakatTypeId =
            item.zakatData?.zakatTypeId ||
            (item.zakatData?.zakatTypeSlug ? zakatTypeMap[item.zakatData.zakatTypeSlug] : undefined) ||
            zakatTypeMap[item.zakatData?.zakatType || ''];

          if (!zakatTypeId) {
            throw new Error(
              t('checkout.main.validation.zakatTypeNotFound', { title: item.title })
            );
          }

          if (!item.zakatData?.periodId) {
            throw new Error(
              t('checkout.main.validation.periodNotFound', { title: item.title })
            );
          }

          const transactionData = {
            product_type: 'zakat',
            product_id: item.zakatData.periodId,
            product_name: item.title,
            ...donorFields,
            is_anonymous: formData.hideMyName,
            quantity: item.zakatData?.quantity || 1,
            unit_price: item.zakatData?.pricePerUnit || item.amount,
            admin_fee: 0,
            total_amount: item.amount,
            message: formData.message.trim() || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: {
              ...metaCookies,
              meta_event_id: metaEventId,
              ...(item.zakatData ? {
                zakat_type: item.zakatData.zakatType,
                zakat_type_id: zakatTypeId,
                quantity: item.zakatData.quantity,
                price_per_unit: item.zakatData.pricePerUnit,
                period_id: item.zakatData.periodId,
                on_behalf_of: behalfOf,
              } : {}),
            },
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: transactionHeaders,
            body: JSON.stringify(transactionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.error ||
              t('checkout.main.toasts.createZakatFailed', { title: item.title })
            );
          }

          const result = await response.json();
          return {
            ...result,
            itemType: 'zakat',
            programType: item.programType,
            useUniversalInvoice: true,
          };
        });

        const zakatResults = await Promise.all(zakatPromises);
        allResults.push(...zakatResults);
      }

      // Create transactions for qurban items
      if (qurbanItems.length > 0) {
        const qurbanPromises = qurbanItems.map(async (item) => {
          const metaEventId = fbPixel.generateEventId('purchase_qurban');
          if (!item.qurbanData) {
            throw new Error(
              t('checkout.main.validation.qurbanDataMissing', { title: item.title })
            );
          }

          // Calculate unit price (price per slot/ekor)
          const unitPrice = item.qurbanData.price;
          // Admin fee is already calculated per slot/ekor
          const adminFee = item.qurbanData.adminFee || 0;
          const quantity = item.qurbanData.quantity;
          const discountAmount = item.qurbanData.discountAmount || 0;
          const totalAmount = (unitPrice * quantity) - discountAmount + (adminFee * quantity);

          const transactionData = {
            product_type: 'qurban',
            product_id: item.qurbanData.packagePeriodId,
            product_name: item.title,
            ...donorFields,
            quantity: quantity,
            unit_price: unitPrice,
            admin_fee: adminFee,
            total_amount: totalAmount,
            notes: formData.message.trim() || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: {
              ...metaCookies,
              meta_event_id: metaEventId,
              period_id: item.qurbanData.periodId,
              package_id: item.qurbanData.packageId,
              package_period_id: item.qurbanData.packagePeriodId,
              onBehalfOf: behalfOf,
              animal_type: item.qurbanData.animalType,
              package_type: item.qurbanData.packageType,
              voucher_code: item.qurbanData.voucherCode || undefined,
              discount_amount: discountAmount > 0 ? discountAmount : undefined,
            },
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: transactionHeaders,
            body: JSON.stringify(transactionData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(
              errorData.message ||
              t('checkout.main.toasts.createQurbanFailed', { title: item.title })
            );
          }

          const result = await response.json();
          return {
            ...result,
            itemType: 'qurban',
            programType: 'qurban',
            useUniversalInvoice: true,
          };
        });

        const qurbanResults = await Promise.all(qurbanPromises);
        allResults.push(...qurbanResults);
      }

      // User login yang profilnya belum punya HP/WhatsApp: simpan nomor yang baru diisi ke profil supaya tidak
      // diminta lagi. fetch (bukan axios `api`: interceptor 401 akan melempar ke /login di tengah checkout);
      // gagal tidak menggagalkan checkout.
      if (user && token && !registeredMode && (!user.phone || !user.whatsappNumber)) {
        try {
          const profilePhone = normalizePhone(formData.phone);
          const profileWhatsapp = whatsappSameAsPhone
            ? profilePhone
            : (formData.whatsapp ? normalizePhone(formData.whatsapp) : profilePhone);
          const profileRes = await fetch(`${API_URL}/auth/me`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ phone: user.phone || profilePhone, whatsappNumber: user.whatsappNumber || profileWhatsapp }),
          });
          if (profileRes.ok) {
            mergeUser({
              phone: user.phone || profilePhone,
              whatsappNumber: user.whatsappNumber || profileWhatsapp,
            });
          }
        } catch (error) {
          console.error('Error saving phone to profile:', error);
        }
      }

      // Success message based on item types
      const hasQurban = qurbanItems.length > 0;
      const hasZakat = zakatItems.length > 0;
      const hasCampaign = campaignItems.length > 0;

      let successMessage = t('checkout.main.toasts.successDefault');
      if (hasQurban && (hasZakat || hasCampaign)) {
        successMessage = t('checkout.main.toasts.successQurbanAndOthers');
      } else if (hasQurban) {
        successMessage = t('checkout.main.toasts.successQurban');
      } else if (hasZakat && hasCampaign) {
        successMessage = t('checkout.main.toasts.successZakatAndCampaign');
      } else if (hasZakat) {
        successMessage = t('checkout.main.toasts.successZakat');
      } else if (hasCampaign) {
        successMessage = t('checkout.main.toasts.successCampaign');
      }

      toast.success(successMessage);

      // Store transaction IDs for payment
      const transactionData = allResults.map((r) => ({
        id: r.data.id,
        type: r.itemType, // 'donation' or 'qurban' or 'zakat'
        program: r.programType.toLowerCase(),
        amount: r.data.amount || r.data.totalAmount || 0, // Include amount for payment pages
        useUniversalInvoice: r.useUniversalInvoice || false, // Flag for new transaction system
      })).filter(d => d.id);

      // Mark checkout as successful to prevent redirect to empty cart
      setCheckoutSuccess(true);

      // Clear cart immediately after successful checkout
      clearCart();

      // Store pending donations in sessionStorage for payment method page
      if (transactionData.length > 0) {
        sessionStorage.setItem('pendingDonations', JSON.stringify(transactionData));
      }

      // Redirect to payment method page
      if (transactionData.length > 0) {
        const firstTransaction = transactionData[0];
        // All transactions now use Universal Invoice System
        router.push(`/invoice/${firstTransaction.id}/payment-method`);
      } else {
        router.push('/');
      }

    } catch (error: any) {
      console.error('Error creating orders:', error);
      toast.error(error?.message || t('checkout.main.toasts.createOrderFailed'));
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

  const programTypeLabel = (programType: string) =>
    programType === 'wakaf'
      ? t('checkout.main.programType.wakaf')
      : programType === 'zakat'
        ? t('checkout.main.programType.zakat')
        : programType === 'qurban'
          ? t('checkout.main.programType.qurban')
          : t('checkout.main.programType.donation');

  return (
    <>
      <Header />
      <main className="min-h-screen bg-light py-4 md:py-8">
        <div className="container mx-auto px-[15px] md:px-4">
          {/* Page Title — desktop; di mobile judul ada di blok ringkasan di bawah */}
          <div className="hidden lg:block mb-8">
            <h1 className="section-title text-dark mb-2">
              {t('checkout.main.title')}
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              {t('checkout.main.subtitle')}
            </p>
          </div>

          {/* Mobile: ringkasan donasi di atas, latar primary, teks putih */}
          <CartSummaryCard
            className="lg:hidden mb-4"
            items={items}
            total={cartTotal}
            title={t('checkout.main.title')}
            subtitle={t('checkout.main.subtitle')}
            summaryTitle={t('checkout.main.summaryTitle')}
            totalLabel={t('checkout.main.totalDonation')}
            infoText={t('checkout.main.afterCheckoutInfo')}
            formatAmount={formatAmount}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2">
              <div className="bg-white shadow-sm -mx-4 sm:-mx-6 md:mx-0 rounded-none md:rounded-lg px-[15px] py-5 md:p-6 md:border md:border-gray-100">
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
                        <p className="text-sm font-medium text-dark">
                          {t('checkout.main.loginAs', { name: user.name })}
                        </p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 flex items-center gap-3">
                      <svg className="w-5 h-5 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <p className="text-sm text-primary-800 flex-1">
                        {t('checkout.main.alreadyHaveAccount')}{' '}
                        <Link
                          href="/login?next=/checkout"
                          className="font-semibold text-primary-700 hover:text-primary-900 underline"
                        >
                          {t('checkout.main.loginHere')}
                        </Link>
                      </p>
                    </div>
                  )}
                  {!user && (
                    <div className="mt-4">
                      <GoogleSignInButton returnTo="/checkout" />
                    </div>
                  )}
                </div>

                {/* Langkah awal tamu: satu isian email/HP + tombol Lanjutkan */}
                {!user && (
                  <div className="mb-6">
                    <label htmlFor="checkout-identifier" className="form-label">
                      {t('checkout.main.identify.label')} <span className="text-danger-600">*</span>
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 min-w-0">
                        <Input
                          id="checkout-identifier"
                          type="text"
                          autoComplete="email"
                          value={identifier}
                          onChange={(e) => handleIdentifierChange(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleIdentify();
                            }
                          }}
                          placeholder={t('checkout.main.identify.placeholder')}
                        />
                      </div>
                      {showContinueButton && (
                        <Button
                          type="button"
                          onClick={handleIdentify}
                          disabled={identifyState === 'checking' || !identifier.trim()}
                          className="flex-shrink-0"
                        >
                          {identifyState === 'checking'
                            ? t('checkout.main.identify.checking')
                            : t('checkout.main.identify.continue')}
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{t('checkout.main.identify.hint')}</p>

                    {identifyState === 'registered' && (
                      <div id="identify-result" className="mt-4 rounded-xl bg-primary-50 p-4 flex items-start gap-3 scroll-mt-24">
                        <svg className="w-6 h-6 text-primary-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-primary-800">{t('checkout.main.identify.registeredTitle')}</p>
                          <p className="text-sm text-primary-800/80 mt-1">{t('checkout.main.identify.registeredDesc')}</p>
                          {!registeredHasAccount && (
                            <p className="text-xs text-primary-800/80 mt-2">
                              {t('checkout.main.identify.accountHint')}{' '}
                              <Link
                                href={identifier.includes('@') ? `/register?email=${encodeURIComponent(identifier.trim())}` : '/register'}
                                className="font-semibold underline"
                              >
                                {t('checkout.main.identify.createAccount')}
                              </Link>
                            </p>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              handleIdentifierChange('');
                              document.getElementById('checkout-identifier')?.focus();
                            }}
                            className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                          >
                            {t('checkout.main.identify.change')}
                          </button>
                        </div>
                      </div>
                    )}

                    {identifyState === 'new' && (
                      <div id="identify-result" className="mt-4 rounded-xl bg-light p-4 scroll-mt-24">
                        <p className="font-semibold text-dark">{t('checkout.main.identify.newTitle')}</p>
                        <p className="text-sm text-gray-600 mt-1">{t('checkout.main.identify.newDesc')}</p>
                        <button
                          type="button"
                          onClick={() => {
                            handleIdentifierChange('');
                            document.getElementById('checkout-identifier')?.focus();
                          }}
                          className="mt-3 text-sm text-gray-500 hover:text-gray-700 underline"
                        >
                          {t('checkout.main.identify.change')}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {showIdentityFields && (
                    <>
                  {/* Email - moved to top */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.email')} <span className="text-danger-600">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      placeholder={t('checkout.main.placeholders.email')}
                      required
                    />
                  </div>

                  {/* Nama Lengkap */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.fullName')} <span className="text-danger-600">*</span>
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
                      placeholder={t('checkout.main.placeholders.fullName')}
                      required
                    />
                    {isAutoFilled && user && (
                      <p className="text-xs text-success-600 mt-1">
                        {t('checkout.main.hints.autoFilledFromAccount')}
                      </p>
                    )}
                  </div>

                    </>
                  )}

                  {showOptionalFields && (
                    <>
                  {/* Hide Name Checkbox */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="hideMyName"
                      checked={formData.hideMyName}
                      onChange={(e) => setFormData({ ...formData, hideMyName: e.target.checked })}
                    />
                    <label htmlFor="hideMyName" className="text-sm text-gray-700">
                      {t('checkout.main.hideName')}
                    </label>
                  </div>

                    </>
                  )}

                  {showIdentityFields && (
                    <>
                  {/* Nomor Telepon */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.phone')} <span className="text-danger-600">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      placeholder={t('checkout.main.placeholders.phone')}
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.whatsapp')} <span className="text-danger-600">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={whatsappSameAsPhone ? formData.phone : formData.whatsapp}
                      onChange={(e) => {
                        setFormData({ ...formData, whatsapp: e.target.value });
                        setWhatsappSameAsPhone(false);
                        setIsAutoFilled(false);
                      }}
                      placeholder={t('checkout.main.placeholders.whatsapp')}
                      required
                      disabled={whatsappSameAsPhone}
                    />
                    <label className="flex items-center gap-2 cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={whatsappSameAsPhone}
                        onChange={(e) => {
                          setWhatsappSameAsPhone(e.target.checked);
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, whatsapp: '' }));
                          }
                        }}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700">
                        {t('checkout.main.whatsappSameAsPhone')}
                      </span>
                    </label>
                  </div>

                    </>
                  )}

                  {showOptionalFields && (
                    <>
                  {/* Atas Nama - For Qurban and Zakat */}
                  {items.some(item => item.itemType === 'qurban' || item.itemType === 'zakat') && (
                    <div className="form-field">
                      <label className="form-label">
                        {t('checkout.main.labels.onBehalfOf')}
                      </label>
                      <Input
                        type="text"
                        value={formData.onBehalfOf}
                        onChange={(e) => setFormData({ ...formData, onBehalfOf: e.target.value })}
                        placeholder={t('checkout.main.placeholders.onBehalfOf')}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {items.some(item => item.itemType === 'qurban')
                          ? t('checkout.main.hints.onBehalfQurbanZakat')
                          : t('checkout.main.hints.onBehalfZakat')}
                      </p>
                    </div>
                  )}

                  {/* Doa atau Catatan */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.note')}
                    </label>
                    <textarea
                      className="form-textarea"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder={t('checkout.main.placeholders.note')}
                    />
                  </div>

                    </>
                  )}

                  {/* Benefits Info - Only show for guests */}
                  {!user && identifyState === 'new' && (
                    <div className="bg-info-50 border border-info-200 rounded-lg p-4">
                      <h4 className="section-title text-info-900 mb-2">
                        {t('checkout.main.benefitsTitle')}
                      </h4>
                      <ul className="text-sm text-info-800 space-y-1">
                        <li>• {t('checkout.main.benefits.trackHistory')}</li>
                        <li>• {t('checkout.main.benefits.fasterCheckout')}</li>
                        <li>• {t('checkout.main.benefits.progressUpdate')}</li>
                        <li>• {t('checkout.main.benefits.downloadProof')}</li>
                      </ul>
                    </div>
                  )}

                  {/* Logged-in User Info */}
                  {user && (
                    <div className="bg-success-50 border border-success-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <h4 className="section-title text-success-900 mb-1">
                            {t('checkout.main.loggedInTitle')}
                          </h4>
                          <p className="text-sm text-success-800">
                            {t('checkout.main.loggedInDesc')}
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
                      {t('checkout.main.actions.backToCart')}
                    </Button>
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isSubmitting}
                      className="flex-1"
                    >
                      {isSubmitting
                        ? t('checkout.common.processing')
                        : t('checkout.main.actions.choosePaymentMethod')}
                    </Button>
                  </div>
                </form>
              </div>
            </div>

            {/* Summary Sidebar — desktop saja (mobile memakai blok primary di atas) */}
            <div className="hidden lg:block lg:col-span-1">
              <div className="bg-white shadow-sm -mx-4 sm:-mx-6 md:mx-0 rounded-none md:rounded-lg px-[15px] py-5 md:p-6 md:border md:border-gray-100 lg:sticky lg:top-24">
                <h2 className="section-title text-dark mb-6">
                  {t('checkout.main.summaryTitle')}
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
                            {programTypeLabel(item.programType)}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-dark mono whitespace-nowrap">
                          {formatAmount(item.amount)}
                        </span>
                      </div>
                      {/* Show quantity breakdown for zakat with quantity */}
                      {item.itemType === 'zakat' && item.zakatData?.quantity && item.zakatData?.pricePerUnit && (
                        <div className="text-xs text-gray-500 mt-1 ml-1">
                          {item.zakatData.quantity} x {formatAmount(item.zakatData.pricePerUnit)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-dark">
                      {t('checkout.main.totalDonation')}
                    </span>
                    <span className="text-2xl font-bold text-primary-600 mono">
                      {formatAmount(cartTotal)}
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
                        {t('checkout.main.afterCheckoutInfo')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bottom Bar: hanya tampil bila data donatur siap; tombol utama + tautan teks (tanpa border) */}
      {isMounted && isDonorReady && createPortal(
        <div className="fixed bottom-0 left-0 right-0 z-[1030] bg-white rounded-t-[20px] shadow-[0_-4px_12px_rgba(0,0,0,0.1)] px-[15px] pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
          <Button
            type="button"
            size="lg"
            onClick={processCheckout}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting
              ? t('checkout.common.processing')
              : t('checkout.main.actions.choosePaymentMethod')}
          </Button>
          <button
            type="button"
            onClick={() => router.push('/keranjang-bantuan')}
            disabled={isSubmitting}
            className="block w-full py-3 text-center text-sm text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            {t('checkout.main.actions.backToCart')}
          </button>
        </div>,
        document.body
      )}

      <Footer />

      {/* Spacer bar bawah mobile — elemen PALING TERAKHIR (docs/arsitektur-mobile-single-shell.md) */}
      {isDonorReady && <div className="h-28 lg:hidden" aria-hidden="true" />}
    </>
  );
}
