import type { DocumentationPage } from "../types";

export const panduanUploadGambarDoc: DocumentationPage = {
    slug: "panduan-upload-gambar",
    title: "Panduan Upload Gambar Utama",
    category: "Operasional",
    summary:
        "Panduan rekomendasi ukuran dan rasio gambar untuk Campaign, Zakat, Qurban, serta penjelasan sistem pemotongan otomatis (Autocrop).",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "ukuran-ideal",
            heading: "Ukuran & Rasio Gambar Ideal",
            bodyHtml: `
                <p>Saat Anda mengunggah gambar utama untuk berbagai modul (<strong>Campaign, Zakat, Qurban, maupun Halaman/Page</strong>), sangat penting untuk memastikan ukuran dan rasionya sudah sesuai agar tampilan website tetap rapi dan profesional.</p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 my-4">
                    <h4 className="font-semibold text-blue-800 mb-2">Penting Diingat:</h4>
                    <ul className="list-disc pl-5 space-y-1 text-blue-900">
                        <li><strong>Ukuran Default:</strong> 900 x 498 pixel</li>
                        <li><strong>Rasio:</strong> ± 16:9 (Landscape / Mendatar)</li>
                        <li><strong>Posisi Objek:</strong> Taruh objek penting/wajah/teks di bagian tengah gambar.</li>
                    </ul>
                </div>
                <h4 className="font-semibold mt-4 mb-2">⚠️ Hindari Gambar Berbentuk Kotak (Square) atau Berdiri (Portrait)</h4>
                <p>Jika Anda mengunggah gambar berbentuk kotak (seperti format Instagram 1:1) atau memanjang ke bawah (portrait/vertikal), <strong>sistem akan secara otomatis memotong (crop) bagian atas dan bawah gambar</strong> agar sesuai dengan rasio 16:9.</p>
                <p>Hal ini sering kali menyebabkan wajah orang terpotong atau tulisan pada gambar menjadi hilang, yang berujung pada tampilan gambar yang jelek atau tidak utuh saat dilihat oleh donatur.</p>
            `,
        },
        {
            id: "tips-upload",
            heading: "Tips Agar Gambar Tampil Maksimal",
            bodyHtml: `
                <ul className="list-disc pl-5 mt-2 space-y-2">
                    <li><strong>Gunakan resolusi minimal 900x498 pixel.</strong> Jika Anda mengunggah ukuran yang lebih besar (misal: 1200x664), tidak apa-apa; sistem akan secara otomatis mengecilkannya. Namun, jika Anda mengupload yang terlalu kecil, gambar akan terlihat pecah atau buram.</li>
                    <li><strong>Jangan simpan informasi penting di pojok gambar.</strong> Beberapa tipe ukuran pratinjau (seperti thumbnail kecil) dapat sedikit memotong ujung gambar.</li>
                    <li><strong>Kompresi otomatis:</strong> Anda tidak perlu repot mengompresi gambar (memperkecil KB) sebelum upload karena sistem secara otomatis mengonversi ke format yang ringan (WebP).</li>
                </ul>
            `,
        },
        {
            id: "sistem-autocrop",
            heading: "Informasi Tambahan: Bagaimana Sistem Memproses Gambar? (Autocrop)",
            bodyHtml: `
                <p>Sebagai informasi teknis tambahan, platform ini memiliki mekanisme khusus di balik layar setiap kali Anda mengupload gambar <em>General</em>:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-1 text-gray-700">
                    <li>Sistem tidak mengambil gambar asli Anda begitu saja untuk ditampilkan, melainkan diproses ulang agar ringan dimuat di handphone maupun PC.</li>
                    <li>Gambar akan dipecah menjadi beberapa variasi ukuran:
                        <ul className="list-disc pl-5 mt-1">
                            <li><strong>Thumbnail</strong> (300 x 166) - Untuk daftar/grid card.</li>
                            <li><strong>Medium</strong> (600 x 332) - Untuk pratinjau sedang.</li>
                            <li><strong>Large</strong> (900 x 498) - Untuk detail di halaman utama.</li>
                            <li><strong>Square</strong> (300 x 300) - Khusus untuk profil/kebutuhan kotak.</li>
                        </ul>
                    </li>
                    <li>Proses pemotongan menggunakan mode <strong>Cover</strong>, yang artinya gambar akan menutupi seluruh area target. Jika rasio gambar awal tidak sesuai, bagian tepi yang berlebih akan dipangkas.</li>
                </ol>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 my-4">
                    <p className="text-sm text-yellow-800">
                        <strong> Pengecualian:</strong> Untuk kategori <strong>Financial</strong> (seperti upload Bukti Transfer manual), sistem tidak akan melakukan pemotongan/crop sama sekali untuk menjaga agar bukti pembayaran (nominal dan rekening) tetap terbaca utuh.
                    </p>
                </div>
            `,
        },
    ]
};
