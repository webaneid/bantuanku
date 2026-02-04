"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SettingsLayout from "@/components/SettingsLayout";
import { PlusIcon, TrashIcon, Bars3Icon, PhotoIcon, PencilIcon } from "@heroicons/react/24/outline";
import api from "@/lib/api";
import MediaLibrary from "@/components/MediaLibrary";
import FeedbackDialog from "@/components/FeedbackDialog";
import URLAutocomplete from "@/components/URLAutocomplete";

type MenuItem = {
  id: string;
  label: string;
  url: string;
};

type FooterColumn = {
  id: string;
  title: string;
  items: MenuItem[];
};

type HeroSlide = {
  id: string;
  title: string;
  description: string;
  image: string;
  ctaText: string;
  ctaLink: string;
};

type ServiceCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  iconSvg: string; // Full SVG code
  gradient: string;
};

type FeaturedSection = {
  title: string;
  description: string;
  limit: number;
  sortBy: 'created_date' | 'days_left' | 'amount_collected' | 'donor_count' | 'urgent';
};

type ProgramsSection = {
  title: string;
  description: string;
  limit: number;
  sortBy: 'created_date' | 'days_left' | 'amount_collected' | 'donor_count';
};

type FunfactItem = {
  id: string;
  key: 'donors' | 'campaigns' | 'disbursed' | 'partners';
  title: string;
  description: string;
};

type FunfactSection = {
  title: string;
  description: string;
  items: FunfactItem[];
};

type WhyChooseUsItem = {
  id: string;
  icon: string; // SVG path
  iconBgColor: 'primary' | 'success' | 'info' | 'warning' | 'danger';
  title: string;
  description: string;
};

type WhyChooseUsSection = {
  title: string;
  description: string;
  items: WhyChooseUsItem[];
};

type CTAButton = {
  text: string;
  url: string;
  variant: 'primary' | 'outline';
};

type CTASection = {
  title: string;
  description: string;
  buttons: CTAButton[];
};

type InfoBoxItem = {
  id: string;
  text: string;
};

type ZakatPageSettings = {
  title: string;
  description: string;
  infoTitle: string;
  infoItems: InfoBoxItem[];
};

type QurbanPageSettings = {
  title: string;
  description: string;
  infoTitle: string;
  infoItems: InfoBoxItem[];
};

type WakafPageSettings = {
  title: string;
  description: string;
};

type ProgramPageSettings = {
  title: string;
  description: string;
};

// Dummy data for header menu
const DUMMY_MENU_ITEMS: MenuItem[] = [
  { id: "1", label: "Beranda", url: "/" },
  { id: "2", label: "Zakat", url: "/zakat" },
  { id: "3", label: "Qurban", url: "/qurban" },
  { id: "4", label: "Infaq/Sedekah", url: "/infaq" },
  { id: "5", label: "Wakaf", url: "/wakaf" },
  { id: "6", label: "Tentang", url: "/tentang" },
];

// Dummy data for footer columns
const DUMMY_FOOTER_COLUMNS: FooterColumn[] = [
  {
    id: "1",
    title: "Informasi",
    items: [
      { id: "1-1", label: "Tentang Kami", url: "/tentang" },
      { id: "1-2", label: "Kontak", url: "/kontak" },
      { id: "1-3", label: "FAQ", url: "/faq" },
    ],
  },
  {
    id: "2",
    title: "Layanan",
    items: [
      { id: "2-1", label: "Zakat", url: "/zakat" },
      { id: "2-2", label: "Qurban", url: "/qurban" },
      { id: "2-3", label: "Program", url: "/program" },
    ],
  },
];

// Dummy data for hero slider
const DUMMY_HERO_SLIDES: HeroSlide[] = [
  {
    id: "1",
    title: "Wujudkan Mimpi Pendidikan Anak Yatim",
    description: "Bersama kita bantu mereka meraih masa depan yang lebih cerah melalui pendidikan berkualitas",
    image: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1920&q=80",
    ctaText: "Mulai Berdonasi",
    ctaLink: "/program/bantuan-pendidikan",
  },
  {
    id: "2",
    title: "Tunaikan Zakat dengan Mudah & Aman",
    description: "Salurkan zakat fitrah dan zakat mal Anda kepada yang berhak dengan transparan",
    image: "https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1920&q=80",
    ctaText: "Bayar Zakat",
    ctaLink: "/zakat",
  },
];

// Dummy data for service categories
const DUMMY_SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: "1",
    name: "Zakat",
    slug: "zakat",
    description: "Zakat Fitrah & Zakat Mal",
    iconSvg: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="9" r="6" /><circle cx="15" cy="15" r="6" /></svg>',
    gradient: "gradient-zakat",
  },
  {
    id: "2",
    name: "Qurban",
    slug: "qurban",
    description: "Hewan Qurban Berkualitas",
    iconSvg: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="14" rx="7" ry="5"/><path d="M5 14V12c0-1.5 1-2.5 2-3"/><path d="M19 14V12c0-1.5-1-2.5-2-3"/><circle cx="9" cy="13" r="0.5" fill="currentColor"/><circle cx="15" cy="13" r="0.5" fill="currentColor"/><path d="M10 16h4"/><path d="M7 9C6 8 5 6 5 4"/><path d="M17 9C18 8 19 6 19 4"/></svg>',
    gradient: "gradient-qurban",
  },
  {
    id: "3",
    name: "Infaq/Sedekah",
    slug: "infaq",
    description: "Berbagi untuk Sesama",
    iconSvg: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>',
    gradient: "gradient-infaq",
  },
  {
    id: "4",
    name: "Wakaf",
    slug: "wakaf",
    description: "Investasi Akhirat",
    iconSvg: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>',
    gradient: "gradient-wakaf",
  },
];

// Dummy data for featured section
const DUMMY_FEATURED_SECTION: FeaturedSection = {
  title: "Program Unggulan & Mendesak",
  description: "Program-program prioritas yang membutuhkan dukungan Anda",
  limit: 6,
  sortBy: "urgent",
};

// Dummy data for programs section
const DUMMY_PROGRAMS_SECTION: ProgramsSection = {
  title: "Program Kami",
  description: "Pilih program yang ingin Anda dukung",
  limit: 6,
  sortBy: "created_date",
};

// Dummy data for funfact section
const DUMMY_FUNFACT_SECTION: FunfactSection = {
  title: "Kepercayaan Anda, Amanah Kami",
  description: "Bersama mewujudkan kebaikan untuk Indonesia",
  items: [
    {
      id: "1",
      key: "donors",
      title: "Total Donatur",
      description: "Kepercayaan dari seluruh Indonesia",
    },
    {
      id: "2",
      key: "campaigns",
      title: "Program Aktif",
      description: "Tersebar di berbagai kategori",
    },
    {
      id: "3",
      key: "disbursed",
      title: "Dana Tersalurkan",
      description: "Manfaat nyata untuk masyarakat",
    },
    {
      id: "4",
      key: "partners",
      title: "Total Mitra",
      description: "Kolaborasi untuk dampak lebih luas",
    },
  ],
};

// Dummy data for why choose us section
const DUMMY_WHY_CHOOSE_US_SECTION: WhyChooseUsSection = {
  title: "Mengapa Memilih Bantuanku?",
  description: "Platform donasi terpercaya dengan layanan terbaik",
  items: [
    {
      id: "1",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      iconBgColor: "primary",
      title: "Terpercaya & Resmi",
      description: "Berizin resmi dan diawasi oleh instansi berwenang dengan laporan keuangan yang transparan",
    },
    {
      id: "2",
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      iconBgColor: "success",
      title: "Mudah & Cepat",
      description: "Proses donasi yang simple dengan berbagai metode pembayaran yang aman dan terpercaya",
    },
    {
      id: "3",
      icon: "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z",
      iconBgColor: "info",
      title: "100% Transparan",
      description: "Laporan donasi real-time dan dokumentasi lengkap penyaluran dana ke penerima manfaat",
    },
  ],
};

// Dummy data for CTA section
const DUMMY_CTA_SECTION: CTASection = {
  title: "Mulai Berbagi Kebaikan Hari Ini",
  description: "Setiap donasi Anda membawa harapan baru bagi mereka yang membutuhkan. Mari bersama wujudkan Indonesia yang lebih baik.",
  buttons: [
    {
      text: "Lihat Semua Program",
      url: "/program",
      variant: "primary",
    },
    {
      text: "Tentang Kami",
      url: "/tentang",
      variant: "outline",
    },
  ],
};

// Dummy data for Zakat page
const DUMMY_ZAKAT_PAGE: ZakatPageSettings = {
  title: "Zakat",
  description: "Tunaikan zakat Anda dengan mudah dan amanah",
  infoTitle: "Tentang Zakat",
  infoItems: [
    { id: "1", text: "Zakat adalah rukun Islam yang ke-3 dan wajib ditunaikan oleh setiap Muslim yang mampu" },
    { id: "2", text: "Zakat Fitrah dibayarkan menjelang Idul Fitri, sedangkan Zakat Mal dibayarkan saat harta mencapai nisab" },
    { id: "3", text: "Zakat akan disalurkan kepada 8 golongan yang berhak (asnaf)" },
    { id: "4", text: "Tunaikan zakat melalui lembaga resmi dan terpercaya" },
  ],
};

// Dummy data for Qurban page
const DUMMY_QURBAN_PAGE: QurbanPageSettings = {
  title: "Paket Qurban",
  description: "Wujudkan ibadah qurban Anda bersama kami dengan hewan berkualitas dan penyaluran yang amanah",
  infoTitle: "Informasi Penting",
  infoItems: [
    { id: "1", text: "Harga sudah termasuk hewan, pemotongan, dan pengemasan" },
    { id: "2", text: "Daging akan didistribusikan kepada yang berhak" },
    { id: "3", text: "Anda dapat memilih untuk menerima bagian daging atau disalurkan sepenuhnya" },
    { id: "4", text: "Penyembelihan dilakukan pada hari raya Idul Adha sesuai syariat" },
  ],
};

// Dummy data for Wakaf page
const DUMMY_WAKAF_PAGE: WakafPageSettings = {
  title: "Program Wakaf",
  description: "Salurkan wakaf Anda untuk aset produktif yang memberikan manfaat berkelanjutan",
};

// Dummy data for Program page
const DUMMY_PROGRAM_PAGE: ProgramPageSettings = {
  title: "Semua Program",
  description: "Temukan berbagai program donasi untuk membantu sesama yang membutuhkan",
};

type TabType = "header-menu" | "body-landingpage" | "footer-menu" | "pages" | "utilities";

export default function FrontendSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("body-landingpage");
  const [menuItems, setMenuItems] = useState<MenuItem[]>(DUMMY_MENU_ITEMS);
  const [draggedItem, setDraggedItem] = useState<MenuItem | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ label: "", url: "" });

  // Footer columns state
  const [footerColumns, setFooterColumns] = useState<FooterColumn[]>(DUMMY_FOOTER_COLUMNS);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [columnForm, setColumnForm] = useState({ title: "", items: [] as MenuItem[] });
  const [editingFooterItemId, setEditingFooterItemId] = useState<string | null>(null);
  const [footerItemForm, setFooterItemForm] = useState({ label: "", url: "" });
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const showFeedback = (type: "success" | "error", title: string, message: string) => {
    setFeedback({ open: true, type, title, message });
  };

  // Hero slides state
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>(DUMMY_HERO_SLIDES);
  const [draggedSlide, setDraggedSlide] = useState<HeroSlide | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<string | null>(null);
  const [slideForm, setSlideForm] = useState({
    title: "",
    description: "",
    image: "",
    ctaText: "",
    ctaLink: "",
  });
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  // Service categories state
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(DUMMY_SERVICE_CATEGORIES);
  const [draggedCategory, setDraggedCategory] = useState<ServiceCategory | null>(null);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    slug: "",
    description: "",
    iconSvg: "",
    gradient: "",
  });

  // Featured section state
  const [featuredSection, setFeaturedSection] = useState<FeaturedSection>(DUMMY_FEATURED_SECTION);

  // Programs section state
  const [programsSection, setProgramsSection] = useState<ProgramsSection>(DUMMY_PROGRAMS_SECTION);

  // Funfact section state
  const [funfactSection, setFunfactSection] = useState<FunfactSection>(DUMMY_FUNFACT_SECTION);
  const [draggedFunfactItem, setDraggedFunfactItem] = useState<FunfactItem | null>(null);

  // Why choose us section state
  const [whyChooseUsSection, setWhyChooseUsSection] = useState<WhyChooseUsSection>(DUMMY_WHY_CHOOSE_US_SECTION);
  const [draggedWhyChooseUsItem, setDraggedWhyChooseUsItem] = useState<WhyChooseUsItem | null>(null);
  const [editingWhyChooseUsId, setEditingWhyChooseUsId] = useState<string | null>(null);
  const [whyChooseUsForm, setWhyChooseUsForm] = useState({
    icon: "",
    iconBgColor: "primary" as 'primary' | 'success' | 'info' | 'warning' | 'danger',
    title: "",
    description: "",
  });

  // CTA section state
  const [ctaSection, setCtaSection] = useState<CTASection>(DUMMY_CTA_SECTION);

  // Zakat page state
  const [zakatPage, setZakatPage] = useState<ZakatPageSettings>(DUMMY_ZAKAT_PAGE);
  const [editingZakatInfoId, setEditingZakatInfoId] = useState<string | null>(null);
  const [zakatInfoForm, setZakatInfoForm] = useState({ text: "" });

  // Qurban page state
  const [qurbanPage, setQurbanPage] = useState<QurbanPageSettings>(DUMMY_QURBAN_PAGE);
  const [editingQurbanInfoId, setEditingQurbanInfoId] = useState<string | null>(null);
  const [qurbanInfoForm, setQurbanInfoForm] = useState({ text: "" });

  // Wakaf page state
  const [wakafPage, setWakafPage] = useState<WakafPageSettings>(DUMMY_WAKAF_PAGE);

  // Program page state
  const [programPage, setProgramPage] = useState<ProgramPageSettings>(DUMMY_PROGRAM_PAGE);

  // Utilities state
  const [campaignAmounts, setCampaignAmounts] = useState<number[]>([50000, 100000, 200000]);
  const [wakafAmounts, setWakafAmounts] = useState<number[]>([100000, 500000, 1000000]);

  // Fetch settings to load menu items
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

  // Load menu items and hero slides from settings
  useEffect(() => {
    if (groupedSettings && groupedSettings.frontend) {
      const frontendSettings = groupedSettings.frontend || [];

      // Load menu
      const menuSetting = frontendSettings.find((s: any) => s.key === "frontend_header_menu");
      if (menuSetting?.value) {
        try {
          const loadedMenu = JSON.parse(menuSetting.value);
          if (Array.isArray(loadedMenu) && loadedMenu.length > 0) {
            setMenuItems(loadedMenu);
          }
        } catch (error) {
          console.error("Failed to parse menu items:", error);
        }
      }

      // Load footer columns
      const footerSetting = frontendSettings.find((s: any) => s.key === "frontend_footer_menu");
      if (footerSetting?.value) {
        try {
          const loadedFooter = JSON.parse(footerSetting.value);
          if (Array.isArray(loadedFooter) && loadedFooter.length > 0) {
            setFooterColumns(loadedFooter);
          }
        } catch (error) {
          console.error("Failed to parse footer columns:", error);
        }
      }

      // Load hero slides
      const heroSetting = frontendSettings.find((s: any) => s.key === "frontend_hero_slides");
      if (heroSetting?.value) {
        try {
          const loadedSlides = JSON.parse(heroSetting.value);
          if (Array.isArray(loadedSlides) && loadedSlides.length > 0) {
            setHeroSlides(loadedSlides);
          }
        } catch (error) {
          console.error("Failed to parse hero slides:", error);
        }
      }

      // Load service categories
      const categorySetting = frontendSettings.find((s: any) => s.key === "frontend_service_categories");
      if (categorySetting?.value) {
        try {
          const loadedCategories = JSON.parse(categorySetting.value);
          if (Array.isArray(loadedCategories) && loadedCategories.length > 0) {
            setServiceCategories(loadedCategories);
          }
        } catch (error) {
          console.error("Failed to parse service categories:", error);
        }
      }

      // Load featured section
      const featuredSetting = frontendSettings.find((s: any) => s.key === "frontend_featured_section");
      if (featuredSetting?.value) {
        try {
          const loadedFeatured = JSON.parse(featuredSetting.value);
          if (loadedFeatured) {
            setFeaturedSection(loadedFeatured);
          }
        } catch (error) {
          console.error("Failed to parse featured section:", error);
        }
      }

      // Load programs section
      const programsSetting = frontendSettings.find((s: any) => s.key === "frontend_programs_section");
      if (programsSetting?.value) {
        try {
          const loadedPrograms = JSON.parse(programsSetting.value);
          if (loadedPrograms) {
            setProgramsSection(loadedPrograms);
          }
        } catch (error) {
          console.error("Failed to parse programs section:", error);
        }
      }

      // Load funfact section
      const funfactSetting = frontendSettings.find((s: any) => s.key === "frontend_funfact_section");
      if (funfactSetting?.value) {
        try {
          const loadedFunfact = JSON.parse(funfactSetting.value);
          if (loadedFunfact) {
            setFunfactSection(loadedFunfact);
          }
        } catch (error) {
          console.error("Failed to parse funfact section:", error);
        }
      }

      // Load why choose us section
      const whyChooseUsSetting = frontendSettings.find((s: any) => s.key === "frontend_why_choose_us_section");
      if (whyChooseUsSetting?.value) {
        try {
          const loadedWhyChooseUs = JSON.parse(whyChooseUsSetting.value);
          if (loadedWhyChooseUs) {
            setWhyChooseUsSection(loadedWhyChooseUs);
          }
        } catch (error) {
          console.error("Failed to parse why choose us section:", error);
        }
      }

      // Load CTA section
      const ctaSetting = frontendSettings.find((s: any) => s.key === "frontend_cta_section");
      if (ctaSetting?.value) {
        try {
          const loadedCta = JSON.parse(ctaSetting.value);
          if (loadedCta) {
            setCtaSection(loadedCta);
          }
        } catch (error) {
          console.error("Failed to parse CTA section:", error);
        }
      }

      // Load Zakat page settings
      const zakatPageSetting = frontendSettings.find((s: any) => s.key === "frontend_zakat_page");
      if (zakatPageSetting?.value) {
        try {
          const loadedZakat = JSON.parse(zakatPageSetting.value);
          if (loadedZakat) {
            setZakatPage(loadedZakat);
          }
        } catch (error) {
          console.error("Failed to parse Zakat page settings:", error);
        }
      }

      // Load Qurban page settings
      const qurbanPageSetting = frontendSettings.find((s: any) => s.key === "frontend_qurban_page");
      if (qurbanPageSetting?.value) {
        try {
          const loadedQurban = JSON.parse(qurbanPageSetting.value);
          if (loadedQurban) {
            setQurbanPage(loadedQurban);
          }
        } catch (error) {
          console.error("Failed to parse Qurban page settings:", error);
        }
      }

      // Load Wakaf page settings
      const wakafPageSetting = frontendSettings.find((s: any) => s.key === "frontend_wakaf_page");
      if (wakafPageSetting?.value) {
        try {
          const loadedWakaf = JSON.parse(wakafPageSetting.value);
          if (loadedWakaf) {
            setWakafPage(loadedWakaf);
          }
        } catch (error) {
          console.error("Failed to parse Wakaf page settings:", error);
        }
      }

      // Load Program page settings
      const programPageSetting = frontendSettings.find((s: any) => s.key === "frontend_program_page");
      if (programPageSetting?.value) {
        try {
          const loadedProgram = JSON.parse(programPageSetting.value);
          if (loadedProgram) {
            setProgramPage(loadedProgram);
          }
        } catch (error) {
          console.error("Failed to parse Program page settings:", error);
        }
      }

      // Load utilities - campaign amounts
      const campaignAmountsSetting = frontendSettings.find((s: any) => s.key === "utilities_campaign_amounts");
      if (campaignAmountsSetting?.value) {
        try {
          const loadedAmounts = JSON.parse(campaignAmountsSetting.value);
          if (Array.isArray(loadedAmounts) && loadedAmounts.length > 0) {
            setCampaignAmounts(loadedAmounts);
          }
        } catch (error) {
          console.error("Failed to parse campaign amounts:", error);
        }
      }

      // Load utilities - wakaf amounts
      const wakafAmountsSetting = frontendSettings.find((s: any) => s.key === "utilities_wakaf_amounts");
      if (wakafAmountsSetting?.value) {
        try {
          const loadedAmounts = JSON.parse(wakafAmountsSetting.value);
          if (Array.isArray(loadedAmounts) && loadedAmounts.length > 0) {
            setWakafAmounts(loadedAmounts);
          }
        } catch (error) {
          console.error("Failed to parse wakaf amounts:", error);
        }
      }
    }
  }, [groupedSettings]);

  // Add new menu item
  const handleAddItem = () => {
    const newItem: MenuItem = {
      id: Date.now().toString(),
      label: "Menu Baru",
      url: "/",
    };
    setMenuItems([...menuItems, newItem]);
    setEditingId(newItem.id);
    setEditForm({ label: newItem.label, url: newItem.url });
  };

  // Delete menu item
  const handleDeleteItem = (id: string) => {
    setMenuItems(menuItems.filter((item) => item.id !== id));
    showFeedback("success", "Berhasil", "Menu berhasil dihapus");
  };

  // Start editing
  const handleEditStart = (item: MenuItem) => {
    setEditingId(item.id);
    setEditForm({ label: item.label, url: item.url });
  };

  // Save edit
  const handleEditSave = (id: string) => {
    setMenuItems(
      menuItems.map((item) =>
        item.id === id ? { ...item, label: editForm.label, url: editForm.url } : item
      )
    );
    setEditingId(null);
    showFeedback("success", "Berhasil", "Menu berhasil diperbarui");
  };

  // Cancel edit
  const handleEditCancel = () => {
    setEditingId(null);
  };

  // Drag handlers
  const handleDragStart = (item: MenuItem) => {
    setDraggedItem(item);
  };

  const handleDragOver = (e: React.DragEvent, targetItem: MenuItem) => {
    e.preventDefault();
    if (!draggedItem || draggedItem.id === targetItem.id) return;

    const draggedIndex = menuItems.findIndex((item) => item.id === draggedItem.id);
    const targetIndex = menuItems.findIndex((item) => item.id === targetItem.id);

    const newItems = [...menuItems];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItem);

    setMenuItems(newItems);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  // Hero slide handlers
  const handleAddSlide = () => {
    const newSlide: HeroSlide = {
      id: Date.now().toString(),
      title: "Slide Baru",
      description: "Deskripsi slide",
      image: "",
      ctaText: "Lihat Detail",
      ctaLink: "/",
    };
    setHeroSlides([...heroSlides, newSlide]);
    setEditingSlideId(newSlide.id);
    setSlideForm({
      title: newSlide.title,
      description: newSlide.description,
      image: newSlide.image,
      ctaText: newSlide.ctaText,
      ctaLink: newSlide.ctaLink,
    });
  };

  const handleDeleteSlide = (id: string) => {
    setHeroSlides(heroSlides.filter((slide) => slide.id !== id));
    showFeedback("success", "Berhasil", "Slide berhasil dihapus");
  };

  const handleEditSlideStart = (slide: HeroSlide) => {
    setEditingSlideId(slide.id);
    setSlideForm({
      title: slide.title,
      description: slide.description,
      image: slide.image,
      ctaText: slide.ctaText,
      ctaLink: slide.ctaLink,
    });
  };

  const handleEditSlideSave = (id: string) => {
    setHeroSlides(
      heroSlides.map((slide) =>
        slide.id === id ? { ...slide, ...slideForm } : slide
      )
    );
    setEditingSlideId(null);
    showFeedback("success", "Berhasil", "Slide berhasil diperbarui");
  };

  const handleEditSlideCancel = () => {
    setEditingSlideId(null);
  };

  const handleSlideDragStart = (slide: HeroSlide) => {
    setDraggedSlide(slide);
  };

  const handleSlideDragOver = (e: React.DragEvent, targetSlide: HeroSlide) => {
    e.preventDefault();
    if (!draggedSlide || draggedSlide.id === targetSlide.id) return;

    const draggedIndex = heroSlides.findIndex((slide) => slide.id === draggedSlide.id);
    const targetIndex = heroSlides.findIndex((slide) => slide.id === targetSlide.id);

    const newSlides = [...heroSlides];
    newSlides.splice(draggedIndex, 1);
    newSlides.splice(targetIndex, 0, draggedSlide);

    setHeroSlides(newSlides);
  };

  const handleSlideDragEnd = () => {
    setDraggedSlide(null);
  };

  // Service category handlers
  const handleAddCategory = () => {
    const newCategory: ServiceCategory = {
      id: Date.now().toString(),
      name: "Kategori Baru",
      slug: "kategori-baru",
      description: "Deskripsi kategori",
      iconSvg: '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>',
      gradient: "gradient-infaq",
    };
    setServiceCategories([...serviceCategories, newCategory]);
    setEditingCategoryId(newCategory.id);
    setCategoryForm({
      name: newCategory.name,
      slug: newCategory.slug,
      description: newCategory.description,
      iconSvg: newCategory.iconSvg,
      gradient: newCategory.gradient,
    });
  };

  const handleDeleteCategory = (id: string) => {
    setServiceCategories(serviceCategories.filter((cat) => cat.id !== id));
    showFeedback("success", "Berhasil", "Kategori berhasil dihapus");
  };

  const handleEditCategoryStart = (category: ServiceCategory) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      name: category.name,
      slug: category.slug,
      description: category.description,
      iconSvg: category.iconSvg,
      gradient: category.gradient,
    });
  };

  const handleEditCategorySave = (id: string) => {
    setServiceCategories(
      serviceCategories.map((cat) =>
        cat.id === id ? { ...cat, ...categoryForm } : cat
      )
    );
    setEditingCategoryId(null);
    showFeedback("success", "Berhasil", "Kategori berhasil diperbarui");
  };

  const handleEditCategoryCancel = () => {
    setEditingCategoryId(null);
  };

  const handleCategoryDragStart = (category: ServiceCategory) => {
    setDraggedCategory(category);
  };

  const handleCategoryDragOver = (e: React.DragEvent, targetCategory: ServiceCategory) => {
    e.preventDefault();
    if (!draggedCategory || draggedCategory.id === targetCategory.id) return;

    const draggedIndex = serviceCategories.findIndex((cat) => cat.id === draggedCategory.id);
    const targetIndex = serviceCategories.findIndex((cat) => cat.id === targetCategory.id);

    const newCategories = [...serviceCategories];
    newCategories.splice(draggedIndex, 1);
    newCategories.splice(targetIndex, 0, draggedCategory);

    setServiceCategories(newCategories);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategory(null);
  };

  // Funfact item drag handlers
  const handleFunfactItemDragStart = (item: FunfactItem) => {
    setDraggedFunfactItem(item);
  };

  const handleFunfactItemDragOver = (e: React.DragEvent, targetItem: FunfactItem) => {
    e.preventDefault();
    if (!draggedFunfactItem || draggedFunfactItem.id === targetItem.id) return;

    const draggedIndex = funfactSection.items.findIndex((item) => item.id === draggedFunfactItem.id);
    const targetIndex = funfactSection.items.findIndex((item) => item.id === targetItem.id);

    const newItems = [...funfactSection.items];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedFunfactItem);

    setFunfactSection({ ...funfactSection, items: newItems });
  };

  const handleFunfactItemDragEnd = () => {
    setDraggedFunfactItem(null);
  };

  // Why choose us item handlers
  const handleAddWhyChooseUsItem = () => {
    const newItem: WhyChooseUsItem = {
      id: Date.now().toString(),
      icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
      iconBgColor: "primary",
      title: "Item Baru",
      description: "Deskripsi item baru",
    };
    setWhyChooseUsSection({
      ...whyChooseUsSection,
      items: [...whyChooseUsSection.items, newItem],
    });
  };

  const handleEditWhyChooseUsItem = (item: WhyChooseUsItem) => {
    setEditingWhyChooseUsId(item.id);
    setWhyChooseUsForm({
      icon: item.icon,
      iconBgColor: item.iconBgColor,
      title: item.title,
      description: item.description,
    });
  };

  const handleSaveWhyChooseUsItem = () => {
    if (!editingWhyChooseUsId) return;

    const newItems = whyChooseUsSection.items.map((item) =>
      item.id === editingWhyChooseUsId
        ? {
            ...item,
            icon: whyChooseUsForm.icon,
            iconBgColor: whyChooseUsForm.iconBgColor,
            title: whyChooseUsForm.title,
            description: whyChooseUsForm.description,
          }
        : item
    );

    setWhyChooseUsSection({ ...whyChooseUsSection, items: newItems });
    setEditingWhyChooseUsId(null);
    setWhyChooseUsForm({
      icon: "",
      iconBgColor: "primary",
      title: "",
      description: "",
    });
  };

  const handleCancelWhyChooseUsEdit = () => {
    setEditingWhyChooseUsId(null);
    setWhyChooseUsForm({
      icon: "",
      iconBgColor: "primary",
      title: "",
      description: "",
    });
  };

  const handleDeleteWhyChooseUsItem = (id: string) => {
    const newItems = whyChooseUsSection.items.filter((item) => item.id !== id);
    setWhyChooseUsSection({ ...whyChooseUsSection, items: newItems });
    if (editingWhyChooseUsId === id) {
      setEditingWhyChooseUsId(null);
    }
  };

  const handleWhyChooseUsItemDragStart = (item: WhyChooseUsItem) => {
    setDraggedWhyChooseUsItem(item);
  };

  const handleWhyChooseUsItemDragOver = (e: React.DragEvent, targetItem: WhyChooseUsItem) => {
    e.preventDefault();
    if (!draggedWhyChooseUsItem || draggedWhyChooseUsItem.id === targetItem.id) return;

    const draggedIndex = whyChooseUsSection.items.findIndex((item) => item.id === draggedWhyChooseUsItem.id);
    const targetIndex = whyChooseUsSection.items.findIndex((item) => item.id === targetItem.id);

    const newItems = [...whyChooseUsSection.items];
    newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedWhyChooseUsItem);

    setWhyChooseUsSection({ ...whyChooseUsSection, items: newItems });
  };

  const handleWhyChooseUsItemDragEnd = () => {
    setDraggedWhyChooseUsItem(null);
  };

  // Zakat page handlers
  const handleAddZakatInfoItem = () => {
    const newItem: InfoBoxItem = {
      id: Date.now().toString(),
      text: "Informasi baru tentang zakat",
    };
    setZakatPage({
      ...zakatPage,
      infoItems: [...zakatPage.infoItems, newItem],
    });
    setEditingZakatInfoId(newItem.id);
    setZakatInfoForm({ text: newItem.text });
  };

  const handleEditZakatInfoStart = (item: InfoBoxItem) => {
    setEditingZakatInfoId(item.id);
    setZakatInfoForm({ text: item.text });
  };

  const handleEditZakatInfoSave = () => {
    if (!editingZakatInfoId) return;

    const newItems = zakatPage.infoItems.map((item) =>
      item.id === editingZakatInfoId ? { ...item, text: zakatInfoForm.text } : item
    );
    setZakatPage({ ...zakatPage, infoItems: newItems });
    setEditingZakatInfoId(null);
    showFeedback("success", "Berhasil", "Informasi zakat berhasil diperbarui");
  };

  const handleEditZakatInfoCancel = () => {
    setEditingZakatInfoId(null);
    setZakatInfoForm({ text: "" });
  };

  const handleDeleteZakatInfoItem = (id: string) => {
    const newItems = zakatPage.infoItems.filter((item) => item.id !== id);
    setZakatPage({ ...zakatPage, infoItems: newItems });
    showFeedback("success", "Berhasil", "Informasi zakat berhasil dihapus");
  };

  // Qurban page handlers
  const handleAddQurbanInfoItem = () => {
    const newItem: InfoBoxItem = {
      id: Date.now().toString(),
      text: "Informasi baru tentang qurban",
    };
    setQurbanPage({
      ...qurbanPage,
      infoItems: [...qurbanPage.infoItems, newItem],
    });
    setEditingQurbanInfoId(newItem.id);
    setQurbanInfoForm({ text: newItem.text });
  };

  const handleEditQurbanInfoStart = (item: InfoBoxItem) => {
    setEditingQurbanInfoId(item.id);
    setQurbanInfoForm({ text: item.text });
  };

  const handleEditQurbanInfoSave = () => {
    if (!editingQurbanInfoId) return;

    const newItems = qurbanPage.infoItems.map((item) =>
      item.id === editingQurbanInfoId ? { ...item, text: qurbanInfoForm.text } : item
    );
    setQurbanPage({ ...qurbanPage, infoItems: newItems });
    setEditingQurbanInfoId(null);
    showFeedback("success", "Berhasil", "Informasi qurban berhasil diperbarui");
  };

  const handleEditQurbanInfoCancel = () => {
    setEditingQurbanInfoId(null);
    setQurbanInfoForm({ text: "" });
  };

  const handleDeleteQurbanInfoItem = (id: string) => {
    const newItems = qurbanPage.infoItems.filter((item) => item.id !== id);
    setQurbanPage({ ...qurbanPage, infoItems: newItems });
    showFeedback("success", "Berhasil", "Informasi qurban berhasil dihapus");
  };

  const handleSaveAll = async () => {
    try {
      const payload = [];

      // Save menu items if on header-menu tab
      if (activeTab === "header-menu") {
        payload.push({
          key: "frontend_header_menu",
          value: JSON.stringify(menuItems),
          category: "frontend",
          type: "json" as const,
          label: "Header Menu",
          description: "Menu navigasi header website",
          isPublic: true,
        });
      }

      // Save footer columns if on footer-menu tab
      if (activeTab === "footer-menu") {
        payload.push({
          key: "frontend_footer_menu",
          value: JSON.stringify(footerColumns),
          category: "frontend",
          type: "json" as const,
          label: "Footer Menu",
          description: "Menu navigasi footer website",
          isPublic: true,
        });
      }

      // Save hero slides if on body-landingpage tab
      if (activeTab === "body-landingpage") {
        payload.push({
          key: "frontend_hero_slides",
          value: JSON.stringify(heroSlides),
          category: "frontend",
          type: "json" as const,
          label: "Hero Slider",
          description: "Hero slider landingpage",
          isPublic: true,
        });

        // Also save service categories
        payload.push({
          key: "frontend_service_categories",
          value: JSON.stringify(serviceCategories),
          category: "frontend",
          type: "json" as const,
          label: "Kategori Layanan",
          description: "Kategori layanan di landingpage",
          isPublic: true,
        });

        // Also save featured section
        payload.push({
          key: "frontend_featured_section",
          value: JSON.stringify(featuredSection),
          category: "frontend",
          type: "json" as const,
          label: "Section Unggulan",
          description: "Pengaturan section program unggulan",
          isPublic: true,
        });

        // Also save programs section
        payload.push({
          key: "frontend_programs_section",
          value: JSON.stringify(programsSection),
          category: "frontend",
          type: "json" as const,
          label: "Section Program Kami",
          description: "Pengaturan section program kami",
          isPublic: true,
        });

        // Also save funfact section
        payload.push({
          key: "frontend_funfact_section",
          value: JSON.stringify(funfactSection),
          category: "frontend",
          type: "json" as const,
          label: "Section Funfact",
          description: "Pengaturan section funfact/statistik",
          isPublic: true,
        });

        // Also save why choose us section
        payload.push({
          key: "frontend_why_choose_us_section",
          value: JSON.stringify(whyChooseUsSection),
          category: "frontend",
          type: "json" as const,
          label: "Section Mengapa Memilih Kami",
          description: "Pengaturan section keunggulan",
          isPublic: true,
        });

        // Also save CTA section
        payload.push({
          key: "frontend_cta_section",
          value: JSON.stringify(ctaSection),
          category: "frontend",
          type: "json" as const,
          label: "Section CTA",
          description: "Pengaturan section call to action",
          isPublic: true,
        });
      }

      // Save pages settings if on pages tab
      if (activeTab === "pages") {
        console.log('[Admin] Saving Pages - Zakat:', zakatPage);
        console.log('[Admin] Saving Pages - Qurban:', qurbanPage);

        payload.push({
          key: "frontend_zakat_page",
          value: JSON.stringify(zakatPage),
          category: "frontend",
          type: "json" as const,
          label: "Halaman Zakat",
          description: "Pengaturan halaman zakat",
          isPublic: true,
        });

        payload.push({
          key: "frontend_qurban_page",
          value: JSON.stringify(qurbanPage),
          category: "frontend",
          type: "json" as const,
          label: "Halaman Qurban",
          description: "Pengaturan halaman qurban",
          isPublic: true,
        });

        payload.push({
          key: "frontend_wakaf_page",
          value: JSON.stringify(wakafPage),
          category: "frontend",
          type: "json" as const,
          label: "Halaman Wakaf",
          description: "Pengaturan halaman wakaf",
          isPublic: true,
        });

        payload.push({
          key: "frontend_program_page",
          value: JSON.stringify(programPage),
          category: "frontend",
          type: "json" as const,
          label: "Halaman Program",
          description: "Pengaturan halaman program",
          isPublic: true,
        });
      }

      // Save utilities settings if on utilities tab
      if (activeTab === "utilities") {
        payload.push({
          key: "utilities_campaign_amounts",
          value: JSON.stringify(campaignAmounts),
          category: "frontend",
          type: "json" as const,
          label: "Rekomendasi Nominal Campaign",
          description: "Nominal rekomendasi untuk donasi campaign",
          isPublic: true,
        });

        payload.push({
          key: "utilities_wakaf_amounts",
          value: JSON.stringify(wakafAmounts),
          category: "frontend",
          type: "json" as const,
          label: "Rekomendasi Nominal Wakaf",
          description: "Nominal rekomendasi untuk wakaf",
          isPublic: true,
        });
      }

      console.log('[Admin] Sending payload:', payload.length, 'items');
      const response = await api.put("/admin/settings/batch", payload);
      console.log('[Admin] Save response:', response.data);

      if (response.data) {
        showFeedback("success", "Berhasil", "Semua perubahan berhasil disimpan!");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      showFeedback(
        "error",
        "Gagal",
        error.response?.data?.message || "Gagal menyimpan perubahan"
      );
    }
  };

  return (
    <>
    <SettingsLayout>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs Header */}
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab("body-landingpage")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "body-landingpage"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Body Landingpage
            </button>
            <button
              onClick={() => setActiveTab("header-menu")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "header-menu"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Header Menu
            </button>
            <button
              onClick={() => setActiveTab("footer-menu")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "footer-menu"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Footer Menu
            </button>
            <button
              onClick={() => setActiveTab("pages")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "pages"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Pages
            </button>
            <button
              onClick={() => setActiveTab("utilities")}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === "utilities"
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300"
              }`}
            >
              Utilities
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "body-landingpage" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Hero Slider</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur slide hero yang tampil di halaman utama
                  </p>
                </div>
                <button onClick={handleAddSlide} className="btn btn-primary btn-sm flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Tambah Slide
                </button>
              </div>

              {/* Hero Slides List */}
              <div className="space-y-4">
                {heroSlides.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Belum ada slide. Klik "Tambah Slide" untuk menambahkan.</p>
                  </div>
                ) : (
                  heroSlides.map((slide) => (
                    <div
                      key={slide.id}
                      draggable={editingSlideId !== slide.id}
                      onDragStart={() => handleSlideDragStart(slide)}
                      onDragOver={(e) => handleSlideDragOver(e, slide)}
                      onDragEnd={handleSlideDragEnd}
                      className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
                        draggedSlide?.id === slide.id ? "opacity-50" : ""
                      } ${editingSlideId !== slide.id ? "cursor-move hover:border-gray-300" : ""}`}
                    >
                      {editingSlideId === slide.id ? (
                        // Edit Mode
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            {/* Left Column - Image */}
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Gambar Hero
                              </label>
                              {slideForm.image ? (
                                <div className="space-y-2">
                                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden relative group">
                                    <img
                                      src={slideForm.image}
                                      alt="Preview"
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3EGambar tidak dapat dimuat%3C/text%3E%3C/svg%3E";
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button
                                        type="button"
                                        onClick={() => setIsMediaLibraryOpen(true)}
                                        className="btn btn-secondary btn-sm"
                                      >
                                        <PhotoIcon className="w-4 h-4 mr-2" />
                                        Ubah Gambar
                                      </button>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setSlideForm({ ...slideForm, image: "" })}
                                    className="text-xs text-danger-600 hover:text-danger-700"
                                  >
                                    Hapus gambar
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setIsMediaLibraryOpen(true)}
                                  className="w-full aspect-video bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary-500 hover:bg-primary-50 transition-all flex flex-col items-center justify-center gap-2"
                                >
                                  <PhotoIcon className="w-12 h-12 text-gray-400" />
                                  <span className="text-sm font-medium text-gray-600">Pilih Gambar</span>
                                  <span className="text-xs text-gray-500">Dari pustaka media</span>
                                </button>
                              )}
                            </div>

                            {/* Right Column - Content */}
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Judul
                                </label>
                                <input
                                  type="text"
                                  value={slideForm.title}
                                  onChange={(e) => setSlideForm({ ...slideForm, title: e.target.value })}
                                  className="form-input"
                                  placeholder="Judul slide"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Deskripsi
                                </label>
                                <textarea
                                  value={slideForm.description}
                                  onChange={(e) => setSlideForm({ ...slideForm, description: e.target.value })}
                                  className="form-input"
                                  rows={3}
                                  placeholder="Deskripsi slide"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Label Tombol
                                </label>
                                <input
                                  type="text"
                                  value={slideForm.ctaText}
                                  onChange={(e) => setSlideForm({ ...slideForm, ctaText: e.target.value })}
                                  className="form-input"
                                  placeholder="Contoh: Mulai Berdonasi"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Link Tombol
                                </label>
                                <URLAutocomplete
                                  value={slideForm.ctaLink}
                                  onChange={(value) => setSlideForm({ ...slideForm, ctaLink: value })}
                                  placeholder="Pilih URL atau ketik manual"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Pilih dari daftar URL yang tersedia atau ketik URL manual
                                </p>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                            <button
                              onClick={handleEditSlideCancel}
                              className="btn btn-ghost btn-sm"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleEditSlideSave(slide.id)}
                              className="btn btn-primary btn-sm"
                              disabled={!slideForm.title || !slideForm.description}
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Left Column - Image Preview */}
                          <div className="flex items-start gap-3">
                            <Bars3Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                            <div className="flex-1">
                              <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                {slide.image ? (
                                  <img
                                    src={slide.image}
                                    alt={slide.title}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='400' height='300' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%239ca3af'%3ENo Image%3C/text%3E%3C/svg%3E";
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                                    No Image
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Right Column - Content */}
                          <div className="space-y-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{slide.title}</p>
                              <p className="text-xs text-gray-600 mt-1">{slide.description}</p>
                            </div>
                            <div className="pt-2">
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Tombol:</span> {slide.ctaText}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                <span className="font-medium">Link:</span> {slide.ctaLink}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 pt-2">
                              <button
                                onClick={() => handleEditSlideStart(slide)}
                                className="btn btn-ghost btn-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteSlide(slide.id)}
                                className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tips:</strong> Drag & drop untuk mengatur urutan slide. Slide akan tampil di hero
                  section sesuai urutan yang Anda atur.
                </p>
              </div>

              {/* Service Categories Section */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Kategori Layanan</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Atur kategori layanan yang tampil di bawah hero
                    </p>
                  </div>
                  <button onClick={handleAddCategory} className="btn btn-primary btn-sm flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" />
                    Tambah Kategori
                  </button>
                </div>

                {/* Service Categories List */}
                <div className="space-y-3">
                  {serviceCategories.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>Belum ada kategori. Klik "Tambah Kategori" untuk menambahkan.</p>
                    </div>
                  ) : (
                    serviceCategories.map((category) => (
                      <div
                        key={category.id}
                        draggable={editingCategoryId !== category.id}
                        onDragStart={() => handleCategoryDragStart(category)}
                        onDragOver={(e) => handleCategoryDragOver(e, category)}
                        onDragEnd={handleCategoryDragEnd}
                        className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
                          draggedCategory?.id === category.id ? "opacity-50" : ""
                        } ${editingCategoryId !== category.id ? "cursor-move hover:border-gray-300" : ""}`}
                      >
                        {editingCategoryId === category.id ? (
                          // Edit Mode
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Nama Kategori
                                </label>
                                <input
                                  type="text"
                                  value={categoryForm.name}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                  className="form-input"
                                  placeholder="Contoh: Zakat"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Slug/URL
                                </label>
                                <URLAutocomplete
                                  value={categoryForm.slug}
                                  onChange={(value) => setCategoryForm({ ...categoryForm, slug: value })}
                                  placeholder="Pilih URL atau ketik slug manual"
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Pilih dari daftar URL yang tersedia atau ketik slug manual
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Deskripsi
                                </label>
                                <input
                                  type="text"
                                  value={categoryForm.description}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                                  className="form-input"
                                  placeholder="Contoh: Zakat Fitrah & Zakat Mal"
                                />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Icon SVG
                                </label>
                                <textarea
                                  value={categoryForm.iconSvg}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, iconSvg: e.target.value })}
                                  className="form-input font-mono text-xs"
                                  rows={4}
                                  placeholder='<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor">...</svg>'
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                  Paste kode SVG lengkap. <strong>PENTING:</strong> Pastikan SVG menggunakan <code className="px-1 py-0.5 bg-gray-100 rounded">fill="currentColor"</code> dan <code className="px-1 py-0.5 bg-gray-100 rounded">stroke="currentColor"</code> agar warna icon otomatis mengikuti design (putih untuk card gradient, biru untuk card putih).
                                </p>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Gradient Class
                                </label>
                                <input
                                  type="text"
                                  value={categoryForm.gradient}
                                  onChange={(e) => setCategoryForm({ ...categoryForm, gradient: e.target.value })}
                                  className="form-input"
                                  placeholder="Contoh: gradient-zakat"
                                />
                              </div>
                            </div>
                            <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                              <button
                                onClick={handleEditCategoryCancel}
                                className="btn btn-ghost btn-sm"
                              >
                                Batal
                              </button>
                              <button
                                onClick={() => handleEditCategorySave(category.id)}
                                className="btn btn-primary btn-sm"
                                disabled={!categoryForm.name || !categoryForm.slug}
                              >
                                Simpan
                              </button>
                            </div>
                          </div>
                        ) : (
                          // View Mode
                          <div className="flex items-center gap-3">
                            <Bars3Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                {category.iconSvg && (
                                  <div
                                    className="w-8 h-8 flex items-center justify-center text-primary-500"
                                    dangerouslySetInnerHTML={{ __html: category.iconSvg.replace(/width="\d+"/, 'width="24"').replace(/height="\d+"/, 'height="24"') }}
                                  />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{category.name}</p>
                                  <p className="text-xs text-gray-500">{category.description}</p>
                                </div>
                              </div>
                              <div className="flex gap-2 mt-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                  /{category.slug}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                  {category.gradient}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleEditCategoryStart(category)}
                                className="btn btn-ghost btn-sm"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteCategory(category.id)}
                                className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* Help Text */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tips:</strong> Drag & drop untuk mengatur urutan kategori. Kategori akan tampil sesuai urutan yang Anda atur.
                  </p>
                </div>
              </div>

              {/* Featured Section Settings */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Section Program Unggulan</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur judul, deskripsi, dan tampilan program unggulan
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Judul Section
                        </label>
                        <input
                          type="text"
                          value={featuredSection.title}
                          onChange={(e) => setFeaturedSection({ ...featuredSection, title: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Program Unggulan & Mendesak"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Jumlah Program Ditampilkan
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={featuredSection.limit}
                          onChange={(e) => setFeaturedSection({ ...featuredSection, limit: parseInt(e.target.value) || 6 })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deskripsi Section
                      </label>
                      <input
                        type="text"
                        value={featuredSection.description}
                        onChange={(e) => setFeaturedSection({ ...featuredSection, description: e.target.value })}
                        className="form-input"
                        placeholder="Contoh: Program-program prioritas yang membutuhkan dukungan Anda"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Urutkan Berdasarkan
                      </label>
                      <select
                        value={featuredSection.sortBy}
                        onChange={(e) => setFeaturedSection({ ...featuredSection, sortBy: e.target.value as any })}
                        className="form-input"
                      >
                        <option value="urgent">Urgensi (Mendesak & Penting)</option>
                        <option value="created_date">Tanggal Dibuat (Terbaru)</option>
                        <option value="days_left">Sisa Waktu (Segera Berakhir)</option>
                        <option value="amount_collected">Donasi Terkumpul (Terbanyak)</option>
                        <option value="donor_count">Jumlah Donatur (Terbanyak)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Program akan ditampilkan sesuai urutan yang dipilih
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Programs Section Settings */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Section Program Kami</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur judul, deskripsi, dan tampilan section program kami
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Judul Section
                        </label>
                        <input
                          type="text"
                          value={programsSection.title}
                          onChange={(e) => setProgramsSection({ ...programsSection, title: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Program Kami"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Jumlah Program Ditampilkan
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={programsSection.limit}
                          onChange={(e) => setProgramsSection({ ...programsSection, limit: parseInt(e.target.value) || 6 })}
                          className="form-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deskripsi Section
                      </label>
                      <input
                        type="text"
                        value={programsSection.description}
                        onChange={(e) => setProgramsSection({ ...programsSection, description: e.target.value })}
                        className="form-input"
                        placeholder="Contoh: Pilih program yang ingin Anda dukung"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Urutkan Berdasarkan
                      </label>
                      <select
                        value={programsSection.sortBy}
                        onChange={(e) => setProgramsSection({ ...programsSection, sortBy: e.target.value as any })}
                        className="form-input"
                      >
                        <option value="created_date">Tanggal Dibuat (Terbaru)</option>
                        <option value="days_left">Sisa Waktu (Segera Berakhir)</option>
                        <option value="amount_collected">Donasi Terkumpul (Terbanyak)</option>
                        <option value="donor_count">Jumlah Donatur (Terbanyak)</option>
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Program akan ditampilkan sesuai urutan yang dipilih
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Funfact Section Settings */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Section Funfact/Statistik</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur judul, deskripsi, dan label setiap item statistik
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Judul Section
                        </label>
                        <input
                          type="text"
                          value={funfactSection.title}
                          onChange={(e) => setFunfactSection({ ...funfactSection, title: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Kepercayaan Anda, Amanah Kami"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deskripsi Section
                        </label>
                        <input
                          type="text"
                          value={funfactSection.description}
                          onChange={(e) => setFunfactSection({ ...funfactSection, description: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Bersama mewujudkan kebaikan untuk Indonesia"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Item Statistik (Drag & Drop untuk mengatur urutan)
                      </label>
                      <div className="space-y-3">
                        {funfactSection.items.map((item) => (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => handleFunfactItemDragStart(item)}
                            onDragOver={(e) => handleFunfactItemDragOver(e, item)}
                            onDragEnd={handleFunfactItemDragEnd}
                            className={`bg-gray-50 border border-gray-200 rounded-lg p-4 cursor-move hover:border-gray-300 transition-all ${
                              draggedFunfactItem?.id === item.id ? "opacity-50" : ""
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <Bars3Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Judul Item
                                  </label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) => {
                                      const newItems = funfactSection.items.map((i) =>
                                        i.id === item.id ? { ...i, title: e.target.value } : i
                                      );
                                      setFunfactSection({ ...funfactSection, items: newItems });
                                    }}
                                    className="form-input text-sm"
                                    placeholder="Contoh: Total Donatur"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Deskripsi Item
                                  </label>
                                  <input
                                    type="text"
                                    value={item.description}
                                    onChange={(e) => {
                                      const newItems = funfactSection.items.map((i) =>
                                        i.id === item.id ? { ...i, description: e.target.value } : i
                                      );
                                      setFunfactSection({ ...funfactSection, items: newItems });
                                    }}
                                    className="form-input text-sm"
                                    placeholder="Contoh: Kepercayaan dari seluruh Indonesia"
                                  />
                                </div>
                              </div>
                            </div>
                            <div className="mt-2 ml-8">
                              <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Data Key: {item.key}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Catatan:</strong> Data angka (jumlah donatur, program, dll) diambil secara otomatis dari database. Anda hanya perlu mengatur label dan deskripsi yang ditampilkan.
                  </p>
                </div>
              </div>

              {/* Why Choose Us Section Settings */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Section Mengapa Memilih Kami</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur judul, deskripsi, dan keunggulan platform Anda
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Judul Section
                        </label>
                        <input
                          type="text"
                          value={whyChooseUsSection.title}
                          onChange={(e) => setWhyChooseUsSection({ ...whyChooseUsSection, title: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Mengapa Memilih Bantuanku?"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Deskripsi Section
                        </label>
                        <input
                          type="text"
                          value={whyChooseUsSection.description}
                          onChange={(e) => setWhyChooseUsSection({ ...whyChooseUsSection, description: e.target.value })}
                          className="form-input"
                          placeholder="Contoh: Platform donasi terpercaya dengan layanan terbaik"
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center justify-between mb-3">
                        <label className="block text-sm font-medium text-gray-700">
                          Item Keunggulan (Drag & Drop untuk mengatur urutan)
                        </label>
                        <button
                          onClick={handleAddWhyChooseUsItem}
                          className="btn btn-sm btn-outline flex items-center gap-1"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Tambah Item
                        </button>
                      </div>
                      <div className="space-y-3">
                        {whyChooseUsSection.items.map((item) => (
                          <div
                            key={item.id}
                            draggable={editingWhyChooseUsId !== item.id}
                            onDragStart={() => handleWhyChooseUsItemDragStart(item)}
                            onDragOver={(e) => handleWhyChooseUsItemDragOver(e, item)}
                            onDragEnd={handleWhyChooseUsItemDragEnd}
                            className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${
                              editingWhyChooseUsId === item.id ? "" : "cursor-move hover:border-gray-300"
                            } transition-all ${draggedWhyChooseUsItem?.id === item.id ? "opacity-50" : ""}`}
                          >
                            {editingWhyChooseUsId === item.id ? (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    SVG Path Icon
                                  </label>
                                  <textarea
                                    value={whyChooseUsForm.icon}
                                    onChange={(e) => setWhyChooseUsForm({ ...whyChooseUsForm, icon: e.target.value })}
                                    className="form-input text-sm font-mono"
                                    rows={3}
                                    placeholder="Contoh: M9 12l2 2 4-4..."
                                  />
                                  <p className="text-xs text-gray-500 mt-1">
                                    Path SVG dari Heroicons atau library icon lainnya
                                  </p>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Warna Background Icon
                                  </label>
                                  <select
                                    value={whyChooseUsForm.iconBgColor}
                                    onChange={(e) => setWhyChooseUsForm({ ...whyChooseUsForm, iconBgColor: e.target.value as any })}
                                    className="form-input text-sm"
                                  >
                                    <option value="primary">Primary (Biru)</option>
                                    <option value="success">Success (Hijau)</option>
                                    <option value="info">Info (Cyan)</option>
                                    <option value="warning">Warning (Kuning)</option>
                                    <option value="danger">Danger (Merah)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Judul
                                  </label>
                                  <input
                                    type="text"
                                    value={whyChooseUsForm.title}
                                    onChange={(e) => setWhyChooseUsForm({ ...whyChooseUsForm, title: e.target.value })}
                                    className="form-input text-sm"
                                    placeholder="Contoh: Terpercaya & Resmi"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Deskripsi
                                  </label>
                                  <textarea
                                    value={whyChooseUsForm.description}
                                    onChange={(e) => setWhyChooseUsForm({ ...whyChooseUsForm, description: e.target.value })}
                                    className="form-input text-sm"
                                    rows={2}
                                    placeholder="Contoh: Berizin resmi dan diawasi oleh instansi berwenang..."
                                  />
                                </div>
                                <div className="flex gap-2 justify-end">
                                  <button
                                    onClick={handleCancelWhyChooseUsEdit}
                                    className="btn btn-sm btn-outline"
                                  >
                                    Batal
                                  </button>
                                  <button
                                    onClick={handleSaveWhyChooseUsItem}
                                    className="btn btn-sm btn-primary"
                                  >
                                    Simpan
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-start gap-3">
                                <Bars3Icon className="w-5 h-5 text-gray-400 flex-shrink-0 mt-1" />
                                <div className="flex-1">
                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-medium text-gray-900">{item.title}</h4>
                                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                                      <div className="mt-2 flex items-center gap-2">
                                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-${item.iconBgColor}-100 text-${item.iconBgColor}-800`}>
                                          {item.iconBgColor}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex gap-2 ml-4">
                                      <button
                                        onClick={() => handleEditWhyChooseUsItem(item)}
                                        className="text-primary-600 hover:text-primary-700"
                                      >
                                        <PencilIcon className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteWhyChooseUsItem(item.id)}
                                        className="text-danger-600 hover:text-danger-700"
                                      >
                                        <TrashIcon className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* CTA Section Settings */}
              <div className="pt-8 mt-8 border-t border-gray-200">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Section Call to Action (CTA)</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur ajakan bertindak di bagian akhir halaman
                  </p>
                </div>

                <div className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Judul CTA
                      </label>
                      <input
                        type="text"
                        value={ctaSection.title}
                        onChange={(e) => setCtaSection({ ...ctaSection, title: e.target.value })}
                        className="form-input"
                        placeholder="Contoh: Mulai Berbagi Kebaikan Hari Ini"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Deskripsi CTA
                      </label>
                      <textarea
                        value={ctaSection.description}
                        onChange={(e) => setCtaSection({ ...ctaSection, description: e.target.value })}
                        className="form-input"
                        rows={2}
                        placeholder="Contoh: Setiap donasi Anda membawa harapan baru..."
                      />
                    </div>

                    <div className="mt-6">
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Tombol CTA
                      </label>
                      <div className="space-y-3">
                        {ctaSection.buttons.map((button, index) => (
                          <div key={index} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Teks Tombol
                                </label>
                                <input
                                  type="text"
                                  value={button.text}
                                  onChange={(e) => {
                                    const newButtons = [...ctaSection.buttons];
                                    newButtons[index] = { ...button, text: e.target.value };
                                    setCtaSection({ ...ctaSection, buttons: newButtons });
                                  }}
                                  className="form-input text-sm"
                                  placeholder="Contoh: Lihat Semua Program"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  URL
                                </label>
                                <URLAutocomplete
                                  value={button.url}
                                  onChange={(value) => {
                                    const newButtons = [...ctaSection.buttons];
                                    newButtons[index] = { ...button, url: value };
                                    setCtaSection({ ...ctaSection, buttons: newButtons });
                                  }}
                                  placeholder="Pilih URL tujuan"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Variant
                                </label>
                                <select
                                  value={button.variant}
                                  onChange={(e) => {
                                    const newButtons = [...ctaSection.buttons];
                                    newButtons[index] = { ...button, variant: e.target.value as any };
                                    setCtaSection({ ...ctaSection, buttons: newButtons });
                                  }}
                                  className="form-input text-sm"
                                >
                                  <option value="primary">Primary (Solid)</option>
                                  <option value="outline">Outline</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSaveAll} className="btn btn-primary btn-md">
                  Simpan Semua Perubahan
                </button>
              </div>
            </div>
          )}

          {activeTab === "header-menu" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Menu Header</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur menu navigasi yang tampil di header website
                  </p>
                </div>
                <button onClick={handleAddItem} className="btn btn-primary btn-sm flex items-center gap-2">
                  <PlusIcon className="w-4 h-4" />
                  Tambah Menu
                </button>
              </div>

              {/* Menu Items List */}
              <div className="space-y-3">
                {menuItems.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Belum ada menu. Klik "Tambah Menu" untuk menambahkan.</p>
                  </div>
                ) : (
                  menuItems.map((item) => (
                    <div
                      key={item.id}
                      draggable={editingId !== item.id}
                      onDragStart={() => handleDragStart(item)}
                      onDragOver={(e) => handleDragOver(e, item)}
                      onDragEnd={handleDragEnd}
                      className={`bg-white border border-gray-200 rounded-lg p-4 transition-all ${
                        draggedItem?.id === item.id ? "opacity-50" : ""
                      } ${editingId !== item.id ? "cursor-move hover:border-gray-300" : ""}`}
                    >
                      {editingId === item.id ? (
                        // Edit Mode
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Label Menu
                              </label>
                              <input
                                type="text"
                                value={editForm.label}
                                onChange={(e) => setEditForm({ ...editForm, label: e.target.value })}
                                className="form-input"
                                placeholder="Contoh: Beranda"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                URL
                              </label>
                              <URLAutocomplete
                                value={editForm.url}
                                onChange={(value) => setEditForm({ ...editForm, url: value })}
                                placeholder="Pilih URL halaman tujuan"
                              />
                              <p className="mt-1 text-xs text-gray-500">
                                Pilih dari daftar URL yang tersedia
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={handleEditCancel}
                              className="btn btn-ghost btn-sm"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => handleEditSave(item.id)}
                              className="btn btn-primary btn-sm"
                              disabled={!editForm.label || !editForm.url}
                            >
                              Simpan
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-center gap-3">
                          <Bars3Icon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">{item.label}</p>
                            <p className="text-xs text-gray-500 truncate">{item.url}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditStart(item)}
                              className="btn btn-ghost btn-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tips:</strong> Drag & drop untuk mengatur urutan menu. Menu akan tampil di header
                  website sesuai urutan yang Anda atur.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSaveAll} className="btn btn-primary btn-md">
                  Simpan Semua Perubahan
                </button>
              </div>
            </div>
          )}

          {activeTab === "footer-menu" && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Menu Footer</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur kolom menu yang tampil di footer website
                  </p>
                </div>
                <button
                  onClick={() => {
                    const newColumn: FooterColumn = {
                      id: Date.now().toString(),
                      title: "Kolom Baru",
                      items: [],
                    };
                    setFooterColumns([...footerColumns, newColumn]);
                    setEditingColumnId(newColumn.id);
                    setColumnForm({ title: newColumn.title, items: [] });
                  }}
                  className="btn btn-primary btn-sm flex items-center gap-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  Tambah Kolom
                </button>
              </div>

              {/* Footer Columns List */}
              <div className="space-y-4">
                {footerColumns.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>Belum ada kolom footer. Klik "Tambah Kolom" untuk menambahkan.</p>
                  </div>
                ) : (
                  footerColumns.map((column) => (
                    <div
                      key={column.id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      {editingColumnId === column.id ? (
                        // Edit Mode - Column
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Judul Kolom
                            </label>
                            <input
                              type="text"
                              value={columnForm.title}
                              onChange={(e) => setColumnForm({ ...columnForm, title: e.target.value })}
                              className="form-input"
                              placeholder="Contoh: Informasi"
                            />
                          </div>

                          {/* Menu Items in Column */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">
                                Menu Items
                              </label>
                              <button
                                onClick={() => {
                                  const newItem: MenuItem = {
                                    id: Date.now().toString(),
                                    label: "",
                                    url: "",
                                  };
                                  const updatedItems = [...columnForm.items, newItem];
                                  setColumnForm({ ...columnForm, items: updatedItems });
                                  setEditingFooterItemId(newItem.id);
                                  setFooterItemForm({ label: "", url: "" });
                                }}
                                className="btn btn-ghost btn-xs flex items-center gap-1"
                              >
                                <PlusIcon className="w-3 h-3" />
                                Tambah Item
                              </button>
                            </div>

                            <div className="space-y-2">
                              {columnForm.items.map((item, itemIndex) => (
                                <div key={item.id} className="bg-gray-50 border border-gray-200 rounded p-3">
                                  {editingFooterItemId === item.id ? (
                                    // Edit Item
                                    <div className="space-y-2">
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                          Label
                                        </label>
                                        <input
                                          type="text"
                                          value={footerItemForm.label}
                                          onChange={(e) => setFooterItemForm({ ...footerItemForm, label: e.target.value })}
                                          className="form-input text-sm"
                                          placeholder="Contoh: Tentang Kami"
                                        />
                                      </div>
                                      <div>
                                        <label className="block text-xs font-medium text-gray-600 mb-1">
                                          URL
                                        </label>
                                        <URLAutocomplete
                                          value={footerItemForm.url}
                                          onChange={(value) => setFooterItemForm({ ...footerItemForm, url: value })}
                                          placeholder="Pilih URL"
                                        />
                                      </div>
                                      <div className="flex gap-2 justify-end pt-2">
                                        <button
                                          onClick={() => {
                                            setEditingFooterItemId(null);
                                            setFooterItemForm({ label: "", url: "" });
                                          }}
                                          className="btn btn-ghost btn-xs"
                                        >
                                          Batal
                                        </button>
                                        <button
                                          onClick={() => {
                                            const updatedItems = columnForm.items.map(i =>
                                              i.id === item.id ? { ...i, ...footerItemForm } : i
                                            );
                                            setColumnForm({ ...columnForm, items: updatedItems });
                                            setEditingFooterItemId(null);
                                            setFooterItemForm({ label: "", url: "" });
                                          }}
                                          className="btn btn-primary btn-xs"
                                        >
                                          Simpan
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    // View Item
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{item.label}</div>
                                        <div className="text-xs text-gray-500">{item.url}</div>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => {
                                            setEditingFooterItemId(item.id);
                                            setFooterItemForm({ label: item.label, url: item.url });
                                          }}
                                          className="btn btn-ghost btn-xs"
                                        >
                                          <PencilIcon className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => {
                                            const updatedItems = columnForm.items.filter(i => i.id !== item.id);
                                            setColumnForm({ ...columnForm, items: updatedItems });
                                          }}
                                          className="btn btn-ghost btn-xs text-red-600 hover:text-red-700"
                                        >
                                          <TrashIcon className="w-3 h-3" />
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2 justify-end pt-3 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setEditingColumnId(null);
                                setColumnForm({ title: "", items: [] });
                              }}
                              className="btn btn-ghost btn-sm"
                            >
                              Batal
                            </button>
                            <button
                              onClick={() => {
                                const updatedColumns = footerColumns.map(col =>
                                  col.id === column.id ? { ...col, ...columnForm } : col
                                );
                                setFooterColumns(updatedColumns);
                                setEditingColumnId(null);
                                setColumnForm({ title: "", items: [] });
                              }}
                              className="btn btn-primary btn-sm"
                            >
                              Simpan Kolom
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View Mode - Column
                        <div>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-gray-900 mb-2">{column.title}</h4>
                              <div className="space-y-1">
                                {column.items.map(item => (
                                  <div key={item.id} className="text-sm text-gray-600">
                                    {item.label} → {item.url}
                                  </div>
                                ))}
                                {column.items.length === 0 && (
                                  <p className="text-sm text-gray-400 italic">Belum ada menu items</p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setEditingColumnId(column.id);
                                  setColumnForm({ title: column.title, items: column.items });
                                }}
                                className="btn btn-ghost btn-sm"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm('Hapus kolom ini?')) {
                                    setFooterColumns(footerColumns.filter(col => col.id !== column.id));
                                  }
                                }}
                                className="btn btn-ghost btn-sm text-red-600 hover:text-red-700"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Help Text */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Tips:</strong> Setiap kolom dapat memiliki beberapa menu items. Kolom akan ditampilkan di footer website sesuai urutan yang Anda atur.
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSaveAll} className="btn btn-primary btn-md">
                  Simpan Semua Perubahan
                </button>
              </div>
            </div>
          )}

          {activeTab === "pages" && (
            <div className="space-y-8">
              {/* Zakat Page Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Halaman Zakat</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur konten untuk halaman zakat (/zakat)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Page Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Halaman
                    </label>
                    <input
                      type="text"
                      value={zakatPage.title}
                      onChange={(e) => setZakatPage({ ...zakatPage, title: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Zakat"
                    />
                  </div>

                  {/* Page Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi Halaman
                    </label>
                    <textarea
                      value={zakatPage.description}
                      onChange={(e) => setZakatPage({ ...zakatPage, description: e.target.value })}
                      className="form-input"
                      rows={2}
                      placeholder="Contoh: Tunaikan zakat Anda dengan mudah dan amanah"
                    />
                  </div>

                  {/* Info Box Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Info Box
                    </label>
                    <input
                      type="text"
                      value={zakatPage.infoTitle}
                      onChange={(e) => setZakatPage({ ...zakatPage, infoTitle: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Tentang Zakat"
                    />
                  </div>

                  {/* Info Box Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Informasi Zakat
                      </label>
                      <button
                        onClick={handleAddZakatInfoItem}
                        className="btn btn-sm btn-outline flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {zakatPage.infoItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          {editingZakatInfoId === item.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <textarea
                                value={zakatInfoForm.text}
                                onChange={(e) => setZakatInfoForm({ text: e.target.value })}
                                className="form-input"
                                rows={3}
                                placeholder="Contoh: Zakat adalah rukun Islam yang ke-3..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleEditZakatInfoCancel}
                                  className="btn btn-ghost btn-sm"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={handleEditZakatInfoSave}
                                  className="btn btn-primary btn-sm"
                                  disabled={!zakatInfoForm.text}
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">• {item.text}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditZakatInfoStart(item)}
                                  className="text-primary-600 hover:text-primary-700"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteZakatInfoItem(item.id)}
                                  className="text-danger-600 hover:text-danger-700"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Qurban Page Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Halaman Qurban</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur konten untuk halaman qurban (/qurban)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Page Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Halaman
                    </label>
                    <input
                      type="text"
                      value={qurbanPage.title}
                      onChange={(e) => setQurbanPage({ ...qurbanPage, title: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Paket Qurban"
                    />
                  </div>

                  {/* Page Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi Halaman
                    </label>
                    <textarea
                      value={qurbanPage.description}
                      onChange={(e) => setQurbanPage({ ...qurbanPage, description: e.target.value })}
                      className="form-input"
                      rows={2}
                      placeholder="Contoh: Wujudkan ibadah qurban Anda bersama kami"
                    />
                  </div>

                  {/* Info Box Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Info Box
                    </label>
                    <input
                      type="text"
                      value={qurbanPage.infoTitle}
                      onChange={(e) => setQurbanPage({ ...qurbanPage, infoTitle: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Informasi Penting"
                    />
                  </div>

                  {/* Info Box Items */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Informasi Qurban
                      </label>
                      <button
                        onClick={handleAddQurbanInfoItem}
                        className="btn btn-sm btn-outline flex items-center gap-1"
                      >
                        <PlusIcon className="w-4 h-4" />
                        Tambah Item
                      </button>
                    </div>

                    <div className="space-y-2">
                      {qurbanPage.infoItems.map((item, index) => (
                        <div
                          key={item.id}
                          className="bg-gray-50 border border-gray-200 rounded-lg p-3"
                        >
                          {editingQurbanInfoId === item.id ? (
                            // Edit Mode
                            <div className="space-y-3">
                              <textarea
                                value={qurbanInfoForm.text}
                                onChange={(e) => setQurbanInfoForm({ text: e.target.value })}
                                className="form-input"
                                rows={3}
                                placeholder="Contoh: Harga sudah termasuk hewan, pemotongan..."
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleEditQurbanInfoCancel}
                                  className="btn btn-ghost btn-sm"
                                >
                                  Batal
                                </button>
                                <button
                                  onClick={handleEditQurbanInfoSave}
                                  className="btn btn-primary btn-sm"
                                  disabled={!qurbanInfoForm.text}
                                >
                                  Simpan
                                </button>
                              </div>
                            </div>
                          ) : (
                            // View Mode
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-gray-700">• {item.text}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleEditQurbanInfoStart(item)}
                                  className="text-primary-600 hover:text-primary-700"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteQurbanInfoItem(item.id)}
                                  className="text-danger-600 hover:text-danger-700"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Wakaf Page Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Halaman Wakaf</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur konten untuk halaman wakaf (/wakaf)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Page Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Halaman
                    </label>
                    <input
                      type="text"
                      value={wakafPage.title}
                      onChange={(e) => setWakafPage({ ...wakafPage, title: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Program Wakaf"
                    />
                  </div>

                  {/* Page Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi Halaman
                    </label>
                    <textarea
                      value={wakafPage.description}
                      onChange={(e) => setWakafPage({ ...wakafPage, description: e.target.value })}
                      className="form-input"
                      rows={2}
                      placeholder="Contoh: Salurkan wakaf Anda untuk aset produktif yang memberikan manfaat berkelanjutan"
                    />
                  </div>
                </div>
              </div>

              {/* Program Page Settings */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900">Halaman Program</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur konten untuk halaman program (/program)
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Page Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Judul Halaman
                    </label>
                    <input
                      type="text"
                      value={programPage.title}
                      onChange={(e) => setProgramPage({ ...programPage, title: e.target.value })}
                      className="form-input"
                      placeholder="Contoh: Semua Program"
                    />
                  </div>

                  {/* Page Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deskripsi Halaman
                    </label>
                    <textarea
                      value={programPage.description}
                      onChange={(e) => setProgramPage({ ...programPage, description: e.target.value })}
                      className="form-input"
                      rows={2}
                      placeholder="Contoh: Temukan berbagai program donasi untuk membantu sesama yang membutuhkan"
                    />
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSaveAll} className="btn btn-primary btn-md">
                  Simpan Semua Perubahan
                </button>
              </div>
            </div>
          )}

          {activeTab === "utilities" && (
            <div className="space-y-8">
              {/* Campaign Amounts */}
              <div>
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Rekomendasi Nominal Campaign</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur nominal rekomendasi untuk donasi campaign (maksimal 3 nominal)
                  </p>
                </div>

                <div className="space-y-3">
                  {campaignAmounts.map((amount, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominal {index + 1}
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            const newAmounts = [...campaignAmounts];
                            newAmounts[index] = parseInt(e.target.value) || 0;
                            setCampaignAmounts(newAmounts);
                          }}
                          className="form-input"
                          placeholder="Contoh: 50000"
                          min="0"
                          step="1000"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newAmounts = campaignAmounts.filter((_, i) => i !== index);
                          setCampaignAmounts(newAmounts);
                        }}
                        className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50 mt-6"
                        disabled={campaignAmounts.length === 1}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {campaignAmounts.length < 3 && (
                    <button
                      onClick={() => {
                        if (campaignAmounts.length < 3) {
                          setCampaignAmounts([...campaignAmounts, 0]);
                        }
                      }}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Nominal
                    </button>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tips:</strong> Masukkan nominal dalam Rupiah (tanpa tanda titik). Contoh: 50000 untuk Rp 50.000
                  </p>
                </div>
              </div>

              {/* Wakaf Amounts */}
              <div className="pt-8 border-t border-gray-200">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Rekomendasi Nominal Wakaf</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Atur nominal rekomendasi untuk wakaf (maksimal 3 nominal)
                  </p>
                </div>

                <div className="space-y-3">
                  {wakafAmounts.map((amount, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nominal {index + 1}
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            const newAmounts = [...wakafAmounts];
                            newAmounts[index] = parseInt(e.target.value) || 0;
                            setWakafAmounts(newAmounts);
                          }}
                          className="form-input"
                          placeholder="Contoh: 100000"
                          min="0"
                          step="1000"
                        />
                      </div>
                      <button
                        onClick={() => {
                          const newAmounts = wakafAmounts.filter((_, i) => i !== index);
                          setWakafAmounts(newAmounts);
                        }}
                        className="btn btn-ghost btn-sm text-danger-600 hover:bg-danger-50 mt-6"
                        disabled={wakafAmounts.length === 1}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {wakafAmounts.length < 3 && (
                    <button
                      onClick={() => {
                        if (wakafAmounts.length < 3) {
                          setWakafAmounts([...wakafAmounts, 0]);
                        }
                      }}
                      className="btn btn-outline btn-sm flex items-center gap-2"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Tambah Nominal
                    </button>
                  )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <p className="text-sm text-blue-800">
                    <strong>Tips:</strong> Masukkan nominal dalam Rupiah (tanpa tanda titik). Contoh: 100000 untuk Rp 100.000
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t border-gray-200">
                <button onClick={handleSaveAll} className="btn btn-primary btn-md">
                  Simpan Semua Perubahan
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Media Library Modal */}
      <MediaLibrary
        isOpen={isMediaLibraryOpen}
        onClose={() => setIsMediaLibraryOpen(false)}
        onSelect={(url) => {
          setSlideForm({ ...slideForm, image: url });
          setIsMediaLibraryOpen(false);
        }}
        selectedUrl={slideForm.image}
        accept="image/*"
        category="activity"
      />
    </SettingsLayout>

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
