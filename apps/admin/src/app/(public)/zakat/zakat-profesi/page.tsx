"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Calculator, Info, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ZakatProfesiCalculatorPage() {
  const [formData, setFormData] = useState({
    monthlyIncome: "",
    otherIncome: "",
    monthlyExpenses: "",
    paymentMethod: "nett", // nett or gross
  });

  const [result, setResult] = useState<any>(null);
  const [nisabStatus, setNisabStatus] = useState<boolean>(false);

  // Fetch gold price
  const { data: goldPrice } = useQuery({
    queryKey: ["gold-price"],
    queryFn: async () => {
      const response = await api.get("/admin/settings");
      return response.data.data?.goldPrice || 1000000;
    },
  });

  const NISAB_GOLD_GRAM = 85;
  const ZAKAT_RATE = 0.025;
  const nisabAmount = (goldPrice || 1000000) * NISAB_GOLD_GRAM;
  const monthlyNisab = nisabAmount / 12;

  const calculateZakat = () => {
    const income = parseFloat(formData.monthlyIncome || "0");
    const otherIncome = parseFloat(formData.otherIncome || "0");
    const expenses = parseFloat(formData.monthlyExpenses || "0");

    const totalIncome = income + otherIncome;

    let zakatableIncome = 0;

    if (formData.paymentMethod === "nett") {
      // Pendapatan bersih (setelah dikurangi kebutuhan pokok)
      zakatableIncome = totalIncome - expenses;
    } else {
      // Pendapatan kotor (gross)
      zakatableIncome = totalIncome;
    }

    const isAboveNisab = zakatableIncome >= monthlyNisab;
    setNisabStatus(isAboveNisab);

    if (isAboveNisab) {
      const zakatAmount = zakatableIncome * ZAKAT_RATE;
      setResult({
        income: totalIncome,
        expenses,
        zakatableIncome,
        zakatAmount,
        annualZakat: zakatAmount * 12,
      });
    } else {
      setResult({
        income: totalIncome,
        expenses,
        zakatableIncome,
        zakatAmount: 0,
        annualZakat: 0,
      });
    }
  };

  const handleReset = () => {
    setFormData({
      monthlyIncome: "",
      otherIncome: "",
      monthlyExpenses: "",
      paymentMethod: "nett",
    });
    setResult(null);
    setNisabStatus(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/zakat"
            className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Kembali ke Pilihan Zakat</span>
          </Link>

          <div className="flex items-start gap-4">
            <div className="text-5xl">💼</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kalkulator Zakat Profesi</h1>
              <p className="text-gray-600 mt-2">
                Hitung zakat dari penghasilan bulanan (gaji, honorarium, atau pendapatan profesi)
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculator Form */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Penghasilan Bulanan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="monthlyIncome">Gaji/Pendapatan Utama per Bulan (Rp)</Label>
                  <Input
                    id="monthlyIncome"
                    type="number"
                    value={formData.monthlyIncome}
                    onChange={(e) =>
                      setFormData({ ...formData, monthlyIncome: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="otherIncome">Pendapatan Lain-lain (Bonus, Thr, dll)</Label>
                  <Input
                    id="otherIncome"
                    type="number"
                    value={formData.otherIncome}
                    onChange={(e) =>
                      setFormData({ ...formData, otherIncome: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="paymentMethod">Metode Perhitungan</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentMethod: value })
                    }
                  >
                    <SelectTrigger id="paymentMethod">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nett">
                        Nett (Pendapatan - Kebutuhan Pokok)
                      </SelectItem>
                      <SelectItem value="gross">
                        Gross (Dari Total Pendapatan)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.paymentMethod === "nett"
                      ? "Zakat dihitung dari pendapatan setelah dikurangi kebutuhan pokok"
                      : "Zakat dihitung dari total pendapatan kotor"}
                  </p>
                </div>

                {formData.paymentMethod === "nett" && (
                  <div>
                    <Label htmlFor="monthlyExpenses">
                      Pengeluaran Kebutuhan Pokok per Bulan (Rp)
                    </Label>
                    <Input
                      id="monthlyExpenses"
                      type="number"
                      value={formData.monthlyExpenses}
                      onChange={(e) =>
                        setFormData({ ...formData, monthlyExpenses: e.target.value })
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Biaya makan, tempat tinggal, pendidikan, kesehatan, dll
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={calculateZakat} className="flex-1">
                Hitung Zakat Profesi
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>

            {/* Info */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Tentang Zakat Profesi
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  Zakat profesi (zakat penghasilan) adalah zakat yang dikeluarkan dari hasil
                  pekerjaan/profesi seperti gaji, honorarium, atau pendapatan lainnya.
                </p>
                <p className="font-semibold mt-3">Dua metode perhitungan:</p>
                <p>
                  1. <span className="font-semibold">Nett:</span> Menurut sebagian ulama, zakat
                  dihitung dari pendapatan bersih setelah dikurangi kebutuhan pokok
                </p>
                <p>
                  2. <span className="font-semibold">Gross:</span> Menurut sebagian ulama lain,
                  zakat dihitung dari total pendapatan kotor
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Result & Info */}
          <div className="space-y-6">
            {/* Nisab Info */}
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Nisab Zakat Profesi
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 space-y-2">
                  <p>
                    Nisab: <span className="font-semibold">85 gram emas</span>
                  </p>
                  <p>
                    Harga emas: <span className="font-semibold">{formatCurrency(goldPrice || 0)}/gram</span>
                  </p>
                  <div className="pt-2 border-t border-primary-300">
                    <p className="text-xs text-gray-600">Nisab per tahun:</p>
                    <p className="text-base font-bold text-primary-700">
                      {formatCurrency(nisabAmount)}
                    </p>
                    <p className="text-xs text-gray-600 mt-2">Nisab per bulan:</p>
                    <p className="text-lg font-bold text-primary-700">
                      {formatCurrency(monthlyNisab)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            {result && (
              <Card className={nisabStatus ? "bg-success-50 border-success-200" : "bg-gray-50"}>
                <CardHeader>
                  <CardTitle className="text-base">Hasil Perhitungan</CardTitle>
                </CardHeader>
                <CardContent>
                  {nisabStatus ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Pendapatan:</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(result.income)}
                        </p>

                        {formData.paymentMethod === "nett" && (
                          <>
                            <p className="text-sm text-gray-600 mt-2">Pengeluaran:</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(result.expenses)}
                            </p>

                            <p className="text-sm text-gray-600 mt-2">Penghasilan Bersih:</p>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatCurrency(result.zakatableIncome)}
                            </p>
                          </>
                        )}
                      </div>

                      <div className="pt-3 border-t border-success-300">
                        <p className="text-sm text-gray-600">Zakat per bulan:</p>
                        <p className="text-2xl font-bold text-success-700">
                          {formatCurrency(result.zakatAmount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">2.5% dari penghasilan</p>

                        <p className="text-sm text-gray-600 mt-3">Estimasi zakat per tahun:</p>
                        <p className="text-lg font-semibold text-success-700">
                          {formatCurrency(result.annualZakat)}
                        </p>
                      </div>

                      <Button className="w-full bg-success-600 hover:bg-success-700">
                        Bayar Zakat Sekarang
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">
                        Penghasilan Anda belum mencapai nisab. Zakat profesi belum wajib.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catatan Penting</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>
                  ✓ Zakat profesi boleh dibayar setiap menerima penghasilan (tidak perlu
                  menunggu haul/1 tahun)
                </p>
                <p>✓ Kadar zakat adalah 2.5% dari penghasilan yang dizakati</p>
                <p>
                  ✓ Penghasilan harus mencapai nisab (setara 85 gram emas) agar wajib zakat
                </p>
                <p>
                  ✓ Pilih metode perhitungan (nett/gross) sesuai pendapat ulama yang Anda ikuti
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
