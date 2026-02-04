/**
 * Address Form Component
 *
 * Provides cascading address selection for Indonesia:
 * Province -> Regency -> District -> Village -> Postal Code (auto-fill)
 *
 * Usage:
 * ```tsx
 * <AddressForm
 *   value={{
 *     provinceCode: "11",
 *     regencyCode: "11.01",
 *     districtCode: "11.01.01",
 *     villageCode: "11.01.01.2001",
 *     postalCode: "23511"
 *   }}
 *   onChange={(value) => console.log(value)}
 * />
 * ```
 */

import { useEffect, useState } from "react";
import { Autocomplete } from "../ui/autocomplete";
import {
  useProvinces,
  useRegencies,
  useDistricts,
  useVillages,
  type Province,
  type Regency,
  type District,
  type Village,
} from "../../lib/hooks/use-indonesia-address";

export interface AddressValue {
  detailAddress?: string; // Jalan, nomor rumah, RT/RW, etc.
  provinceCode: string;
  regencyCode: string;
  districtCode: string;
  villageCode: string;
  postalCode: string | null;
}

interface AddressFormProps {
  value?: Partial<AddressValue>;
  onChange?: (value: AddressValue) => void;
  disabled?: boolean;
  required?: boolean;
  showTitle?: boolean;
  className?: string;
}

export function AddressForm({
  value,
  onChange,
  disabled = false,
  required = false,
  showTitle = true,
  className,
}: AddressFormProps) {
  const [detailAddress, setDetailAddress] = useState<string>(value?.detailAddress || "");
  const [provinceCode, setProvinceCode] = useState<string>(value?.provinceCode || "");
  const [regencyCode, setRegencyCode] = useState<string>(value?.regencyCode || "");
  const [districtCode, setDistrictCode] = useState<string>(value?.districtCode || "");
  const [villageCode, setVillageCode] = useState<string>(value?.villageCode || "");
  const [postalCode, setPostalCode] = useState<string | null>(value?.postalCode || null);

  const { data: provinces, isLoading: provincesLoading, error: provincesError } = useProvinces();
  const { data: regencies, isLoading: regenciesLoading } = useRegencies(provinceCode);
  const { data: districts, isLoading: districtsLoading } = useDistricts(regencyCode);
  const { data: villages, isLoading: villagesLoading } = useVillages(districtCode);

  // Debug logging
  useEffect(() => {
    if (provincesError) {
      console.error("Error loading provinces:", provincesError);
    }
    if (provinces) {
      console.log("Provinces loaded:", provinces.length, "items");
    }
  }, [provinces, provincesError]);

  // Sync with external value changes
  useEffect(() => {
    console.log("🏠 AddressForm - Received value prop:", value);
    if (value) {
      console.log("🏠 AddressForm - Setting state from value:", {
        detailAddress: value.detailAddress,
        provinceCode: value.provinceCode,
        regencyCode: value.regencyCode,
        districtCode: value.districtCode,
        villageCode: value.villageCode,
      });
      setDetailAddress(value.detailAddress || "");
      setProvinceCode(value.provinceCode || "");
      setRegencyCode(value.regencyCode || "");
      setDistrictCode(value.districtCode || "");
      setVillageCode(value.villageCode || "");
      setPostalCode(value.postalCode || null);
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    if (onChange) {
      const addressValue = {
        detailAddress,
        provinceCode,
        regencyCode,
        districtCode,
        villageCode,
        postalCode,
      };
      console.log("🏠 AddressForm - Calling onChange with:", addressValue);
      onChange(addressValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailAddress, provinceCode, regencyCode, districtCode, villageCode, postalCode]);

  // Reset dependent fields when parent changes
  const handleProvinceChange = (value: Province | null) => {
    setProvinceCode(value?.code || "");
    setRegencyCode("");
    setDistrictCode("");
    setVillageCode("");
    setPostalCode(null);
  };

  const handleRegencyChange = (value: Regency | null) => {
    setRegencyCode(value?.code || "");
    setDistrictCode("");
    setVillageCode("");
    setPostalCode(null);
  };

  const handleDistrictChange = (value: District | null) => {
    setDistrictCode(value?.code || "");
    setVillageCode("");
    setPostalCode(null);
  };

  const handleVillageChange = (value: Village | null) => {
    setVillageCode(value?.code || "");
    setPostalCode(value?.postalCode || null);
  };

  return (
    <div className="form-section">
      {showTitle && <h3 className="form-section-title">Alamat Indonesia</h3>}
      
      <div className="space-y-4">
        {/* Detail Address (Street, House Number, RT/RW) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alamat Lengkap (Jalan, No. Rumah, RT/RW)
          </label>
          <textarea
            value={detailAddress}
            onChange={(e) => setDetailAddress(e.target.value)}
            disabled={disabled}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-100 focus:border-primary-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            placeholder="Contoh: Jl. Merdeka No. 123, RT 02/RW 05"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Province */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Provinsi {required && <span className="text-red-500">*</span>}
            </label>
          <Autocomplete
            options={provinces || []}
            value={provinces?.find((p) => p.code === provinceCode) || null}
            onChange={handleProvinceChange}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.code}
            placeholder="Pilih provinsi..."
            disabled={disabled || provincesLoading}
            required={required}
          />
        </div>

        {/* Regency */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kabupaten/Kota {required && <span className="text-red-500">*</span>}
          </label>
          <Autocomplete
            options={regencies || []}
            value={regencies?.find((r) => r.code === regencyCode) || null}
            onChange={handleRegencyChange}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.code}
            placeholder="Pilih kabupaten/kota..."
            disabled={disabled || !provinceCode || regenciesLoading}
            required={required}
          />
        </div>

        {/* District */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kecamatan {required && <span className="text-red-500">*</span>}
          </label>
          <Autocomplete
            options={districts || []}
            value={districts?.find((d) => d.code === districtCode) || null}
            onChange={handleDistrictChange}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.code}
            placeholder="Pilih kecamatan..."
            disabled={disabled || !regencyCode || districtsLoading}
            required={required}
          />
        </div>

        {/* Village */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Kelurahan/Desa {required && <span className="text-red-500">*</span>}
          </label>
          <Autocomplete
            options={villages || []}
            value={villages?.find((v) => v.code === villageCode) || null}
            onChange={handleVillageChange}
            getOptionLabel={(option) => option.name}
            getOptionValue={(option) => option.code}
            placeholder="Pilih kelurahan/desa..."
            disabled={disabled || !districtCode || villagesLoading}
            required={required}
          />
        </div>

          {/* Postal Code (Auto-filled) */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kode Pos
            </label>
            <input
              type="text"
              value={postalCode || "-"}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500 cursor-not-allowed"
              placeholder="Otomatis terisi saat memilih kelurahan/desa"
            />
            <p className="text-xs text-gray-500 mt-1">
              Kode pos akan terisi otomatis saat Anda memilih kelurahan/desa
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
