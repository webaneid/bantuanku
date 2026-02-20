"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { ArrowLeftIcon, PlusIcon } from "@heroicons/react/24/outline";
import Autocomplete, { type AutocompleteOption } from "@/components/Autocomplete";
import { EXPENSE_CATEGORIES } from "@/lib/constants/categories";
import VendorModal from "@/components/modals/VendorModal";
import EmployeeModal from "@/components/modals/EmployeeModal";
import MustahiqModal from "@/components/modals/MustahiqModal";
import AdminPaymentMethodList from "@/components/AdminPaymentMethodList";
import { useAuth } from "@/lib/auth";

type DisbursementType = "campaign" | "zakat" | "qurban" | "operational" | "vendor" | "revenue_share";
type RecipientType = "vendor" | "employee" | "mustahiq" | "fundraiser" | "mitra" | "manual";
const DEVELOPER_RECIPIENT_NAME = "Webane Indonesia";
const DEVELOPER_RECIPIENT_CONTACT = "085210626455";

export default function CreateDisbursementPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const isCoordinator = user?.roles?.includes("program_coordinator") && !user?.roles?.includes("super_admin") && !user?.roles?.includes("admin_finance") && !user?.roles?.includes("admin_campaign");
  const isMitra = user?.roles?.length === 1 && user?.roles?.includes("mitra");
  const isEmployeeOnly = user?.roles?.includes("employee") &&
    !user?.roles?.includes("super_admin") &&
    !user?.roles?.includes("admin_finance") &&
    !user?.roles?.includes("admin_campaign") &&
    !user?.roles?.includes("program_coordinator");
  const canManageRevenueShare = !!user?.roles?.includes("super_admin") || !!user?.roles?.includes("admin_finance");
  const canUseRevenueShare = canManageRevenueShare || !!isMitra;

  const [formData, setFormData] = useState({
    disbursement_type: "" as DisbursementType | "",
    reference_type: "",
    reference_id: "",
    reference_name: "",
    amount: "",
    category: "",
    source_bank_id: "",
    recipient_type: "" as RecipientType | "",
    recipient_id: "",
    recipient_name: "",
    recipient_contact: "",
    recipient_bank_name: "",
    recipient_bank_account: "",
    recipient_bank_account_name: "",
    purpose: "",
    description: "",
    notes: "",
    payment_method: "",
    type_specific_data: {} as Record<string, any>,
  });

  // Modal states for creating new recipients
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showMustahiqModal, setShowMustahiqModal] = useState(false);
  const [showBankAccountModal, setShowBankAccountModal] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState("");
  const [newBankAccount, setNewBankAccount] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
  });

  // Fetch coordinator's own employee record
  const { data: myEmployeeData } = useQuery({
    queryKey: ["my-employee-record"],
    queryFn: async () => {
      const response = await api.get("/admin/employees", {
        params: { page: 1, limit: 100, status: "active" },
      });
      const allEmployees = response.data?.data || [];
      return allEmployees.find((emp: any) => emp.userId === user?.id) || null;
    },
    enabled: !!isCoordinator || !!isEmployeeOnly,
  });

  // Fetch mitra record for self-service flow
  const { data: myMitraData } = useQuery({
    queryKey: ["my-mitra-record"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra/me");
      return response.data?.data || null;
    },
    enabled: !!isMitra,
  });

  const { data: developerBankAccountsData } = useQuery({
    queryKey: ["developer-bank-accounts", user?.id],
    queryFn: async () => {
      const response = await api.get("/admin/settings/developer/rekening");
      return response.data?.data?.bankAccounts || [];
    },
    enabled:
      canManageRevenueShare &&
      formData.disbursement_type === "revenue_share" &&
      formData.category === "revenue_share_developer",
  });

  // Auto-set recipient for coordinator
  useEffect(() => {
    if ((isCoordinator || isEmployeeOnly) && myEmployeeData) {
      setFormData(prev => ({
        ...prev,
        recipient_type: "employee" as RecipientType,
        recipient_id: myEmployeeData.id,
        recipient_name: myEmployeeData.name,
        recipient_contact: myEmployeeData.phone || "",
      }));
    }
  }, [isCoordinator, isEmployeeOnly, myEmployeeData]);

  // Set disbursement type from query params or lock for employee-only
  useEffect(() => {
    if (isEmployeeOnly) {
      setFormData(prev => ({ ...prev, disbursement_type: "campaign" as DisbursementType }));
      return;
    }
    const type = searchParams.get("type");
    if (type && ["campaign", "zakat", "qurban", "operational", "vendor", "revenue_share"].includes(type)) {
      setFormData(prev => ({ ...prev, disbursement_type: type as DisbursementType }));
    }
  }, [searchParams, isEmployeeOnly]);

  // Fetch bank accounts (source banks from bank_accounts table)
  const { data: banksData } = useQuery({
    queryKey: ["bank-accounts-source"],
    queryFn: async () => {
      const response = await api.get("/admin/bank-accounts/source");
      return response.data;
    },
    enabled: !isMitra,
  });

  // Fetch campaigns (if campaign type)
  const { data: campaignsData } = useQuery({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const response = await api.get("/admin/campaigns", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
    enabled: formData.disbursement_type === "campaign",
  });

  // Fetch zakat types (if zakat type)
  const { data: zakatTypesData } = useQuery({
    queryKey: ["zakat-types"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { limit: 100 },
      });
      return response.data;
    },
    enabled: formData.disbursement_type === "zakat",
  });

  // Fetch zakat periods based on selected zakat type
  const { data: zakatPeriodsData } = useQuery({
    queryKey: ["zakat-periods", formData.type_specific_data.zakat_type_id],
    queryFn: async () => {
      if (!formData.type_specific_data.zakat_type_id) return { data: [] };
      const response = await api.get("/admin/zakat/periods", {
        params: {
          zakatTypeId: formData.type_specific_data.zakat_type_id,
          status: "active",
          limit: 100
        },
      });
      return response.data;
    },
    enabled: formData.disbursement_type === "zakat" && !!formData.type_specific_data.zakat_type_id,
  });

  // Fetch qurban periods (if qurban type)
  const { data: qurbanPeriodsData } = useQuery({
    queryKey: ["qurban-periods"],
    queryFn: async () => {
      const response = await api.get("/admin/qurban/periods");
      return response.data;
    },
    enabled: formData.disbursement_type === "qurban",
  });

  // Fetch qurban period summary
  const { data: qurbanSummaryData } = useQuery({
    queryKey: ["qurban-summary", formData.reference_id],
    queryFn: async () => {
      const response = await api.get(`/admin/qurban/periods/${formData.reference_id}/summary`);
      return response.data;
    },
    enabled: formData.disbursement_type === "qurban" && !!formData.reference_id,
  });

  // Fetch vendors
  const { data: vendorsData } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await api.get("/admin/vendors", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
    enabled: !isMitra && formData.recipient_type === "vendor",
  });

  // Fetch employees
  const { data: employeesData } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const response = await api.get("/admin/employees", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
    enabled: !isMitra && formData.recipient_type === "employee",
  });

  // Fetch mustahiqs
  const { data: mustahiqsData } = useQuery({
    queryKey: ["mustahiqs"],
    queryFn: async () => {
      const response = await api.get("/admin/mustahiqs", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
    enabled: !isMitra && formData.recipient_type === "mustahiq",
  });

  // Fetch fundraisers (for revenue share payout)
  const { data: fundraisersData } = useQuery({
    queryKey: ["fundraisers", "active-for-disbursement"],
    queryFn: async () => {
      const response = await api.get("/admin/fundraisers", {
        params: { page: 1, limit: 100, status: "active" },
      });
      return response.data;
    },
    enabled: canManageRevenueShare && formData.disbursement_type === "revenue_share",
  });

  // Fetch mitra (for revenue share payout)
  const { data: mitraData } = useQuery({
    queryKey: ["mitra", "verified-for-disbursement"],
    queryFn: async () => {
      const response = await api.get("/admin/mitra", {
        params: { page: 1, limit: 100, status: "verified" },
      });
      return response.data;
    },
    enabled: canManageRevenueShare && formData.disbursement_type === "revenue_share",
  });

  // Fetch bank accounts for selected recipient
  const { data: recipientBankAccountsData, refetch: refetchBankAccounts } = useQuery({
    queryKey: ["recipient-bank-accounts", formData.recipient_type, formData.recipient_id, isMitra],
    queryFn: async () => {
      if (!formData.recipient_id || !formData.recipient_type) return [];
      if (formData.recipient_type === "manual") return [];

      if (formData.recipient_type === "fundraiser") {
        const response = await api.get(`/admin/fundraisers/${formData.recipient_id}`);
        return response.data?.data?.bankAccounts || [];
      }

      if (formData.recipient_type === "mitra") {
        const response = isMitra
          ? await api.get("/admin/mitra/me")
          : await api.get(`/admin/mitra/${formData.recipient_id}`);
        return response.data?.data?.bankAccounts || [];
      }

      const response = await api.get(`/admin/${formData.recipient_type}s/${formData.recipient_id}`);
      return response.data?.data?.bankAccounts || [];
    },
    enabled: !!formData.recipient_id && !!formData.recipient_type,
  });
  const recipientBankAccounts = recipientBankAccountsData || [];
  const developerBankAccounts = developerBankAccountsData || [];
  const isRevenueShareDeveloperRecipient =
    formData.disbursement_type === "revenue_share" &&
    formData.category === "revenue_share_developer";

  // Fetch centralized disbursement stats for reference (always shows ALL disbursements from ALL admins)
  const { data: referenceStatsData } = useQuery({
    queryKey: ["disbursement-reference-stats", formData.reference_id, formData.disbursement_type],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements/reference-stats", {
        params: {
          reference_id: formData.reference_id,
          disbursement_type: formData.disbursement_type,
        },
      });
      return response.data?.data;
    },
    enabled: !!formData.reference_id && ["campaign", "zakat", "qurban"].includes(formData.disbursement_type),
  });

  // Fetch available funds based on reference (using centralized stats)
  const { data: availableFundsData } = useQuery({
    queryKey: ["available-funds", formData.disbursement_type, formData.reference_id, formData.category, referenceStatsData],
    queryFn: async () => {
      if (!formData.reference_id) return null;

      // Use centralized stats that include ALL disbursements from ALL admins
      const totalDisbursed = referenceStatsData?.totalCommitted || 0;

      if (formData.disbursement_type === "campaign") {
        const campaignResponse = await api.get(`/admin/campaigns/${formData.reference_id}`);
        const campaign = campaignResponse.data?.data;
        const isBeneficiaryCategory = formData.category === "campaign_to_beneficiary";
        const isWakaf = (campaign?.pillar || "").toLowerCase() === "wakaf";
        const collectedAmount = isBeneficiaryCategory
          ? (isWakaf ? (campaign?.collected || 0) : (referenceStatsData?.totalProgramAmount || 0))
          : (campaign?.collected || 0);

        return {
          collected: collectedAmount,
          disbursed: totalDisbursed,
          available: collectedAmount - totalDisbursed,
        };
      } else if (formData.disbursement_type === "zakat") {
        const collectedAmount = referenceStatsData?.totalProgramAmount || 0;

        return {
          collected: collectedAmount,
          disbursed: totalDisbursed,
          available: collectedAmount - totalDisbursed,
        };
      } else if (formData.disbursement_type === "qurban") {
        const summary = qurbanSummaryData?.data;
        const category = formData.category;

        if (category === "qurban_purchase_sapi") {
          return {
            collected: summary?.collectedSapi || 0,
            disbursed: summary?.disbursedSapi || 0,
            available: summary?.availableSapi || 0,
          };
        } else if (category === "qurban_purchase_kambing") {
          return {
            collected: summary?.collectedKambing || 0,
            disbursed: summary?.disbursedKambing || 0,
            available: summary?.availableKambing || 0,
          };
        } else if (category === "qurban_execution_fee") {
          return {
            collected: summary?.collectedAdmin || 0,
            disbursed: summary?.disbursedAdmin || 0,
            available: summary?.availableAdmin || 0,
          };
        }
        return null;
      }
      return null;
    },
    enabled: !!formData.reference_id && !!formData.category && ["campaign", "zakat", "qurban"].includes(formData.disbursement_type) && referenceStatsData !== undefined,
  });

  const revenueShareCategorySelected = [
    "revenue_share_mitra",
    "revenue_share_fundraiser",
    "revenue_share_developer",
  ].includes(formData.category);

  const { data: revenueShareAvailableData } = useQuery({
    queryKey: ["revenue-share-available", formData.category, formData.recipient_id],
    queryFn: async () => {
      const response = await api.get("/admin/disbursements/revenue-share/available", {
        params: {
          category: formData.category,
          recipient_id: formData.recipient_id || undefined,
        },
      });
      return response.data?.data;
    },
    enabled:
      canUseRevenueShare &&
      formData.disbursement_type === "revenue_share" &&
      revenueShareCategorySelected &&
      (formData.category === "revenue_share_developer" || !!formData.recipient_id),
  });

  useEffect(() => {
    if (!isMitra || !myMitraData) return;

    const defaultBank = (myMitraData.bankAccounts || [])[0];
    const shouldUpdateRecipient =
      formData.recipient_type !== "mitra" ||
      formData.recipient_id !== myMitraData.id ||
      formData.recipient_name !== (myMitraData.name || "") ||
      formData.recipient_contact !== (myMitraData.phone || myMitraData.whatsappNumber || "") ||
      formData.recipient_bank_name !== (defaultBank?.bankName || "") ||
      formData.recipient_bank_account !== (defaultBank?.accountNumber || "") ||
      formData.recipient_bank_account_name !== (defaultBank?.accountHolderName || "");
    if (!shouldUpdateRecipient) return;

    setSelectedBankAccountId(defaultBank?.id || "");
    setFormData((prev) => ({
      ...prev,
      recipient_type: "mitra",
      recipient_id: myMitraData.id,
      recipient_name: myMitraData.name || "",
      recipient_contact: myMitraData.phone || myMitraData.whatsappNumber || "",
      recipient_bank_name: defaultBank?.bankName || "",
      recipient_bank_account: defaultBank?.accountNumber || "",
      recipient_bank_account_name: defaultBank?.accountHolderName || "",
    }));
  }, [
    isMitra,
    myMitraData,
    formData.disbursement_type,
    formData.recipient_type,
    formData.recipient_id,
    formData.recipient_name,
    formData.recipient_contact,
    formData.recipient_bank_name,
    formData.recipient_bank_account,
    formData.recipient_bank_account_name,
  ]);

  useEffect(() => {
    if (!isRevenueShareDeveloperRecipient) return;

    const selectedDeveloperBank =
      developerBankAccounts.find((acc: any) => acc.id === selectedBankAccountId) ||
      developerBankAccounts[0];

    const shouldUpdateRecipient =
      formData.recipient_type !== "manual" ||
      formData.recipient_id !== "developer_platform" ||
      formData.recipient_name !== DEVELOPER_RECIPIENT_NAME ||
      formData.recipient_contact !== DEVELOPER_RECIPIENT_CONTACT ||
      formData.recipient_bank_name !== (selectedDeveloperBank?.bankName || "") ||
      formData.recipient_bank_account !== (selectedDeveloperBank?.accountNumber || "") ||
      formData.recipient_bank_account_name !== (selectedDeveloperBank?.accountHolderName || "");

    if (!shouldUpdateRecipient) return;

    if (!selectedBankAccountId && selectedDeveloperBank?.id) {
      setSelectedBankAccountId(selectedDeveloperBank.id);
    }

    setFormData((prev) => ({
      ...prev,
      recipient_type: "manual",
      recipient_id: "developer_platform",
      recipient_name: DEVELOPER_RECIPIENT_NAME,
      recipient_contact: DEVELOPER_RECIPIENT_CONTACT,
      recipient_bank_name: selectedDeveloperBank?.bankName || "",
      recipient_bank_account: selectedDeveloperBank?.accountNumber || "",
      recipient_bank_account_name: selectedDeveloperBank?.accountHolderName || "",
    }));
  }, [
    isRevenueShareDeveloperRecipient,
    developerBankAccounts,
    selectedBankAccountId,
    formData.recipient_type,
    formData.recipient_id,
    formData.recipient_name,
    formData.recipient_contact,
    formData.recipient_bank_name,
    formData.recipient_bank_account,
    formData.recipient_bank_account_name,
  ]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/disbursements", {
        ...data,
        amount: parseFloat(data.amount),
      });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["disbursements"] });
      router.push(`/dashboard/disbursements/${data.data.id}`);
    },
  });

  const createBankAccountMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/admin/bank-accounts/entity", {
        entityType: formData.recipient_type,
        entityId: formData.recipient_id,
        ...data,
      });
      return response.data;
    },
    onSuccess: () => {
      refetchBankAccounts();
      setShowBankAccountModal(false);
      setNewBankAccount({ bankName: "", accountNumber: "", accountHolderName: "" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isExceedingFunds) return;

    // Enrich type_specific_data for zakat
    let enrichedData = { ...formData };
    if (formData.disbursement_type === "zakat" && formData.reference_id) {
      const period = zakatPeriods.find((p: any) => p.id === formData.reference_id);
      if (period) {
        enrichedData.type_specific_data = {
          ...formData.type_specific_data,
          zakatPeriodId: period.id,
          zakatPeriodName: period.name,
          zakatTypeId: period.zakatTypeId,
          zakatTypeName: period.zakatTypeName,
          zakatTypeSlug: period.zakatTypeSlug,
          year: period.year,
          hijriYear: period.hijriYear,
        };
      }
    }

    createMutation.mutate(enrichedData);
  };

  const banks = banksData?.data || [];
  const campaigns = campaignsData?.data || [];
  const zakatTypes = zakatTypesData?.data || [];
  const zakatPeriods = zakatPeriodsData?.data || [];
  const qurbanPeriods = qurbanPeriodsData?.data || [];
  const vendors = vendorsData?.data || [];
  const employees = employeesData?.data || [];
  const mustahiqs = mustahiqsData?.data || [];
  const fundraisers = fundraisersData?.data || [];
  const mitras = mitraData?.data || [];
  const mitraRecipientOptions = isMitra
    ? (myMitraData ? [{ value: myMitraData.id, label: myMitraData.name }] : [])
    : mitras.map((m: any) => ({ value: m.id, label: m.name }));
  const availableFunds = formData.disbursement_type === "revenue_share"
    ? (revenueShareAvailableData
      ? {
          collected: Number(revenueShareAvailableData.totalEntitled || 0),
          disbursed: Number(revenueShareAvailableData.totalCommitted || 0),
          available: Number(revenueShareAvailableData.totalAvailable || 0),
          paid: Number(revenueShareAvailableData.totalPaid || 0),
          recordsCount: Number(revenueShareAvailableData.recordsCount || 0),
        }
      : null)
    : (availableFundsData || null);

  // Check if amount exceeds available funds
  const amountValue = parseFloat(formData.amount || "0");
  const isExceedingFunds = availableFunds && amountValue > availableFunds.available;

  useEffect(() => {
    if (formData.disbursement_type !== "revenue_share") return;
    if (!availableFunds) return;
    if (formData.amount) return;

    setFormData((prev) => ({
      ...prev,
      amount: String(Math.max(0, Math.floor(availableFunds.available || 0))),
    }));
  }, [formData.disbursement_type, formData.amount, availableFunds]);

  // Filter banks for zakat
  const availableBanks = formData.disbursement_type === "zakat" || formData.category?.startsWith("zakat_to_")
    ? banks.filter((b: any) => b.isForZakat || b.is_for_zakat)
    : banks;

  // Disbursement Type Options
  const disbursementTypeOptions: AutocompleteOption[] = isMitra
    ? [
        { value: "campaign", label: "Campaign Disbursement - Penyaluran untuk program" },
        { value: "zakat", label: "Zakat Distribution - Penyaluran zakat (8 asnaf)" },
        { value: "qurban", label: "Qurban Purchase - Pembelian hewan qurban" },
        { value: "revenue_share", label: "Revenue Share - Pencairan bagi hasil mitra" },
      ]
    : [
        { value: "campaign", label: "Campaign Disbursement - Penyaluran untuk program" },
        { value: "zakat", label: "Zakat Distribution - Penyaluran zakat (8 asnaf)" },
        { value: "qurban", label: "Qurban Purchase - Pembelian hewan qurban" },
        { value: "operational", label: "Operational Expense - Biaya operasional umum" },
        { value: "vendor", label: "Vendor Payment - Pembayaran ke vendor" },
        ...(canManageRevenueShare
          ? [{ value: "revenue_share", label: "Revenue Share - Pencairan bagi hasil mitra/fundraiser/developer" }]
          : []),
      ];

  // Get category options based on disbursement type
  const getCategoryOptions = (): AutocompleteOption[] => {
    if (!formData.disbursement_type) return [];

    if (formData.disbursement_type === "qurban") {
      const summary = qurbanSummaryData?.data;
      const categories = [];

      if (summary?.totalSapi > 0) {
        categories.push({ value: "qurban_purchase_sapi", label: `Pembelian Sapi (${summary.totalSapi} ekor)` });
      }
      if (summary?.totalKambing > 0) {
        categories.push({ value: "qurban_purchase_kambing", label: `Pembelian Kambing (${summary.totalKambing} ekor)` });
      }
      categories.push({ value: "qurban_execution_fee", label: "Biaya Penyembelihan & Distribusi" });

      return categories;
    }

    const categories = EXPENSE_CATEGORIES[formData.disbursement_type as keyof typeof EXPENSE_CATEGORIES];
    if (formData.disbursement_type === "revenue_share" && isMitra) {
      return (categories || [])
        .filter((c) => c.value === "revenue_share_mitra")
        .map((c) => ({ value: c.value, label: c.label }));
    }
    return categories?.map(c => ({ value: c.value, label: c.label })) || [];
  };

  // Handle disbursement type change
  const handleDisbursementTypeChange = (value: string) => {
    setSelectedBankAccountId("");
    setFormData({
      ...formData,
      disbursement_type: value as DisbursementType,
      reference_type: "",
      reference_id: "",
      reference_name: "",
      amount: "",
      category: "",
      recipient_type: "",
      recipient_id: "",
      recipient_name: "",
      recipient_contact: "",
      recipient_bank_name: "",
      recipient_bank_account: "",
      recipient_bank_account_name: "",
      type_specific_data: {},
    });
  };

  // Handle reference change
  const handleReferenceChange = (value: string) => {
    let referenceName = "";
    let referenceType = "";

    if (formData.disbursement_type === "campaign") {
      const campaign = campaigns.find((c: any) => c.id === value);
      referenceName = campaign?.title || "";
      referenceType = "campaign";
    } else if (formData.disbursement_type === "zakat") {
      const period = zakatPeriods.find((p: any) => p.id === value);
      referenceName = period?.name || "";
      referenceType = "zakat_period";
    } else if (formData.disbursement_type === "qurban") {
      const period = qurbanPeriods.find((p: any) => p.id === value);
      referenceName = period?.name || "";
      referenceType = "qurban_period";
    }

    setFormData({
      ...formData,
      reference_id: value,
      reference_name: referenceName,
      reference_type: referenceType,
    });
  };

  // Handle vendor selection
  const handleVendorChange = (value: string) => {
    const vendor = vendors.find((v: any) => v.id === value);
    if (vendor) {
      setSelectedBankAccountId("");
      setFormData({
        ...formData,
        recipient_id: value,
        recipient_name: vendor.name,
        recipient_contact: vendor.phone || "",
        recipient_bank_name: "",
        recipient_bank_account: "",
        recipient_bank_account_name: "",
      });
    }
  };

  // Handle employee selection
  const handleEmployeeChange = (value: string) => {
    const employee = employees.find((e: any) => e.id === value);
    if (employee) {
      setSelectedBankAccountId("");
      setFormData({
        ...formData,
        recipient_id: value,
        recipient_name: employee.name,
        recipient_contact: employee.phone || "",
        recipient_bank_name: "",
        recipient_bank_account: "",
        recipient_bank_account_name: "",
      });
    }
  };

  // Handle mustahiq selection
  const handleMustahiqChange = (value: string) => {
    const mustahiq = mustahiqs.find((m: any) => m.id === value);
    if (mustahiq) {
      setSelectedBankAccountId("");
      setFormData({
        ...formData,
        recipient_id: value,
        recipient_name: mustahiq.name,
        recipient_contact: mustahiq.phone || "",
        recipient_bank_name: "",
        recipient_bank_account: "",
        recipient_bank_account_name: "",
      });
    }
  };

  const handleFundraiserChange = (value: string) => {
    const fundraiser = fundraisers.find((f: any) => f.id === value);
    if (fundraiser) {
      setSelectedBankAccountId("");
      setFormData({
        ...formData,
        recipient_id: value,
        recipient_name: fundraiser.employeeName || fundraiser.donaturName || fundraiser.code || "",
        recipient_contact: fundraiser.employeePhone || fundraiser.donaturPhone || "",
        recipient_bank_name: "",
        recipient_bank_account: "",
        recipient_bank_account_name: "",
      });
    }
  };

  const handleMitraChange = (value: string) => {
    const mitraRecord = isMitra
      ? (myMitraData?.id === value ? myMitraData : null)
      : mitras.find((m: any) => m.id === value);
    if (mitraRecord) {
      setSelectedBankAccountId("");
      setFormData({
        ...formData,
        recipient_id: value,
        recipient_name: mitraRecord.name || "",
        recipient_contact: mitraRecord.phone || "",
        recipient_bank_name: "",
        recipient_bank_account: "",
        recipient_bank_account_name: "",
      });
    }
  };

  // Handle bank account selection
  const handleBankAccountChange = (value: string) => {
    const account = recipientBankAccounts.find((a: any) => a.id === value);
    if (account) {
      setSelectedBankAccountId(value);
      setFormData({
        ...formData,
        recipient_bank_name: account.bankName,
        recipient_bank_account: account.accountNumber,
        recipient_bank_account_name: account.accountHolderName,
      });
    }
  };

  const handleDeveloperBankAccountChange = (value: string) => {
    const account = developerBankAccounts.find((a: any) => a.id === value);
    if (account) {
      setSelectedBankAccountId(value);
      setFormData({
        ...formData,
        recipient_bank_name: account.bankName,
        recipient_bank_account: account.accountNumber,
        recipient_bank_account_name: account.accountHolderName,
      });
    }
  };

  // Handle create bank account
  const handleCreateBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    createBankAccountMutation.mutate(newBankAccount);
  };

  return (
    <div className="dashboard-container">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
        >
          <ArrowLeftIcon className="w-5 h-5" />
          Kembali
        </button>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isCoordinator || isMitra || isEmployeeOnly ? "Ajukan Pencairan Dana" : "Buat Pencairan Dana"}</h1>
          <p className="text-gray-600 mt-1">{isCoordinator ? "Ajukan pencairan dana untuk diri sendiri" : isMitra ? "Ajukan pencairan campaign, zakat, qurban, dan bagi hasil milik Anda" : isEmployeeOnly ? "Ajukan pencairan dana untuk campaign yang Anda kelola" : "Sistem universal untuk semua jenis pengeluaran"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="card max-w-3xl">
        <div className="space-y-6">
          {/* STEP 1: Disbursement Type */}
          {isEmployeeOnly ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600">Tipe Pencairan</p>
              <p className="font-medium text-gray-900">Campaign Disbursement</p>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipe Pencairan <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={disbursementTypeOptions}
                value={formData.disbursement_type}
                onChange={handleDisbursementTypeChange}
                placeholder="Pilih Tipe Pencairan"
                allowClear={false}
              />
            </div>
          )}

          {/* STEP 2: Reference (Conditional) */}
          {formData.disbursement_type === "campaign" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={campaigns.map((c: any) => ({ value: c.id, label: c.title }))}
                value={formData.reference_id}
                onChange={handleReferenceChange}
                placeholder="Pilih Campaign"
                allowClear={false}
              />
            </div>
          )}

          {formData.disbursement_type === "zakat" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Jenis Zakat <span className="text-red-500">*</span>
                </label>
                <Autocomplete
                  options={zakatTypes.map((t: any) => ({ value: t.id, label: t.name }))}
                  value={formData.type_specific_data.zakat_type_id || ""}
                  onChange={(value) => {
                    const zakatType = zakatTypes.find((t: any) => t.id === value);
                    setFormData({
                      ...formData,
                      reference_id: "",
                      reference_name: "",
                      type_specific_data: {
                        ...formData.type_specific_data,
                        zakat_type_id: value,
                        zakat_type_name: zakatType?.name || "",
                      }
                    });
                  }}
                  placeholder="Pilih Jenis Zakat"
                  allowClear={false}
                />
              </div>

              {formData.type_specific_data.zakat_type_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Periode Zakat <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={zakatPeriods.map((p: any) => ({
                      value: p.id,
                      label: `${p.name}${p.hijriYear ? ` (${p.hijriYear})` : ""}`
                    }))}
                    value={formData.reference_id}
                    onChange={handleReferenceChange}
                    placeholder="Pilih Periode Zakat"
                    allowClear={false}
                  />
                  {zakatPeriods.length === 0 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Belum ada periode aktif untuk jenis zakat ini
                    </p>
                  )}
                </div>
              )}
            </>
          )}

          {formData.disbursement_type === "qurban" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Periode Qurban <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={qurbanPeriods.map((p: any) => ({ value: p.id, label: p.name }))}
                value={formData.reference_id}
                onChange={handleReferenceChange}
                placeholder="Pilih Periode Qurban"
                allowClear={false}
              />
              {qurbanSummaryData?.data && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mt-4">
                  <h4 className="text-sm font-semibold text-emerald-900 mb-3">Ringkasan Periode</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-emerald-700">Total Sapi</p>
                      <p className="text-xl font-bold text-emerald-900">{qurbanSummaryData.data.totalSapi} ekor</p>
                    </div>
                    <div>
                      <p className="text-emerald-700">Total Kambing</p>
                      <p className="text-xl font-bold text-emerald-900">{qurbanSummaryData.data.totalKambing} ekor</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Asnaf Selection (Zakat Only) */}
          {formData.disbursement_type === "zakat" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Asnaf (Penerima) <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={[
                  { value: "fakir", label: "Fakir" },
                  { value: "miskin", label: "Miskin" },
                  { value: "amil", label: "Amil" },
                  { value: "mualaf", label: "Mualaf" },
                  { value: "riqab", label: "Riqab" },
                  { value: "gharim", label: "Gharim" },
                  { value: "fisabilillah", label: "Fisabilillah" },
                  { value: "ibnus_sabil", label: "Ibnus Sabil" },
                ]}
                value={formData.type_specific_data.asnaf || ""}
                onChange={(value) => setFormData({
                  ...formData,
                  type_specific_data: { ...formData.type_specific_data, asnaf: value }
                })}
                placeholder="Pilih Asnaf"
                allowClear={false}
              />
            </div>
          )}

          {/* STEP 3: Category */}
          {formData.disbursement_type && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Kategori <span className="text-red-500">*</span>
              </label>
              <Autocomplete
                options={getCategoryOptions()}
                value={formData.category}
                onChange={(value) => {
                  let nextRecipientType: RecipientType | "" = formData.recipient_type;
                  const defaultMitraBank = (myMitraData?.bankAccounts || [])[0];
                  const defaultDeveloperBank = developerBankAccounts[0];
                  if (formData.disbursement_type === "revenue_share") {
                    if (value === "revenue_share_mitra") nextRecipientType = "mitra";
                    else if (value === "revenue_share_fundraiser") nextRecipientType = "fundraiser";
                    else if (value === "revenue_share_developer") nextRecipientType = "manual";
                    else nextRecipientType = "";
                  }

                  const isRecipientTypeChanged = nextRecipientType !== formData.recipient_type;
                  const nextRecipientId = value === "revenue_share_developer"
                    ? "developer_platform"
                    : (isRecipientTypeChanged ? "" : formData.recipient_id);
                  const nextRecipientName = value === "revenue_share_developer"
                    ? DEVELOPER_RECIPIENT_NAME
                    : (isRecipientTypeChanged ? "" : formData.recipient_name);
                  const nextRecipientContact = value === "revenue_share_developer"
                    ? DEVELOPER_RECIPIENT_CONTACT
                    : (isRecipientTypeChanged ? "" : formData.recipient_contact);
                  const nextRecipientIdForMitra =
                    isMitra && value === "revenue_share_mitra"
                      ? (myMitraData?.id || "")
                      : nextRecipientId;
                  const nextRecipientNameForMitra =
                    isMitra && value === "revenue_share_mitra"
                      ? (myMitraData?.name || "")
                      : nextRecipientName;
                  const nextRecipientContactForMitra =
                    isMitra && value === "revenue_share_mitra"
                      ? (myMitraData?.phone || myMitraData?.whatsappNumber || "")
                      : nextRecipientContact;

                  setSelectedBankAccountId(
                    value === "revenue_share_developer" ? (defaultDeveloperBank?.id || "") : ""
                  );
                  setFormData({
                    ...formData,
                    category: value,
                    amount: "",
                    recipient_type: nextRecipientType,
                    recipient_id: nextRecipientIdForMitra,
                    recipient_name: nextRecipientNameForMitra,
                    recipient_contact: nextRecipientContactForMitra,
                    recipient_bank_name:
                      isMitra && value === "revenue_share_mitra"
                        ? (defaultMitraBank?.bankName || "")
                        : value === "revenue_share_developer"
                          ? (defaultDeveloperBank?.bankName || "")
                          : "",
                    recipient_bank_account:
                      isMitra && value === "revenue_share_mitra"
                        ? (defaultMitraBank?.accountNumber || "")
                        : value === "revenue_share_developer"
                          ? (defaultDeveloperBank?.accountNumber || "")
                          : "",
                    recipient_bank_account_name:
                      isMitra && value === "revenue_share_mitra"
                        ? (defaultMitraBank?.accountHolderName || "")
                        : value === "revenue_share_developer"
                          ? (defaultDeveloperBank?.accountHolderName || "")
                          : "",
                    type_specific_data: {
                      ...formData.type_specific_data,
                      qurban_category: value,
                    },
                  });
                }}
                placeholder="Pilih Kategori"
                allowClear={false}
              />
              <p className="text-sm text-gray-500 mt-1">
                Pilih kategori pengeluaran yang sesuai
              </p>
            </div>
          )}

          {/* STEP 4: Available Funds & Amount */}
          {availableFunds && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">
                {formData.disbursement_type === "revenue_share" ? "Hak Bagi Hasil" : "Dana Tersedia"}
              </h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-blue-600">
                    {formData.disbursement_type === "revenue_share" ? "Total Hak" : "Dana Masuk"}
                  </p>
                  <p className="text-lg font-bold text-blue-900 mono">
                    Rp {availableFunds.collected.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Sudah Diajukan/Disalurkan</p>
                  <p className="text-lg font-bold text-blue-900 mono">
                    Rp {availableFunds.disbursed.toLocaleString("id-ID")}
                  </p>
                </div>
                <div>
                  <p className="text-blue-600">Tersisa</p>
                  <p className="text-lg font-bold text-green-600 mono">
                    Rp {availableFunds.available.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                {formData.disbursement_type === "revenue_share"
                  ? "Termasuk alokasi yang sudah diajukan, disetujui, maupun dibayar."
                  : "Termasuk pencairan yang diajukan, disetujui, maupun sudah dibayar oleh semua admin."}
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Jumlah Dana <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
              <input
                type="number"
                required
                min="1"
                max={availableFunds ? Math.max(0, Math.floor(availableFunds.available || 0)) : undefined}
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full pl-12 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            {isExceedingFunds && (
              <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <p className="text-sm text-orange-800">
                  ⚠️ <strong>Peringatan:</strong> Jumlah pencairan (Rp {amountValue.toLocaleString("id-ID")})
                  melebihi dana tersedia (Rp {availableFunds?.available.toLocaleString("id-ID")}) untuk {" "}
                  {formData.disbursement_type === "campaign" ? "campaign" :
                   formData.disbursement_type === "zakat" ? "zakat" :
                   formData.disbursement_type === "qurban" ? "qurban" : "revenue share"} ini.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bank Sumber (Opsional)
            </label>
            <AdminPaymentMethodList
              value={formData.source_bank_id}
              onChange={(value) => setFormData({ ...formData, source_bank_id: value })}
              types={["bank_transfer"]}
              programFilter={(() => {
                if (formData.disbursement_type === "campaign") {
                  const campaign = campaigns.find((c: any) => c.id === formData.reference_id);
                  const pillar = campaign?.pillar;
                  if (pillar === "wakaf") return "wakaf";
                  return "infaq";
                } else if (formData.disbursement_type === "zakat") {
                  return "zakat";
                } else if (formData.disbursement_type === "qurban") {
                  return "qurban";
                } else {
                  return "general";
                }
              })()}
              placeholder="Pilih Bank Sumber"
              allowClear={false}
            />
            {(formData.disbursement_type === "zakat" || formData.category?.startsWith("zakat_to_")) && (
              <p className="text-sm text-orange-600 mt-1">
                ⚠️ Zakat harus dari rekening zakat!
              </p>
            )}
          </div>

          {/* STEP 5: Recipient */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Penerima</h3>

            {/* Mitra: locked to own account */}
            {isMitra ? (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Nama Penerima</p>
                      <p className="font-medium text-gray-900">{formData.recipient_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Kontak</p>
                      <p className="font-medium text-gray-900">{formData.recipient_contact || "-"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Pencairan hanya bisa ditransfer ke rekening mitra Anda.
                  </p>
                </div>

                {formData.recipient_bank_name ? (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Bank</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nomor Rekening</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_account}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nama Pemilik</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_account_name}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <p className="text-sm text-orange-800">
                      Rekening mitra belum tersedia. Lengkapi rekening mitra terlebih dahulu sebelum mengajukan pencairan.
                    </p>
                  </div>
                )}
              </div>
            ) : isCoordinator ? (
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Nama Penerima</p>
                      <p className="font-medium text-gray-900">{formData.recipient_name || "-"}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Kontak</p>
                      <p className="font-medium text-gray-900">{formData.recipient_contact || "-"}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    Pencairan akan ditujukan ke akun Anda.
                  </p>
                </div>

                {/* Bank account selection for coordinator */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Rekening Bank <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowBankAccountModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Rekening
                    </button>
                  </div>
                  {recipientBankAccounts.length > 0 ? (
                    <Autocomplete
                      options={recipientBankAccounts.map((acc: any) => ({
                        value: acc.id,
                        label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountHolderName})`,
                      }))}
                      value={selectedBankAccountId}
                      onChange={handleBankAccountChange}
                      placeholder="Pilih rekening bank"
                      allowClear={false}
                    />
                  ) : (
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <p className="text-sm text-orange-800">
                        Anda belum memiliki rekening bank. Silakan tambahkan rekening terlebih dahulu sebelum mengajukan pencairan.
                      </p>
                    </div>
                  )}
                </div>

                {formData.recipient_bank_name && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Bank</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_name}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nomor Rekening</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_account}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Nama Pemilik</p>
                        <p className="font-medium text-gray-900">{formData.recipient_bank_account_name}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
            <div className="space-y-4">
              {formData.disbursement_type === "revenue_share" ? (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Tipe Penerima</p>
                  <p className="font-medium text-gray-900">
                    {formData.category === "revenue_share_mitra"
                      ? "Mitra"
                      : formData.category === "revenue_share_fundraiser"
                        ? "Fundraiser"
                        : formData.category === "revenue_share_developer"
                          ? "Developer"
                          : "-"}
                  </p>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipe Penerima <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={[
                      { value: "vendor", label: "Vendor" },
                      { value: "employee", label: "Employee" },
                      { value: "mustahiq", label: "Mustahiq (Zakat)" },
                    ]}
                    value={formData.recipient_type}
                    onChange={(value) => {
                      setFormData({
                        ...formData,
                        recipient_type: value as RecipientType,
                        recipient_id: "",
                        recipient_name: "",
                        recipient_contact: "",
                        recipient_bank_name: "",
                        recipient_bank_account: "",
                        recipient_bank_account_name: "",
                      });
                    }}
                    placeholder="Pilih Tipe Penerima"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type === "vendor" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pilih Vendor <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowVendorModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Vendor
                    </button>
                  </div>
                  <Autocomplete
                    options={vendors.map((v: any) => ({ value: v.id, label: v.name }))}
                    value={formData.recipient_id}
                    onChange={handleVendorChange}
                    placeholder="Cari dan pilih vendor"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type === "employee" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pilih Employee <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowEmployeeModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Employee
                    </button>
                  </div>
                  <Autocomplete
                    options={employees.map((e: any) => ({ value: e.id, label: e.name }))}
                    value={formData.recipient_id}
                    onChange={handleEmployeeChange}
                    placeholder="Cari dan pilih employee"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type === "mustahiq" && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">
                      Pilih Mustahiq <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowMustahiqModal(true)}
                      className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Mustahiq
                    </button>
                  </div>
                  <Autocomplete
                    options={mustahiqs.map((m: any) => ({ value: m.id, label: m.name }))}
                    value={formData.recipient_id}
                    onChange={handleMustahiqChange}
                    placeholder="Cari dan pilih mustahiq"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type === "fundraiser" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Fundraiser <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={fundraisers.map((f: any) => ({
                      value: f.id,
                      label: `${f.employeeName || f.donaturName || "-"} (${f.code || "-"})`,
                    }))}
                    value={formData.recipient_id}
                    onChange={handleFundraiserChange}
                    placeholder="Pilih fundraiser"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type === "mitra" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pilih Mitra <span className="text-red-500">*</span>
                  </label>
                  <Autocomplete
                    options={mitraRecipientOptions}
                    value={formData.recipient_id}
                    onChange={handleMitraChange}
                    placeholder="Pilih mitra"
                    allowClear={false}
                  />
                </div>
              )}

              {formData.recipient_type && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Penerima <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.recipient_name}
                      readOnly={isRevenueShareDeveloperRecipient}
                      onChange={(e) => setFormData({ ...formData, recipient_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent read-only:bg-gray-50"
                      placeholder="Nama lengkap penerima"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kontak
                    </label>
                    <input
                      type="text"
                      value={formData.recipient_contact}
                      readOnly={isRevenueShareDeveloperRecipient}
                      onChange={(e) => setFormData({ ...formData, recipient_contact: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent read-only:bg-gray-50"
                      placeholder="08xxxxxxxxxx"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Rekening Bank
                      </label>
                      {["vendor", "employee", "mustahiq", "mitra"].includes(formData.recipient_type) && (
                        <button
                          type="button"
                          onClick={() => setShowBankAccountModal(true)}
                          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Tambah Rekening
                        </button>
                      )}
                    </div>
                    {formData.recipient_type === "manual" ? (
                      isRevenueShareDeveloperRecipient ? (
                        developerBankAccounts.length > 0 ? (
                          <Autocomplete
                            options={developerBankAccounts.map((acc: any) => ({
                              value: acc.id,
                              label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountHolderName})`,
                            }))}
                            value={selectedBankAccountId}
                            onChange={handleDeveloperBankAccountChange}
                            placeholder="Pilih rekening developer"
                            allowClear={false}
                          />
                        ) : (
                          <p className="text-sm text-orange-600">
                            Rekening developer belum tersedia. Lengkapi di Settings &gt; Developer &gt; Rekening.
                          </p>
                        )
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            value={formData.recipient_bank_name}
                            onChange={(e) => setFormData({ ...formData, recipient_bank_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Nama bank"
                          />
                          <input
                            type="text"
                            value={formData.recipient_bank_account}
                            onChange={(e) => setFormData({ ...formData, recipient_bank_account: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Nomor rekening"
                          />
                          <input
                            type="text"
                            value={formData.recipient_bank_account_name}
                            onChange={(e) => setFormData({ ...formData, recipient_bank_account_name: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            placeholder="Nama pemilik rekening"
                          />
                        </div>
                      )
                    ) : recipientBankAccounts.length > 0 ? (
                      <Autocomplete
                        options={recipientBankAccounts.map((acc: any) => ({
                          value: acc.id,
                          label: `${acc.bankName} - ${acc.accountNumber} (${acc.accountHolderName})`,
                        }))}
                        value={selectedBankAccountId}
                        onChange={handleBankAccountChange}
                        placeholder="Pilih rekening bank"
                        allowClear={false}
                      />
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Belum ada rekening. Klik "Tambah Rekening" untuk menambah.
                      </p>
                    )}
                  </div>

                  {formData.recipient_bank_name && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Bank</p>
                          <p className="font-medium text-gray-900">{formData.recipient_bank_name}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Nomor Rekening</p>
                          <p className="font-medium text-gray-900">{formData.recipient_bank_account}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Nama Pemilik</p>
                          <p className="font-medium text-gray-900">{formData.recipient_bank_account_name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            )}
          </div>

          {/* Purpose & Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tujuan Pencairan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Contoh: Bantuan untuk kebutuhan sehari-hari"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Deskripsi
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Detail penggunaan dana..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Catatan Internal
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Catatan untuk tim internal..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={
                createMutation.isPending ||
                isExceedingFunds ||
                ((isCoordinator || isMitra || isRevenueShareDeveloperRecipient) && !formData.recipient_bank_name)
              }
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan sebagai Draft"}
            </button>
          </div>

          {createMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              Gagal membuat pencairan. Silakan coba lagi.
            </div>
          )}
        </div>
      </form>

      {/* Modals for creating new recipients */}
      <VendorModal
        isOpen={showVendorModal}
        onClose={() => setShowVendorModal(false)}
        onSuccess={(createdId) => {
          setShowVendorModal(false);
          queryClient.invalidateQueries({ queryKey: ["vendors"] });
          if (createdId) {
            // Auto-select the newly created vendor
            setTimeout(() => handleVendorChange(createdId), 100);
          }
        }}
      />

      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        onSuccess={(createdId) => {
          setShowEmployeeModal(false);
          queryClient.invalidateQueries({ queryKey: ["employees"] });
          if (createdId) {
            // Auto-select the newly created employee
            setTimeout(() => handleEmployeeChange(createdId), 100);
          }
        }}
      />

      {showMustahiqModal && (
        <MustahiqModal
          mustahiq={null}
          onClose={() => setShowMustahiqModal(false)}
          onSuccess={() => {
            setShowMustahiqModal(false);
            queryClient.invalidateQueries({ queryKey: ["mustahiqs"] });
          }}
        />
      )}

      {/* Modal for adding bank account */}
      {showBankAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Tambah Rekening Bank</h3>
              <button
                onClick={() => {
                  setShowBankAccountModal(false);
                  setNewBankAccount({ bankName: "", accountNumber: "", accountHolderName: "" });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateBankAccount} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Bank <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccount.bankName}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, bankName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Contoh: BCA, Mandiri"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccount.accountNumber}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, accountNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="1234567890"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Pemilik Rekening <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newBankAccount.accountHolderName}
                  onChange={(e) => setNewBankAccount({ ...newBankAccount, accountHolderName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Nama sesuai rekening"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowBankAccountModal(false);
                    setNewBankAccount({ bankName: "", accountNumber: "", accountHolderName: "" });
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={createBankAccountMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {createBankAccountMutation.isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>

              {createBankAccountMutation.isError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  Gagal menyimpan rekening. Silakan coba lagi.
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
