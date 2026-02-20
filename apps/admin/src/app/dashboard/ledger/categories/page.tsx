"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

type Category = {
  value: string;
  label: string;
  productType?: string;
  type?: string;
};

export default function LedgerCategoriesPage() {
  const [activeTab, setActiveTab] = useState<"income" | "expense">("income");

  const { data: incomeData, isLoading: incomeLoading } = useQuery({
    queryKey: ["ledger-categories", "income"],
    queryFn: async () => {
      const response = await api.get("/admin/ledger/categories/flat?type=income");
      return response.data.data as Category[];
    },
  });

  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ["ledger-categories", "expense"],
    queryFn: async () => {
      const response = await api.get("/admin/ledger/categories/flat?type=expense");
      return response.data.data as Category[];
    },
  });

  const getProductTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      campaign: "Campaign",
      zakat: "Zakat",
      qurban: "Qurban",
      operational: "Operasional",
    };
    return labels[type] || type;
  };

  const renderTable = (categories: Category[] = []) => {
    if (categories.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          Tidak ada kategori
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Nama Kategori
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipe Produk
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipe Transaksi
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categories.map((cat, index) => (
              <tr key={`${cat.value}-${index}`} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{cat.label}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 font-mono">{cat.value}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {getProductTypeLabel(cat.productType || "")}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    cat.type === "income"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}>
                    {cat.type === "income" ? "Income" : "Expense"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Kategori Ledger</h1>
            <p className="text-sm text-gray-600 mt-1">
              Daftar kategori untuk transaksi income dan expense
            </p>
          </div>
        </div>

        {/* Info Alert */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Kategori Sistem (Read-Only)
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Kategori ini digunakan untuk transaksi income dan disbursement (expense).
                  Kategori ini sudah didefinisikan di sistem dan tidak bisa diubah melalui UI.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab("income")}
                className={`
                  flex-1 py-4 px-6 text-center font-medium text-sm border-b-2
                  ${activeTab === "income"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                Kategori Income
                {incomeData && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                    {incomeData.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("expense")}
                className={`
                  flex-1 py-4 px-6 text-center font-medium text-sm border-b-2
                  ${activeTab === "expense"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }
                `}
              >
                Kategori Expense
                {expenseData && (
                  <span className="ml-2 px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-600">
                    {expenseData.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          <div>
            {activeTab === "income" && (
              <>
                {incomeLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : (
                  renderTable(incomeData)
                )}
              </>
            )}

            {activeTab === "expense" && (
              <>
                {expenseLoading ? (
                  <div className="text-center py-8 text-gray-500">Loading...</div>
                ) : (
                  renderTable(expenseData)
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
