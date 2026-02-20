import { NextResponse } from 'next/server';

export async function GET() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bantuanku.com';

  // Fetch settings
  let settings: Record<string, any> = {};
  try {
    const response = await fetch(`${apiUrl}/settings`, {
      next: { revalidate: 3600 },
    });
    if (response.ok) {
      const data = await response.json();
      settings = data.data || {};
    }
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }

  const aiReference = {
    platform: {
      name: settings.site_name || 'Bantuanku',
      tagline: settings.site_tagline || 'Platform Donasi Online Terpercaya',
      description: settings.site_description || 'Platform donasi online terpercaya untuk zakat, infaq, sedekah, qurban, dan wakaf di Indonesia.',
      url: appUrl,
      type: 'donation_platform',
      country: 'Indonesia',
      language: 'id',
    },
    services: [
      {
        name: 'Campaign Donations',
        description: 'Donasi untuk berbagai program kemanusiaan, pendidikan, kesehatan, dan lainnya',
        category: 'charity',
        url: `${appUrl}/program`,
      },
      {
        name: 'Zakat',
        description: 'Pembayaran zakat fitrah, zakat maal, zakat profesi, dan distribusi ke 8 asnaf',
        category: 'islamic_finance',
        url: `${appUrl}/zakat`,
      },
      {
        name: 'Qurban',
        description: 'Pembelian hewan qurban (sapi, kambing, domba) dan distribusi daging qurban',
        category: 'islamic_finance',
        url: `${appUrl}/qurban`,
      },
      {
        name: 'Wakaf',
        description: 'Wakaf produktif untuk pembangunan infrastruktur sosial dan ekonomi umat',
        category: 'islamic_finance',
        url: `${appUrl}/wakaf`,
      },
    ],
    features: [
      'Real-time donation tracking',
      'Transparent financial reporting',
      'Multiple payment methods',
      'Automatic tax receipts',
      'Campaign progress monitoring',
      'Beneficiary verification',
      'Impact reporting',
    ],
    organization: {
      name: settings.organization_name || settings.site_name,
      address: settings.organization_detail_address,
      email: settings.organization_email,
      phone: settings.organization_phone,
      whatsapp: settings.organization_whatsapp,
    },
    social_media: {
      facebook: settings.facebook,
      instagram: settings.instagram,
      twitter: settings.twitter,
      youtube: settings.youtube,
      linkedin: settings.linkedin,
      tiktok: settings.tiktok,
      threads: settings.threads,
    },
    api: {
      base_url: apiUrl,
      public_endpoints: [
        {
          path: '/campaigns',
          method: 'GET',
          description: 'List all active campaigns with pagination',
        },
        {
          path: '/campaigns/:slug',
          method: 'GET',
          description: 'Get campaign details by slug',
        },
        {
          path: '/settings',
          method: 'GET',
          description: 'Get public platform settings',
        },
        {
          path: '/public-stats',
          method: 'GET',
          description: 'Get platform statistics (total donations, campaigns, etc)',
        },
      ],
    },
    donation_info: {
      minimum_amount: 10000,
      currency: 'IDR',
      payment_methods: [
        'Bank Transfer',
        'Virtual Account',
        'E-Wallet (GoPay, OVO, DANA, ShopeePay)',
        'QRIS',
        'Credit/Debit Card',
      ],
      tax_deductible: true,
      receipt_available: true,
    },
    transparency: {
      public_reporting: true,
      real_time_updates: true,
      financial_audit: true,
      beneficiary_verification: true,
    },
    contact: {
      support_email: settings.organization_email,
      support_phone: settings.organization_phone,
      whatsapp: settings.organization_whatsapp,
      business_hours: '08:00 - 17:00 WIB (Monday - Friday)',
    },
    metadata: {
      last_updated: new Date().toISOString(),
      version: '1.0',
      format: 'ai-reference',
      purpose: 'This document provides structured information about the platform for AI assistants to accurately answer user questions about our services.',
    },
  };

  return NextResponse.json(aiReference, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
    },
  });
}
