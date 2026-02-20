"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { formatRupiah } from "@/lib/format";
import Autocomplete from "@/components/Autocomplete";
import { CalculatorIcon } from "@heroicons/react/24/outline";

export default function ZakatCalculatorPage() {
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [calculationResult, setCalculationResult] = useState<number | null>(null);

  // Form states for different calculator types
  const [maalData, setMaalData] = useState({
    uangTunai: "",
    saham: "",
    realEstate: "",
    emas: "",
    mobil: "",
    hutang: "",
  });

  const [fitrahData, setFitrahData] = useState({
    jumlahJiwa: "",
    hargaBeras: "50000",
  });

  const [profesiData, setProfesiData] = useState({
    penghasilanBulanan: "",
    bonus: "",
    penghasilanLain: "",
    pengeluaran: "",
  });

  const [pertanianData, setPertanianData] = useState({
    hargaBeras: "",
    pendapatan: "",
    biayaProduksi: "",
    jenisPengairan: "hujan", // hujan (10%) atau irigasi (5%)
  });

  const [peternakanData, setPeternakanData] = useState({
    nilaiTernak: "",
    jenisTernak: "sapi",
  });

  // Fetch active zakat types with calculator
  const { data: typesData, isLoading } = useQuery({
    queryKey: ["zakat-types-calculator"],
    queryFn: async () => {
      const response = await api.get("/admin/zakat/types", {
        params: { isActive: "true", hasCalculator: "true", limit: 100 },
      });
      return response.data?.data || [];
    },
  });

  // Fetch zakat settings
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data?.data || {};
    },
  });

  const typeOptions = typesData?.map((type: any) => ({
    value: type.id,
    label: `${type.icon || ""} ${type.name}`,
    slug: type.slug,
  })) || [];

  const selectedType = typesData?.find((type: any) => type.id === selectedTypeId);

  // Get zakat settings from API
  const zakatSettings = settingsData?.zakat || [];
  const getSettingValue = (key: string, defaultValue: string) => {
    const setting = zakatSettings.find((s: any) => s.key === key);
    return setting ? parseFloat(setting.value) : parseFloat(defaultValue);
  };

  const nishabGoldGrams = getSettingValue("zakat_nisab_gold", "85");
  const goldPricePerGram = getSettingValue("zakat_gold_price", "1000000");
  const nishabSilverGrams = getSettingValue("zakat_nisab_silver", "595");
  const silverPricePerGram = getSettingValue("zakat_silver_price", "100000");
  const zakatFitrahAmount = getSettingValue("zakat_fitrah_amount", "50000");
  const zakatMalPercentage = getSettingValue("zakat_mal_percentage", "2.5") / 100;
  const zakatProfessionPercentage = getSettingValue("zakat_profession_percentage", "2.5") / 100;

  const nishabEmas = nishabGoldGrams * goldPricePerGram;
  const nishabPerak = nishabSilverGrams * silverPricePerGram;

  const handleCalculate = () => {
    if (!selectedType) return;

    let result = 0;

    switch (selectedType.calculatorType || selectedType.slug) {
      case "zakat-maal":
        const uangTunai = parseFloat(maalData.uangTunai) || 0;
        const saham = parseFloat(maalData.saham) || 0;
        const realEstate = parseFloat(maalData.realEstate) || 0;
        const emas = parseFloat(maalData.emas) || 0;
        const mobil = parseFloat(maalData.mobil) || 0;
        const hutang = parseFloat(maalData.hutang) || 0;

        const jumlahHarta = uangTunai + saham + realEstate + emas + mobil;
        const hartaBersih = jumlahHarta - hutang;

        if (hartaBersih >= nishabEmas) {
          result = hartaBersih * zakatMalPercentage;
        }
        break;

      case "zakat-fitrah":
        const jumlahJiwa = parseFloat(fitrahData.jumlahJiwa) || 0;
        // Priority: type-specific fitrahAmount > global setting > manual rice price
        const typeFitrahAmount = selectedType.fitrahAmount ? parseFloat(selectedType.fitrahAmount) : 0;
        const effectiveFitrahAmount = typeFitrahAmount > 0 ? typeFitrahAmount : zakatFitrahAmount;
        if (effectiveFitrahAmount > 0) {
          result = jumlahJiwa * effectiveFitrahAmount;
        } else {
          const hargaBeras = parseFloat(fitrahData.hargaBeras) || 0;
          const berasPerJiwa = 2.5; // kg
          result = jumlahJiwa * berasPerJiwa * hargaBeras;
        }
        break;

      case "zakat-profesi":
        const penghasilanBulanan = parseFloat(profesiData.penghasilanBulanan) || 0;
        const bonus = parseFloat(profesiData.bonus) || 0;
        const penghasilanLain = parseFloat(profesiData.penghasilanLain) || 0;
        const pengeluaran = parseFloat(profesiData.pengeluaran) || 0;
        const totalPenghasilan = penghasilanBulanan + bonus + penghasilanLain;
        const penghasilanBersih = totalPenghasilan - pengeluaran;

        const nishabProfesi = nishabEmas / 12; // per bulan
        if (penghasilanBersih >= nishabProfesi) {
          result = penghasilanBersih * zakatProfessionPercentage;
        }
        break;

      case "zakat-pertanian":
        const hargaBeras = parseFloat(pertanianData.hargaBeras) || 0;
        const pendapatan = parseFloat(pertanianData.pendapatan) || 0;
        const biayaProduksi = parseFloat(pertanianData.biayaProduksi) || 0;
        const jenisPengairan = pertanianData.jenisPengairan;

        // Nisab pertanian: 750 kg beras
        const nishabPertanian = 750 * hargaBeras;
        const hasilBersih = pendapatan - biayaProduksi;
        
        if (hasilBersih >= nishabPertanian) {
          result = hasilBersih * (jenisPengairan === "hujan" ? 0.1 : 0.05); // 10% atau 5%
        }
        break;

      case "zakat-peternakan":
        const nilaiTernak = parseFloat(peternakanData.nilaiTernak) || 0;

        if (nilaiTernak >= nishabEmas) {
          result = nilaiTernak * zakatMalPercentage;
        }
        break;

      default:
        result = 0;
    }

    setCalculationResult(result);
  };

  const handleReset = () => {
    setMaalData({ uangTunai: "", saham: "", realEstate: "", emas: "", mobil: "", hutang: "" });
    setFitrahData({ jumlahJiwa: "", hargaBeras: "50000" });
    setProfesiData({ penghasilanBulanan: "", bonus: "", penghasilanLain: "", pengeluaran: "" });
    setPertanianData({ hargaBeras: "", pendapatan: "", biayaProduksi: "", jenisPengairan: "hujan" });
    setPeternakanData({ nilaiTernak: "", jenisTernak: "sapi" });
    setCalculationResult(null);
  };

  const renderCalculatorForm = () => {
    if (!selectedType) {
      return (
        <div className="text-center py-16">
          <CalculatorIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Pilih jenis zakat untuk mulai menghitung</p>
        </div>
      );
    }

    switch (selectedType.calculatorType || selectedType.slug) {
      case "zakat-maal":
        const uangTunai = parseFloat(maalData.uangTunai) || 0;
        const saham = parseFloat(maalData.saham) || 0;
        const realEstate = parseFloat(maalData.realEstate) || 0;
        const emas = parseFloat(maalData.emas) || 0;
        const mobil = parseFloat(maalData.mobil) || 0;
        const hutang = parseFloat(maalData.hutang) || 0;
        const jumlahHarta = uangTunai + saham + realEstate + emas + mobil;
        const hartaBersih = jumlahHarta - hutang;
        const zakatTahunan = hartaBersih >= nishabEmas ? hartaBersih * zakatMalPercentage : 0;
        const zakatBulanan = zakatTahunan / 12;

        return (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-900 mb-1">Harga Emas</p>
                  <p className="text-2xl font-bold text-primary-700">Rp {formatRupiah(goldPricePerGram)}</p>
                  <p className="text-xs text-primary-600 mt-1">/gram</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-700 mb-1">Harga emas per gram saat ini, sesuai dengan (www.pluang.com)</p>
                </div>
              </div>
            </div>

            {/* Nisab Info */}
            <div className="bg-success-50 border-l-4 border-success-500 p-4 rounded">
              <p className="text-sm font-semibold text-success-900 mb-2">
                Nisab: {nishabGoldGrams} x {formatRupiah(goldPricePerGram)} = Rp. {formatRupiah(nishabEmas)}
              </p>
            </div>

            {/* Input Fields */}
            <div className="form-group">
              <label className="form-label">a. Uang Tunai, Tabungan, Deposito atau sejenisnya</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.uangTunai}
                  onChange={(e) => setMaalData({ ...maalData, uangTunai: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">b. Saham atau surat-surat berharga lainnya</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.saham}
                  onChange={(e) => setMaalData({ ...maalData, saham: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">c. Real Estate (tidak termasuk rumah tinggal yang dipakai sekarang)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.realEstate}
                  onChange={(e) => setMaalData({ ...maalData, realEstate: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">d. Emas, Perak, Permata atau sejenisnya</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.emas}
                  onChange={(e) => setMaalData({ ...maalData, emas: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">e. Mobil (lebih dari keperluan pekerjaan anggota keluarga)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.mobil}
                  onChange={(e) => setMaalData({ ...maalData, mobil: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Jumlah Harta Simpanan */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">f. Jumlah Harta Simpanan (A+B+C+D+E)</p>
              <p className="text-xl font-bold text-gray-900">Rp {formatRupiah(jumlahHarta)}</p>
            </div>

            <div className="form-group">
              <label className="form-label">g. Hutang Pribadi yg jatuh tempo dalam tahun ini</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={maalData.hutang}
                  onChange={(e) => setMaalData({ ...maalData, hutang: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Harta Kena Zakat */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-900 mb-1">h. Harta simpanan kena zakat (F-G, jika nisab)</p>
              <p className="text-xl font-bold text-primary-700">Rp {formatRupiah(hartaBersih)}</p>
              {hartaBersih < nishabEmas && (
                <p className="text-xs text-orange-600 mt-2">
                  Belum mencapai nishab (Rp {formatRupiah(nishabEmas)})
                </p>
              )}
            </div>

            {/* Hasil Zakat */}
            {hartaBersih >= nishabEmas && (
              <>
                <div className="bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-success-900">I. JUMLAH ZAKAT ATAS SIMPANAN YANG WAJIB DIBAYARKAN PER TAHUN (2,5% x H)</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(zakatTahunan.toString());
                      }}
                      className="px-3 py-1 text-xs bg-success-600 text-white rounded hover:bg-success-700"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-2xl font-bold text-success-700">Rp {formatRupiah(zakatTahunan)}</p>
                </div>

                <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-primary-900">J. JUMLAH ZAKAT ATAS SIMPANAN YANG WAJIB DIBAYARKAN PER BULAN</p>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(zakatBulanan.toString());
                      }}
                      className="px-3 py-1 text-xs bg-primary-600 text-white rounded hover:bg-primary-700"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-2xl font-bold text-primary-700">Rp {formatRupiah(zakatBulanan)}</p>
                </div>
              </>
            )}

            {/* Input Nominal Manual jika belum nisab */}
            {hartaBersih < nishabEmas && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Jika tidak mencapai nisab, Anda tetap dapat ber-infaq, silahkan isi kolom input nominal dibawah ini
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    className="form-input !pl-14"
                    placeholder="Input Nominal"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "zakat-fitrah":
        return (
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Jumlah Jiwa</label>
              <input
                type="number"
                className="form-input"
                value={fitrahData.jumlahJiwa}
                onChange={(e) => setFitrahData({ ...fitrahData, jumlahJiwa: e.target.value })}
                placeholder="0"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Termasuk diri sendiri dan tanggungan
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Harga Beras per Kg (Rp)</label>
              <input
                type="number"
                className="form-input"
                value={fitrahData.hargaBeras}
                onChange={(e) => setFitrahData({ ...fitrahData, hargaBeras: e.target.value })}
                placeholder="50000"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Harga beras yang biasa dikonsumsi
              </p>
            </div>

            <div className="bg-success-50 border border-success-200 rounded-lg p-4">
              <p className="text-sm font-medium text-success-900 mb-1">Ketentuan Zakat Fitrah</p>
              <p className="text-sm text-success-700">
                {(() => {
                  const typeFitrah = selectedType?.fitrahAmount ? parseFloat(selectedType.fitrahAmount) : 0;
                  const effectiveFitrah = typeFitrah > 0 ? typeFitrah : zakatFitrahAmount;
                  return effectiveFitrah > 0
                    ? `Rp ${formatRupiah(effectiveFitrah)} per jiwa${typeFitrah > 0 ? " (khusus tipe ini)" : ""}`
                    : "2.5 kg beras per jiwa";
                })()}
              </p>
              <p className="text-xs text-success-600 mt-1">
                Wajib dibayarkan sebelum Shalat Idul Fitri
              </p>
            </div>
          </div>
        );

      case "zakat-profesi":
        const penghasilanBulananVal = parseFloat(profesiData.penghasilanBulanan) || 0;
        const bonusVal = parseFloat(profesiData.bonus) || 0;
        const penghasilanLainVal = parseFloat(profesiData.penghasilanLain) || 0;
        const pengeluaranVal = parseFloat(profesiData.pengeluaran) || 0;
        const totalPenghasilanVal = penghasilanBulananVal + bonusVal + penghasilanLainVal;
        const penghasilanBersihVal = totalPenghasilanVal - pengeluaranVal;
        const nishabProfesiVal = nishabEmas / 12;
        const zakatProfesiTahunan = penghasilanBersihVal >= nishabProfesiVal ? penghasilanBersihVal * zakatProfessionPercentage : 0;
        const zakatProfesiBulanan = zakatProfesiTahunan;

        return (
          <div className="space-y-4">
            {/* Header Info */}
            <div className="bg-gradient-to-r from-primary-50 to-primary-100 border border-primary-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-primary-900 mb-1">Harga Emas</p>
                  <p className="text-2xl font-bold text-primary-700">Rp {formatRupiah(goldPricePerGram)}</p>
                  <p className="text-xs text-primary-600 mt-1">/gram</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-primary-700 mb-1">Harga emas per gram saat ini</p>
                </div>
              </div>
            </div>

            {/* Nisab Info */}
            <div className="bg-success-50 border-l-4 border-success-500 p-4 rounded">
              <p className="text-sm font-semibold text-success-900 mb-2">
                Nisab (per bulan): Rp {formatRupiah(nishabProfesiVal)}
              </p>
              <p className="text-xs text-success-700">
                Setara dengan {nishabGoldGrams} gram emas per tahun / 12 bulan
              </p>
            </div>

            {/* Input Fields */}
            <div className="form-group">
              <label className="form-label">a. Penghasilan Bulanan (Gaji Pokok + Tunjangan Tetap)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={profesiData.penghasilanBulanan}
                  onChange={(e) => setProfesiData({ ...profesiData, penghasilanBulanan: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">b. Bonus / THR / Insentif</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={profesiData.bonus}
                  onChange={(e) => setProfesiData({ ...profesiData, bonus: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">c. Penghasilan Lainnya (Freelance, Investasi, dll)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={profesiData.penghasilanLain}
                  onChange={(e) => setProfesiData({ ...profesiData, penghasilanLain: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Total Penghasilan */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">d. Total Penghasilan (A+B+C)</p>
              <p className="text-xl font-bold text-gray-900">Rp {formatRupiah(totalPenghasilanVal)}</p>
            </div>

            <div className="form-group">
              <label className="form-label">e. Pengeluaran Kebutuhan Pokok (termasuk utang jatuh tempo)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={profesiData.pengeluaran}
                  onChange={(e) => setProfesiData({ ...profesiData, pengeluaran: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Biaya hidup bulanan, cicilan, dan utang yang jatuh tempo
              </p>
            </div>

            {/* Penghasilan Bersih */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-900 mb-1">f. Penghasilan Bersih (D-E, jika nisab)</p>
              <p className="text-xl font-bold text-primary-700">Rp {formatRupiah(penghasilanBersihVal)}</p>
              {penghasilanBersihVal < nishabProfesiVal && (
                <p className="text-xs text-orange-600 mt-2">
                  Belum mencapai nishab (Rp {formatRupiah(nishabProfesiVal)})
                </p>
              )}
            </div>

            {/* Hasil Zakat */}
            {penghasilanBersihVal >= nishabProfesiVal && (
              <div className="bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-success-900">G. JUMLAH ZAKAT PROFESI YANG WAJIB DIBAYARKAN (2,5% x F)</p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(zakatProfesiBulanan.toString());
                    }}
                    className="px-3 py-1 text-xs bg-success-600 text-white rounded hover:bg-success-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-2xl font-bold text-success-700">Rp {formatRupiah(zakatProfesiBulanan)}</p>
              </div>
            )}

            {/* Input Nominal Manual jika belum nisab */}
            {penghasilanBersihVal < nishabProfesiVal && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Jika tidak mencapai nisab, Anda tetap dapat ber-infaq, silahkan isi kolom input nominal dibawah ini
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    className="form-input !pl-14"
                    placeholder="Input Nominal"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "zakat-pertanian":
        const hargaBerasVal = parseFloat(pertanianData.hargaBeras) || 0;
        const pendapatanVal = parseFloat(pertanianData.pendapatan) || 0;
        const biayaProduksiVal = parseFloat(pertanianData.biayaProduksi) || 0;
        const nishabPertanianVal = 750 * hargaBerasVal;
        const hasilBersihVal = pendapatanVal - biayaProduksiVal;
        const persenZakat = pertanianData.jenisPengairan === "hujan" ? 0.1 : 0.05;
        const zakatPertanianVal = hasilBersihVal >= nishabPertanianVal ? hasilBersihVal * persenZakat : 0;

        return (
          <div className="space-y-4">
            {/* Harga Beras */}
            <div className="form-group">
              <label className="form-label">Harga Beras</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={pertanianData.hargaBeras}
                  onChange={(e) => setPertanianData({ ...pertanianData, hargaBeras: e.target.value })}
                  className="form-input !pl-14 !pr-14"
                  placeholder="0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">/kg</span>
              </div>
            </div>

            {/* Nisab Info */}
            <div className="bg-success-50 border-l-4 border-success-500 p-4 rounded">
              <p className="text-sm text-success-900 italic mb-2">
                nisab hasil pertanian adalah 5 wasq atau setara dengan 1.350 kg gabah atau 750 Kg beras. Hauilnya, tiap panen.
              </p>
              <div className="flex items-center gap-2">
                <span className="text-2xl">💚</span>
                <div>
                  <p className="text-sm font-semibold text-success-900">
                    Nisab: 750 x {formatRupiah(hargaBerasVal)} = Rp. {formatRupiah(nishabPertanianVal)}
                  </p>
                </div>
              </div>
            </div>

            {/* Jenis Pengairan */}
            <div className="form-group">
              <label className="form-label">A. Jenis pengairan</label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="jenisPengairan"
                    value="irigasi"
                    checked={pertanianData.jenisPengairan === "irigasi"}
                    onChange={(e) => setPertanianData({ ...pertanianData, jenisPengairan: e.target.value })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-gray-900">Buatan</span>
                </label>
                <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="jenisPengairan"
                    value="hujan"
                    checked={pertanianData.jenisPengairan === "hujan"}
                    onChange={(e) => setPertanianData({ ...pertanianData, jenisPengairan: e.target.value })}
                    className="w-4 h-4 text-primary-600"
                  />
                  <span className="text-gray-900">Air Hujan</span>
                </label>
              </div>
            </div>

            {/* Pendapatan */}
            <div className="form-group">
              <label className="form-label">B. Pendapatan hasil panen</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={pertanianData.pendapatan}
                  onChange={(e) => setPertanianData({ ...pertanianData, pendapatan: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Biaya Produksi */}
            <div className="form-group">
              <label className="form-label">C. Biaya produksi (biaya pengolahan lahan, ongkos buruh, pembelian bibit, pupuk, obat-obatan)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                <input
                  type="number"
                  value={pertanianData.biayaProduksi}
                  onChange={(e) => setPertanianData({ ...pertanianData, biayaProduksi: e.target.value })}
                  className="form-input !pl-14"
                  placeholder="0"
                />
              </div>
            </div>

            {/* Hasil Bersih */}
            <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-900 mb-1">D. Hasil bersih panen (B dikurangi C, jika B &gt; nisab)</p>
              <p className="text-xl font-bold text-primary-700">Rp {formatRupiah(hasilBersihVal)}</p>
              {hasilBersihVal < nishabPertanianVal && (
                <p className="text-xs text-orange-600 mt-2">
                  Belum mencapai nishab (Rp {formatRupiah(nishabPertanianVal)})
                </p>
              )}
            </div>

            {/* Hasil Zakat */}
            {hasilBersihVal >= nishabPertanianVal && (
              <div className="bg-gradient-to-r from-success-50 to-success-100 border border-success-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-success-900">
                    I. Jumlah zakat pertanian yang wajib dibayarkan ({pertanianData.jenisPengairan === "hujan" ? "10" : "5"}% x D)
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(zakatPertanianVal.toString());
                    }}
                    className="px-3 py-1 text-xs bg-success-600 text-white rounded hover:bg-success-700"
                  >
                    Copy
                  </button>
                </div>
                <p className="text-2xl font-bold text-success-700">Rp {formatRupiah(zakatPertanianVal)}</p>
              </div>
            )}

            {/* Input Nominal Manual jika belum nisab */}
            {hasilBersihVal < nishabPertanianVal && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Jika tidak mencapai nisab, Anda tetap dapat ber-infaq, silahkan isi kolom input nominal dibawah ini
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Rp</span>
                  <input
                    type="number"
                    className="form-input !pl-14"
                    placeholder="Input Nominal"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case "zakat-peternakan":
        return (
          <div className="space-y-4">
            <div className="form-group">
              <label className="form-label">Jenis Ternak</label>
              <select
                className="form-input"
                value={peternakanData.jenisTernak}
                onChange={(e) => setPeternakanData({ ...peternakanData, jenisTernak: e.target.value })}
              >
                <option value="sapi">Sapi/Kerbau</option>
                <option value="kambing">Kambing/Domba</option>
                <option value="unta">Unta</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Nilai Ternak (Rp)</label>
              <input
                type="number"
                className="form-input"
                value={peternakanData.nilaiTernak}
                onChange={(e) => setPeternakanData({ ...peternakanData, nilaiTernak: e.target.value })}
                placeholder="0"
                min="0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total nilai seluruh ternak yang dimiliki
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900 mb-1">Nishab Zakat Peternakan</p>
              <p className="text-sm text-amber-700">
                Sapi: 30 ekor | Kambing: 40 ekor | Unta: 5 ekor
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Atau setara dengan nishab emas
              </p>
            </div>
          </div>
        );

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            Kalkulator untuk jenis zakat ini belum tersedia
          </div>
        );
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <div className="dashboard-container">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-48 mb-8"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 overflow-y-auto bg-gray-50">
      <div className="dashboard-container">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kalkulator Zakat</h1>
            <p className="text-gray-600 mt-1">Hitung zakat Anda dengan mudah dan akurat</p>
          </div>
        </div>

        {/* Calculator Form - Centered */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Pilih Jenis Zakat</h2>
              <div className="form-group">
                <label className="form-label">Jenis Zakat</label>
                <Autocomplete
                  options={typeOptions}
                  value={selectedTypeId}
                  onChange={(value) => {
                    setSelectedTypeId(value);
                    handleReset();
                  }}
                  placeholder="Pilih jenis zakat..."
                  isLoading={isLoading}
                />
              </div>
            </div>

            {renderCalculatorForm()}

            {selectedType && (
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  className="btn btn-primary btn-lg flex-1"
                  onClick={handleCalculate}
                >
                  <CalculatorIcon className="h-5 w-5" />
                  Tunaikan Sekarang
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-lg"
                  onClick={handleReset}
                >
                  Reset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
