import type { DocumentationPage } from "../types";

export const whatsappAiDoc: DocumentationPage = {
    slug: "whatsapp-ai",
    title: "Robot AI WhatsApp (Chatbot)",
    category: "Fitur",
    summary:
        "Panduan tentang Robot AI WhatsApp yang interaktif untuk melayani donatur, cek status, dan tanya jawab program.",
    updatedAt: "2026-02-20",
    sections: [
        {
            id: "konsep-dasar-ai",
            heading: "Apa itu Robot AI WhatsApp?",
            bodyHtml: `
                <p>Berbeda dengan <em>Notifikasi Otomatis</em> yang bersifat 1-arah (sistem mengirim info ke donatur), <strong>Robot AI WhatsApp</strong> bersifat <strong>2-arah (Interaktif)</strong>.</p>
                <p>Fitur ini mengintegrasikan nomor WhatsApp lembaga Anda dengan mesin Kecerdasan Buatan (seperti Google Gemini atau Claude) sehingga donatur dapat "mengobrol" layaknya bersama Customer Service manusia sungguhan selama 24 jam penuh.</p>
            `,
        },
        {
            id: "kemampuan-ai",
            heading: "Kemampuan Utama AI",
            bodyHtml: `
                <p>Robot AI tidak hanya menjawab dari teks statis (seperti Auto-Reply biasa), tetapi AI tersebut memiliki akses internal ke database Bantuanku milik Anda, sehingga ia mampu:</p>
                <ol className="list-decimal pl-5 mt-2 space-y-3">
                    <li>
                        <strong>Memandu Proses Berdonasi Langsung:</strong>
                        <br/>
                        Donatur mengetik: <em>"Saya mau sedekah Rp 50.000 untuk panti asuhan"</em>. 
                        AI akan mencarikan program Panti Asuhan yang aktif, membuatkan <em>order transaksi</em> langsung di sistem, lalu membalas dengan total tagihan dan nomor rekening tujuannya.
                    </li>
                    <li>
                        <strong>Menghitung Zakat Otomatis:</strong>
                        <br/>
                        Donatur mengetik: <em>"Gaji saya 10 juta per bulan, berapa zakat profesi saya?"</em>.
                        AI akan memahami pertanyaannya, menghitung nominal sesuai standar Nishab zakat, lalu langsung membuatkan tagihan pembayarannya.
                    </li>
                    <li>
                        <strong>Mengecek Status Pembayaran & Program:</strong>
                        <br/>
                        Donatur bisa menanyakan status konfirmasi transfer mereka: <em>"Tolong cek tagihan INV-2026-001 apakah sudah lunas?"</em> AI akan melihat status di database secara <em>real-time</em> dan menjawab.
                    </li>
                    <li>
                        <strong>Tanya Jawab Program:</strong>
                        <br/>
                        AI mampu mempelajari detail seluruh program yang Anda terbitkan. Jika donatur bertanya: <em>"Apa saja program bantuan Palestina yang lagi buka?"</em> AI akan melakukan pencarian dan merangkumkan daftar kampanyenya beserta link amalnya.
                    </li>
                </ol>
            `,
        },
        {
            id: "batasan-dan-pengawasan",
            heading: "Batasan & Handover (Oper Alih ke Manusia)",
            bodyHtml: `
                <p>Untuk menjaga kendali, AI bekerja dengan sistem <em>Guardrails</em> (pagar pembatas):</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>AI menolak memberikan diskon donasi atau memodifikasi invoice jika tidak sesuai perintah sistem.</li>
                    <li>Terdapat batasan <em>rate-limiting</em> untuk mencegah biaya API jebol jika ada donatur yang memberikan pesan spam secara terus menerus.</li>
                    <li>
                        <strong>Human Handover:</strong> Jika AI tidak mampu menjawab, kebingungan, atau dimarahi oleh donatur yang komplain terkait masalah teknis, AI akan secara otomatis memutus sesinya dan memberi tanda bahwa <strong>Admin Manusia harus mengambil alih percakapan (Takeover)</strong>.
                    </li>
                </ul>
            `,
        },
    ]
};
