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

function normalizeOptionName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export default function AddressOptionManager({ options }: { options: AddressOptionItem[] }) {
  const router = useRouter();
  const [type, setType] = useState<'district' | 'tehsil'>('district');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const districtOptions = useMemo(() => {
    if (!province) return [];

    const defaultDistricts = getDistrictsByProvince(province).map((item) => item.name);
    const customDistricts = options
      .filter((option) => option.type === 'district' && option.province === province)
      .map((option) => option.name);

    return Array.from(new Set([...defaultDistricts, ...customDistricts])).sort((a, b) => a.localeCompare(b));
  }, [options, province]);

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
          <thead className="bg-[#f6f9fd] text-xs uppercase tracking-[0.12em] text-[#7d8fa6]">
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Province</th>
              <th className="px-4 py-3">District</th>
              <th className="px-4 py-3">Name</th>
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
    </div>
  );
}
