"use client";

import { useState, useEffect } from "react";
import Autocomplete from "./Autocomplete";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";

interface PaymentMethodOption {
  value: string;
  label: string;
  type: "cash" | "bank_transfer" | "qris";
  coaCode?: string;
  programs?: string[];
}

interface AdminPaymentMethodListProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  allowClear?: boolean;
  types?: Array<"cash" | "bank_transfer" | "qris">;
  programFilter?: string;
  includeAll?: boolean;
}

export default function AdminPaymentMethodList({
  value,
  onChange,
  placeholder = "Pilih Metode Pembayaran",
  className,
  disabled = false,
  allowClear = true,
  types = ["cash", "bank_transfer", "qris"],
  programFilter,
  includeAll = false,
}: AdminPaymentMethodListProps) {
  const [options, setOptions] = useState<Array<{ value: string; label: string }>>([]);

  const { data: paymentMethods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: async () => {
      try {
        const response = await api.get("/payments/methods");
        return response.data?.data || [];
      } catch (error: any) {
        console.error("Payment methods API error:", error);
        return [];
      }
    },
    refetchOnWindowFocus: false,
    retry: 1,
  });

  useEffect(() => {
    if (!paymentMethods || !Array.isArray(paymentMethods)) return;

    const filteredMethods: Array<{ value: string; label: string }> = [];

    // Helper function to filter methods by type and program with fallback to general
    const filterByTypeAndProgram = (type: string) => {
      const methodsOfType = paymentMethods.filter((m: any) => m.type === type);

      if (!programFilter) {
        return methodsOfType;
      }

      // First try to find methods with specific program
      const withSpecificProgram = methodsOfType.filter((m: any) => {
        const programs = m.programs || [];
        return programs.includes(programFilter);
      });

      if (withSpecificProgram.length > 0) {
        return withSpecificProgram;
      }

      // Fallback to methods with "general" program
      return methodsOfType.filter((m: any) => {
        const programs = m.programs || [];
        return programs.includes("general");
      });
    };

    // Process each type in order: cash, bank_transfer, qris
    const typeOrder = ["cash", "bank_transfer", "qris"];

    typeOrder.forEach((type) => {
      if (!types.includes(type as any)) return;

      const methodsForType = filterByTypeAndProgram(type);

      methodsForType.forEach((method: any) => {
        filteredMethods.push({
          value: method.id,
          label: method.name,
        });
      });
    });

    // Add "All" option if requested
    if (includeAll) {
      filteredMethods.unshift({ value: "", label: "Semua Metode" });
    }

    setOptions(filteredMethods);
  }, [paymentMethods, types, programFilter, includeAll]);

  return (
    <Autocomplete
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      allowClear={allowClear}
    />
  );
}
