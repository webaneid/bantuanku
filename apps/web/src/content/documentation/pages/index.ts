// Re-export all documentation pages
import { pengenalanDoc } from "./pengenalan";
import { arsitekturSistemDoc } from "./arsitektur-sistem";
import { loginDanAksesDoc } from "./login-dan-akses";
import { navigasiDashboardDoc } from "./navigasi-dashboard";
import { panduanUploadGambarDoc as uploadGambarDoc } from "./panduan-upload-gambar";
import { konsepMitraDoc } from "./konsep-mitra";
import { alurPencairanDoc } from "./alur-pencairan";
import { caraMembuatCampaignDoc } from "./cara-membuat-campaign";
import { mengelolaTransaksiDoc } from "./mengelola-transaksi";
import { laporanKeuanganDoc } from "./laporan-keuangan";
import { kategoriKeuanganDoc } from "./kategori-keuangan";
import { seoDoc } from "./seo";
import { flipPaymentDoc } from "./flip-payment";
import { kodeUnikDoc } from "./kode-unik";
import { qurbanDoc } from "./qurban";
import { zakatDoc } from "./zakat";
import { fundraiserDoc } from "./fundraiser";
import { amilRevenueDoc as bagiHasilAmilDoc } from "./bagi-hasil-amil";
import { whatsappNotificationDoc } from "./whatsapp-notifikasi";
import { whatsappAiDoc } from "./whatsapp-ai";
import { bukuKasDoc } from "./buku-kas";
import { pengaturanPembayaranDoc } from "./pengaturan-pembayaran";
import { wakafDoc } from "./wakaf";
import { laporanKegiatanDoc } from "./laporan-kegiatan";
import { donaturDoc } from "./donatur";
import { pagesCmsDoc } from "./pages-cms";
import { masterDataDoc } from "./master-data";
import { programCoordinatorDoc } from "./program-coordinator";
import { alurDonaturDoc } from "./alur-donatur";
import { pengaturanUmumDoc } from "./pengaturan-umum";

export {
  pengenalanDoc,
  bukuKasDoc,
  pengaturanPembayaranDoc,
  wakafDoc,
  laporanKegiatanDoc,
  donaturDoc,
  pagesCmsDoc,
  masterDataDoc,
  programCoordinatorDoc,
  alurDonaturDoc,
  pengaturanUmumDoc,
  arsitekturSistemDoc,
  loginDanAksesDoc,
  navigasiDashboardDoc,
  uploadGambarDoc,
  konsepMitraDoc,
  alurPencairanDoc,
  caraMembuatCampaignDoc,
  mengelolaTransaksiDoc,
  laporanKeuanganDoc,
  kategoriKeuanganDoc,
  seoDoc,
  flipPaymentDoc,
  kodeUnikDoc,
  qurbanDoc,
  zakatDoc,
  fundraiserDoc,
  bagiHasilAmilDoc,
  whatsappNotificationDoc,
  whatsappAiDoc,
};

export const documentationPages: Record<string, any> = {
  "pengenalan": pengenalanDoc,
  "buku-kas": bukuKasDoc,
  "pengaturan-pembayaran": pengaturanPembayaranDoc,
  "wakaf": wakafDoc,
  "laporan-kegiatan": laporanKegiatanDoc,
  "donatur": donaturDoc,
  "pages-cms": pagesCmsDoc,
  "master-data": masterDataDoc,
  "program-coordinator": programCoordinatorDoc,
  "alur-donatur": alurDonaturDoc,
  "pengaturan-umum": pengaturanUmumDoc,
  "arsitektur-sistem": arsitekturSistemDoc,
  "login-dan-akses": loginDanAksesDoc,
  "navigasi-dashboard": navigasiDashboardDoc,
  "panduan-upload-gambar": uploadGambarDoc,
  "konsep-mitra": konsepMitraDoc,
  "alur-pencairan": alurPencairanDoc,
  "cara-membuat-campaign": caraMembuatCampaignDoc,
  "mengelola-transaksi": mengelolaTransaksiDoc,
  "laporan-keuangan": laporanKeuanganDoc,
  "kategori-keuangan": kategoriKeuanganDoc,
  "seo": seoDoc,
  "flip-payment": flipPaymentDoc,
  "kode-unik": kodeUnikDoc,
  "qurban": qurbanDoc,
  "zakat": zakatDoc,
  "fundraiser": fundraiserDoc,
  "bagi-hasil-amil": bagiHasilAmilDoc,
  "whatsapp-notifikasi": whatsappNotificationDoc,
  "whatsapp-ai": whatsappAiDoc,
};
