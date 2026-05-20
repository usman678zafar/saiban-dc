import { pakistanAddressData } from '@/lib/pakistan-address-data';

export function getProvinces() {
  return pakistanAddressData.map((item) => item.province);
}

export function getDistrictsByProvince(province: string) {
  return pakistanAddressData.find((item) => item.province === province)?.districts ?? [];
}

export function getTehsilsByDistrict(province: string, district: string) {
  return getDistrictsByProvince(province).find((item) => item.name === district)?.tehsils ?? [];
}

export function isValidProvince(province: string) {
  return pakistanAddressData.some((item) => item.province === province);
}

export function isValidDistrictForProvince(province: string, district: string) {
  return getDistrictsByProvince(province).some((item) => item.name === district);
}

export function isValidTehsilForDistrict(province: string, district: string, tehsil: string) {
  if (!tehsil || tehsil === 'unknown') return true;
  return getTehsilsByDistrict(province, district).some((item) => item.name === tehsil);
}

