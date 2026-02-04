import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../api";

export interface Province {
  code: string;
  name: string;
}

export interface Regency {
  code: string;
  name: string;
  provinceCode: string;
}

export interface District {
  code: string;
  name: string;
  regencyCode: string;
}

export interface Village {
  code: string;
  name: string;
  districtCode: string;
  postalCode: string | null;
}

export interface CompleteAddress {
  village: Village;
  district: {
    code: string;
    name: string;
  };
  regency: {
    code: string;
    name: string;
  };
  province: {
    code: string;
    name: string;
  };
}

export function useProvinces() {
  return useQuery<Province[]>({
    queryKey: ["provinces"],
    queryFn: async () => {
      const response = await apiRequest("/admin/address/provinces");
      return response.data;
    },
    staleTime: Infinity, // Provinces rarely change
  });
}

export function useRegencies(provinceCode: string | null) {
  return useQuery<Regency[]>({
    queryKey: ["regencies", provinceCode],
    queryFn: async () => {
      if (!provinceCode) return [];
      const response = await apiRequest(`/admin/address/regencies/${provinceCode}`);
      return response.data;
    },
    enabled: !!provinceCode,
    staleTime: Infinity,
  });
}

export function useDistricts(regencyCode: string | null) {
  return useQuery<District[]>({
    queryKey: ["districts", regencyCode],
    queryFn: async () => {
      if (!regencyCode) return [];
      const response = await apiRequest(`/admin/address/districts/${regencyCode}`);
      return response.data;
    },
    enabled: !!regencyCode,
    staleTime: Infinity,
  });
}

export function useVillages(districtCode: string | null) {
  return useQuery<Village[]>({
    queryKey: ["villages", districtCode],
    queryFn: async () => {
      if (!districtCode) return [];
      const response = await apiRequest(`/admin/address/villages/${districtCode}`);
      return response.data;
    },
    enabled: !!districtCode,
    staleTime: Infinity,
  });
}

export function useCompleteAddress(villageCode: string | null) {
  return useQuery<CompleteAddress>({
    queryKey: ["complete-address", villageCode],
    queryFn: async () => {
      if (!villageCode) throw new Error("Village code is required");
      const response = await apiRequest(`/admin/address/complete/${villageCode}`);
      return response.data;
    },
    enabled: !!villageCode,
    staleTime: Infinity,
  });
}
