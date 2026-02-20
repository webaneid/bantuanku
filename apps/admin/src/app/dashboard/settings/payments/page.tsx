"use client";

import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jsQR from "jsqr";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";

type PaymentProvider = "bank_transfer" | "cash" | "qris" | "xendit" | "ipaymu" | "flip";

interface PaymentMethod {
  id: string;
  provider: PaymentProvider;
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

const programOptions = [
  { value: "general", label: "Umum" },
  { value: "infaq", label: "Infaq/Shodaqoh" },
  { value: "zakat", label: "Zakat" },
  { value: "qurban", label: "Qurban" },
  { value: "wakaf", label: "Wakaf" },
];

const paymentProviders: Array<{ id: PaymentProvider; name: string; description: string }> = [
  {
    id: "bank_transfer",
    name: "Bank Transfer",
    description: "Transfer manual ke rekening bank organisasi",
  },
  {
    id: "cash",
    name: "Tunai / Cash",
    description: "Pembayaran tunai secara langsung",
  },
  {
    id: "qris",
    name: "QRIS",
    description: "Pembayaran menggunakan QRIS",
  },
  {
    id: "xendit",
    name: "Xendit",
    description: "Payment gateway Xendit untuk berbagai metode pembayaran",
  },
  {
    id: "ipaymu",
    name: "iPaymu",
    description: "Payment gateway iPaymu untuk pembayaran digital",
  },
  {
    id: "flip",
    name: "Flip",
    description: "Flip untuk transfer antar bank tanpa biaya admin",
  },
];

// QRIS EMV helpers
function parseQrisTlv(payload: string) {
  const entries: Array<{ tag: string; value: string }> = [];
  let i = 0;
  while (i < payload.length) {
    if (i + 4 > payload.length) break;
    const tag = payload.substring(i, i + 2);
    const len = parseInt(payload.substring(i + 2, i + 4), 10);
    if (isNaN(len) || i + 4 + len > payload.length) break;
    entries.push({ tag, value: payload.substring(i + 4, i + 4 + len) });
    i += 4 + len;
  }
  return entries;
}

function validateQrisCrc(payload: string): boolean {
  if (payload.length < 8) return false;
  const withoutCrc = payload.substring(0, payload.length - 4);
  const existingCrc = payload.substring(payload.length - 4).toUpperCase();
  let crc = 0xffff;
  for (let i = 0; i < withoutCrc.length; i++) {
    crc ^= withoutCrc.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return existingCrc === crc.toString(16).toUpperCase().padStart(4, "0");
}

function parseQrisMerchantInfo(payload: string) {
  const entries = parseQrisTlv(payload);
  const tag59 = entries.find((e) => e.tag === "59");
  const tag60 = entries.find((e) => e.tag === "60");
  return {
    merchantName: tag59?.value || "",
    merchantCity: tag60?.value || "",
  };
}

export default function PaymentsSettingsPage() {
  const queryClient = useQueryClient();
  const [activeProvider, setActiveProvider] = useState<PaymentProvider | null>(null);
  const [enabledProviders, setEnabledProviders] = useState<Set<PaymentProvider>>(new Set());
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [deleteBankAccountId, setDeleteBankAccountId] = useState<string | null>(null);
  const [deleteQrisId, setDeleteQrisId] = useState<string | null>(null);

  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  // Fetch settings from database
  const { data: groupedSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      try {
        const response = await api.get("/admin/settings");
        return response.data?.data || {};
      } catch (error: any) {
        console.error("Settings API error:", error);
        return {};
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  // Fetch COA accounts for bank selection (including cash)
  const { data: coaAccounts } = useQuery({
    queryKey: ["coa-bank-accounts"],
    queryFn: async () => {
      try {
        const response = await api.get("/admin/coa?type=asset");
        const accounts = response.data?.data || [];
        // Filter bank and cash accounts (6201-6210)
        return accounts.filter((acc: any) =>
          acc.code >= "6201" && acc.code <= "6210"
        );
      } catch (error: any) {
        console.error("COA API error:", error);
        return [];
      }
    },
  });

  // Toggle payment method mutation
  const toggleMethodMutation = useMutation({
    mutationFn: async ({ provider, enabled }: { provider: PaymentProvider; enabled: boolean }) => {
      const settingKey = `payment_${provider}_enabled`;
      return api.put("/admin/settings/batch", [
        {
          key: settingKey,
          value: String(enabled),
          category: "payment",
          type: "boolean" as const,
          label: `Enable ${provider}`,
          description: `Enable/disable ${provider} payment method`,
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Metode pembayaran berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal memperbarui metode pembayaran"
      );
    },
  });

  // Bank accounts - bisa lebih dari satu
  const [bankAccounts, setBankAccounts] = useState<
    Array<{
      id: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
      branch: string;
      coaCode?: string;
      programs?: string[];
    }>
  >([]);

  // Form untuk add new bank account
  const [newBankForm, setNewBankForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    branch: "",
    coaCode: "6201",
    programs: ["general"] as string[],
  });

  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [editBankForm, setEditBankForm] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
    branch: "",
    coaCode: "6201",
    programs: ["general"] as string[],
  });

  // Xendit form
  const [xenditForm, setXenditForm] = useState({
    apiKey: "",
    webhookToken: "",
    environment: "production",
  });

  // iPaymu form
  const [iPaymuForm, setIPaymuForm] = useState({
    apiKey: "",
    va: "",
    environment: "production",
  });

  // Flip form
  const [flipForm, setFlipForm] = useState({
    apiKey: "",
    webhookToken: "",
    environment: "production",
  });

  // QRIS accounts (multiple, like bank)
  const [qrisAccounts, setQrisAccounts] = useState<
    Array<{
      id: string;
      name: string;
      imageUrl: string;
      coaCode?: string;
      programs: string[];
      emvPayload?: string;
      merchantName?: string;
      merchantCity?: string;
      isDynamic?: boolean;
    }>
  >([]);
  const [newQrisForm, setNewQrisForm] = useState({
    name: "",
    imageUrl: "",
    coaCode: "6201",
    programs: ["general"] as string[],
    emvPayload: "",
    merchantName: "",
    merchantCity: "",
    isDynamic: false,
  });
  const [editingQrisId, setEditingQrisId] = useState<string | null>(null);
  const [editQrisForm, setEditQrisForm] = useState({
    name: "",
    imageUrl: "",
    coaCode: "6201",
    programs: ["general"] as string[],
    emvPayload: "",
    merchantName: "",
    merchantCity: "",
    isDynamic: false,
  });
  const [showQrisMedia, setShowQrisMedia] = useState(false);
  const [qrisMediaTarget, setQrisMediaTarget] = useState<"new" | "edit">("new");
  const [decodingQr, setDecodingQr] = useState(false);

  const decodeQrFromImage = useCallback(async (imageUrl: string, target: "new" | "edit") => {
    if (!imageUrl) return;
    setDecodingQr(true);
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("Gagal memuat gambar"));
        img.src = imageUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas tidak tersedia");
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (!code || !code.data) {
        showFeedback("error", "QR Tidak Ditemukan", "Tidak dapat membaca QR code dari gambar ini. Pastikan gambar berisi QRIS yang jelas.");
        return;
      }
      const payload = code.data;
      if (!validateQrisCrc(payload)) {
        showFeedback("error", "CRC Invalid", `QR berhasil dibaca tetapi CRC tidak valid. Payload: ${payload.substring(0, 50)}...`);
        return;
      }
      handleEmvPayloadChange(payload, target);
      showFeedback("success", "QR Berhasil Dibaca", `EMV Payload berhasil diekstrak dari gambar QRIS.`);
    } catch (err: any) {
      showFeedback("error", "Gagal Decode", err.message || "Gagal membaca QR dari gambar.");
    } finally {
      setDecodingQr(false);
    }
  }, []);

  // Load data from settings when available
  useEffect(() => {
    if (groupedSettings) {
      const paymentSettings = groupedSettings.payment || [];

      // Load enabled providers
      const enabled = new Set<PaymentProvider>();
      paymentProviders.forEach((provider) => {
        const setting = paymentSettings.find((s: any) => s.key === `payment_${provider.id}_enabled`);
        if (setting && setting.value === "true") {
          enabled.add(provider.id);
        }
      });
      setEnabledProviders(enabled);

      // Load bank accounts from JSON setting
      const bankAccountsSetting = paymentSettings.find((s: any) => s.key === "payment_bank_accounts");
      if (bankAccountsSetting && bankAccountsSetting.value) {
        try {
          const accounts = JSON.parse(bankAccountsSetting.value);
          const normalized = accounts.map((acc: any) => ({
            ...acc,
            programs: acc.programs && acc.programs.length > 0 ? acc.programs : ["general"],
          }));
          setBankAccounts(normalized);
        } catch (e) {
          console.error("Failed to parse bank accounts:", e);
        }
      }

      // Load Xendit config
      const xenditApiKey = paymentSettings.find((s: any) => s.key === "payment_xendit_api_key");
      const xenditWebhook = paymentSettings.find((s: any) => s.key === "payment_xendit_webhook");
      const xenditEnv = paymentSettings.find((s: any) => s.key === "payment_xendit_environment");
      if (xenditApiKey || xenditWebhook || xenditEnv) {
        setXenditForm({
          apiKey: xenditApiKey?.value || "",
          webhookToken: xenditWebhook?.value || "",
          environment: xenditEnv?.value || "production",
        });
      }

      // Load iPaymu config
      const iPaymuApiKey = paymentSettings.find((s: any) => s.key === "payment_ipaymu_api_key");
      const iPaymuVa = paymentSettings.find((s: any) => s.key === "payment_ipaymu_va");
      const iPaymuEnv = paymentSettings.find((s: any) => s.key === "payment_ipaymu_environment");
      if (iPaymuApiKey || iPaymuVa || iPaymuEnv) {
        setIPaymuForm({
          apiKey: iPaymuApiKey?.value || "",
          va: iPaymuVa?.value || "",
          environment: iPaymuEnv?.value || "production",
        });
      }

      // Load Flip config
      const flipApiKey = paymentSettings.find((s: any) => s.key === "payment_flip_api_key");
      const flipWebhook = paymentSettings.find((s: any) => s.key === "payment_flip_webhook");
      const flipEnv = paymentSettings.find((s: any) => s.key === "payment_flip_environment");
      if (flipApiKey || flipWebhook || flipEnv) {
        setFlipForm({
          apiKey: flipApiKey?.value || "",
          webhookToken: flipWebhook?.value || "",
          environment: flipEnv?.value || "production",
        });
      }

      // Load QRIS accounts (multiple)
      const qrisSetting = paymentSettings.find((s: any) => s.key === "payment_qris_accounts");
      if (qrisSetting?.value) {
        try {
          const parsed = JSON.parse(qrisSetting.value);
          const normalized = (parsed || []).map((acc: any) => ({
            id: acc.id || `qris-${Date.now()}`,
            name: acc.name || "",
            imageUrl: acc.imageUrl || "",
            coaCode: acc.coaCode || "6201",
            programs: acc.programs && acc.programs.length > 0 ? acc.programs : ["general"],
            emvPayload: acc.emvPayload || "",
            merchantName: acc.merchantName || "",
            merchantCity: acc.merchantCity || "",
            isDynamic: acc.isDynamic || false,
          }));
          setQrisAccounts(normalized);
        } catch (e) {
          console.error("Failed to parse QRIS accounts:", e);
        }
      }
    }
  }, [groupedSettings]);

  const isProviderEnabled = (provider: PaymentProvider) => {
    return enabledProviders.has(provider);
  };

  const handleToggleProvider = (provider: PaymentProvider) => {
    const currentEnabled = isProviderEnabled(provider);
    toggleMethodMutation.mutate({ provider, enabled: !currentEnabled });
  };

  // Mutation for saving bank accounts
  const saveBankAccountsMutation = useMutation({
    mutationFn: async (accounts: typeof bankAccounts) => {
      return api.put("/admin/settings/batch", [
        {
          key: "payment_bank_accounts",
          value: JSON.stringify(accounts),
          category: "payment",
          type: "json" as const,
          label: "Bank Accounts",
          description: "List of bank accounts for manual transfer",
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Rekening bank berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal memperbarui rekening bank"
      );
    },
  });

  // Mutation for saving Xendit config
  const saveXenditMutation = useMutation({
    mutationFn: async (data: typeof xenditForm) => {
      return api.put("/admin/settings/batch", [
        {
          key: "payment_xendit_api_key",
          value: data.apiKey,
          category: "payment",
          type: "string" as const,
          label: "Xendit API Key",
        },
        {
          key: "payment_xendit_webhook",
          value: data.webhookToken,
          category: "payment",
          type: "string" as const,
          label: "Xendit Webhook Token",
        },
        {
          key: "payment_xendit_environment",
          value: data.environment,
          category: "payment",
          type: "string" as const,
          label: "Xendit Environment",
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Konfigurasi Xendit berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal menyimpan konfigurasi Xendit"
      );
    },
  });

  // Mutation for saving iPaymu config
  const saveIPaymuMutation = useMutation({
    mutationFn: async (data: typeof iPaymuForm) => {
      return api.put("/admin/settings/batch", [
        {
          key: "payment_ipaymu_api_key",
          value: data.apiKey,
          category: "payment",
          type: "string" as const,
          label: "iPaymu API Key",
        },
        {
          key: "payment_ipaymu_va",
          value: data.va,
          category: "payment",
          type: "string" as const,
          label: "iPaymu VA",
        },
        {
          key: "payment_ipaymu_environment",
          value: data.environment,
          category: "payment",
          type: "string" as const,
          label: "iPaymu Environment",
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Konfigurasi iPaymu berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal menyimpan konfigurasi iPaymu"
      );
    },
  });

  // Mutation for saving Flip config
  const saveFlipMutation = useMutation({
    mutationFn: async (data: typeof flipForm) => {
      return api.put("/admin/settings/batch", [
        {
          key: "payment_flip_api_key",
          value: data.apiKey,
          category: "payment",
          type: "string" as const,
          label: "Flip API Key",
        },
        {
          key: "payment_flip_webhook",
          value: data.webhookToken,
          category: "payment",
          type: "string" as const,
          label: "Flip Webhook Token",
        },
        {
          key: "payment_flip_environment",
          value: data.environment,
          category: "payment",
          type: "string" as const,
          label: "Flip Environment",
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "Konfigurasi Flip berhasil disimpan!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal menyimpan konfigurasi Flip"
      );
    },
  });

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const newAccount = {
      id: `bank-${Date.now()}`,
      ...newBankForm,
    };
    const updatedAccounts = [...bankAccounts, newAccount];
    setBankAccounts(updatedAccounts);
    saveBankAccountsMutation.mutate(updatedAccounts);
    setNewBankForm({
      bankName: "",
      accountNumber: "",
      accountName: "",
      branch: "",
      coaCode: "6201",
      programs: ["general"],
    });
  };

  const handleRemoveBankAccount = (id: string) => {
    setDeleteBankAccountId(id);
  };

  const handleConfirmRemoveBankAccount = () => {
    if (!deleteBankAccountId) return;
    const updatedAccounts = bankAccounts.filter((acc) => acc.id !== deleteBankAccountId);
    setBankAccounts(updatedAccounts);
    saveBankAccountsMutation.mutate(updatedAccounts);
    setDeleteBankAccountId(null);
  };

  const handleStartEditBank = (account: typeof bankAccounts[number]) => {
    setEditingBankId(account.id);
    setEditBankForm({
      bankName: account.bankName,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      branch: account.branch,
      coaCode: account.coaCode || "",
      programs: account.programs || ["general"],
    });
  };

  const handleSaveEditBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankId) return;
    const updatedAccounts = bankAccounts.map((acc) =>
      acc.id === editingBankId ? { ...acc, ...editBankForm } : acc
    );
    setBankAccounts(updatedAccounts);
    saveBankAccountsMutation.mutate(updatedAccounts);
    setEditingBankId(null);
  };

  const handleCancelEdit = () => {
    setEditingBankId(null);
  };

  const handleSaveXendit = (e: React.FormEvent) => {
    e.preventDefault();
    saveXenditMutation.mutate(xenditForm);
  };

  const handleSaveIPaymu = (e: React.FormEvent) => {
    e.preventDefault();
    saveIPaymuMutation.mutate(iPaymuForm);
  };

  const handleSaveFlip = (e: React.FormEvent) => {
    e.preventDefault();
    saveFlipMutation.mutate(flipForm);
  };

  // Mutation for saving QRIS accounts
  const saveQrisAccountsMutation = useMutation({
    mutationFn: async (accounts: typeof qrisAccounts) => {
      return api.put("/admin/settings/batch", [
        {
          key: "payment_qris_accounts",
          value: JSON.stringify(accounts),
          category: "payment",
          type: "json" as const,
          label: "QRIS Accounts",
          description: "List of QRIS configurations",
        },
      ]);
    },
    onSuccess: () => {
      showFeedback("success", "Berhasil", "QRIS berhasil diperbarui!");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal memperbarui QRIS"
      );
    },
  });

  const handleAddQris = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQrisForm.emvPayload && !validateQrisCrc(newQrisForm.emvPayload)) {
      showFeedback("error", "CRC Invalid", "EMV Payload QRIS tidak valid. Pastikan string payload benar.");
      return;
    }
    const newAcc = {
      id: `qris-${Date.now()}`,
      ...newQrisForm,
    };
    const updated = [...qrisAccounts, newAcc];
    setQrisAccounts(updated);
    saveQrisAccountsMutation.mutate(updated);
    setNewQrisForm({
      name: "",
      imageUrl: "",
      coaCode: "6201",
      programs: ["general"],
      emvPayload: "",
      merchantName: "",
      merchantCity: "",
      isDynamic: false,
    });
  };

  const handleRemoveQris = (id: string) => {
    setDeleteQrisId(id);
  };

  const handleConfirmRemoveQris = () => {
    if (!deleteQrisId) return;
    const updated = qrisAccounts.filter((acc) => acc.id !== deleteQrisId);
    setQrisAccounts(updated);
    saveQrisAccountsMutation.mutate(updated);
    if (editingQrisId === deleteQrisId) setEditingQrisId(null);
    setDeleteQrisId(null);
  };

  const handleStartEditQris = (acc: typeof qrisAccounts[number]) => {
    setEditingQrisId(acc.id);
    setEditQrisForm({
      name: acc.name,
      imageUrl: acc.imageUrl,
      coaCode: acc.coaCode || "6201",
      programs: acc.programs || ["general"],
      emvPayload: acc.emvPayload || "",
      merchantName: acc.merchantName || "",
      merchantCity: acc.merchantCity || "",
      isDynamic: acc.isDynamic || false,
    });
  };

  const handleSaveEditQris = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQrisId) return;
    if (editQrisForm.emvPayload && !validateQrisCrc(editQrisForm.emvPayload)) {
      showFeedback("error", "CRC Invalid", "EMV Payload QRIS tidak valid. Pastikan string payload benar.");
      return;
    }
    const updated = qrisAccounts.map((acc) =>
      acc.id === editingQrisId ? { ...acc, ...editQrisForm } : acc
    );
    setQrisAccounts(updated);
    saveQrisAccountsMutation.mutate(updated);
    setEditingQrisId(null);
  };

  const handleCancelEditQris = () => {
    setEditingQrisId(null);
  };

  const handleEmvPayloadChange = (payload: string, target: "new" | "edit") => {
    const info = payload ? parseQrisMerchantInfo(payload) : { merchantName: "", merchantCity: "" };
    if (target === "new") {
      setNewQrisForm((prev) => ({
        ...prev,
        emvPayload: payload,
        merchantName: info.merchantName,
        merchantCity: info.merchantCity,
      }));
    } else {
      setEditQrisForm((prev) => ({
        ...prev,
        emvPayload: payload,
        merchantName: info.merchantName,
        merchantCity: info.merchantCity,
      }));
    }
  };

  return (
    <>
    <SettingsLayout>
      <div className="space-y-6">
        {/* Payment Providers List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Metode Pembayaran</h2>
            <p className="text-sm text-gray-600 mt-1">
              Pilih dan konfigurasi metode pembayaran yang tersedia untuk donatur
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {paymentProviders.map((provider) => {
              const enabled = isProviderEnabled(provider.id);
              const isActive = activeProvider === provider.id;

              return (
                <div key={provider.id} className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="flex-shrink-0 mt-1">
                        <input
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToggleProvider(provider.id)}
                          className="w-5 h-5 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-base font-medium text-gray-900">{provider.name}</h3>
                          {enabled && (
                            <CheckCircleIcon className="w-5 h-5 text-success-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{provider.description}</p>
                      </div>
                    </div>

                    {enabled && (
                      <button
                        type="button"
                        onClick={() => setActiveProvider(isActive ? null : provider.id)}
                        className="btn btn-secondary btn-sm whitespace-nowrap"
                      >
                        {isActive ? "Tutup" : "Konfigurasi"}
                      </button>
                    )}
                  </div>

                  {/* Configuration Forms */}
                      {enabled && isActive && (
                        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                          {provider.id === "bank_transfer" && (
                            <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">Rekening Bank</h4>
                            <span className="text-sm text-gray-600">
                              {bankAccounts.length} rekening terdaftar
                            </span>
                          </div>

                          {/* List of existing bank accounts */}
                          {bankAccounts.length > 0 && (
                            <div className="space-y-3">
                              {bankAccounts.map((account) => (
                                <div
                                  key={account.id}
                                  className="bg-white border border-gray-200 rounded-lg p-4"
                                >
                                  {editingBankId === account.id ? (
                                    <form onSubmit={handleSaveEditBank} className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="form-field">
                                          <label className="form-label">Nama Bank</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={editBankForm.bankName}
                                            onChange={(e) =>
                                              setEditBankForm({ ...editBankForm, bankName: e.target.value })
                                            }
                                            required
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Nomor Rekening</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={editBankForm.accountNumber}
                                            onChange={(e) =>
                                              setEditBankForm({ ...editBankForm, accountNumber: e.target.value })
                                            }
                                            required
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Nama Pemilik Rekening</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={editBankForm.accountName}
                                            onChange={(e) =>
                                              setEditBankForm({ ...editBankForm, accountName: e.target.value })
                                            }
                                            required
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Cabang</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={editBankForm.branch}
                                            onChange={(e) =>
                                              setEditBankForm({ ...editBankForm, branch: e.target.value })
                                            }
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Kode Akun (COA)</label>
                                          <select
                                            className="form-input"
                                            value={editBankForm.coaCode}
                                            onChange={(e) =>
                                              setEditBankForm({ ...editBankForm, coaCode: e.target.value })
                                            }
                                            required
                                          >
                                            <option value="">Pilih Kode Akun</option>
                                            {coaAccounts?.map((acc: any) => (
                                              <option key={acc.id} value={acc.code}>
                                                {acc.code} - {acc.name}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Program</label>
                                          <div className="grid grid-cols-2 gap-2">
                                            {programOptions.map((opt) => (
                                              <label key={opt.value} className="flex items-center gap-2 text-sm">
                                                <input
                                                  type="checkbox"
                                                  className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                                  checked={editBankForm.programs.includes(opt.value)}
                                                  onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setEditBankForm((prev) => {
                                                      const current = new Set(prev.programs);
                                                      if (checked) current.add(opt.value);
                                                      else current.delete(opt.value);
                                                      const next = Array.from(current);
                                                      return { ...prev, programs: next.length ? next : ["general"] };
                                                    });
                                                  }}
                                                />
                                                {opt.label}
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEdit}>
                                          Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm">
                                          Simpan Perubahan
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                          <h5 className="font-semibold text-gray-900">
                                            {account.bankName}
                                          </h5>
                                          {account.branch && (
                                            <span className="text-xs text-gray-500">
                                              ({account.branch})
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-1 text-sm">
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">No. Rekening:</span>
                                            <span className="font-mono font-medium text-gray-900">
                                              {account.accountNumber}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-600">Atas Nama:</span>
                                            <span className="text-gray-900">{account.accountName}</span>
                                          </div>
                                          {account.coaCode && (
                                            <div className="flex items-center gap-2">
                                              <span className="text-gray-600">Kode Akun:</span>
                                              <span className="font-mono text-gray-900">{account.coaCode}</span>
                                            </div>
                                          )}
                                          <div className="flex flex-wrap gap-2 mt-2">
                                            {(account.programs || ["general"]).map((p) => {
                                              const label = programOptions.find((opt) => opt.value === p)?.label || p;
                                              return (
                                                <span key={p} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                  {label}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditBank(account)}
                                          className="btn btn-secondary btn-sm"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveBankAccount(account.id)}
                                          className="btn btn-danger btn-sm"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                      {provider.id === "bank_transfer" && (
                        <div className="border-t border-gray-200 pt-4">
                          <h5 className="font-medium text-gray-900 mb-4">Tambah Rekening Baru</h5>
                          <form onSubmit={handleAddBankAccount} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="form-field">
                                    <label className="form-label">
                                      Nama Bank <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={newBankForm.bankName}
                                      onChange={(e) =>
                                        setNewBankForm({ ...newBankForm, bankName: e.target.value })
                                      }
                                      placeholder="Contoh: Bank BCA"
                                      required
                                    />
                                  </div>

                                  <div className="form-field">
                                    <label className="form-label">
                                      Nomor Rekening <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={newBankForm.accountNumber}
                                      onChange={(e) =>
                                        setNewBankForm({ ...newBankForm, accountNumber: e.target.value })
                                      }
                                      placeholder="1234567890"
                                      required
                                    />
                                  </div>

                                  <div className="form-field">
                                    <label className="form-label">
                                      Nama Pemilik Rekening <span className="text-danger-500">*</span>
                                    </label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={newBankForm.accountName}
                                      onChange={(e) =>
                                        setNewBankForm({ ...newBankForm, accountName: e.target.value })
                                      }
                                      placeholder="Yayasan ABC"
                                      required
                                    />
                                  </div>

                                  <div className="form-field">
                                    <label className="form-label">Cabang Bank</label>
                                    <input
                                      type="text"
                                      className="form-input"
                                      value={newBankForm.branch}
                                      onChange={(e) =>
                                        setNewBankForm({ ...newBankForm, branch: e.target.value })
                                      }
                                      placeholder="KCP Jakarta Pusat"
                                    />
                                  </div>

                                  <div className="form-field">
                                    <label className="form-label">
                                      Kode Akun (COA) <span className="text-danger-500">*</span>
                                    </label>
                                    <select
                                      className="form-input"
                                      value={newBankForm.coaCode}
                                      onChange={(e) =>
                                        setNewBankForm({ ...newBankForm, coaCode: e.target.value })
                                      }
                                      required
                                    >
                                      <option value="">Pilih Kode Akun</option>
                                      {coaAccounts?.map((acc: any) => (
                                        <option key={acc.id} value={acc.code}>
                                          {acc.code} - {acc.name}
                                        </option>
                                      ))}
                                    </select>
                                    <p className="text-xs text-gray-500 mt-1">
                                      Pilih akun buku besar untuk rekening ini (contoh: 6203 - Bank BCA)
                                    </p>
                                  </div>
                                  <div className="form-field">
                                    <label className="form-label">Program</label>
                                    <div className="grid grid-cols-2 gap-2">
                                      {programOptions.map((opt) => (
                                        <label key={opt.value} className="flex items-center gap-2 text-sm">
                                          <input
                                            type="checkbox"
                                            className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                            checked={newBankForm.programs.includes(opt.value)}
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setNewBankForm((prev) => {
                                                const current = new Set(prev.programs);
                                                if (checked) current.add(opt.value);
                                                else current.delete(opt.value);
                                                const next = Array.from(current);
                                                return { ...prev, programs: next.length ? next : ["general"] };
                                              });
                                            }}
                                          />
                                          {opt.label}
                                        </label>
                                      ))}
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Pilih program yang menggunakan rekening ini.</p>
                                  </div>
                                </div>

                                <div className="flex justify-end pt-2">
                                  <button type="submit" className="btn btn-primary btn-md">
                                    Tambah Rekening
                                  </button>
                                </div>
                          </form>
                        </div>
                      )}
                        </div>
                      )}

                      {provider.id === "qris" && (
                        <div className="space-y-6">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-gray-900">QRIS</h4>
                            <span className="text-sm text-gray-600">
                              {qrisAccounts.length} QRIS terdaftar
                            </span>
                          </div>

                          {qrisAccounts.length > 0 && (
                            <div className="space-y-3">
                              {qrisAccounts.map((acc) => (
                                <div key={acc.id} className="bg-white border border-gray-200 rounded-lg p-4">
                                  {editingQrisId === acc.id ? (
                                    <form onSubmit={handleSaveEditQris} className="space-y-3">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="form-field">
                                          <label className="form-label">Nama QRIS</label>
                                          <input
                                            type="text"
                                            className="form-input"
                                            value={editQrisForm.name}
                                            onChange={(e) => setEditQrisForm({ ...editQrisForm, name: e.target.value })}
                                            required
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Kode Akun (COA)</label>
                                          <select
                                            className="form-input"
                                            value={editQrisForm.coaCode}
                                            onChange={(e) => setEditQrisForm({ ...editQrisForm, coaCode: e.target.value })}
                                            required
                                          >
                                            <option value="">Pilih Kode Akun</option>
                                            {coaAccounts?.map((acc: any) => (
                                              <option key={acc.id} value={acc.code}>
                                                {acc.code} - {acc.name}
                                              </option>
                                            ))}
                                          </select>
                                          <p className="text-xs text-gray-500 mt-1">
                                            Bank tujuan untuk pencairan QRIS
                                          </p>
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Program</label>
                                          <div className="grid grid-cols-2 gap-2">
                                            {programOptions.map((opt) => (
                                              <label key={opt.value} className="flex items-center gap-2 text-sm">
                                                <input
                                                  type="checkbox"
                                                  className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                                  checked={editQrisForm.programs.includes(opt.value)}
                                                  onChange={(e) => {
                                                    const checked = e.target.checked;
                                                    setEditQrisForm((prev) => {
                                                      const current = new Set(prev.programs);
                                                      if (checked) current.add(opt.value);
                                                      else current.delete(opt.value);
                                                      const next = Array.from(current);
                                                      return { ...prev, programs: next.length ? next : ["general"] };
                                                    });
                                                  }}
                                                />
                                                {opt.label}
                                              </label>
                                            ))}
                                          </div>
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Gambar QRIS</label>
                                          <div className="flex items-center gap-3">
                                            {editQrisForm.imageUrl ? (
                                              <img
                                                src={editQrisForm.imageUrl}
                                                alt="QRIS"
                                                className="h-16 w-16 object-contain rounded border"
                                              />
                                            ) : (
                                              <div className="h-16 w-16 border rounded flex items-center justify-center text-xs text-gray-400">
                                                Belum ada
                                              </div>
                                            )}
                                            <button
                                              type="button"
                                              className="btn btn-secondary btn-sm"
                                              onClick={() => {
                                                setQrisMediaTarget("edit");
                                                setShowQrisMedia(true);
                                              }}
                                            >
                                              Pilih / Ganti
                                            </button>
                                            {editQrisForm.imageUrl && (
                                              <button
                                                type="button"
                                                className="btn btn-secondary btn-sm"
                                                onClick={() => setEditQrisForm({ ...editQrisForm, imageUrl: "" })}
                                              >
                                                Hapus
                                              </button>
                                            )}
                                          </div>
                                        </div>
                                        <div className="form-field md:col-span-2">
                                          <div className="flex items-center justify-between mb-1">
                                            <label className="form-label mb-0">EMV Payload</label>
                                            {editQrisForm.imageUrl && (
                                              <button
                                                type="button"
                                                className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                                disabled={decodingQr}
                                                onClick={() => decodeQrFromImage(editQrisForm.imageUrl, "edit")}
                                              >
                                                {decodingQr ? "Membaca QR..." : "Decode dari Gambar"}
                                              </button>
                                            )}
                                          </div>
                                          <textarea
                                            className="form-input font-mono text-xs"
                                            rows={3}
                                            value={editQrisForm.emvPayload}
                                            onChange={(e) => handleEmvPayloadChange(e.target.value, "edit")}
                                            placeholder="Paste string EMV QRIS static di sini, atau klik 'Decode dari Gambar'..."
                                          />
                                          <p className="text-xs text-gray-500 mt-1">
                                            Upload gambar QRIS di atas untuk auto-decode, atau paste manual string EMV payload.
                                          </p>
                                          {editQrisForm.emvPayload && !validateQrisCrc(editQrisForm.emvPayload) && (
                                            <p className="text-xs text-red-500 mt-1 font-medium">CRC tidak valid. Pastikan payload benar.</p>
                                          )}
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Merchant Name</label>
                                          <input
                                            type="text"
                                            className="form-input bg-gray-50"
                                            value={editQrisForm.merchantName}
                                            readOnly
                                            placeholder="Auto-parse dari EMV Payload"
                                          />
                                        </div>
                                        <div className="form-field">
                                          <label className="form-label">Merchant City</label>
                                          <input
                                            type="text"
                                            className="form-input bg-gray-50"
                                            value={editQrisForm.merchantCity}
                                            readOnly
                                            placeholder="Auto-parse dari EMV Payload"
                                          />
                                        </div>
                                        <div className="form-field md:col-span-2">
                                          <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                              type="checkbox"
                                              className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                              checked={editQrisForm.isDynamic}
                                              onChange={(e) => setEditQrisForm({ ...editQrisForm, isDynamic: e.target.checked })}
                                            />
                                            <span className="text-sm font-medium text-gray-900">Dynamic Mode</span>
                                          </label>
                                          <p className="text-xs text-gray-500 mt-1 ml-7">
                                            Jika aktif, sistem akan generate QR per-transaksi dengan nominal terkunci. Memerlukan EMV Payload.
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex justify-end gap-2">
                                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleCancelEditQris}>
                                          Batal
                                        </button>
                                        <button type="submit" className="btn btn-primary btn-sm">
                                          Simpan Perubahan
                                        </button>
                                      </div>
                                    </form>
                                  ) : (
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-2">
                                          {acc.imageUrl ? (
                                            <img src={acc.imageUrl} alt="QRIS" className="h-12 w-12 object-contain rounded border" />
                                          ) : (
                                            <div className="h-12 w-12 border rounded flex items-center justify-center text-xs text-gray-400">
                                              -
                                            </div>
                                          )}
                                          <div>
                                            <div className="flex items-center gap-2">
                                              <h5 className="font-semibold text-gray-900">{acc.name || "QRIS"}</h5>
                                              {acc.isDynamic && (
                                                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Dynamic</span>
                                              )}
                                            </div>
                                            {acc.coaCode && (
                                              <p className="text-sm text-gray-600">COA: {acc.coaCode}</p>
                                            )}
                                            {acc.merchantName && (
                                              <p className="text-sm text-gray-600">Merchant: {acc.merchantName}{acc.merchantCity ? `, ${acc.merchantCity}` : ""}</p>
                                            )}
                                          </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mt-2">
                                          {(acc.programs || ["general"]).map((p) => {
                                            const label = programOptions.find((opt) => opt.value === p)?.label || p;
                                            return (
                                              <span key={p} className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                                                {label}
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      <div className="flex flex-col gap-2 flex-shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => handleStartEditQris(acc)}
                                          className="btn btn-secondary btn-sm"
                                        >
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleRemoveQris(acc.id)}
                                          className="btn btn-danger btn-sm"
                                        >
                                          Hapus
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add new QRIS */}
                          <div className="border-t border-gray-200 pt-4">
                            <h5 className="font-medium text-gray-900 mb-4">Tambah QRIS Baru</h5>
                            <form onSubmit={handleAddQris} className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="form-field">
                                  <label className="form-label">
                                    Nama QRIS <span className="text-danger-500">*</span>
                                  </label>
                                  <input
                                    type="text"
                                    className="form-input"
                                    value={newQrisForm.name}
                                    onChange={(e) =>
                                      setNewQrisForm({ ...newQrisForm, name: e.target.value })
                                    }
                                    placeholder="Contoh: QRIS BCA, QRIS BSI"
                                    required
                                  />
                                </div>
                                <div className="form-field">
                                  <label className="form-label">
                                    Kode Akun (COA) <span className="text-danger-500">*</span>
                                  </label>
                                  <select
                                    className="form-input"
                                    value={newQrisForm.coaCode}
                                    onChange={(e) =>
                                      setNewQrisForm({ ...newQrisForm, coaCode: e.target.value })
                                    }
                                    required
                                  >
                                    <option value="">Pilih Kode Akun</option>
                                    {coaAccounts?.map((acc: any) => (
                                      <option key={acc.id} value={acc.code}>
                                        {acc.code} - {acc.name}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-xs text-gray-500 mt-1">
                                    Bank tujuan untuk pencairan QRIS
                                  </p>
                                </div>
                                <div className="form-field">
                                  <label className="form-label">Program</label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {programOptions.map((opt) => (
                                      <label key={opt.value} className="flex items-center gap-2 text-sm">
                                        <input
                                          type="checkbox"
                                          className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                          checked={newQrisForm.programs.includes(opt.value)}
                                          onChange={(e) => {
                                            const checked = e.target.checked;
                                            setNewQrisForm((prev) => {
                                              const current = new Set(prev.programs);
                                              if (checked) current.add(opt.value);
                                              else current.delete(opt.value);
                                              const next = Array.from(current);
                                              return { ...prev, programs: next.length ? next : ["general"] };
                                            });
                                          }}
                                        />
                                        {opt.label}
                                      </label>
                                    ))}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-1">Pilih program yang menggunakan QRIS ini.</p>
                                </div>
                                <div className="form-field">
                                  <label className="form-label">Gambar QRIS</label>
                                  <div className="flex items-center gap-3">
                                    {newQrisForm.imageUrl ? (
                                      <img
                                        src={newQrisForm.imageUrl}
                                        alt="QRIS"
                                        className="h-16 w-16 object-contain rounded border"
                                      />
                                    ) : (
                                      <div className="h-16 w-16 border rounded flex items-center justify-center text-xs text-gray-400">
                                        Belum ada
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => {
                                        setQrisMediaTarget("new");
                                        setShowQrisMedia(true);
                                      }}
                                    >
                                      Pilih / Ganti
                                    </button>
                                    {newQrisForm.imageUrl && (
                                      <button
                                        type="button"
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => setNewQrisForm({ ...newQrisForm, imageUrl: "" })}
                                      >
                                        Hapus
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className="form-field md:col-span-2">
                                  <div className="flex items-center justify-between mb-1">
                                    <label className="form-label mb-0">EMV Payload</label>
                                    {newQrisForm.imageUrl && (
                                      <button
                                        type="button"
                                        className="text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                                        disabled={decodingQr}
                                        onClick={() => decodeQrFromImage(newQrisForm.imageUrl, "new")}
                                      >
                                        {decodingQr ? "Membaca QR..." : "Decode dari Gambar"}
                                      </button>
                                    )}
                                  </div>
                                  <textarea
                                    className="form-input font-mono text-xs"
                                    rows={3}
                                    value={newQrisForm.emvPayload}
                                    onChange={(e) => handleEmvPayloadChange(e.target.value, "new")}
                                    placeholder="Paste string EMV QRIS static di sini, atau klik 'Decode dari Gambar'..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Upload gambar QRIS di atas untuk auto-decode, atau paste manual string EMV payload.
                                  </p>
                                  {newQrisForm.emvPayload && !validateQrisCrc(newQrisForm.emvPayload) && (
                                    <p className="text-xs text-red-500 mt-1 font-medium">CRC tidak valid. Pastikan payload benar.</p>
                                  )}
                                </div>
                                <div className="form-field">
                                  <label className="form-label">Merchant Name</label>
                                  <input
                                    type="text"
                                    className="form-input bg-gray-50"
                                    value={newQrisForm.merchantName}
                                    readOnly
                                    placeholder="Auto-parse dari EMV Payload"
                                  />
                                </div>
                                <div className="form-field">
                                  <label className="form-label">Merchant City</label>
                                  <input
                                    type="text"
                                    className="form-input bg-gray-50"
                                    value={newQrisForm.merchantCity}
                                    readOnly
                                    placeholder="Auto-parse dari EMV Payload"
                                  />
                                </div>
                                <div className="form-field md:col-span-2">
                                  <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      className="w-4 h-4 text-primary-600 border-gray-300 rounded"
                                      checked={newQrisForm.isDynamic}
                                      onChange={(e) => setNewQrisForm({ ...newQrisForm, isDynamic: e.target.checked })}
                                    />
                                    <span className="text-sm font-medium text-gray-900">Dynamic Mode</span>
                                  </label>
                                  <p className="text-xs text-gray-500 mt-1 ml-7">
                                    Jika aktif, sistem akan generate QR per-transaksi dengan nominal terkunci. Memerlukan EMV Payload.
                                  </p>
                                </div>
                              </div>

                              <div className="flex justify-end pt-2">
                                <button type="submit" className="btn btn-primary btn-md">
                                  Tambah QRIS
                                </button>
                              </div>
                            </form>
                          </div>
                        </div>
                      )}

                      {provider.id === "xendit" && (
                        <form onSubmit={handleSaveXendit} className="space-y-4">
                          <h4 className="font-medium text-gray-900 mb-4">Konfigurasi Xendit</h4>

                          <div className="space-y-4">
                            <div className="form-field">
                              <label className="form-label">
                                API Key <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="password"
                                className="form-input font-mono text-sm"
                                value={xenditForm.apiKey}
                                onChange={(e) => setXenditForm({ ...xenditForm, apiKey: e.target.value })}
                                placeholder="xnd_public_..."
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">
                                Webhook Token <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="password"
                                className="form-input font-mono text-sm"
                                value={xenditForm.webhookToken}
                                onChange={(e) =>
                                  setXenditForm({ ...xenditForm, webhookToken: e.target.value })
                                }
                                placeholder="whsec_..."
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">Environment</label>
                              <select
                                className="form-input"
                                value={xenditForm.environment}
                                onChange={(e) =>
                                  setXenditForm({ ...xenditForm, environment: e.target.value })
                                }
                              >
                                <option value="production">Production</option>
                                <option value="sandbox">Sandbox (Testing)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button type="submit" className="btn btn-primary btn-md">
                              Simpan Konfigurasi
                            </button>
                          </div>
                        </form>
                      )}

                      {provider.id === "ipaymu" && (
                        <form onSubmit={handleSaveIPaymu} className="space-y-4">
                          <h4 className="font-medium text-gray-900 mb-4">Konfigurasi iPaymu</h4>

                          <div className="space-y-4">
                            <div className="form-field">
                              <label className="form-label">
                                API Key <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="password"
                                className="form-input font-mono text-sm"
                                value={iPaymuForm.apiKey}
                                onChange={(e) => setIPaymuForm({ ...iPaymuForm, apiKey: e.target.value })}
                                placeholder="API Key dari iPaymu"
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">
                                Virtual Account (VA) <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="text"
                                className="form-input font-mono text-sm"
                                value={iPaymuForm.va}
                                onChange={(e) => setIPaymuForm({ ...iPaymuForm, va: e.target.value })}
                                placeholder="Virtual Account Number"
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">Environment</label>
                              <select
                                className="form-input"
                                value={iPaymuForm.environment}
                                onChange={(e) => setIPaymuForm({ ...iPaymuForm, environment: e.target.value })}
                              >
                                <option value="production">Production</option>
                                <option value="sandbox">Sandbox (Testing)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button type="submit" className="btn btn-primary btn-md">
                              Simpan Konfigurasi
                            </button>
                          </div>
                        </form>
                      )}

                      {provider.id === "flip" && (
                        <form onSubmit={handleSaveFlip} className="space-y-4">
                          <h4 className="font-medium text-gray-900 mb-4">Konfigurasi Flip</h4>

                          <div className="space-y-4">
                            <div className="form-field">
                              <label className="form-label">
                                API Key <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="password"
                                className="form-input font-mono text-sm"
                                value={flipForm.apiKey}
                                onChange={(e) => setFlipForm({ ...flipForm, apiKey: e.target.value })}
                                placeholder="API Key dari Flip"
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">
                                Webhook Token <span className="text-danger-500">*</span>
                              </label>
                              <input
                                type="password"
                                className="form-input font-mono text-sm"
                                value={flipForm.webhookToken}
                                onChange={(e) => setFlipForm({ ...flipForm, webhookToken: e.target.value })}
                                placeholder="Webhook Token"
                                required
                              />
                            </div>

                            <div className="form-field">
                              <label className="form-label">Environment</label>
                              <select
                                className="form-input"
                                value={flipForm.environment}
                                onChange={(e) => setFlipForm({ ...flipForm, environment: e.target.value })}
                              >
                                <option value="production">Production</option>
                                <option value="sandbox">Sandbox (Testing)</option>
                              </select>
                            </div>
                          </div>

                          <div className="flex justify-end pt-2">
                            <button type="submit" className="btn btn-primary btn-md">
                              Simpan Konfigurasi
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </SettingsLayout>

    {deleteBankAccountId && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Hapus Rekening</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700">Hapus rekening bank ini?</p>
          </div>
          <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setDeleteBankAccountId(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger btn-md"
              onClick={handleConfirmRemoveBankAccount}
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    )}

    {deleteQrisId && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">Hapus QRIS</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-700">Hapus QRIS ini?</p>
          </div>
          <div className="p-6 border-t border-gray-200 flex gap-3 justify-end">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => setDeleteQrisId(null)}
            >
              Batal
            </button>
            <button
              type="button"
              className="btn btn-danger btn-md"
              onClick={handleConfirmRemoveQris}
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    )}

    <MediaLibrary
      isOpen={showQrisMedia}
      onClose={() => setShowQrisMedia(false)}
      onSelect={(url) => {
        if (qrisMediaTarget === "edit") {
          setEditQrisForm((prev) => ({ ...prev, imageUrl: url }));
        } else {
          setNewQrisForm((prev) => ({ ...prev, imageUrl: url }));
        }
        setShowQrisMedia(false);
        // Auto-decode QR from selected image
        decodeQrFromImage(url, qrisMediaTarget);
      }}
      category="financial"
      selectedUrl={qrisMediaTarget === "edit" ? editQrisForm.imageUrl : newQrisForm.imageUrl}
    />

    <FeedbackDialog
      open={feedback.open}
      type={feedback.type}
      title={feedback.title}
      message={feedback.message}
      onClose={() => setFeedback((prev) => ({ ...prev, open: false }))}
    />
    </>
  );
}
