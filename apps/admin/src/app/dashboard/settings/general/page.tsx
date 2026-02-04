"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import api from "@/lib/api";
import { ArrowPathIcon } from "@heroicons/react/24/outline";
import { AddressForm, type AddressValue } from "@/components/forms/AddressForm";
import ContactForm, { type ContactValue } from "@/components/forms/ContactForm";
import { normalizeContactData } from "@/lib/contact-helpers";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";

type TabType = "organization" | "zakat" | "fidyah" | "sosmed" | "cdn";

export default function GeneralSettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabType>("organization");
  const [isLoadingGoldPrice, setIsLoadingGoldPrice] = useState(false);
  const [isLoadingSilverPrice, setIsLoadingSilverPrice] = useState(false);

  // Fetch settings
  const { data: groupedSettings, isLoading } = useQuery({
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

  // Form state for organization
  const [orgForm, setOrgForm] = useState({
    organizationName: "",
    organizationLogo: "",
    organizationAbout: "",
    organizationAboutUrl: "",
    organizationAboutUrlLabel: "",
    address: "", // Legacy - for backward compatibility
    // Indonesia Address System fields
    detailAddress: "",
    provinceCode: "",
    regencyCode: "",
    districtCode: "",
    villageCode: "",
  });

  // Contact data state
  const [contactData, setContactData] = useState<ContactValue>({});
  const [showLogoLibrary, setShowLogoLibrary] = useState(false);
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });

  // State untuk track perubahan address dari user
  const [addressFormData, setAddressFormData] = useState<Partial<AddressValue>>({});

  // Form state for zakat
  const [zakatForm, setZakatForm] = useState({
    zakatEnabled: false,
    nisabGold: "85",
    nisabSilver: "595",
    goldPricePerGram: "",
    silverPricePerGram: "",
    zakatFitrahAmount: "",
    ricePricePerKg: "",
    zakatMalPercentage: "2.5",
    zakatProfessionPercentage: "2.5",
  });

  // Form state for fidyah
  const [fidyahForm, setFidyahForm] = useState({
    fidyahEnabled: false,
    fidyahAmountPerDay: "",
  });

  // Form state for social media
  const [sosmedForm, setSosmedForm] = useState({
    facebook: "",
    instagram: "",
    youtube: "",
    twitter: "",
    linkedin: "",
    threads: "",
    tiktok: "",
  });

  // Form state for CDN
  const [cdnForm, setCdnForm] = useState({
    cdnEnabled: false,
    gcsBucketName: "",
    gcsProjectId: "",
    gcsClientEmail: "",
    gcsPrivateKey: "",
  });

  // Compute address data from settings
  const addressData = useMemo<Partial<AddressValue>>(() => {
    if (groupedSettings && groupedSettings.organization) {
      const orgSettings = groupedSettings.organization || [];
      const addressObj: any = {};

      orgSettings.forEach((setting: any) => {
        if (setting.key === "organization_detail_address") addressObj.detailAddress = setting.value;
        if (setting.key === "organization_province_code") addressObj.provinceCode = setting.value;
        if (setting.key === "organization_regency_code") addressObj.regencyCode = setting.value;
        if (setting.key === "organization_district_code") addressObj.districtCode = setting.value;
        if (setting.key === "organization_village_code") addressObj.villageCode = setting.value;
      });

      return addressObj;
    }
    return {};
  }, [groupedSettings]);

  // Load existing settings into form when data is fetched
  useEffect(() => {
    if (groupedSettings) {
      // Load organization settings
      const orgSettings = groupedSettings.organization || [];
      const orgData: any = {};
      const contactValues: any = {};
      orgSettings.forEach((setting: any) => {
        if (setting.key === "organization_name") orgData.organizationName = setting.value;
        if (setting.key === "organization_address") orgData.address = setting.value;
        if (setting.key === "organization_logo") orgData.organizationLogo = setting.value;
        if (setting.key === "organization_about") orgData.organizationAbout = setting.value;
        if (setting.key === "organization_about_url") orgData.organizationAboutUrl = setting.value;
        if (setting.key === "organization_about_url_label") orgData.organizationAboutUrlLabel = setting.value;
        if (setting.key === "organization_phone") contactValues.phone = setting.value;
        if (setting.key === "organization_whatsapp") contactValues.whatsappNumber = setting.value;
        if (setting.key === "organization_email") contactValues.email = setting.value;
        if (setting.key === "organization_website") contactValues.website = setting.value;
        // Indonesia Address System
        if (setting.key === "organization_detail_address") orgData.detailAddress = setting.value;
        if (setting.key === "organization_province_code") orgData.provinceCode = setting.value;
        if (setting.key === "organization_regency_code") orgData.regencyCode = setting.value;
        if (setting.key === "organization_district_code") orgData.districtCode = setting.value;
        if (setting.key === "organization_village_code") orgData.villageCode = setting.value;
      });
      if (Object.keys(orgData).length > 0) {
        setOrgForm((prev) => ({ ...prev, ...orgData }));
      }
      if (Object.keys(contactValues).length > 0) {
        setContactData(contactValues);
      }

      // Load zakat settings
      const zakatSettings = groupedSettings.zakat || [];
      const zakatData: any = {};
      zakatSettings.forEach((setting: any) => {
        if (setting.key === "zakat_enabled") zakatData.zakatEnabled = setting.value === "true";
        if (setting.key === "zakat_nisab_gold") zakatData.nisabGold = setting.value;
        if (setting.key === "zakat_nisab_silver") zakatData.nisabSilver = setting.value;
        if (setting.key === "zakat_gold_price") zakatData.goldPricePerGram = setting.value;
        if (setting.key === "zakat_silver_price") zakatData.silverPricePerGram = setting.value;
        if (setting.key === "zakat_fitrah_amount") zakatData.zakatFitrahAmount = setting.value;
        if (setting.key === "rice_price_per_kg") zakatData.ricePricePerKg = setting.value;
        if (setting.key === "zakat_mal_percentage") zakatData.zakatMalPercentage = setting.value;
        if (setting.key === "zakat_profession_percentage")
          zakatData.zakatProfessionPercentage = setting.value;
      });
      if (Object.keys(zakatData).length > 0) {
        setZakatForm((prev) => ({ ...prev, ...zakatData }));
      }

      // Load fidyah settings
      const fidyahSettings = groupedSettings.fidyah || [];
      const fidyahData: any = {};
      fidyahSettings.forEach((setting: any) => {
        if (setting.key === "fidyah_enabled") fidyahData.fidyahEnabled = setting.value === "true";
        if (setting.key === "fidyah_amount_per_day") fidyahData.fidyahAmountPerDay = setting.value;
      });
      if (Object.keys(fidyahData).length > 0) {
        setFidyahForm((prev) => ({ ...prev, ...fidyahData }));
      }

      // Load social media settings
      const sosmedSettings = groupedSettings.sosmed || [];
      const sosmedData: any = {};
      sosmedSettings.forEach((setting: any) => {
        if (setting.key === "social_media_facebook") sosmedData.facebook = setting.value;
        if (setting.key === "social_media_instagram") sosmedData.instagram = setting.value;
        if (setting.key === "social_media_youtube") sosmedData.youtube = setting.value;
        if (setting.key === "social_media_twitter") sosmedData.twitter = setting.value;
        if (setting.key === "social_media_linkedin") sosmedData.linkedin = setting.value;
        if (setting.key === "social_media_threads") sosmedData.threads = setting.value;
        if (setting.key === "social_media_tiktok") sosmedData.tiktok = setting.value;
      });
      if (Object.keys(sosmedData).length > 0) {
        setSosmedForm((prev) => ({ ...prev, ...sosmedData }));
      }

      // Load CDN settings
      const cdnSettings = groupedSettings.cdn || [];
      const cdnData: any = {};
      cdnSettings.forEach((setting: any) => {
        if (setting.key === "cdn_enabled") cdnData.cdnEnabled = setting.value === "true";
        if (setting.key === "gcs_bucket_name") cdnData.gcsBucketName = setting.value;
        if (setting.key === "gcs_project_id") cdnData.gcsProjectId = setting.value;
        if (setting.key === "gcs_client_email") cdnData.gcsClientEmail = setting.value;
        if (setting.key === "gcs_private_key") cdnData.gcsPrivateKey = setting.value;
      });
      if (Object.keys(cdnData).length > 0) {
        setCdnForm((prev) => ({ ...prev, ...cdnData }));
      }
    }
  }, [groupedSettings]);

  // Auto-fetch gold and silver prices on page load
  useEffect(() => {
    const fetchGoldPrice = async () => {
      setIsLoadingGoldPrice(true);
      try {
        const response = await api.post("/admin/settings/auto-update-gold-price", {});
        const data = response.data?.data;
        if (data?.priceNumber) {
          setZakatForm((prev) => ({ ...prev, goldPricePerGram: data.priceNumber.toString() }));
        }
      } catch (error) {
        console.error("Failed to fetch gold price:", error);
      } finally {
        setIsLoadingGoldPrice(false);
      }
    };

    const fetchSilverPrice = async () => {
      setIsLoadingSilverPrice(true);
      try {
        const response = await api.post("/admin/settings/auto-update-silver-price", {});
        const data = response.data?.data;
        if (data?.pricePerGram) {
          setZakatForm((prev) => ({ ...prev, silverPricePerGram: data.pricePerGram.toString() }));
        }
      } catch (error) {
        console.error("Failed to fetch silver price:", error);
      } finally {
        setIsLoadingSilverPrice(false);
      }
    };

    // Fetch prices when switching to zakat tab
    if (activeTab === "zakat") {
      fetchGoldPrice();
      fetchSilverPrice();
    }
  }, [activeTab]);

  // Update organization settings mutation
  const updateOrgMutation = useMutation({
    mutationFn: async (data: any) => {
      // Normalize contact data
      const normalizedContact = normalizeContactData(data.contactData);
      
      const settingsPayload = [
        {
          key: "organization_name",
          value: data.organizationName,
          category: "organization",
          type: "string" as const,
          label: "Nama Organisasi",
          description: "Nama resmi organisasi",
          isPublic: true,
        },
        {
          key: "organization_logo",
          value: data.organizationLogo || "",
          category: "organization",
          type: "string" as const,
          label: "Logo Organisasi",
          description: "URL logo organisasi",
          isPublic: true,
        },
        {
          key: "organization_about",
          value: data.organizationAbout || "",
          category: "organization",
          type: "string" as const,
          label: "Tentang Organisasi",
          description: "Deskripsi singkat tentang organisasi",
          isPublic: true,
        },
        {
          key: "organization_about_url",
          value: data.organizationAboutUrl || "",
          category: "organization",
          type: "string" as const,
          label: "URL Selengkapnya",
          description: "URL untuk informasi selengkapnya",
          isPublic: true,
        },
        {
          key: "organization_about_url_label",
          value: data.organizationAboutUrlLabel || "",
          category: "organization",
          type: "string" as const,
          label: "Label URL",
          description: "Label untuk link selengkapnya",
          isPublic: true,
        },
        {
          key: "organization_phone",
          value: normalizedContact.phone || "",
          category: "organization",
          type: "string" as const,
          label: "Nomor Telepon",
          description: "Nomor telepon organisasi",
          isPublic: true,
        },
        {
          key: "organization_whatsapp",
          value: normalizedContact.whatsappNumber || "",
          category: "organization",
          type: "string" as const,
          label: "Nomor WhatsApp",
          description: "Nomor WhatsApp organisasi",
          isPublic: true,
        },
        {
          key: "organization_email",
          value: normalizedContact.email || "",
          category: "organization",
          type: "string" as const,
          label: "Email",
          description: "Email organisasi",
          isPublic: true,
        },
        {
          key: "organization_website",
          value: normalizedContact.website || "",
          category: "organization",
          type: "string" as const,
          label: "Website",
          description: "Website organisasi",
          isPublic: true,
        },
        // Indonesia Address System
        {
          key: "organization_detail_address",
          value: data.detailAddress || "",
          category: "organization",
          type: "string" as const,
          label: "Detail Alamat",
          description: "Alamat lengkap (jalan, nomor, RT/RW)",
          isPublic: true,
        },
        {
          key: "organization_province_code",
          value: data.provinceCode || "",
          category: "organization",
          type: "string" as const,
          label: "Kode Provinsi",
          description: "Kode provinsi",
          isPublic: true,
        },
        {
          key: "organization_regency_code",
          value: data.regencyCode || "",
          category: "organization",
          type: "string" as const,
          label: "Kode Kabupaten/Kota",
          description: "Kode kabupaten/kota",
          isPublic: true,
        },
        {
          key: "organization_district_code",
          value: data.districtCode || "",
          category: "organization",
          type: "string" as const,
          label: "Kode Kecamatan",
          description: "Kode kecamatan",
          isPublic: true,
        },
        {
          key: "organization_village_code",
          value: data.villageCode || "",
          category: "organization",
          type: "string" as const,
          label: "Kode Kelurahan/Desa",
          description: "Kode kelurahan/desa",
          isPublic: true,
        },
      ];

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pengaturan organisasi berhasil diperbarui!",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui pengaturan",
      });
    },
  });


  // Update zakat settings mutation
  const updateZakatMutation = useMutation({
    mutationFn: async (data: typeof zakatForm) => {
      const settingsPayload = [
        {
          key: "zakat_enabled",
          value: String(data.zakatEnabled),
          category: "zakat",
          type: "boolean" as const,
          label: "Aktifkan Zakat",
          description: "Aktifkan fitur perhitungan zakat",
        },
        {
          key: "zakat_nisab_gold",
          value: data.nisabGold,
          category: "zakat",
          type: "number" as const,
          label: "Nisab Emas",
          description: "Nisab emas dalam gram",
        },
        {
          key: "zakat_nisab_silver",
          value: data.nisabSilver,
          category: "zakat",
          type: "number" as const,
          label: "Nisab Perak",
          description: "Nisab perak dalam gram",
        },
        {
          key: "zakat_gold_price",
          value: data.goldPricePerGram,
          category: "zakat",
          type: "number" as const,
          label: "Harga Emas",
          description: "Harga emas per gram dalam Rupiah",
        },
        {
          key: "zakat_silver_price",
          value: data.silverPricePerGram,
          category: "zakat",
          type: "number" as const,
          label: "Harga Perak",
          description: "Harga perak per gram dalam Rupiah",
        },
        {
          key: "zakat_fitrah_amount",
          value: data.zakatFitrahAmount,
          category: "zakat",
          type: "number" as const,
          label: "Zakat Fitrah",
          description: "Nominal zakat fitrah per jiwa dalam Rupiah",
        },
        {
          key: "rice_price_per_kg",
          value: data.ricePricePerKg,
          category: "zakat",
          type: "number" as const,
          label: "Harga Beras per KG",
          description: "Harga beras per kilogram dalam Rupiah",
        },
        {
          key: "zakat_mal_percentage",
          value: data.zakatMalPercentage,
          category: "zakat",
          type: "number" as const,
          label: "Persentase Zakat Mal",
          description: "Persentase zakat mal/harta",
        },
        {
          key: "zakat_profession_percentage",
          value: data.zakatProfessionPercentage,
          category: "zakat",
          type: "number" as const,
          label: "Persentase Zakat Profesi",
          description: "Persentase zakat profesi/penghasilan",
        },
      ];

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pengaturan zakat berhasil diperbarui!",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui pengaturan",
      });
    },
  });

  // Mutation for fidyah settings
  const updateFidyahMutation = useMutation({
    mutationFn: async (data: typeof fidyahForm) => {
      const settingsPayload = [
        {
          key: "fidyah_enabled",
          value: data.fidyahEnabled ? "true" : "false",
          category: "fidyah",
          type: "boolean" as const,
          label: "Fidyah Enabled",
          description: "Enable/disable fidyah feature",
        },
        {
          key: "fidyah_amount_per_day",
          value: data.fidyahAmountPerDay,
          category: "fidyah",
          type: "number" as const,
          label: "Fidyah per Hari",
          description: "Fidyah per hari puasa dalam Rupiah",
        },
      ];

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pengaturan fidyah berhasil diperbarui!",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui pengaturan",
      });
    },
  });

  // Mutation for social media settings
  const updateSosmedMutation = useMutation({
    mutationFn: async (data: typeof sosmedForm) => {
      const settingsPayload = [
        {
          key: "social_media_facebook",
          value: data.facebook || "",
          category: "sosmed",
          type: "string" as const,
          label: "Facebook URL",
          description: "URL profil Facebook organisasi",
          isPublic: true,
        },
        {
          key: "social_media_instagram",
          value: data.instagram || "",
          category: "sosmed",
          type: "string" as const,
          label: "Instagram URL",
          description: "URL profil Instagram organisasi",
          isPublic: true,
        },
        {
          key: "social_media_youtube",
          value: data.youtube || "",
          category: "sosmed",
          type: "string" as const,
          label: "YouTube URL",
          description: "URL channel YouTube organisasi",
          isPublic: true,
        },
        {
          key: "social_media_twitter",
          value: data.twitter || "",
          category: "sosmed",
          type: "string" as const,
          label: "Twitter/X URL",
          description: "URL profil Twitter/X organisasi",
          isPublic: true,
        },
        {
          key: "social_media_linkedin",
          value: data.linkedin || "",
          category: "sosmed",
          type: "string" as const,
          label: "LinkedIn URL",
          description: "URL profil LinkedIn organisasi",
          isPublic: true,
        },
        {
          key: "social_media_threads",
          value: data.threads || "",
          category: "sosmed",
          type: "string" as const,
          label: "Threads URL",
          description: "URL profil Threads organisasi",
          isPublic: true,
        },
        {
          key: "social_media_tiktok",
          value: data.tiktok || "",
          category: "sosmed",
          type: "string" as const,
          label: "TikTok URL",
          description: "URL profil TikTok organisasi",
          isPublic: true,
        },
      ];

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Akun sosial media berhasil diperbarui!",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui pengaturan",
      });
    },
  });

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...orgForm,
      contactData, // Include contact data
      // Merge address data - use addressData as base, then override with addressFormData if user changed
      ...addressData,
      ...addressFormData,
    };
    updateOrgMutation.mutate(payload);
  };

  const handleZakatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateZakatMutation.mutate(zakatForm);
  };

  const handleFidyahSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFidyahMutation.mutate(fidyahForm);
  };

  const handleSosmedSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSosmedMutation.mutate(sosmedForm);
  };

  // Mutation for CDN settings
  const updateCdnMutation = useMutation({
    mutationFn: async (data: typeof cdnForm) => {
      const settingsPayload = [
        {
          key: "cdn_enabled",
          value: data.cdnEnabled ? "true" : "false",
          category: "cdn",
          type: "boolean" as const,
          label: "Enable CDN",
          description: "Enable Google Cloud Storage CDN untuk media files",
          isPublic: false,
        },
        {
          key: "gcs_bucket_name",
          value: data.gcsBucketName || "",
          category: "cdn",
          type: "string" as const,
          label: "GCS Bucket Name",
          description: "Google Cloud Storage bucket name",
          isPublic: false,
        },
        {
          key: "gcs_project_id",
          value: data.gcsProjectId || "",
          category: "cdn",
          type: "string" as const,
          label: "GCS Project ID",
          description: "Google Cloud Project ID",
          isPublic: false,
        },
        {
          key: "gcs_client_email",
          value: data.gcsClientEmail || "",
          category: "cdn",
          type: "string" as const,
          label: "GCS Client Email",
          description: "Service account email",
          isPublic: false,
        },
        {
          key: "gcs_private_key",
          value: data.gcsPrivateKey || "",
          category: "cdn",
          type: "string" as const,
          label: "GCS Private Key",
          description: "Service account private key (keep secret!)",
          isPublic: false,
        },
      ];

      return api.put("/admin/settings/batch", settingsPayload);
    },
    onSuccess: () => {
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Pengaturan CDN berhasil diperbarui!",
      });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (error: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: error.response?.data?.message || "Gagal memperbarui pengaturan",
      });
    },
  });

  const handleCdnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCdnMutation.mutate(cdnForm);
  };

  return (
    <>
      <SettingsLayout>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Tabs Header */}
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => setActiveTab("organization")}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "organization"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Informasi Organisasi
              </button>
              <button
                onClick={() => setActiveTab("zakat")}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "zakat"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Setting Zakat
              </button>
              <button
                onClick={() => setActiveTab("fidyah")}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "fidyah"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Setting Fidyah
              </button>
              <button
                onClick={() => setActiveTab("sosmed")}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "sosmed"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                Akun Sosmed
              </button>
              <button
                onClick={() => setActiveTab("cdn")}
                className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === "cdn"
                    ? "border-primary-600 text-primary-600"
                    : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
                }`}
              >
                CDN
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "organization" && (
              <form onSubmit={handleOrgSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-field md:col-span-2">
                    <label className="form-label">Logo</label>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-20 rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden">
                        {orgForm.organizationLogo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={orgForm.organizationLogo}
                            alt="Logo organisasi"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xs text-gray-400 text-center px-2">Belum ada logo</span>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => setShowLogoLibrary(true)}
                          >
                            Pilih dari Media
                          </button>
                          {orgForm.organizationLogo && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-danger-600"
                              onClick={() => setOrgForm({ ...orgForm, organizationLogo: "" })}
                            >
                              Hapus
                            </button>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          Gunakan Media Library kategori <span className="font-semibold">financial</span> agar tidak di-crop.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="form-field md:col-span-2">
                    <label className="form-label">
                      Nama Organisasi <span className="text-danger-500">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={orgForm.organizationName}
                      onChange={(e) => setOrgForm({ ...orgForm, organizationName: e.target.value })}
                      placeholder="Contoh: Yayasan Peduli Ummat"
                      required
                    />
                  </div>

                  <div className="form-field md:col-span-2">
                    <label className="form-label">
                      Tentang Organisasi (Singkat)
                    </label>
                    <textarea
                      className="form-input"
                      value={orgForm.organizationAbout}
                      onChange={(e) => setOrgForm({ ...orgForm, organizationAbout: e.target.value })}
                      placeholder="Contoh: Platform donasi terpercaya untuk membantu sesama yang membutuhkan"
                      rows={3}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Deskripsi singkat yang akan ditampilkan di footer website
                    </p>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      URL Selengkapnya
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={orgForm.organizationAboutUrl}
                      onChange={(e) => setOrgForm({ ...orgForm, organizationAboutUrl: e.target.value })}
                      placeholder="Contoh: /tentang"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      URL untuk halaman informasi lengkap tentang organisasi
                    </p>
                  </div>

                  <div className="form-field">
                    <label className="form-label">
                      Label URL
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      value={orgForm.organizationAboutUrlLabel}
                      onChange={(e) => setOrgForm({ ...orgForm, organizationAboutUrlLabel: e.target.value })}
                      placeholder="Contoh: Selengkapnya"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Teks yang ditampilkan pada link
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <ContactForm
                      value={contactData}
                      onChange={setContactData}
                      required={true}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <AddressForm
                      value={addressData}
                      onChange={setAddressFormData}
                      disabled={false}
                      required={true}
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={updateOrgMutation.isPending}
                  >
                    {updateOrgMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "zakat" && (
              <form onSubmit={handleZakatSubmit} className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="zakatEnabled"
                    checked={zakatForm.zakatEnabled}
                    onChange={(e) => setZakatForm({ ...zakatForm, zakatEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="zakatEnabled" className="text-sm font-medium text-gray-700">
                    Aktifkan fitur perhitungan zakat
                  </label>
                </div>

                {zakatForm.zakatEnabled && (
                  <div className="space-y-6">
                    {/* Section: Nisab */}
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                        Nisab (Batas Minimum Wajib Zakat)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-field">
                          <label className="form-label">
                            Nisab Emas (gram) <span className="text-danger-500">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={zakatForm.nisabGold}
                            onChange={(e) => setZakatForm({ ...zakatForm, nisabGold: e.target.value })}
                            placeholder="85"
                            required
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 85 gram</p>
                        </div>

                        <div className="form-field">
                          <label className="form-label">
                            Nisab Perak (gram) <span className="text-danger-500">*</span>
                          </label>
                          <input
                            type="number"
                            className="form-input"
                            value={zakatForm.nisabSilver}
                            onChange={(e) => setZakatForm({ ...zakatForm, nisabSilver: e.target.value })}
                            placeholder="595"
                            required
                            step="0.01"
                          />
                          <p className="text-xs text-gray-500 mt-1">Default: 595 gram</p>
                        </div>
                      </div>
                    </div>

                    {/* Section: Harga Emas & Perak */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                        Harga Emas & Perak (Per Gram)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-field">
                          <label className="form-label">
                            Harga Emas (Rp/gram) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              Rp
                            </span>
                            <input
                              type="number"
                              className="form-input !pl-14"
                              value={zakatForm.goldPricePerGram}
                              onChange={(e) =>
                                setZakatForm({ ...zakatForm, goldPricePerGram: e.target.value })
                              }
                              placeholder={isLoadingGoldPrice ? "Mengambil harga..." : "1000000"}
                              required
                              step="1000"
                              disabled={isLoadingGoldPrice}
                            />
                            {isLoadingGoldPrice && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Harga emas otomatis diambil dari Pluang.com
                          </p>
                        </div>

                        <div className="form-field">
                          <label className="form-label">
                            Harga Perak (Rp/gram) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              Rp
                            </span>
                            <input
                              type="number"
                              className="form-input !pl-14"
                              value={zakatForm.silverPricePerGram}
                              onChange={(e) =>
                                setZakatForm({ ...zakatForm, silverPricePerGram: e.target.value })
                              }
                              placeholder={isLoadingSilverPrice ? "Mengambil harga..." : "15000"}
                              required
                              step="100"
                              disabled={isLoadingSilverPrice}
                            />
                            {isLoadingSilverPrice && (
                              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <ArrowPathIcon className="w-4 h-4 text-gray-400 animate-spin" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Harga perak otomatis diambil dari Pluang.com (dikonversi USD → IDR)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section: Zakat Fitrah */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                        Zakat Fitrah & Pertanian
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-field">
                          <label className="form-label">
                            Nominal Zakat Fitrah (Rp/jiwa) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              Rp
                            </span>
                            <input
                              type="number"
                              className="form-input !pl-14"
                              value={zakatForm.zakatFitrahAmount}
                              onChange={(e) =>
                                setZakatForm({ ...zakatForm, zakatFitrahAmount: e.target.value })
                              }
                              placeholder="50000"
                              required
                              step="1000"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Nominal per jiwa (setara 2.5-3 kg beras)
                          </p>
                        </div>

                        <div className="form-field">
                          <label className="form-label">
                            Harga Beras per KG (Rp/kg) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              Rp
                            </span>
                            <input
                              type="number"
                              className="form-input !pl-14"
                              value={zakatForm.ricePricePerKg}
                              onChange={(e) =>
                                setZakatForm({ ...zakatForm, ricePricePerKg: e.target.value })
                              }
                              placeholder="20000"
                              required
                              step="1000"
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Harga beras per kilogram untuk zakat pertanian
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Section: Persentase Zakat */}
                    <div className="border-t border-gray-200 pt-6">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                        Persentase Zakat
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-field">
                          <label className="form-label">
                            Zakat Mal / Harta (%) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="form-input !pr-14"
                              value={zakatForm.zakatMalPercentage}
                              onChange={(e) =>
                                setZakatForm({ ...zakatForm, zakatMalPercentage: e.target.value })
                              }
                              placeholder="2.5"
                              required
                              step="0.1"
                              min="0"
                              max="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              %
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Default: 2.5% dari total harta
                          </p>
                        </div>

                        <div className="form-field">
                          <label className="form-label">
                            Zakat Profesi / Penghasilan (%) <span className="text-danger-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              className="form-input !pr-14"
                              value={zakatForm.zakatProfessionPercentage}
                              onChange={(e) =>
                                setZakatForm({
                                  ...zakatForm,
                                  zakatProfessionPercentage: e.target.value,
                                })
                              }
                              placeholder="2.5"
                              required
                              step="0.1"
                              min="0"
                              max="100"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                              %
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Default: 2.5% dari penghasilan kotor
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={updateZakatMutation.isPending}
                  >
                    {updateZakatMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "fidyah" && (
              <form onSubmit={handleFidyahSubmit} className="space-y-6">
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                  <input
                    type="checkbox"
                    id="fidyahEnabled"
                    checked={fidyahForm.fidyahEnabled}
                    onChange={(e) => setFidyahForm({ ...fidyahForm, fidyahEnabled: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="fidyahEnabled" className="text-sm font-medium text-gray-700">
                    Aktifkan fitur Fidyah
                  </label>
                </div>

                {fidyahForm.fidyahEnabled && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                        Pengaturan Fidyah
                      </h3>
                      <div className="form-field">
                        <label className="form-label">
                          Fidyah per Hari (Rp) <span className="text-danger-500">*</span>
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                            Rp
                          </span>
                          <input
                            type="number"
                            className="form-input !pl-14"
                            value={fidyahForm.fidyahAmountPerDay}
                            onChange={(e) => setFidyahForm({ ...fidyahForm, fidyahAmountPerDay: e.target.value })}
                            placeholder="45000"
                            required
                            step="1000"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Nominal fidyah per hari puasa yang terlewat (setara harga 1 mud beras atau sekitar 0.6 kg)
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={updateFidyahMutation.isPending}
                  >
                    {updateFidyahMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "sosmed" && (
              <form onSubmit={handleSosmedSubmit} className="space-y-6">
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Masukkan URL lengkap akun sosial media organisasi. Kosongkan jika tidak ingin ditampilkan.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span>Facebook</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.facebook}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, facebook: e.target.value })}
                        placeholder="https://facebook.com/organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                          </svg>
                          <span>Instagram</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.instagram}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, instagram: e.target.value })}
                        placeholder="https://instagram.com/organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>YouTube</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.youtube}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, youtube: e.target.value })}
                        placeholder="https://youtube.com/@organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                          </svg>
                          <span>Twitter / X</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.twitter}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, twitter: e.target.value })}
                        placeholder="https://twitter.com/organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                          </svg>
                          <span>LinkedIn</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.linkedin}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, linkedin: e.target.value })}
                        placeholder="https://linkedin.com/company/organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.007 0C5.392 0 .004 5.389.004 12.003c0 5.281 3.416 9.762 8.165 11.338.598.11.816-.259.816-.577 0-.285-.01-1.04-.015-2.04-3.338.725-4.042-1.61-4.042-1.61-.544-1.382-1.328-1.75-1.328-1.75-1.086-.743.082-.728.082-.728 1.201.085 1.834 1.234 1.834 1.234 1.067 1.829 2.8 1.3 3.482.994.108-.774.418-1.3.761-1.6-2.665-.303-5.467-1.332-5.467-5.93 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.216.694.824.576 4.746-1.578 8.162-6.057 8.162-11.337C23.996 5.388 18.611 0 12.007 0z"/>
                          </svg>
                          <span>Threads</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.threads}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, threads: e.target.value })}
                        placeholder="https://threads.net/@organisasi"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                          </svg>
                          <span>TikTok</span>
                        </div>
                      </label>
                      <input
                        type="url"
                        className="form-input"
                        value={sosmedForm.tiktok}
                        onChange={(e) => setSosmedForm({ ...sosmedForm, tiktok: e.target.value })}
                        placeholder="https://tiktok.com/@organisasi"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={updateSosmedMutation.isPending}
                  >
                    {updateSosmedMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                  </button>
                </div>
              </form>
            )}

            {activeTab === "cdn" && (
              <form onSubmit={handleCdnSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <div className="text-sm text-amber-800">
                        <p className="font-semibold mb-1">Integrasi Google Cloud Storage</p>
                        <p>
                          Aktifkan CDN untuk menyimpan semua media files di Google Cloud Storage.
                          Mode CDN akan menggunakan bucket: <code className="px-1 py-0.5 bg-amber-100 rounded">cdn.webane.net</code>
                        </p>
                        <p className="mt-2">
                          <strong>Catatan:</strong> Pastikan service account memiliki permission untuk write ke bucket.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={cdnForm.cdnEnabled}
                        onChange={(e) => setCdnForm({ ...cdnForm, cdnEnabled: e.target.checked })}
                        className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <div>
                        <span className="form-label mb-0">Enable Google Cloud Storage CDN</span>
                        <p className="text-sm text-gray-600">
                          Aktifkan untuk menyimpan media di GCS dan serve melalui CDN
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="form-field">
                      <label className="form-label">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                          </svg>
                          Bucket Name
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={cdnForm.gcsBucketName}
                        onChange={(e) => setCdnForm({ ...cdnForm, gcsBucketName: e.target.value })}
                        placeholder="cdn.webane.net"
                        disabled={!cdnForm.cdnEnabled}
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          Project ID
                        </span>
                      </label>
                      <input
                        type="text"
                        className="form-input"
                        value={cdnForm.gcsProjectId}
                        onChange={(e) => setCdnForm({ ...cdnForm, gcsProjectId: e.target.value })}
                        placeholder="webanecom"
                        disabled={!cdnForm.cdnEnabled}
                      />
                    </div>

                    <div className="form-field md:col-span-2">
                      <label className="form-label">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          </svg>
                          Client Email (Service Account)
                        </span>
                      </label>
                      <input
                        type="email"
                        className="form-input"
                        value={cdnForm.gcsClientEmail}
                        onChange={(e) => setCdnForm({ ...cdnForm, gcsClientEmail: e.target.value })}
                        placeholder="stateless-webane-net-130@webanecom.iam.gserviceaccount.com"
                        disabled={!cdnForm.cdnEnabled}
                      />
                    </div>

                    <div className="form-field md:col-span-2">
                      <label className="form-label">
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                          Private Key
                        </span>
                      </label>
                      <textarea
                        rows={8}
                        className="form-input font-mono text-xs"
                        value={cdnForm.gcsPrivateKey}
                        onChange={(e) => setCdnForm({ ...cdnForm, gcsPrivateKey: e.target.value })}
                        placeholder="-----BEGIN PRIVATE KEY-----&#10;MIIEvAIBADANBgkqhkiG9w...&#10;-----END PRIVATE KEY-----"
                        disabled={!cdnForm.cdnEnabled}
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Paste the complete private key including BEGIN and END markers. Ini akan disimpan secara aman di database.
                      </p>
                    </div>
                  </div>

                  {cdnForm.cdnEnabled && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm text-blue-800">
                          <p className="font-semibold mb-1">Mode CDN Aktif</p>
                          <p>
                            Semua upload media baru akan disimpan ke Google Cloud Storage dan served melalui:
                            <code className="block mt-1 px-2 py-1 bg-blue-100 rounded">
                              https://storage.googleapis.com/{cdnForm.gcsBucketName || 'cdn.webane.net'}/bantuanku/...
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="submit"
                    className="btn btn-primary btn-md"
                    disabled={updateCdnMutation.isPending}
                  >
                    {updateCdnMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan CDN"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </SettingsLayout>

      <MediaLibrary
        isOpen={showLogoLibrary}
        onClose={() => setShowLogoLibrary(false)}
        onSelect={(url) => {
          setOrgForm((prev) => ({ ...prev, organizationLogo: url }));
          setFeedback({
            open: true,
            type: "success",
            title: "Berhasil",
            message: "File berhasil diupload!",
          });
          setShowLogoLibrary(false);
        }}
        category="financial"
        accept="image/*"
        selectedUrl={orgForm.organizationLogo}
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
