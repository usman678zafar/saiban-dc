'use client';

import { FormEvent, useMemo, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getDistrictsByProvince } from '@/lib/address-utils';
import { pakistanAddressData } from '@/lib/pakistan-address-data';

type AddressOptionItem = {
  id: string;
  type: 'district' | 'tehsil';
  province: string;
  district: string | null;
  name: string;
};

type DefaultAddressRow = {
  province: string;
  district: string;
  tehsilCount: number;
  tehsils: string[];
};

function normalizeOptionName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export default function AddressOptionManager({
  options,
  defaultRows,
}: {
  options: AddressOptionItem[];
  defaultRows: DefaultAddressRow[];
}) {
  const router = useRouter();
  const [type, setType] = useState<'district' | 'tehsil'>('district');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [defaultSearch, setDefaultSearch] = useState('');

  const districtOptions = useMemo(() => {
    if (!province) return [];

    const defaultDistricts = getDistrictsByProvince(province).map((item) => item.name);
    const customDistricts = options
      .filter((option) => option.type === 'district' && option.province === province)
      .map((option) => option.name);

    return Array.from(new Set([...defaultDistricts, ...customDistricts])).sort((a, b) => a.localeCompare(b));
  }, [options, province]);

  const filteredDefaultRows = useMemo(() => {
    const query = defaultSearch.trim().toLowerCase();
    if (!query) return defaultRows;

    return defaultRows.filter((row) => (
      row.province.toLowerCase().includes(query)
      || row.district.toLowerCase().includes(query)
      || row.tehsils.some((tehsil) => tehsil.toLowerCase().includes(query))
    ));
  }, [defaultRows, defaultSearch]);

  const defaultSummary = useMemo(() => {
    const provinceCount = new Set(defaultRows.map((row) => row.province)).size;
    const districtCount = defaultRows.length;
    const tehsilCount = defaultRows.reduce((total, row) => total + row.tehsilCount, 0);
    return { provinceCount, districtCount, tehsilCount };
  }, [defaultRows]);

  const addAddressOption = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    const response = await fetch('/api/address-options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        province,
        district: type === 'tehsil' ? district : null,
        name: normalizeOptionName(name),
      }),
    });
    const result = await response.json();
    setIsSubmitting(false);

    if (!response.ok) {
      setMessage(result?.message ?? 'Unable to add address option.');
      return;
    }

    setName('');
    if (type === 'district') setDistrict('');
    router.refresh();
  };

  const handleTypeChange = (nextType: 'district' | 'tehsil') => {
    setType(nextType);
    setName('');
    setMessage(null);
  };

  const handleProvinceChange = (nextProvince: string) => {
    setProvince(nextProvince);
    setDistrict('');
    setMessage(null);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-[#dbe4ef] bg-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-[#0f1f33]">Add Location Option</h2>
        <form onSubmit={addAddressOption} className="mt-4 grid gap-3 lg:grid-cols-[160px_minmax(180px,1fr)_minmax(180px,1fr)_minmax(220px,1.2fr)_auto]">
          <select
            value={type}
            onChange={(event) => handleTypeChange(event.target.value as 'district' | 'tehsil')}
            className="min-h-11 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          >
            <option value="district">District</option>
            <option value="tehsil">Tehsil</option>
          </select>

          <select
            value={province}
            onChange={(event) => handleProvinceChange(event.target.value)}
            required
            className="min-h-11 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          >
            <option value="">Select province</option>
            {pakistanAddressData.map((item) => (
              <option key={item.province} value={item.province}>{item.province}</option>
            ))}
          </select>

          <select
            value={district}
            onChange={(event) => setDistrict(event.target.value)}
            required={type === 'tehsil'}
            disabled={type === 'district' || !province}
            className="min-h-11 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff] disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
          >
            <option value="">{type === 'district' ? 'Not needed' : province ? 'Select district' : 'Select province first'}</option>
            {districtOptions.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>

          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder={type === 'district' ? 'District name' : 'Tehsil name'}
            className="min-h-11 rounded-lg border border-[#dbe4ef] bg-[#f6f9fd] px-3 py-2 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff]"
          />

          <button
            type="submit"
            disabled={isSubmitting || !province || !name.trim() || (type === 'tehsil' && !district)}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[#3b82f6] px-4 py-2 text-sm font-semibold text-white hover:bg-[#2563eb] disabled:opacity-60"
          >
            <Plus size={18} />
            {isSubmitting ? 'Adding...' : 'Add'}
          </button>
        </form>
        {message ? <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{message}</p> : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="flex items-center gap-2 border-b border-[#edf2f7] bg-[#f6f9fd] px-4 py-3">
          <MapPin className="h-4 w-4 text-[#3b82f6]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-[#0f1f33]">Admin Added Options</h2>
        </div>
        <table className="min-w-full text-left text-sm text-[#506784]">
          <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
            <tr>
              <th className="px-4 py-4">Type</th>
              <th className="px-4 py-4">Province</th>
              <th className="px-4 py-4">District</th>
              <th className="px-4 py-4">Name</th>
            </tr>
          </thead>
          <tbody>
            {options.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[#8a9bb3]">No custom address options added.</td>
              </tr>
            ) : (
              options.map((option) => (
                <tr key={option.id} className="border-t border-[#edf2f7]">
                  <td className="px-4 py-4 capitalize">{option.type}</td>
                  <td className="px-4 py-4">{option.province}</td>
                  <td className="px-4 py-4">{option.district ?? '-'}</td>
                  <td className="px-4 py-4 font-semibold text-[#0f1f33]">{option.name}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <section className="overflow-hidden rounded-xl border border-[#dbe4ef] bg-white">
        <div className="border-b border-[#edf2f7] bg-[#f6f9fd] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#3b82f6]" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-[#0f1f33]">Default Address Options</h2>
                <p className="mt-0.5 text-xs text-[#6b7f99]">System defaults used in application forms. Read only.</p>
              </div>
            </div>
            <input
              value={defaultSearch}
              onChange={(event) => setDefaultSearch(event.target.value)}
              placeholder="Search province, district, or tehsil"
              className="min-h-10 w-full rounded-lg border border-[#dbe4ef] bg-white px-3 py-2 text-sm text-[#0f1f33] outline-none focus:border-[#3b82f6] focus:ring-2 focus:ring-[#dceaff] lg:w-[320px]"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#edf4ff] px-3 py-1 text-xs font-semibold text-[#2563eb]">
              {defaultSummary.provinceCount} provinces
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {defaultSummary.districtCount} districts
            </span>
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              {defaultSummary.tehsilCount} tehsils
            </span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-[#506784]">
            <thead className="bg-blue-600 text-xs uppercase tracking-[0.12em] text-white">
              <tr>
                <th className="px-4 py-4">Province</th>
                <th className="px-4 py-4">District</th>
                <th className="px-4 py-4">Tehsils</th>
                <th className="px-4 py-4">Count</th>
              </tr>
            </thead>
            <tbody>
              {filteredDefaultRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-[#8a9bb3]">No default address options match this search.</td>
                </tr>
              ) : (
                filteredDefaultRows.map((row) => (
                  <tr key={`${row.province}-${row.district}`} className="border-t border-[#edf2f7] align-top">
                    <td className="px-4 py-4 font-medium text-[#0f1f33]">{row.province}</td>
                    <td className="px-4 py-4 font-semibold text-[#0f1f33]">{row.district}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.tehsils.map((tehsil) => (
                          <span key={tehsil} className="rounded-full bg-[#f6f9fd] px-2.5 py-1 text-xs font-medium text-[#506784]">
                            {tehsil}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-[#edf4ff] px-2.5 py-1 text-xs font-semibold text-[#2563eb]">
                        {row.tehsilCount}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
