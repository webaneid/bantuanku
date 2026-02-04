"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";
import { ArrowLeft, Calculator, Info, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ZakatFitrahCalculatorPage() {
  const RICE_PRICE_PER_KG = 15000; // Default harga beras per kg
  const ZAKAT_PER_PERSON = 2.5; // kg or 3.5 liter

  const [formData, setFormData] = useState({
    familyMembers: "1",
    ricePrice: RICE_PRICE_PER_KG.toString(),
    paymentType: "beras", // beras or uang
  });

  const [result, setResult] = useState<any>(null);

  const calculateZakat = () => {
    const members = parseInt(formData.familyMembers);
    const pricePerKg = parseInt(formData.ricePrice);

    const totalKg = members * ZAKAT_PER_PERSON;
    const totalCash = totalKg * pricePerKg;

    setResult({
      members,
      totalKg,
      totalCash,
      pricePerKg,
      paymentType: formData.paymentType,
    });
  };

  const handleReset = () => {
    setFormData({
      familyMembers: "1",
      ricePrice: RICE_PRICE_PER_KG.toString(),
      paymentType: "beras",
    });
    setResult(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
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
            <div className="text-5xl">🌾</div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Kalkulator Zakat Fitrah</h1>
              <p className="text-gray-600 mt-2">
                Hitung zakat fitrah yang wajib dikeluarkan sebelum Sholat Idul Fitri
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
                  Data Keluarga
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="familyMembers">Jumlah Anggota Keluarga</Label>
                  <Input
                    id="familyMembers"
                    type="number"
                    min="1"
                    value={formData.familyMembers}
                    onChange={(e) =>
                      setFormData({ ...formData, familyMembers: e.target.value })
                    }
                    placeholder="1"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Termasuk diri sendiri, istri, anak, dan tanggungan lainnya
                  </p>
                </div>

                <div>
                  <Label htmlFor="paymentType">Jenis Pembayaran</Label>
                  <Select
                    value={formData.paymentType}
                    onValueChange={(value) =>
                      setFormData({ ...formData, paymentType: value })
                    }
                  >
                    <SelectTrigger id="paymentType">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="beras">Beras (2.5 kg/jiwa)</SelectItem>
                      <SelectItem value="uang">Uang (setara beras)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {formData.paymentType === "uang" && (
                  <div>
                    <Label htmlFor="ricePrice">Harga Beras per Kg (Rp)</Label>
                    <Input
                      id="ricePrice"
                      type="number"
                      value={formData.ricePrice}
                      onChange={(e) =>
                        setFormData({ ...formData, ricePrice: e.target.value })
                      }
                      placeholder="15000"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Harga beras yang biasa dikonsumsi (makanan pokok)
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button onClick={calculateZakat} className="flex-1">
                Hitung Zakat Fitrah
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Reset
              </Button>
            </div>

            {/* Who Must Pay */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Siapa yang Wajib Bayar Zakat Fitrah?
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>✓ Setiap muslim (laki-laki dan perempuan)</p>
                <p>✓ Yang memiliki kelebihan makanan untuk sehari semalam</p>
                <p>✓ Masih hidup saat terbenam matahari di akhir Ramadhan</p>
                <p>✓ Kepala keluarga wajib mengeluarkan untuk tanggungannya</p>
              </CardContent>
            </Card>
          </div>

          {/* Result & Info */}
          <div className="space-y-6">
            {/* Result */}
            {result && (
              <Card className="bg-success-50 border-success-200">
                <CardHeader>
                  <CardTitle className="text-base">Hasil Perhitungan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600">
                        Untuk {result.members} jiwa:
                      </p>

                      {result.paymentType === "beras" ? (
                        <>
                          <p className="text-3xl font-bold text-success-700">
                            {result.totalKg} kg
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Beras (atau makanan pokok)
                          </p>
                          <div className="mt-3 pt-3 border-t border-success-300">
                            <p className="text-xs text-gray-600">Jika dibayar dengan uang:</p>
                            <p className="text-lg font-semibold text-success-700">
                              {formatCurrency(result.totalCash)}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="text-3xl font-bold text-success-700">
                            {formatCurrency(result.totalCash)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Setara {result.totalKg} kg beras
                          </p>
                          <p className="text-xs text-gray-500">
                            @ {formatCurrency(result.pricePerKg)}/kg
                          </p>
                        </>
                      )}
                    </div>

                    <Button className="w-full bg-success-600 hover:bg-success-700">
                      Bayar Zakat Fitrah Sekarang
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Nisab Info */}
            <Card className="bg-primary-50 border-primary-200">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Ketentuan Zakat Fitrah
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-gray-700 space-y-2">
                <p>
                  <span className="font-semibold">Kadar:</span> 2.5 kg atau 3.5 liter beras per
                  jiwa
                </p>
                <p>
                  <span className="font-semibold">Waktu:</span> Mulai awal Ramadhan hingga
                  sebelum Sholat Idul Fitri
                </p>
                <p>
                  <span className="font-semibold">Paling Utama:</span> Sebelum Sholat Id
                </p>
              </CardContent>
            </Card>

            {/* Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Catatan Penting</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-gray-600 space-y-2">
                <p>
                  ✓ Boleh dibayar dengan beras atau uang senilai beras
                </p>
                <p>
                  ✓ Jika dibayar dengan uang, gunakan harga beras yang biasa dikonsumsi
                </p>
                <p>
                  ✓ Bayi yang lahir sebelum terbenam matahari akhir Ramadhan wajib dizakati
                </p>
                <p>
                  ✓ Zakat fitrah berbeda dengan fidyah (denda puasa)
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
