"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Calculator, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ZakatMaalCalculatorPage() {
  const [formData, setFormData] = useState({
    cash: "",
    savings: "",
    gold: "",
    silver: "",
    stocks: "",
    business: "",
    receivables: "",
    debt: "",
  });

  const [result, setResult] = useState<number | null>(null);
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

  const calculateZakat = () => {
    const totalAssets =
      parseFloat(formData.cash || "0") +
      parseFloat(formData.savings || "0") +
      parseFloat(formData.gold || "0") +
      parseFloat(formData.silver || "0") +
      parseFloat(formData.stocks || "0") +
      parseFloat(formData.business || "0") +
      parseFloat(formData.receivables || "0");

    const totalDebt = parseFloat(formData.debt || "0");
    const netAssets = totalAssets - totalDebt;

    const isAboveNisab = netAssets >= nisabAmount;
    setNisabStatus(isAboveNisab);

    if (isAboveNisab) {
      const zakatAmount = netAssets * ZAKAT_RATE;
      setResult(zakatAmount);
    } else {
      setResult(0);
    }
  };

  const handleReset = () => {
    setFormData({
      cash: "",
      savings: "",
      gold: "",
      silver: "",
      stocks: "",
      business: "",
      receivables: "",
      debt: "",
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
            <div className="text-5xl">💰</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kalkulator Zakat Maal</h1>
              <p className="text-gray-600 mt-2">
                Hitung zakat atas harta yang tersimpan selama 1 tahun hijriyah (haul)
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Calculator Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Assets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Harta yang Dimiliki
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="cash">Uang Tunai (Rp)</Label>
                  <Input
                    id="cash"
                    type="number"
                    value={formData.cash}
                    onChange={(e) => setFormData({ ...formData, cash: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="savings">Tabungan & Deposito (Rp)</Label>
                  <Input
                    id="savings"
                    type="number"
                    value={formData.savings}
                    onChange={(e) => setFormData({ ...formData, savings: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="gold">Emas (Nilai dalam Rp)</Label>
                  <Input
                    id="gold"
                    type="number"
                    value={formData.gold}
                    onChange={(e) => setFormData({ ...formData, gold: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="silver">Perak (Nilai dalam Rp)</Label>
                  <Input
                    id="silver"
                    type="number"
                    value={formData.silver}
                    onChange={(e) => setFormData({ ...formData, silver: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="stocks">Saham & Investasi (Rp)</Label>
                  <Input
                    id="stocks"
                    type="number"
                    value={formData.stocks}
                    onChange={(e) => setFormData({ ...formData, stocks: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="business">Modal Usaha/Dagang (Rp)</Label>
                  <Input
                    id="business"
                    type="number"
                    value={formData.business}
                    onChange={(e) => setFormData({ ...formData, business: e.target.value })}
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label htmlFor="receivables">Piutang yang Dapat Ditagih (Rp)</Label>
                  <Input
                    id="receivables"
                    type="number"
                    value={formData.receivables}
                    onChange={(e) => setFormData({ ...formData, receivables: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Liabilities */}
            <Card>
              <CardHeader>
                <CardTitle>Hutang Jatuh Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="debt">Total Hutang yang Harus Dibayar (Rp)</Label>
                  <Input
                    id="debt"
                    type="number"
                    value={formData.debt}
                    onChange={(e) => setFormData({ ...formData, debt: e.target.value })}
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Hutang yang sudah jatuh tempo akan dikurangkan dari total harta
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={calculateZakat} className="flex-1">
                Hitung Zakat
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>
          </div>

          {/* Result & Info */}
          <div className="space-y-6">
            {/* Nisab Info */}
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Nisab Zakat Maal
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
                    <p className="text-xs text-gray-600">Nisab saat ini:</p>
                    <p className="text-lg font-bold text-primary-700">
                      {formatCurrency(nisabAmount)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Result */}
            {result !== null && (
              <Card className={nisabStatus ? "bg-success-50 border-success-200" : "bg-gray-50"}>
                <CardHeader>
                  <CardTitle className="text-base">Hasil Perhitungan</CardTitle>
                </CardHeader>
                <CardContent>
                  {nisabStatus ? (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-gray-600">Zakat yang harus dibayar:</p>
                        <p className="text-3xl font-bold text-success-700">
                          {formatCurrency(result)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">2.5% dari harta bersih</p>
                      </div>

                      <Button className="w-full bg-success-600 hover:bg-success-700">
                        Bayar Zakat Sekarang
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-600">
                        Harta Anda belum mencapai nisab. Zakat maal belum wajib.
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
                  ✓ Harta harus mencapai nisab (85 gram emas) dan telah dimiliki selama 1 tahun hijriyah (haul)
                </p>
                <p>
                  ✓ Kadar zakat maal adalah 2.5% dari harta bersih (harta - hutang)
                </p>
                <p>
                  ✓ Emas dan perak perhiasan yang dipakai sehari-hari tidak wajib dizakati
                </p>
                <p>
                  ✓ Hutang yang dikurangkan adalah hutang yang sudah jatuh tempo
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
