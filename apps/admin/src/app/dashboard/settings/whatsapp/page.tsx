"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import FeedbackDialog from "@/components/FeedbackDialog";
import { useAuth } from "@/lib/auth";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  SignalIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TabType = "config" | "templates" | "bot";

type Setting = {
  key: string;
  value: string;
  type: string;
  label: string;
  description: string;
  category: string;
};

// ---------------------------------------------------------------------------
// Template definitions — mirrors blueprint exactly
// ---------------------------------------------------------------------------

type TemplateInfo = {
  key: string;
  label: string;
  description: string;
  variables: string[];
};

type TemplateGroup = {
  title: string;
  templates: TemplateInfo[];
};

const GLOBAL_VARS = [
  "store_name",
  "store_phone",
  "store_whatsapp",
  "store_email",
  "store_website",
  "frontend_url",
  "store_address",
  "current_date",
  "current_time",
];

const CUSTOMER_VARS = [
  "customer_name",
  "customer_email",
  "customer_phone",
  "customer_whatsapp",
];

const TRANSACTION_VARS = [
  "order_number",
  "product_type",
  "product_name",
  "quantity",
  "unit_price",
  "subtotal",
  "admin_fee",
  "unique_code",
  "total_amount",
  "transfer_amount",
  "paid_amount",
  "remaining_amount",
  "payment_status",
  "payment_method",
  "message",
  "invoice_url",
  "created_date",
  "paid_date",
];

const BANK_VARS = ["bank_name", "bank_account", "bank_holder"];

const ZAKAT_VARS = ["zakat_type", "zakat_period", "zakat_year", "zakat_hijri_year", "zakat_calculation"];

const QURBAN_VARS = ["qurban_package", "qurban_period", "qurban_type", "qurban_names"];

const SAVINGS_VARS = [
  "savings_number",
  "savings_target",
  "savings_current",
  "savings_remaining",
  "savings_progress",
  "installment_amount",
  "installment_frequency",
  "installment_count",
  "installment_paid",
  "installment_remaining",
  "next_installment_date",
];

const DISBURSEMENT_VARS = [
  "disbursement_number",
  "disbursement_type",
  "disbursement_amount",
  "disbursement_status",
  "disbursement_purpose",
  "recipient_name",
  "campaign_name",
];

const REPORT_VARS = ["report_title", "report_date", "report_description", "report_url"];

const MITRA_VARS = [
  "mitra_name",
  "mitra_amount",
  "mitra_balance",
];

const FUNDRAISER_VARS = [
  "fundraiser_name",
  "commission_percentage",
  "commission_amount",
  "total_referrals",
  "fundraiser_balance",
];

const USER_VARS = ["user_name", "user_email", "verification_code", "code_expires_at"];

const TEMPLATE_GROUPS: TemplateGroup[] = [
  {
    title: "Registrasi & Akun",
    templates: [
      {
        key: "wa_tpl_register_welcome",
        label: "Selamat Datang",
        description: "Dikirim ke user baru setelah registrasi",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...USER_VARS],
      },
      {
        key: "wa_tpl_register_verify",
        label: "Verifikasi WhatsApp",
        description: "Dikirim untuk verifikasi nomor WhatsApp",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...USER_VARS],
      },
    ],
  },
  {
    title: "Transaksi Baru",
    templates: [
      {
        key: "wa_tpl_order_campaign",
        label: "Donasi Campaign Diterima",
        description: "Dikirim ke donatur saat membuat donasi campaign",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS, ...BANK_VARS, "customer_message"],
      },
      {
        key: "wa_tpl_order_zakat",
        label: "Pembayaran Zakat Diterima",
        description: "Dikirim ke donatur saat membuat pembayaran zakat",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS, ...BANK_VARS, ...ZAKAT_VARS],
      },
      {
        key: "wa_tpl_order_qurban",
        label: "Pesanan Qurban Diterima",
        description: "Dikirim ke donatur saat membuat pesanan qurban",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS, ...BANK_VARS, ...QURBAN_VARS],
      },
    ],
  },
  {
    title: "Status Pembayaran",
    templates: [
      {
        key: "wa_tpl_payment_uploaded",
        label: "Bukti Pembayaran Diterima",
        description: "Dikirim saat donatur upload bukti bayar",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
      {
        key: "wa_tpl_payment_approved",
        label: "Pembayaran Dikonfirmasi",
        description: "Dikirim saat admin approve pembayaran",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
      {
        key: "wa_tpl_payment_rejected",
        label: "Pembayaran Ditolak",
        description: "Dikirim saat admin reject pembayaran",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
      {
        key: "wa_tpl_payment_reminder",
        label: "Pengingat Pembayaran",
        description: "Dikirim sebagai pengingat pembayaran",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS, ...BANK_VARS],
      },
      {
        key: "wa_tpl_payment_expired",
        label: "Pembayaran Kedaluwarsa",
        description: "Dikirim saat transaksi expired",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
    ],
  },
  {
    title: "Tabungan Qurban",
    templates: [
      {
        key: "wa_tpl_savings_created",
        label: "Tabungan Qurban Dibuat",
        description: "Dikirim saat tabungan qurban dibuat",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...SAVINGS_VARS],
      },
      {
        key: "wa_tpl_savings_deposit",
        label: "Setoran Tabungan Diterima",
        description: "Dikirim saat setoran tabungan dikonfirmasi",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...SAVINGS_VARS],
      },
      {
        key: "wa_tpl_savings_reminder",
        label: "Pengingat Cicilan Qurban",
        description: "Dikirim sebagai pengingat cicilan tabungan",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...SAVINGS_VARS],
      },
      {
        key: "wa_tpl_savings_completed",
        label: "Tabungan Qurban Lunas",
        description: "Dikirim saat tabungan qurban mencapai target",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...SAVINGS_VARS],
      },
      {
        key: "wa_tpl_savings_converted",
        label: "Tabungan Dikonversi",
        description: "Dikirim saat tabungan dikonversi ke pesanan",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...SAVINGS_VARS],
      },
    ],
  },
  {
    title: "Laporan & Penyaluran",
    templates: [
      {
        key: "wa_tpl_report_published",
        label: "Laporan Kegiatan Dipublikasikan",
        description: "Dikirim ke donatur saat laporan kegiatan dipublikasikan",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS, ...REPORT_VARS],
      },
      {
        key: "wa_tpl_disbursement_created",
        label: "Dana Disalurkan",
        description: "Dikirim ke donatur saat dana campaign disalurkan",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...DISBURSEMENT_VARS],
      },
    ],
  },
  {
    title: "Notifikasi Admin",
    templates: [
      {
        key: "wa_tpl_admin_new_transaction",
        label: "Transaksi Masuk (Admin)",
        description: "Dikirim ke admin saat ada transaksi baru",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
      {
        key: "wa_tpl_admin_proof_uploaded",
        label: "Bukti Bayar Masuk (Admin)",
        description: "Dikirim ke admin finance saat ada bukti bayar",
        variables: [...GLOBAL_VARS, ...CUSTOMER_VARS, ...TRANSACTION_VARS],
      },
      {
        key: "wa_tpl_admin_disbursement_request",
        label: "Permintaan Pencairan (Admin)",
        description: "Dikirim ke admin saat ada permintaan pencairan",
        variables: [...GLOBAL_VARS, ...DISBURSEMENT_VARS],
      },
    ],
  },
  {
    title: "Notifikasi Mitra & Fundraiser",
    templates: [
      {
        key: "wa_tpl_mitra_donation_received",
        label: "Donasi Masuk ke Program Mitra",
        description: "Dikirim ke mitra saat ada donasi masuk ke program miliknya",
        variables: [...GLOBAL_VARS, ...MITRA_VARS, "product_name", "donor_name", "donation_amount", "paid_date"],
      },
      {
        key: "wa_tpl_fundraiser_referral",
        label: "Referral Fundraiser Berhasil",
        description: "Dikirim ke fundraiser saat ada donasi melalui link referralnya",
        variables: [...GLOBAL_VARS, ...FUNDRAISER_VARS, "product_name", "donor_name", "donation_amount"],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Sample data for preview
// ---------------------------------------------------------------------------

const SAMPLE_DATA: Record<string, string> = {
  store_name: "Yayasan Bantuanku",
  store_phone: "021-12345678",
  store_whatsapp: "628123456789",
  store_email: "info@bantuanku.org",
  store_website: "https://bantuanku.org",
  frontend_url: "https://app.bantuanku.org",
  store_address: "Jl. Kebaikan No. 1, Jakarta",
  current_date: "18 Februari 2026",
  current_time: "14:30 WIB",
  customer_name: "Ahmad Subekti",
  customer_email: "ahmad@email.com",
  customer_phone: "628123456789",
  customer_whatsapp: "628123456789",
  customer_message: "",
  order_number: "TRX-20260218-12345",
  product_type: "Campaign",
  product_name: "Pembangunan Masjid Al-Ikhlas",
  quantity: "1",
  unit_price: "Rp 500.000",
  subtotal: "Rp 500.000",
  admin_fee: "Rp 0",
  unique_code: "123",
  total_amount: "Rp 500.000",
  transfer_amount: "Rp 500.123",
  paid_amount: "Rp 500.123",
  remaining_amount: "Rp 0",
  payment_status: "Lunas",
  payment_method: "Bank Transfer",
  message: "",
  invoice_url: "https://bantuanku.org/invoice/abc123",
  created_date: "18 Februari 2026",
  paid_date: "18 Februari 2026",
  bank_name: "Bank Syariah Indonesia",
  bank_account: "1234567890",
  bank_holder: "Yayasan Bantuanku",
  zakat_type: "Zakat Maal",
  zakat_period: "2025/2026",
  zakat_year: "2026",
  zakat_hijri_year: "1447",
  zakat_calculation: "2.5% x Rp 100.000.000",
  qurban_package: "Sapi Premium (1/7)",
  qurban_period: "Idul Adha 1447H",
  qurban_type: "Sapi",
  qurban_names: "Ahmad Subekti, Siti Aminah",
  savings_number: "SAV-20260218-001",
  savings_target: "Rp 3.500.000",
  savings_current: "Rp 1.750.000",
  savings_remaining: "Rp 1.750.000",
  savings_progress: "50%",
  installment_amount: "Rp 500.000",
  installment_frequency: "Bulanan",
  installment_count: "7",
  installment_paid: "3",
  installment_remaining: "4",
  next_installment_date: "18 Maret 2026",
  disbursement_number: "DSB-20260218-001",
  disbursement_type: "Campaign",
  disbursement_amount: "Rp 10.000.000",
  disbursement_status: "Submitted",
  disbursement_purpose: "Pembelian material bangunan",
  recipient_name: "Bpk. Hasan",
  campaign_name: "Pembangunan Masjid Al-Ikhlas",
  report_title: "Progres Pembangunan Fondasi",
  report_date: "15 Februari 2026",
  report_description: "Alhamdulillah pembangunan fondasi masjid telah selesai 80%. Material telah terpenuhi dan pekerja telah menyelesaikan cor lantai dasar.",
  report_url: "https://bantuanku.org/program/abc123",
  mitra_name: "Yayasan Amanah Umat",
  mitra_amount: "Rp 50.000",
  mitra_balance: "Rp 1.250.000",
  fundraiser_name: "Budi Santoso",
  commission_percentage: "5%",
  commission_amount: "Rp 25.000",
  total_referrals: "12",
  fundraiser_balance: "Rp 750.000",
  donor_name: "Ahmad Subekti",
  donation_amount: "Rp 500.000",
  user_name: "Ahmad Subekti",
  user_email: "ahmad@email.com",
  verification_code: "482916",
  code_expires_at: "14:45",
};

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function WhatsAppSettingsPage() {
  const { user } = useAuth();
  const isDeveloper = Boolean(user?.isDeveloper);
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("config");
  const [feedback, setFeedback] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({ open: false, type: "success", title: "" });

  // Fetch all settings
  const { data: groupedSettings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
    refetchOnWindowFocus: false,
  });

  // ---------------------------------------------------------------------------
  // GOWA Config state
  // ---------------------------------------------------------------------------

  const [configForm, setConfigForm] = useState({
    whatsapp_enabled: "false",
    whatsapp_api_url: "",
    whatsapp_username: "",
    whatsapp_password: "",
    whatsapp_device_id: "",
    whatsapp_sender_number: "",
    whatsapp_admin_numbers: "[]",
    whatsapp_message_delay: "2000",
    whatsapp_webhook_secret: "",
  });

  const [connectionStatus, setConnectionStatus] = useState<"unknown" | "connected" | "disconnected" | "checking">("unknown");
  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState("Test notifikasi dari Bantuanku");
  const [isTesting, setIsTesting] = useState(false);

  // Populate config form from settings
  useEffect(() => {
    if (groupedSettings?.whatsapp) {
      const waSettings = groupedSettings.whatsapp as Setting[];
      const form: Record<string, string> = {};
      for (const s of waSettings) {
        form[s.key] = s.value;
      }
      setConfigForm((prev) => ({ ...prev, ...form }));
    }
  }, [groupedSettings]);

  // ---------------------------------------------------------------------------
  // Template state
  // ---------------------------------------------------------------------------

  const [templateValues, setTemplateValues] = useState<Record<string, string>>({});
  const [templateToggles, setTemplateToggles] = useState<Record<string, boolean>>({});
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [previewKey, setPreviewKey] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Bot AI state
  // ---------------------------------------------------------------------------

  const [botForm, setBotForm] = useState({
    whatsapp_bot_enabled: "false",
    whatsapp_bot_ai_provider: "gemini",
    whatsapp_bot_ai_api_key: "",
    whatsapp_bot_ai_model: "gemini-2.0-flash",
    whatsapp_bot_system_prompt: "",
  });

  const [botLogs, setBotLogs] = useState<
    Array<{
      phone: string;
      profileName: string;
      history: Array<{ role: string; content: string }>;
      lastActivity: number;
    }>
  >([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (!isDeveloper && activeTab === "bot") {
      setActiveTab("config");
    }
  }, [activeTab, isDeveloper]);

  // Populate bot form from settings
  useEffect(() => {
    if (groupedSettings?.whatsapp) {
      const waSettings = groupedSettings.whatsapp as Setting[];
      const form: Record<string, string> = {};
      for (const s of waSettings) {
        if (s.key.startsWith("whatsapp_bot_")) {
          form[s.key] = s.value;
        }
      }
      setBotForm((prev) => ({ ...prev, ...form }));
    }
  }, [groupedSettings]);

  const handleSaveBotConfig = () => {
    const waSettings = (groupedSettings?.whatsapp || []) as Setting[];
    const items = Object.entries(botForm).map(([key, value]) => {
      const existing = waSettings.find((s) => s.key === key);
      return {
        key,
        value,
        category: "whatsapp",
        type: existing?.type || "string",
        label: existing?.label || key,
        description: existing?.description || "",
      };
    });
    saveMutation.mutate(items);
  };

  const handleLoadBotLogs = async () => {
    setLogsLoading(true);
    try {
      const response = await api.get("/admin/whatsapp/bot-logs");
      setBotLogs(response.data?.data || []);
    } catch {
      setBotLogs([]);
    } finally {
      setLogsLoading(false);
    }
  };

  // Populate template state from settings
  useEffect(() => {
    if (groupedSettings?.whatsapp_template) {
      const tplSettings = groupedSettings.whatsapp_template as Setting[];
      const values: Record<string, string> = {};
      const toggles: Record<string, boolean> = {};
      for (const s of tplSettings) {
        if (s.key.endsWith("_enabled")) {
          toggles[s.key.replace("_enabled", "")] = s.value === "true";
        } else {
          values[s.key] = s.value;
        }
      }
      setTemplateValues(values);
      setTemplateToggles(toggles);
    }
  }, [groupedSettings]);

  // ---------------------------------------------------------------------------
  // Save config mutation
  // ---------------------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async (items: Array<{ key: string; value: string; category: string; label: string; description?: string }>) => {
      await api.put("/admin/settings/batch", items);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      setFeedback({ open: true, type: "success", title: "Berhasil disimpan" });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal menyimpan",
        message: err?.response?.data?.message || err.message,
      });
    },
  });

  // ---------------------------------------------------------------------------
  // Save GOWA config
  // ---------------------------------------------------------------------------

  const handleSaveConfig = () => {
    const waSettings = (groupedSettings?.whatsapp || []) as Setting[];
    const items = Object.entries(configForm).map(([key, value]) => {
      const existing = waSettings.find((s) => s.key === key);
      return {
        key,
        value,
        category: "whatsapp",
        type: existing?.type || "string",
        label: existing?.label || key,
        description: existing?.description || "",
      };
    });
    saveMutation.mutate(items);
  };

  // ---------------------------------------------------------------------------
  // Test connection
  // ---------------------------------------------------------------------------

  const handleTestConnection = async () => {
    setConnectionStatus("checking");
    try {
      const res = await api.post("/admin/whatsapp/test-connection", {});
      const data = res.data?.data;
      if (data?.connected) {
        setConnectionStatus("connected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  };

  // ---------------------------------------------------------------------------
  // Test send message
  // ---------------------------------------------------------------------------

  const handleTestSend = async () => {
    if (!testPhone.trim()) {
      setFeedback({ open: true, type: "error", title: "Masukkan nomor tujuan" });
      return;
    }
    setIsTesting(true);
    try {
      const phone = testPhone.replace(/[^0-9]/g, "");
      await api.post("/admin/whatsapp/test-send", { phone, message: testMessage });
      setFeedback({ open: true, type: "success", title: "Pesan terkirim!" });
    } catch (err: any) {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal mengirim",
        message: err?.response?.data?.message || err.message,
      });
    } finally {
      setIsTesting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Save single template
  // ---------------------------------------------------------------------------

  const handleSaveTemplate = (key: string) => {
    const items = [
      {
        key: `${key}_enabled`,
        value: templateToggles[key] !== false ? "true" : "false",
        category: "whatsapp_template",
        label: "Aktif",
        description: "",
      },
      {
        key,
        value: templateValues[key] || "",
        category: "whatsapp_template",
        label: "",
        description: "",
      },
    ];
    saveMutation.mutate(items);
  };

  // ---------------------------------------------------------------------------
  // Render template preview
  // ---------------------------------------------------------------------------

  const renderPreview = (template: string): string => {
    return template.replace(/\{(\w+)\}/g, (_, varName) => {
      return SAMPLE_DATA[varName] || `{${varName}}`;
    });
  };

  // ---------------------------------------------------------------------------
  // Admin numbers helpers
  // ---------------------------------------------------------------------------

  let adminNumbers: string[] = [];
  try {
    adminNumbers = JSON.parse(configForm.whatsapp_admin_numbers || "[]");
  } catch {
    adminNumbers = [];
  }

  const addAdminNumber = () => {
    const updated = [...adminNumbers, ""];
    setConfigForm((prev) => ({
      ...prev,
      whatsapp_admin_numbers: JSON.stringify(updated),
    }));
  };

  const updateAdminNumber = (index: number, value: string) => {
    const updated = [...adminNumbers];
    updated[index] = value;
    setConfigForm((prev) => ({
      ...prev,
      whatsapp_admin_numbers: JSON.stringify(updated),
    }));
  };

  const removeAdminNumber = (index: number) => {
    const updated = adminNumbers.filter((_, i) => i !== index);
    setConfigForm((prev) => ({
      ...prev,
      whatsapp_admin_numbers: JSON.stringify(updated),
    }));
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="bg-white rounded-lg shadow-sm border p-8 text-center text-gray-500">
          Memuat pengaturan...
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([
            { key: "config", label: "Konfigurasi GOWA" },
            { key: "templates", label: "Template Pesan" },
            ...(isDeveloper ? [{ key: "bot", label: "Bot AI" }] : []),
          ] as Array<{ key: TabType; label: string }>).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-white text-primary-700 shadow-sm"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab 1: Konfigurasi GOWA */}
      {activeTab === "config" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Konfigurasi GOWA</h2>

            {/* Toggle */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <p className="font-medium">WhatsApp Notifikasi</p>
                <p className="text-sm text-gray-500">Aktifkan/nonaktifkan seluruh notifikasi WhatsApp</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={configForm.whatsapp_enabled === "true"}
                  onChange={(e) =>
                    setConfigForm((prev) => ({
                      ...prev,
                      whatsapp_enabled: e.target.checked ? "true" : "false",
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* Gateway URL */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gateway URL</label>
                <input
                  type="text"
                  value={configForm.whatsapp_api_url}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_api_url: e.target.value }))}
                  placeholder="https://gowa-xxx.sumopod.my.id"
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">Base URL GOWA REST API (SumoPod / self-hosted)</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
                <input
                  type="text"
                  value={configForm.whatsapp_device_id}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_device_id: e.target.value }))}
                  placeholder="628xxx:xx"
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">Format: 628xxx:xx (dari SumoPod)</p>
              </div>
            </div>

            {/* Auth */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={configForm.whatsapp_username}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_username: e.target.value }))}
                  placeholder="admin"
                  className="form-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={configForm.whatsapp_password}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_password: e.target.value }))}
                  placeholder="********"
                  className="form-input"
                />
              </div>
            </div>

            {/* Sender + Webhook */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nomor Pengirim</label>
                <input
                  type="text"
                  value={configForm.whatsapp_sender_number}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_sender_number: e.target.value }))}
                  placeholder="628123456789"
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">Nomor WhatsApp yang login di GOWA</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                <input
                  type="text"
                  value={configForm.whatsapp_webhook_secret}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_webhook_secret: e.target.value }))}
                  placeholder="secret123"
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">Sama dengan WHATSAPP_WEBHOOK_SECRET di SumoPod</p>
              </div>
            </div>

            {/* Delay */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Delay Pesan (ms)</label>
                <input
                  type="number"
                  value={configForm.whatsapp_message_delay}
                  onChange={(e) => setConfigForm((prev) => ({ ...prev, whatsapp_message_delay: e.target.value }))}
                  min={500}
                  max={10000}
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">Delay antar pengiriman pesan (anti-ban). Default: 2000ms</p>
              </div>
            </div>

            {/* Admin numbers */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nomor Admin</label>
              <p className="text-xs text-gray-400 mb-2">Nomor WhatsApp admin penerima notifikasi internal</p>
              <div className="space-y-2">
                {adminNumbers.map((num, i) => (
                  <div key={i} className="flex gap-2">
                    <input
                      type="text"
                      value={num}
                      onChange={(e) => updateAdminNumber(i, e.target.value)}
                      placeholder="628123456789"
                      className="form-input flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => removeAdminNumber(i)}
                      className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-md text-sm"
                    >
                      Hapus
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addAdminNumber}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  + Tambah Nomor Admin
                </button>
              </div>
            </div>

            {/* Connection status */}
            <div className="flex items-center gap-4 mb-6 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <SignalIcon className="w-5 h-5 text-gray-400" />
                <span className="text-sm font-medium">Status Koneksi:</span>
                {connectionStatus === "unknown" && <span className="text-sm text-gray-400">Belum dicek</span>}
                {connectionStatus === "checking" && <span className="text-sm text-yellow-600">Memeriksa...</span>}
                {connectionStatus === "connected" && (
                  <span className="text-sm text-green-600 font-medium">Connected</span>
                )}
                {connectionStatus === "disconnected" && (
                  <span className="text-sm text-red-600 font-medium">Disconnected</span>
                )}
              </div>
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={connectionStatus === "checking"}
                className="btn btn-secondary text-sm"
              >
                Test Koneksi
              </button>
            </div>

            {/* Test send */}
            <div className="mb-6 p-4 border rounded-lg">
              <h3 className="text-sm font-medium mb-3">Test Kirim Pesan</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="628123456789"
                  className="form-input"
                />
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Pesan test..."
                  className="form-input"
                />
              </div>
              <button
                type="button"
                onClick={handleTestSend}
                disabled={isTesting}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <PaperAirplaneIcon className="w-4 h-4" />
                {isTesting ? "Mengirim..." : "Kirim Test"}
              </button>
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveConfig}
                disabled={saveMutation.isPending}
                className="btn btn-primary"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Konfigurasi"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Template Pesan */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {TEMPLATE_GROUPS.map((group) => {
            const isOpen = openGroups[group.title] !== false; // default open
            return (
              <div key={group.title} className="bg-white rounded-lg shadow-sm border overflow-hidden">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((prev) => ({
                      ...prev,
                      [group.title]: !isOpen,
                    }))
                  }
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <h3 className="text-sm font-semibold text-gray-800">{group.title}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{group.templates.length} template</span>
                    {isOpen ? (
                      <ChevronUpIcon className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="border-t divide-y">
                    {group.templates.map((tpl) => (
                      <TemplateCard
                        key={tpl.key}
                        tpl={tpl}
                        value={templateValues[tpl.key] || ""}
                        enabled={templateToggles[tpl.key] !== false}
                        onValueChange={(val) =>
                          setTemplateValues((prev) => ({ ...prev, [tpl.key]: val }))
                        }
                        onToggle={(val) =>
                          setTemplateToggles((prev) => ({ ...prev, [tpl.key]: val }))
                        }
                        onSave={() => handleSaveTemplate(tpl.key)}
                        saving={saveMutation.isPending}
                        showPreview={previewKey === tpl.key}
                        onTogglePreview={() =>
                          setPreviewKey((prev) => (prev === tpl.key ? null : tpl.key))
                        }
                        renderPreview={renderPreview}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tab 3: Bot AI */}
      {activeTab === "bot" && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Bot AI WhatsApp</h2>

            {/* Toggle Bot AI */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b">
              <div>
                <p className="font-medium">Bot AI</p>
                <p className="text-sm text-gray-500">
                  Aktifkan bot AI untuk menjawab pesan donatur secara otomatis
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={botForm.whatsapp_bot_enabled === "true"}
                  onChange={(e) =>
                    setBotForm((prev) => ({
                      ...prev,
                      whatsapp_bot_enabled: e.target.checked ? "true" : "false",
                    }))
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>

            {/* AI Provider */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Provider
                </label>
                <select
                  value={botForm.whatsapp_bot_ai_provider}
                  onChange={(e) =>
                    setBotForm((prev) => ({
                      ...prev,
                      whatsapp_bot_ai_provider: e.target.value,
                      whatsapp_bot_ai_model:
                        e.target.value === "gemini"
                          ? "gemini-2.0-flash"
                          : "claude-sonnet-4-5-20250929",
                    }))
                  }
                  className="form-input"
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="claude">Anthropic Claude</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  AI Model
                </label>
                <input
                  type="text"
                  value={botForm.whatsapp_bot_ai_model}
                  onChange={(e) =>
                    setBotForm((prev) => ({
                      ...prev,
                      whatsapp_bot_ai_model: e.target.value,
                    }))
                  }
                  placeholder={
                    botForm.whatsapp_bot_ai_provider === "gemini"
                      ? "gemini-2.0-flash"
                      : "claude-sonnet-4-5-20250929"
                  }
                  className="form-input"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {botForm.whatsapp_bot_ai_provider === "gemini"
                    ? "Contoh: gemini-2.0-flash, gemini-1.5-pro"
                    : "Contoh: claude-sonnet-4-5-20250929, claude-haiku-4-5-20251001"}
                </p>
              </div>
            </div>

            {/* API Key */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                AI API Key
              </label>
              <input
                type="password"
                value={botForm.whatsapp_bot_ai_api_key}
                onChange={(e) =>
                  setBotForm((prev) => ({
                    ...prev,
                    whatsapp_bot_ai_api_key: e.target.value,
                  }))
                }
                placeholder={
                  botForm.whatsapp_bot_ai_provider === "gemini"
                    ? "AIzaSy..."
                    : "sk-ant-..."
                }
                className="form-input"
              />
              <p className="text-xs text-gray-400 mt-1">
                {botForm.whatsapp_bot_ai_provider === "gemini"
                  ? "API key dari Google AI Studio (aistudio.google.com)"
                  : "API key dari Anthropic Console (console.anthropic.com)"}
              </p>
            </div>

            {/* System Prompt */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                System Prompt
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Instruksi untuk AI bot. Variable yang tersedia: {"{store_name}"},{" "}
                {"{store_website}"}, {"{store_whatsapp}"}
              </p>
              <textarea
                value={botForm.whatsapp_bot_system_prompt}
                onChange={(e) =>
                  setBotForm((prev) => ({
                    ...prev,
                    whatsapp_bot_system_prompt: e.target.value,
                  }))
                }
                rows={16}
                className="form-input w-full font-mono text-sm"
                placeholder="Kamu adalah asisten donasi {store_name} di WhatsApp..."
              />
            </div>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSaveBotConfig}
                disabled={saveMutation.isPending}
                className="btn btn-primary"
              >
                {saveMutation.isPending ? "Menyimpan..." : "Simpan Konfigurasi Bot"}
              </button>
            </div>
          </div>

          {/* Log Viewer */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Riwayat Percakapan Bot</h2>
                <p className="text-sm text-gray-500">
                  Percakapan aktif dalam 30 menit terakhir (in-memory)
                </p>
              </div>
              <button
                type="button"
                onClick={handleLoadBotLogs}
                disabled={logsLoading}
                className="btn btn-secondary text-sm flex items-center gap-2"
              >
                <ArrowPathIcon className={`w-4 h-4 ${logsLoading ? "animate-spin" : ""}`} />
                {logsLoading ? "Memuat..." : "Muat Ulang"}
              </button>
            </div>

            {botLogs.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                {logsLoading
                  ? "Memuat percakapan..."
                  : "Belum ada percakapan aktif. Klik \"Muat Ulang\" untuk melihat."}
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {botLogs.map((log) => (
                  <div
                    key={log.phone}
                    className="border rounded-lg overflow-hidden"
                  >
                    <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">{log.profileName || "Unknown"}</span>
                        <span className="text-xs text-gray-400 ml-2">{log.phone}</span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {new Date(log.lastActivity).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="p-4 space-y-2 max-h-[300px] overflow-y-auto">
                      {log.history.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-gray-100 text-gray-800"
                                : "bg-primary-50 text-primary-900"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
      />
    </SettingsLayout>
  );
}

// ---------------------------------------------------------------------------
// Template card sub-component
// ---------------------------------------------------------------------------

function TemplateCard({
  tpl,
  value,
  enabled,
  onValueChange,
  onToggle,
  onSave,
  saving,
  showPreview,
  onTogglePreview,
  renderPreview,
}: {
  tpl: TemplateInfo;
  value: string;
  enabled: boolean;
  onValueChange: (val: string) => void;
  onToggle: (val: boolean) => void;
  onSave: () => void;
  saving: boolean;
  showPreview: boolean;
  onTogglePreview: () => void;
  renderPreview: (template: string) => string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertVariable = (varName: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = value;
    const before = text.substring(0, start);
    const after = text.substring(end);
    const newVal = `${before}{${varName}}${after}`;
    onValueChange(newVal);
    // Restore cursor position
    setTimeout(() => {
      ta.focus();
      const pos = start + varName.length + 2;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  return (
    <div className="px-5 py-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium text-gray-800">{tpl.label}</p>
          <p className="text-xs text-gray-400">{tpl.description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      {/* Variable chips */}
      <div className="mb-3">
        <p className="text-xs text-gray-500 mb-1">Variable tersedia (klik untuk insert):</p>
        <div className="flex flex-wrap gap-1">
          {tpl.variables.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => insertVariable(v)}
              className="px-2 py-0.5 text-xs bg-primary-50 text-primary-700 rounded hover:bg-primary-100 transition-colors font-mono"
            >
              {`{${v}}`}
            </button>
          ))}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        rows={8}
        className="form-input w-full font-mono text-sm"
        placeholder="Isi template pesan..."
      />

      {/* Actions */}
      <div className="flex items-center justify-between mt-3">
        <button
          type="button"
          onClick={onTogglePreview}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <EyeIcon className="w-4 h-4" />
          {showPreview ? "Sembunyikan Preview" : "Preview"}
        </button>
        <button type="button" onClick={onSave} disabled={saving} className="btn btn-primary text-sm">
          {saving ? "Menyimpan..." : "Simpan Template"}
        </button>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="mt-3 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-xs text-green-700 font-medium mb-2">Preview (dengan data contoh):</p>
          <pre className="text-sm whitespace-pre-wrap text-gray-800 font-sans">
            {renderPreview(value)}
          </pre>
        </div>
      )}
    </div>
  );
}
