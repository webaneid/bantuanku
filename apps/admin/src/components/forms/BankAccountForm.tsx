/**
 * Bank Account Form Component
 *
 * Provides repeater form for managing multiple bank accounts
 * Can be used for any entity: vendors, employees, donors, mustahiqs, etc.
 *
 * Usage:
 * ```tsx
 * <BankAccountForm
 *   value={[
 *     { bankName: "BCA", accountNumber: "1234567890", accountHolderName: "John Doe" }
 *   ]}
 *   onChange={(accounts) => console.log(accounts)}
 * />
 * ```
 */

import { useState, useEffect } from "react";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

export interface BankAccountValue {
  id?: string; // Only exists for saved accounts
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
}

interface BankAccountFormProps {
  value?: BankAccountValue[];
  onChange?: (value: BankAccountValue[]) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export function BankAccountForm({
  value = [],
  onChange,
  disabled = false,
  required = false,
  className = "",
}: BankAccountFormProps) {
  const [accounts, setAccounts] = useState<BankAccountValue[]>(value);

  // Sync with external value changes
  useEffect(() => {
    setAccounts(value);
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      onChange(accounts);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts]);

  const handleAddAccount = () => {
    const newAccount: BankAccountValue = {
      bankName: "",
      accountNumber: "",
      accountHolderName: "",
    };
    setAccounts([...accounts, newAccount]);
  };

  const handleRemoveAccount = (index: number) => {
    const updatedAccounts = accounts.filter((_, i) => i !== index);
    setAccounts(updatedAccounts);
  };

  const handleAccountChange = (index: number, field: keyof BankAccountValue, value: string) => {
    const updatedAccounts = [...accounts];
    updatedAccounts[index] = {
      ...updatedAccounts[index],
      [field]: value,
    };
    setAccounts(updatedAccounts);
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        {accounts.map((account, index) => (
          <div
            key={index}
            className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Rekening #{index + 1}
              </span>
              {!disabled && accounts.length > 0 && (
                <button
                  type="button"
                  onClick={() => handleRemoveAccount(index)}
                  className="p-1 text-danger-600 hover:bg-danger-50 rounded transition-colors"
                  title="Hapus rekening"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {/* Bank Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Bank {required && index === 0 && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={account.bankName}
                  onChange={(e) => handleAccountChange(index, "bankName", e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Contoh: BCA, Mandiri, BRI"
                  required={required && index === 0}
                />
              </div>

              {/* Account Number */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nomor Rekening {required && index === 0 && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={account.accountNumber}
                  onChange={(e) => handleAccountChange(index, "accountNumber", e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Contoh: 1234567890"
                  required={required && index === 0}
                />
              </div>

              {/* Account Holder Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nama Pemilik Rekening {required && index === 0 && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={account.accountHolderName}
                  onChange={(e) => handleAccountChange(index, "accountHolderName", e.target.value)}
                  disabled={disabled}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Contoh: PT. Nama Perusahaan"
                  required={required && index === 0}
                />
              </div>
            </div>
          </div>
        ))}

        {/* Add Button */}
        {!disabled && (
          <button
            type="button"
            onClick={handleAddAccount}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-primary-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span className="font-medium">Tambah Rekening</span>
          </button>
        )}

        {accounts.length === 0 && disabled && (
          <div className="text-center py-6 text-gray-500 text-sm">
            Tidak ada rekening
          </div>
        )}
      </div>
    </div>
  );
}
