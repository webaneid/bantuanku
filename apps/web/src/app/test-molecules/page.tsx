'use client';

import React, { useState } from 'react';
import {
  InputField,
  TextareaField,
  SelectField,
  ProgressBar,
  AmountSelector,
  SearchBox,
  ShareButtons,
  QuantitySelector,
} from '@/components/molecules';

export default function TestMoleculesPage() {
  const [amount, setAmount] = useState(100000);
  const [searchQuery, setSearchQuery] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Molecule Components Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing all molecule components for Bantuanku Front-End
          </p>
        </header>

        <div className="space-y-12">
          {/* FormField Components */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Form Fields</h2>

            <div className="space-y-6 max-w-2xl">
              <InputField
                label="Email Address"
                type="email"
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                help="Kami tidak akan membagikan email Anda"
                required
              />

              <InputField
                label="Nomor Telepon"
                type="tel"
                placeholder="08123456789"
                error="Nomor telepon tidak valid"
              />

              <TextareaField
                label="Pesan"
                placeholder="Tulis pesan Anda di sini..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                help="Maksimal 500 karakter"
                rows={4}
              />

              <SelectField
                label="Kategori Program"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              >
                <option value="">Pilih kategori</option>
                <option value="zakat">Zakat</option>
                <option value="qurban">Qurban</option>
                <option value="infaq">Infaq/Sedekah</option>
                <option value="wakaf">Wakaf</option>
              </SelectField>
            </div>
          </section>

          {/* ProgressBar Component */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Progress Bar</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Default</h3>
                <ProgressBar current={75000000} target={100000000} />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Success (Target Tercapai)</h3>
                <ProgressBar current={120000000} target={100000000} variant="success" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Warning</h3>
                <ProgressBar current={25000000} target={100000000} variant="warning" />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Sizes</h3>
                <div className="space-y-4">
                  <ProgressBar current={50000000} target={100000000} size="sm" />
                  <ProgressBar current={50000000} target={100000000} size="md" />
                  <ProgressBar current={50000000} target={100000000} size="lg" />
                  <ProgressBar current={50000000} target={100000000} size="xl" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Animated & Striped</h3>
                <ProgressBar
                  current={60000000}
                  target={100000000}
                  variant="info"
                  striped
                  animated
                />
              </div>
            </div>
          </section>

          {/* AmountSelector Component */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Amount Selector</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Default Presets</h3>
                <AmountSelector
                  value={amount}
                  onChange={setAmount}
                  label="Pilih Jumlah Donasi"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Custom Presets</h3>
                <AmountSelector
                  value={amount}
                  onChange={setAmount}
                  presets={[50000, 100000, 200000, 500000]}
                  label="Donasi Qurban"
                  help="Minimal donasi Rp 50.000"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">With Error</h3>
                <AmountSelector
                  value={5000}
                  onChange={setAmount}
                  error="Jumlah donasi kurang dari minimal"
                />
              </div>
            </div>
          </section>

          {/* SearchBox Component */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Search Box</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Default</h3>
                <SearchBox
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onSearch={(query) => console.log('Search:', query)}
                  placeholder="Cari program donasi..."
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Filled Variant</h3>
                <SearchBox
                  variant="filled"
                  placeholder="Cari artikel..."
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Sizes</h3>
                <div className="space-y-4">
                  <SearchBox size="sm" placeholder="Small search..." />
                  <SearchBox size="md" placeholder="Medium search..." />
                  <SearchBox size="lg" placeholder="Large search..." />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Loading State</h3>
                <SearchBox loading placeholder="Searching..." />
              </div>
            </div>
          </section>

          {/* ShareButtons Component */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Share Buttons</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Default</h3>
                <ShareButtons
                  url="https://bantuanku.org/program/bantuan-pendidikan"
                  title="Program Bantuan Pendidikan"
                  description="Mari bersama membantu pendidikan anak-anak yang membutuhkan"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Minimal</h3>
                <ShareButtons
                  url="https://bantuanku.org"
                  title="Bantuanku"
                  variant="minimal"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Icon Only</h3>
                <ShareButtons
                  url="https://bantuanku.org"
                  title="Bantuanku"
                  variant="icon-only"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Sizes</h3>
                <div className="space-y-4">
                  <ShareButtons
                    url="https://bantuanku.org"
                    title="Small"
                    size="sm"
                  />
                  <ShareButtons
                    url="https://bantuanku.org"
                    title="Medium"
                    size="md"
                  />
                  <ShareButtons
                    url="https://bantuanku.org"
                    title="Large"
                    size="lg"
                  />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Vertical Direction</h3>
                <ShareButtons
                  url="https://bantuanku.org"
                  title="Vertical Layout"
                  direction="vertical"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Custom Platforms</h3>
                <ShareButtons
                  url="https://bantuanku.org"
                  title="WhatsApp & Telegram Only"
                  platforms={['whatsapp', 'telegram', 'copy']}
                />
              </div>
            </div>
          </section>

          {/* QuantitySelector Component */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Quantity Selector</h2>

            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Default</h3>
                <QuantitySelector
                  value={quantity}
                  onChange={setQuantity}
                  label="Jumlah Paket"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Outline Variant</h3>
                <QuantitySelector
                  value={2}
                  onChange={() => {}}
                  variant="outline"
                  label="Jumlah Kambing"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Filled Variant</h3>
                <QuantitySelector
                  value={3}
                  onChange={() => {}}
                  variant="filled"
                  label="Jumlah Domba"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Sizes</h3>
                <div className="space-y-4">
                  <QuantitySelector value={1} onChange={() => {}} size="sm" label="Small" />
                  <QuantitySelector value={1} onChange={() => {}} size="md" label="Medium" />
                  <QuantitySelector value={1} onChange={() => {}} size="lg" label="Large" />
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Without Input</h3>
                <QuantitySelector
                  value={5}
                  onChange={() => {}}
                  showInput={false}
                  label="Display Only"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">With Min/Max Limits</h3>
                <QuantitySelector
                  value={1}
                  onChange={() => {}}
                  min={1}
                  max={5}
                  label="Maksimal 5 paket per transaksi"
                />
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Disabled State</h3>
                <QuantitySelector
                  value={1}
                  onChange={() => {}}
                  disabled
                  label="Tidak Tersedia"
                />
              </div>
            </div>
          </section>

          {/* Combined Example */}
          <section className="bg-white rounded-xl shadow-sm p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Combined Example: Donation Form
            </h2>

            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-gradient-to-br from-primary-50 to-primary-100 p-6 rounded-lg">
                <h3 className="text-xl font-bold text-primary-900 mb-2">
                  Program Bantuan Pendidikan
                </h3>
                <p className="text-primary-700 mb-4">
                  Mari bersama membantu pendidikan anak-anak yang membutuhkan
                </p>
                <ProgressBar
                  current={45000000}
                  target={100000000}
                  size="lg"
                />
              </div>

              <AmountSelector
                value={amount}
                onChange={setAmount}
                label="Pilih Jumlah Donasi"
              />

              <InputField
                label="Nama Lengkap"
                placeholder="Nama Anda"
                required
              />

              <InputField
                label="Email"
                type="email"
                placeholder="nama@email.com"
                required
              />

              <InputField
                label="Nomor WhatsApp"
                type="tel"
                placeholder="08123456789"
                help="Untuk konfirmasi donasi"
              />

              <TextareaField
                label="Pesan (Opsional)"
                placeholder="Tulis pesan atau doa Anda..."
                rows={3}
              />

              <div className="pt-4">
                <button className="btn btn-primary btn-lg w-full">
                  Lanjut Pembayaran
                </button>
              </div>

              <div className="pt-4 border-t">
                <p className="text-sm text-gray-600 mb-3 text-center">
                  Bagikan program ini:
                </p>
                <ShareButtons
                  url="https://bantuanku.org/program/bantuan-pendidikan"
                  title="Program Bantuan Pendidikan - Bantuanku"
                  variant="minimal"
                  size="sm"
                />
              </div>
            </div>
          </section>
        </div>

        <footer className="mt-12 text-center text-gray-600">
          <p>All molecule components loaded successfully! 🎉</p>
        </footer>
      </div>
    </div>
  );
}
