'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/contexts/CartContext';
import { useAuth } from '@/lib/auth';
import { Button, Input, Checkbox } from '@/components/atoms';
import { InputField, TextareaField } from '@/components/molecules/FormField';
import { Header, Footer } from '@/components/organisms';
import toast from '@/lib/feedback-toast';
import { getReferralCode } from '@/lib/referral';
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
  onBehalfOf: string; // For qurban and zakat donations
}

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, getCartTotal, clearCart } = useCart();
  const { user, isHydrated } = useAuth();
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
  const [donaturId, setDonaturId] = useState<string | null>(null);
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [fundraiserRefCode, setFundraiserRefCode] = useState<string | null>(null);

  useEffect(() => { setIsMounted(true); }, []);

  // Capture fundraiser referral code from sessionStorage
  useEffect(() => {
    const stored = getReferralCode();
    if (stored) {
      setFundraiserRefCode(stored);
    }
  }, []);

  // Redirect if cart is empty (but not during submission or after successful checkout)
  useEffect(() => {
    if (items.length === 0 && !isSubmitting && !checkoutSuccess) {
      router.push('/keranjang-bantuan');
    }
  }, [items, router, isSubmitting, checkoutSuccess]);

  // Auto-fill from logged-in user
  useEffect(() => {
    if (isHydrated && user) {
      // Find donatur ID for logged-in user first
      checkExistingDonatur(user.email ?? undefined, user.phone ?? undefined);

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

  // Check if donatur exists based on email or phone
  const checkExistingDonatur = async (email?: string, phone?: string) => {
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

          // Set donatur ID
          setDonaturId(donatur.id);

          // Auto-fill name if found (only for guests)
          if (!user) {
            setFormData(prev => ({
              ...prev,
              name: donatur.name || prev.name,
              phone: donatur.phone || prev.phone,
              whatsapp: donatur.whatsappNumber || prev.whatsapp,
            }));
            setIsAutoFilled(true);
            toast.success(t('checkout.main.toasts.donorFound'));
          }
        }
      }
    } catch (error) {
      console.error('Error checking donatur:', error);
    }
  };

  const handleEmailBlur = () => {
    if (formData.email && !donaturId) {
      checkExistingDonatur(formData.email, undefined);
    }
  };

  const handlePhoneBlur = () => {
    if (formData.phone && !donaturId) {
      checkExistingDonatur(undefined, formData.phone);
    }
  };

  const handleWhatsappFromPhone = () => {
    if (formData.phone && !formData.whatsapp) {
      setFormData(prev => ({
        ...prev,
        whatsapp: prev.phone,
      }));
      toast.success(t('checkout.main.toasts.whatsappAutoFilled'));
    }
  };

  const processCheckout = async () => {

    // Validation
    if (!formData.name || formData.name.trim().length < 2) {
      toast.error(t('checkout.main.validation.invalidName'));
      return;
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      toast.error(t('checkout.main.validation.invalidEmail'));
      return;
    }

    if (!formData.phone || normalizePhone(formData.phone).length < 10) {
      toast.error(t('checkout.main.validation.invalidPhone'));
      return;
    }

    if (items.length === 0) {
      toast.error(t('checkout.main.validation.emptyCart'));
      return;
    }


    // Check minimum donation amount for campaign items
    const invalidCampaignItem = items.find(item => item.itemType === 'campaign' && item.amount < 10000);
    if (invalidCampaignItem) {
      toast.error(
        t('checkout.main.validation.minDonation', { title: invalidCampaignItem.title })
      );
      return;
    }

    // Check minimum amount for zakat items
    const invalidZakatItem = items.find(item => item.itemType === 'zakat' && item.amount < 10000);
    if (invalidZakatItem) {
      toast.error(
        t('checkout.main.validation.minZakat', { title: invalidZakatItem.title })
      );
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
      const refCode = fundraiserRefCode || undefined;

      // Create donations for campaign items
      if (campaignItems.length > 0) {
        const donationPromises = campaignItems.map(async (item) => {
          const transactionData = {
            product_type: 'campaign',
            product_id: item.campaignId,
            product_name: item.title,
            donor_name: formData.name.trim(),
            donor_email: normalizedEmail,
            donor_phone: normalizedPhone,
            donatur_id: donaturId || undefined,
            is_anonymous: formData.hideMyName,
            quantity: 1,
            unit_price: item.amount,
            admin_fee: 0,
            total_amount: item.amount,
            message: formData.message.trim() || undefined,
            user_id: user?.id || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: item.fidyahData ? {
              fidyah_person_count: item.fidyahData.personCount,
              fidyah_day_count: item.fidyahData.dayCount,
            } : undefined,
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
            donor_name: formData.name.trim(),
            donor_email: normalizedEmail,
            donor_phone: normalizedPhone,
            donatur_id: donaturId || undefined,
            is_anonymous: formData.hideMyName,
            quantity: item.zakatData?.quantity || 1,
            unit_price: item.zakatData?.pricePerUnit || item.amount,
            admin_fee: 0,
            total_amount: item.amount,
            message: formData.message.trim() || undefined,
            user_id: user?.id || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: item.zakatData ? {
              zakat_type: item.zakatData.zakatType,
              zakat_type_id: zakatTypeId,
              quantity: item.zakatData.quantity,
              price_per_unit: item.zakatData.pricePerUnit,
              period_id: item.zakatData.periodId,
              on_behalf_of: formData.onBehalfOf.trim() || formData.name.trim(),
            } : undefined,
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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
          const totalAmount = (unitPrice * quantity) + (adminFee * quantity);

          const transactionData = {
            product_type: 'qurban',
            product_id: item.qurbanData.packagePeriodId,
            product_name: item.title,
            donor_name: formData.name.trim(),
            donor_email: normalizedEmail,
            donor_phone: normalizedPhone,
            donatur_id: donaturId || undefined,
            quantity: quantity,
            unit_price: unitPrice,
            admin_fee: adminFee,
            total_amount: totalAmount,
            notes: formData.message.trim() || undefined,
            user_id: user?.id || undefined,
            referred_by_fundraiser_code: refCode,
            type_specific_data: {
              period_id: item.qurbanData.periodId,
              package_id: item.qurbanData.packageId,
              package_period_id: item.qurbanData.packagePeriodId,
              onBehalfOf: formData.onBehalfOf.trim() || formData.name.trim(),
              animal_type: item.qurbanData.animalType,
              package_type: item.qurbanData.packageType,
            },
          };

          const response = await fetch(`${API_URL}/transactions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 py-8 pb-24 lg:pb-8">
        <div className="container mx-auto px-4">
          {/* Page Title */}
          <div className="mb-8">
            <h1 className="section-title text-gray-900 mb-2">
              {t('checkout.main.title')}
            </h1>
            <p className="text-gray-600" style={{ fontSize: '15px' }}>
              {t('checkout.main.subtitle')}
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
                          {t('checkout.main.loginAs', { name: user.name })}
                        </p>
                        <p className="text-xs text-gray-600">{user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600">
                      {t('checkout.main.alreadyHaveAccount')}{' '}
                      <Link
                        href="/login"
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        {t('checkout.main.loginHere')}
                      </Link>
                    </p>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nama Lengkap */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.fullName')} <span className="text-red-600">*</span>
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
                      <p className="text-xs text-green-600 mt-1">
                        {t('checkout.main.hints.autoFilledFromAccount')}
                      </p>
                    )}
                    {isAutoFilled && !user && (
                      <p className="text-xs text-green-600 mt-1">
                        {t('checkout.main.hints.autoFilledFromHistory')}
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
                      {t('checkout.main.hideName')}
                    </label>
                  </div>

                  {/* Email */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.email')} <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => {
                        setFormData({ ...formData, email: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      onBlur={handleEmailBlur}
                      placeholder={t('checkout.main.placeholders.email')}
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {t('checkout.main.hints.donationProofEmail')}
                    </p>
                  </div>

                  {/* Nomor Telepon */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.phone')} <span className="text-red-600">*</span>
                    </label>
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        setIsAutoFilled(false);
                      }}
                      onBlur={handlePhoneBlur}
                      placeholder={t('checkout.main.placeholders.phone')}
                      required
                    />
                  </div>

                  {/* WhatsApp */}
                  <div className="form-field">
                    <label className="form-label">
                      {t('checkout.main.labels.whatsapp')}
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="tel"
                        value={formData.whatsapp}
                        onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                        placeholder={t('checkout.main.placeholders.whatsapp')}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={handleWhatsappFromPhone}
                        disabled={!formData.phone}
                      >
                        {t('checkout.main.whatsappSameAsPhone')}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {t('checkout.main.hints.whatsappNotification')}
                    </p>
                  </div>

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

                  {/* Benefits Info - Only show for guests */}
                  {!user && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="section-title text-blue-900 mb-2">
                        {t('checkout.main.benefitsTitle')}
                      </h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• {t('checkout.main.benefits.trackHistory')}</li>
                        <li>• {t('checkout.main.benefits.fasterCheckout')}</li>
                        <li>• {t('checkout.main.benefits.progressUpdate')}</li>
                        <li>• {t('checkout.main.benefits.downloadProof')}</li>
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
                            {t('checkout.main.loggedInTitle')}
                          </h4>
                          <p className="text-sm text-green-800">
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

            {/* Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-100 sticky top-24">
                <h2 className="section-title text-gray-900 mb-6">
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
                            {item.programType === 'wakaf'
                              ? t('checkout.main.programType.wakaf')
                              : item.programType === 'zakat'
                                ? t('checkout.main.programType.zakat')
                                : item.programType === 'qurban'
                                  ? t('checkout.main.programType.qurban')
                                  : t('checkout.main.programType.donation')}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-gray-900 mono whitespace-nowrap">
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
                    <span className="text-lg font-semibold text-gray-900">
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
              {t('checkout.main.actions.backToCart')}
            </Button>
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
          </div>
        </div>,
        document.body
      )}

      <Footer />
    </>
  );
}
