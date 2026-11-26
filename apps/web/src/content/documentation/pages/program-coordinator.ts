import type { DocumentationPage } from "../types";

export const programCoordinatorDoc: DocumentationPage = {
  slug: "program-coordinator",
  title: "Program Coordinator",
  category: "Operasional",
  summary: "Menugaskan karyawan sebagai koordinator program dan batas akses perannya.",
  updatedAt: "2026-11-26",
  sections: [
    {
      id: "peran",
      heading: "Apa Itu Program Coordinator?",
      bodyHtml: `<p>Program Coordinator adalah karyawan yang bertanggung jawab atas campaign tertentu. Ia mendapat akun dashboard dengan akses terbatas pada program yang ditugaskan, sehingga tidak melihat seluruh data lembaga.</p>
<p>Menu yang tersedia antara lain Campaigns (miliknya), Laporan Kegiatan, Disbursements, dan Influencer Saya.</p>`,
    },
    {
      id: "mengaktifkan",
      heading: "Menjadikan Karyawan sebagai Koordinator",
      bodyHtml: `<ol>
<li>Pastikan karyawan sudah ada di <strong>Master → Employees</strong> dengan email.</li>
<li>Super Admin mengaktifkan akun login karyawan dan memilih peran <code>program_coordinator</code> (juga bisa lewat <strong>Settings → Users</strong>).</li>
<li>Pada form campaign, isi <strong>Penanggung Jawab Program</strong> dengan karyawan tersebut.</li>
</ol>
<p>Koordinator hanya melihat campaign tempat ia ditunjuk serta laporan dan pencairan yang ia buat.</p>`,
    },
  ],
};
