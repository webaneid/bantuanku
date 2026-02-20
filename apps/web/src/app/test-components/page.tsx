'use client';

import {
  Button,
  IconButton,
  Badge,
  StatusBadge,
  ProgramBadge,
  Input,
  Textarea,
  Select,
  Checkbox,
  Radio,
  Label,
  Spinner,
} from '@/components/atoms';

export default function TestComponentsPage() {
  return (
    <main className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <h1 className="text-4xl font-bold mb-8">Atomic Components Demo</h1>

        {/* Buttons */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Buttons</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="success">Success</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="warning">Warning</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Sizes</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button size="sm">Small</Button>
                <Button size="md">Medium</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">States</h3>
              <div className="flex flex-wrap gap-3">
                <Button disabled>Disabled</Button>
                <Button loading>Loading</Button>
                <Button fullWidth>Full Width</Button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">With Icons</h3>
              <div className="flex flex-wrap gap-3">
                <Button
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                >
                  Add Item
                </Button>
                <IconButton
                  icon={
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  }
                  aria-label="Search"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Badges */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Badges</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Variants</h3>
              <div className="flex flex-wrap gap-3">
                <Badge variant="primary">Primary</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="danger">Danger</Badge>
                <Badge variant="info">Info</Badge>
                <Badge variant="accent">Accent</Badge>
                <Badge variant="gray">Gray</Badge>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Program Badges</h3>
              <div className="flex flex-wrap gap-3">
                <ProgramBadge label="Zakat" />
                <ProgramBadge label="Qurban" />
                <ProgramBadge label="Infaq" />
                <ProgramBadge label="Wakaf" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Status Badges</h3>
              <div className="flex flex-wrap gap-3">
                <StatusBadge status="active" />
                <StatusBadge status="inactive" />
                <StatusBadge status="pending" />
                <StatusBadge status="completed" />
                <StatusBadge status="urgent" />
                <StatusBadge status="new" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Sizes & Modifiers</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Badge size="sm">Small</Badge>
                <Badge size="md">Medium</Badge>
                <Badge size="lg">Large</Badge>
                <Badge dot>With Dot</Badge>
                <Badge outline>Outline</Badge>
              </div>
            </div>
          </div>
        </section>

        {/* Form Inputs */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Form Inputs</h2>

          <div className="space-y-6 max-w-md">
            <div>
              <Label required>Nama Lengkap</Label>
              <Input placeholder="Masukkan nama lengkap" />
            </div>

            <div>
              <Label>Email</Label>
              <Input type="email" placeholder="email@example.com" error />
              <p className="form-error">Email tidak valid</p>
            </div>

            <div>
              <Label>Pesan</Label>
              <Textarea placeholder="Tulis pesan Anda..." rows={4} />
            </div>

            <div>
              <Label>Pilih Program</Label>
              <Select>
                <option value="">Pilih program...</option>
                <option value="zakat">Zakat</option>
                <option value="qurban">Qurban</option>
                <option value="infaq">Infaq/Sedekah</option>
                <option value="wakaf">Wakaf</option>
              </Select>
            </div>

            <div>
              <Checkbox label="Saya setuju dengan syarat dan ketentuan" />
            </div>

            <div className="space-y-2">
              <Label>Metode Pembayaran</Label>
              <Radio name="payment" label="Bank Transfer" defaultChecked />
              <Radio name="payment" label="QRIS" />
              <Radio name="payment" label="E-Wallet" />
            </div>
          </div>
        </section>

        {/* Spinners */}
        <section className="mb-12 bg-white p-8 rounded-lg shadow">
          <h2 className="text-2xl font-bold mb-6">Spinners</h2>

          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-3">Sizes</h3>
              <div className="flex items-center gap-6">
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-3">Colors</h3>
              <div className="flex items-center gap-6">
                <Spinner color="primary" />
                <Spinner color="gray" />
                <div className="bg-gray-900 p-4 rounded">
                  <Spinner color="white" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
