// Transaction Categories (Client-side copy from @bantuanku/db)

export const EXPENSE_CATEGORIES = {
  zakat: [
    { value: 'zakat_to_fakir', label: 'Penyaluran ke Fakir' },
    { value: 'zakat_to_miskin', label: 'Penyaluran ke Miskin' },
    { value: 'zakat_to_amil', label: 'Penyaluran ke Amil' },
    { value: 'zakat_to_mualaf', label: 'Penyaluran ke Mualaf' },
    { value: 'zakat_to_riqab', label: 'Penyaluran ke Riqab' },
    { value: 'zakat_to_gharim', label: 'Penyaluran ke Gharim' },
    { value: 'zakat_to_fisabilillah', label: 'Penyaluran ke Fisabilillah' },
    { value: 'zakat_to_ibnussabil', label: 'Penyaluran ke Ibnus Sabil' },
  ],
  campaign: [
    { value: 'campaign_to_beneficiary', label: 'Pencairan untuk Penerima Manfaat' },
    { value: 'campaign_to_vendor', label: 'Pembayaran Vendor' },
  ],
  qurban: [
    { value: 'qurban_purchase_sapi', label: 'Pembelian Sapi Qurban' },
    { value: 'qurban_purchase_kambing', label: 'Pembelian Kambing Qurban' },
    { value: 'qurban_execution_fee', label: 'Biaya Penyembelihan & Distribusi' },
  ],
  operational: [
    { value: 'operational_salary', label: 'Gaji & Tunjangan' },
    { value: 'operational_rent', label: 'Sewa Kantor' },
    { value: 'operational_utilities', label: 'Listrik & Air' },
    { value: 'operational_internet', label: 'Internet & Telekomunikasi' },
    { value: 'operational_marketing', label: 'Marketing & Promosi' },
    { value: 'operational_pg_fee', label: 'Biaya Payment Gateway' },
    { value: 'operational_bank_fee', label: 'Biaya Administrasi Bank' },
    { value: 'operational_supplies', label: 'Perlengkapan Kantor' },
    { value: 'operational_other', label: 'Beban Lain-lain' },
  ],
  vendor: [
    { value: 'vendor_general_payment', label: 'Pembayaran Vendor Umum' },
  ],
  revenue_share: [
    { value: 'revenue_share_mitra', label: 'Pencairan Bagi Hasil Mitra' },
    { value: 'revenue_share_fundraiser', label: 'Pencairan Komisi Fundraiser' },
    { value: 'revenue_share_developer', label: 'Pencairan Fee Developer' },
  ],
} as const;
