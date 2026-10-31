# ADR-0017: Kalkulasi Zakat Satu Sumber di Server

**Status:** Accepted
**Tanggal:** 2026-10-31

## Context
Hitung zakat tersebar di lima tempat dengan aturan dan sumber parameter berbeda: kalkulator web (sebagian di browser dengan 85 gram dan 2,5% ditulis langsung di kode, maal di server), `services/zakat.ts` (kode mati, endpoint income/trade/fitrah tidak pernah dibuat), alur zakat bot WA (`whatsapp-flow.ts`), kalkulator lama di `whatsapp-ai.ts` (kode mati), dan `/zakat/config` + `/zakat/calculate/maal` yang membaca `zakat_calculator_configs`. Tabel itu tidak punya UI admin; admin hanya bisa mengubah `settings.zakat_*`. Akibatnya perubahan nisab/rate admin mengubah bot tetapi tidak web maal, dan bot tidak mengecek nisab untuk pertanian, peternakan, dan bisnis padahal web mengeceknya. Fitur "bot bisa menghitung zakat" membutuhkan satu sumber yang bisa dipanggil dari tool.

## Decision
`apps/api/src/services/zakat-calculator.ts` adalah satu-satunya tempat hitung zakat di server: fungsi murni `calculateZakat(kind, input, params)` dan `loadZakatParams(db)`.
- **Aturan mengikuti kalkulator web** (yang dilihat donatur): nisab maal/peternakan/bisnis = `zakat_nisab_gold` gram × harga emas; profesi = nisab/12 per bulan atas penghasilan bersih; pertanian = 750 kg × harga beras (dilewati bila harga beras tak diketahui), 10% tadah hujan / 5% irigasi; fitrah = jiwa × nominal.
- **Parameter hanya dari tabel `settings`** (`zakat_gold_price`, `zakat_nisab_gold`, `zakat_mal_percentage`, `zakat_profession_percentage`, `zakat_rice_price`, `zakat_fitrah_amount`), karena itu satu-satunya sumber yang bisa diubah admin.
- Dipakai oleh alur zakat bot, tool `calculate_zakat`, dan `/zakat/config` + `/zakat/calculate/maal`. Harga emas bot kini sama dengan web (`zakat_gold_price`); scraper Pluang di bot dihapus.
- Pembulatan `Math.floor`, sama dengan `/calculate/maal`.

## Alternatif yang Dipertimbangkan
- Pakai `zakat_calculator_configs` sebagai sumber — tidak dipilih: tidak ada UI admin untuk mengubahnya.
- Biarkan bot dan web berbeda — tidak dipilih: donatur mendapat angka berbeda untuk input yang sama.
- Memindahkan semua kalkulator web ke endpoint server sekarang — ditunda: perubahan web yang lebih besar, dicatat sebagai gap.

## Konsekuensi
- Admin mengubah nisab/rate/harga di Settings dan bot serta web maal ikut berubah.
- Bot kini memberi jawaban "belum wajib zakat" untuk pertanian/peternakan/bisnis di bawah nisab, seperti web.
- Harga emas bergantung pada `zakat_gold_price` yang diperbarui lewat admin/cron; bila basi, web dan bot sama-sama basi (bot tidak lagi mengambil harga langsung dari Pluang).
- Kalkulator web selain maal (profesi, pertanian, peternakan) masih menghitung di browser dengan aturan yang sama tetapi nilai 85 gram dan 2,5% ditulis langsung; menyatukannya adalah pekerjaan lanjutan.
- `zakat_calculator_configs` dan fungsi lama di `services/zakat.ts` tidak lagi dipakai jalur zakat bot/maal.
