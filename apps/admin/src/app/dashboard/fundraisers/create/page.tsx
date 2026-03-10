"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import Autocomplete from "@/components/Autocomplete";
import FeedbackDialog from "@/components/FeedbackDialog";
import api from "@/lib/api";

export default function CreateFundraiserPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [entityType, setEntityType] = useState<"donatur" | "employee">("donatur");
  const [selectedDonaturId, setSelectedDonaturId] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState({
    open: false,
    type: "success" as "success" | "error",
    title: "",
    message: "",
  });
  const [redirectAfterFeedback, setRedirectAfterFeedback] = useState(false);

  // Fetch donatur list for autocomplete
  const { data: donaturData } = useQuery({
    queryKey: ["donatur-list-for-fundraiser"],
    queryFn: async () => {
      const response = await api.get("/admin/donatur", {
        params: { limit: 200 },
      });
      return response.data?.data || [];
    },
    enabled: entityType === "donatur",
  });

  // Fetch employee list for autocomplete
  const { data: employeeData } = useQuery({
    queryKey: ["employee-list-for-fundraiser"],
    queryFn: async () => {
      const response = await api.get("/admin/employees", {
        params: { limit: 200 },
      });
      return response.data?.data || [];
    },
    enabled: entityType === "employee",
  });

  const donaturOptions = (donaturData || []).map((d: any) => ({
    value: d.id,
    label: `${d.name || "Tanpa Nama"} - ${d.email || d.phone || ""}`,
  }));

  const employeeOptions = (employeeData || []).map((e: any) => ({
    value: e.id,
    label: `${e.name || "Tanpa Nama"} - ${e.email || e.phone || ""}`,
  }));

  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post("/admin/fundraisers", payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fundraisers"] });
      queryClient.invalidateQueries({ queryKey: ["fundraiser-stats"] });
      setRedirectAfterFeedback(true);
      setFeedback({
        open: true,
        type: "success",
        title: "Berhasil",
        message: "Influencer berhasil ditambahkan",
      });
    },
    onError: (err: any) => {
      setFeedback({
        open: true,
        type: "error",
        title: "Gagal",
        message: err.response?.data?.message || "Gagal menambahkan influencer",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const payload: any = {};
    if (entityType === "donatur") {
      if (!selectedDonaturId) {
        setFeedback({ open: true, type: "error", title: "Gagal", message: "Pilih donatur terlebih dahulu" });
        return;
      }
      payload.donaturId = selectedDonaturId;
    } else {
      if (!selectedEmployeeId) {
        setFeedback({ open: true, type: "error", title: "Gagal", message: "Pilih employee terlebih dahulu" });
        return;
      }
      payload.employeeId = selectedEmployeeId;
    }

    if (notes) {
      payload.notes = notes;
    }

    createMutation.mutate(payload);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          type="button"
          onClick={() => router.push("/dashboard/fundraisers")}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tambah Influencer</h1>
          <p className="text-gray-600">Daftarkan donatur atau employee sebagai influencer</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Entity Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipe</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="entityType"
                  value="donatur"
                  checked={entityType === "donatur"}
                  onChange={() => { setEntityType("donatur"); setSelectedEmployeeId(""); }}
                  className="text-primary-600"
                />
                <span className="text-sm">Donatur</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="entityType"
                  value="employee"
                  checked={entityType === "employee"}
                  onChange={() => { setEntityType("employee"); setSelectedDonaturId(""); }}
                  className="text-primary-600"
                />
                <span className="text-sm">Employee</span>
              </label>
            </div>
          </div>

          {/* Donatur Select */}
          {entityType === "donatur" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Donatur</label>
              <Autocomplete
                options={donaturOptions}
                value={selectedDonaturId}
                onChange={(value: string) => setSelectedDonaturId(value)}
                placeholder="Cari donatur..."
              />
            </div>
          )}

          {/* Employee Select */}
          {entityType === "employee" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Employee</label>
              <Autocomplete
                options={employeeOptions}
                value={selectedEmployeeId}
                onChange={(value: string) => setSelectedEmployeeId(value)}
                placeholder="Cari employee..."
              />
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Catatan <span className="text-gray-400 font-normal">- opsional</span></label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="Catatan tambahan..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              className="btn btn-secondary btn-md"
              onClick={() => router.push("/dashboard/fundraisers")}
            >
              Batal
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-md"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>

      <FeedbackDialog
        open={feedback.open}
        type={feedback.type}
        title={feedback.title}
        message={feedback.message}
        onClose={() => {
          setFeedback((prev) => ({ ...prev, open: false }));
          if (redirectAfterFeedback) {
            setRedirectAfterFeedback(false);
            router.push("/dashboard/fundraisers");
          }
        }}
      />
    </div>
  );
}
