'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { LatLngBoundsExpression, LayerGroup, Map as LeafletMap } from 'leaflet';
import { Activity, Filter, LocateFixed, MapPinned, Navigation, ShieldCheck } from 'lucide-react';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { useViewerLanguage, type ViewerLanguage as Language } from './viewer-language';

export type ViewerGeoApplication = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  status: string;
  collectorProject: string | null;
  province: string | null;
  district: string | null;
  tehsil: string | null;
  city: string | null;
  fullAddress: string | null;
  latitude: number;
  longitude: number;
  gpsAccuracyMeters: number | null;
  gpsCapturedAt: string | null;
};

type StatusFilter = 'all' | 'active' | 'final_approved' | 'pending' | 'rejected';
type LocationLevel = 'province' | 'district' | 'tehsil' | 'city';

const PAKISTAN_BOUNDS: LatLngBoundsExpression = [
  [23.35, 60.75],
  [37.1, 77.25],
];

const statusFilters: Array<{ value: StatusFilter; label: Record<Language, string> }> = [
  { value: 'all', label: { en: 'All homes', ur: 'تمام گھرانے' } },
  { value: 'active', label: { en: 'In process', ur: 'زیر عمل' } },
  { value: 'final_approved', label: { en: 'Final approved', ur: 'حتمی منظور شدہ' } },
  { value: 'pending', label: { en: 'Pending review', ur: 'زیر جائزہ' } },
  { value: 'rejected', label: { en: 'Rejected', ur: 'مسترد' } },
];

const locationLevels: Array<{ value: LocationLevel; label: Record<Language, string>; ranking: Record<Language, string> }> = [
  { value: 'province', label: { en: 'Province', ur: 'صوبہ' }, ranking: { en: 'High-density provinces', ur: 'اہم صوبے' } },
  { value: 'district', label: { en: 'District', ur: 'ضلع' }, ranking: { en: 'High-density districts', ur: 'اہم اضلاع' } },
  { value: 'tehsil', label: { en: 'Tehsil', ur: 'تحصیل' }, ranking: { en: 'High-density tehsils', ur: 'اہم تحصیلیں' } },
  { value: 'city', label: { en: 'City', ur: 'شہر' }, ranking: { en: 'High-density cities', ur: 'اہم شہر' } },
];

const copy = {
  en: {
    eyebrow: 'Geographic coverage',
    title: 'Homes Reached Across Pakistan',
    subtitle: 'Each point represents a registered household with verified GPS coordinates. Select a marker to read the story behind the location.',
    language: 'Urdu',
    filter: 'Filter',
    locationLens: 'Location lens',
    viewBy: 'View by',
    allLocations: 'All locations',
    clearLocation: 'Clear location',
    coverage: 'Coverage',
    noLocationMatches: 'No homes match this location and status selection.',
    mappedHomes: 'Mapped homes',
    districts: 'Districts covered',
    finalApproved: 'Final approved',
    gpsAccuracy: 'Avg. GPS accuracy',
    noAccuracy: 'No GPS accuracy',
    topDistricts: 'High-density districts',
    noMappedData: 'No mapped household coordinates are available yet.',
    mapAria: 'Interactive Pakistan map of household GPS locations',
    homes: 'homes',
    pakistanOnly: 'Pakistan only',
    unspecified: 'Unspecified',
  },
  ur: {
    eyebrow: 'جغرافیائی رسائی',
    title: 'پاکستان بھر میں رجسٹرڈ گھرانے',
    subtitle: 'ہر نشان ایک رجسٹرڈ گھرانے کی نمائندگی کرتا ہے جس کے جغرافیائی مقام کی تصدیق ہو چکی ہے۔ تفصیل دیکھنے کے لیے نقشے پر نشان منتخب کریں۔',
    language: 'English',
    filter: 'فلٹر',
    locationLens: 'مقام کا جائزہ',
    viewBy: 'دیکھیں',
    allLocations: 'تمام مقامات',
    clearLocation: 'مقام صاف کریں',
    coverage: 'سطح کی رسائی',
    noLocationMatches: 'اس مقام اور حیثیت کے لیے کوئی گھر موجود نہیں۔',
    mappedHomes: 'نقشے پر گھرانے',
    districts: 'اضلاع',
    finalApproved: 'حتمی منظور شدہ',
    gpsAccuracy: 'جغرافیائی مقام کی اوسط درستگی',
    noAccuracy: 'جغرافیائی درستگی موجود نہیں',
    topDistricts: 'اہم اضلاع',
    noMappedData: 'ابھی گھرانوں کے GPS کوآرڈینیٹس دستیاب نہیں۔',
    mapAria: 'پاکستان میں گھرانوں کے GPS مقامات کا انٹرایکٹو نقشہ',
    homes: 'گھرانے',
    pakistanOnly: 'صرف پاکستان',
    unspecified: 'غیر متعین',
  },
};

const statusLabelsUrdu: Record<string, string> = {
  draft: 'ڈرافٹ',
  submitted: 'جمع شدہ',
  needs_correction: 'اصلاح درکار',
  supervisor_approved: 'سپروائزر سے منظور',
  reviewer_approved: 'ریویور سے منظور',
  admin_approved: 'ایڈمن سے منظور',
  validated: 'تصدیق شدہ',
  rejected: 'مسترد',
  migrated: 'منتقل شدہ',
};

function displayStatusLabel(status: string, language: Language) {
  return language === 'ur' ? statusLabelsUrdu[status] ?? applicationStatusLabel(status) : applicationStatusLabel(status);
}

function statusGroup(status: string): StatusFilter {
  if (['admin_approved', 'validated', 'migrated'].includes(status)) return 'final_approved';
  if (status === 'rejected') return 'rejected';
  if (['submitted', 'supervisor_approved', 'reviewer_approved', 'needs_correction'].includes(status)) return 'pending';
  return 'active';
}

function markerColor(status: string) {
  switch (statusGroup(status)) {
    case 'final_approved':
      return '#16a34a';
    case 'pending':
      return '#2563eb';
    case 'rejected':
      return '#e11d48';
    default:
      return '#f59e0b';
  }
}

function formatAccuracy(value: number | null, language: Language) {
  if (value == null) return copy[language].noAccuracy;
  return language === 'ur' ? `${Math.round(value).toLocaleString('ur-PK')} میٹر` : `${Math.round(value).toLocaleString()} m`;
}

function locationValue(point: ViewerGeoApplication, level: LocationLevel, fallback: string) {
  const value = point[level]?.trim();
  return value || fallback;
}

export default function ViewerGeoStoryMap({ points }: { points: ViewerGeoApplication[] }) {
  const { language } = useViewerLanguage();
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [locationLevel, setLocationLevel] = useState<LocationLevel>('district');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id ?? null);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layerRef = useRef<LayerGroup | null>(null);
  const t = copy[language];

  const statusFilteredPoints = useMemo(() => {
    if (filter === 'all') return points;
    return points.filter((point) => statusGroup(point.status) === filter);
  }, [filter, points]);

  const locationOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const point of statusFilteredPoints) {
      const value = locationValue(point, locationLevel, t.unspecified);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, total]) => ({ value, total }))
      .sort((a, b) => b.total - a.total || a.value.localeCompare(b.value));
  }, [locationLevel, statusFilteredPoints, t.unspecified]);

  const pointsInLocation = useMemo(() => {
    if (locationFilter === 'all') return points;
    return points.filter((point) => locationValue(point, locationLevel, t.unspecified) === locationFilter);
  }, [locationFilter, locationLevel, points, t.unspecified]);

  const filteredPoints = useMemo(() => {
    if (filter === 'all') return pointsInLocation;
    return pointsInLocation.filter((point) => statusGroup(point.status) === filter);
  }, [filter, pointsInLocation]);

  const selectedPoint = useMemo(
    () => filteredPoints.find((point) => point.id === selectedId) ?? filteredPoints[0] ?? null,
    [filteredPoints, selectedId],
  );

  const locationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const point of filteredPoints) {
      const value = locationValue(point, locationLevel, t.unspecified);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([value, total]) => ({ value, total }))
      .sort((a, b) => b.total - a.total || a.value.localeCompare(b.value))
      .slice(0, 5);
  }, [filteredPoints, locationLevel, t.unspecified]);

  const filterCounts = useMemo(() => {
    const counts = new Map<StatusFilter, number>();
    counts.set('all', pointsInLocation.length);
    for (const point of pointsInLocation) {
      const group = statusGroup(point.status);
      counts.set(group, (counts.get(group) ?? 0) + 1);
    }
    return counts;
  }, [pointsInLocation]);

  const summary = useMemo(() => {
    const areas = new Set(
      filteredPoints
        .map((point) => locationValue(point, locationLevel, t.unspecified))
        .filter((value) => value !== t.unspecified),
    ).size;
    const finalApproved = filteredPoints.filter((point) => statusGroup(point.status) === 'final_approved').length;
    const accuracies = filteredPoints.map((point) => point.gpsAccuracyMeters).filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    const averageAccuracy = accuracies.length ? Math.round(accuracies.reduce((total, value) => total + value, 0) / accuracies.length) : null;
    return { areas, finalApproved, averageAccuracy };
  }, [filteredPoints, locationLevel, t.unspecified]);

  const selectedLocationLevel = locationLevels.find((item) => item.value === locationLevel) ?? locationLevels[1];
  const numberLocale = language === 'ur' ? 'ur-PK' : 'en-US';
  const isRtl = language === 'ur';

  useEffect(() => {
    let disposed = false;

    async function initMap() {
      if (!mapNodeRef.current || mapRef.current) return;
      const L = await import('leaflet');
      if (disposed || !mapNodeRef.current) return;

      const map = L.map(mapNodeRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        maxBounds: PAKISTAN_BOUNDS,
        maxBoundsViscosity: 1,
        minZoom: 4,
        maxZoom: 13,
      }).fitBounds(PAKISTAN_BOUNDS, { padding: [8, 8] });

      L.control.zoom({ position: 'bottomright' }).addTo(map);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      }).addTo(map);

      mapRef.current = map;
      layerRef.current = L.layerGroup().addTo(map);
      setTimeout(() => map.invalidateSize(), 120);
      setTimeout(() => map.invalidateSize(), 450);
    }

    initMap();

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      layerRef.current = null;
    };
  }, []);

  useEffect(() => {
    let disposed = false;

    async function renderMarkers() {
      const map = mapRef.current;
      const layer = layerRef.current;
      if (!map || !layer) return;
      const L = await import('leaflet');
      if (disposed) return;

      layer.clearLayers();
      for (const point of filteredPoints) {
        const isSelected = point.id === selectedPoint?.id;
        const color = markerColor(point.status);
        const marker = L.circleMarker([point.latitude, point.longitude], {
          radius: isSelected ? 9 : 6,
          color,
          fillColor: color,
          fillOpacity: isSelected ? 0.95 : 0.72,
          weight: isSelected ? 3 : 2,
          opacity: 0.95,
        });
        marker.bindTooltip(`${point.registrationNumber ?? point.id} - ${displayStatusLabel(point.status, language)}`);
        marker.on('click', () => {
          setSelectedId(point.id);
          map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 8), { duration: 0.55 });
        });
        marker.addTo(layer);
      }

      if (filteredPoints.length > 0) {
        const bounds = L.latLngBounds(filteredPoints.map((point) => [point.latitude, point.longitude]));
        map.fitBounds(bounds.pad(0.32), { maxZoom: filteredPoints.length === 1 ? 9 : 8, animate: true });
      } else {
        map.fitBounds(PAKISTAN_BOUNDS, { animate: true });
      }
    }

    renderMarkers();
    return () => {
      disposed = true;
    };
  }, [filteredPoints, selectedPoint?.id, language]);

  useEffect(() => {
    if (selectedPoint && selectedPoint.id !== selectedId) setSelectedId(selectedPoint.id);
  }, [selectedId, selectedPoint]);

  useEffect(() => {
    if (locationFilter !== 'all' && !locationOptions.some((option) => option.value === locationFilter)) {
      setLocationFilter('all');
      setSelectedId(null);
    }
  }, [locationFilter, locationOptions]);

  if (points.length === 0) {
    return (
      <section className="mt-4 rounded-xl border border-[#dbe4ef] bg-white px-5 py-8 text-center shadow-sm">
        <MapPinned className="mx-auto h-10 w-10 text-[#8a9bb3]" aria-hidden="true" />
        <h2 className="mt-3 text-lg font-semibold text-[#0f1f33]">{t.title}</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#5f718a]">{t.noMappedData}</p>
      </section>
    );
  }

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[#b8c7da] bg-[#101c2f] shadow-[0_26px_70px_rgba(15,31,51,0.18)]">
      <div className="border-b border-white/10 bg-[#14233a] px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className={`min-w-0 w-full ${isRtl ? 'text-right' : 'text-left'}`}>
            <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#8fc7ff] ${isRtl ? 'flex-row-reverse justify-end' : ''}`}>
              <Navigation className="h-4 w-4" aria-hidden="true" />
              {t.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl" dir={isRtl ? 'rtl' : 'ltr'}>{t.title}</h2>
            <p className={`mt-2 max-w-4xl text-sm leading-6 text-[#c9d8ea] ${isRtl ? 'ml-auto' : ''}`} dir={isRtl ? 'rtl' : 'ltr'}>{t.subtitle}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryTile icon={MapPinned} label={t.mappedHomes} value={filteredPoints.length.toLocaleString(numberLocale)} tone="blue" />
          <SummaryTile icon={LocateFixed} label={`${selectedLocationLevel.label[language]} ${t.coverage}`} value={summary.areas.toLocaleString(numberLocale)} tone="violet" />
          <SummaryTile icon={ShieldCheck} label={t.finalApproved} value={summary.finalApproved.toLocaleString(numberLocale)} tone="emerald" />
          <SummaryTile icon={Activity} label={t.gpsAccuracy} value={formatAccuracy(summary.averageAccuracy, language)} tone="amber" />
        </div>
      </div>

      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 bg-[#eef5fa]">
          <div className="space-y-3 border-b border-[#d7e3ef] bg-white/95 px-4 py-3">
            <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#506784]">
                <LocateFixed className="h-4 w-4" aria-hidden="true" />
                {t.locationLens}
              </div>
              <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-end">
                <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
                  {locationLevels.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setLocationLevel(item.value);
                        setLocationFilter('all');
                        setSelectedId(null);
                      }}
                      className={`inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border px-3 text-xs font-semibold transition ${locationLevel === item.value ? 'border-[#101c2f] bg-[#101c2f] text-white shadow-[0_10px_24px_rgba(15,31,51,0.18)]' : 'border-[#dbe4ef] bg-white text-[#0f1f33] hover:bg-[#f6f9fd]'}`}
                    >
                      {item.label[language]}
                    </button>
                  ))}
                </div>
                <label className="sr-only" htmlFor="viewer-location-filter">{t.locationLens}</label>
                <select
                  id="viewer-location-filter"
                  value={locationFilter}
                  onChange={(event) => {
                    setLocationFilter(event.target.value);
                    setSelectedId(null);
                  }}
                  className="min-h-10 w-full rounded-lg border border-[#dbe4ef] bg-white px-3 text-xs font-semibold text-[#0f1f33] shadow-sm outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#bfdbfe] lg:w-[260px]"
                >
                  <option value="all">{t.allLocations}</option>
                  {locationOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.value} ({option.total.toLocaleString(numberLocale)})
                    </option>
                  ))}
                </select>
                {locationFilter !== 'all' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setLocationFilter('all');
                      setSelectedId(null);
                    }}
                    className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white px-3 text-xs font-semibold text-[#506784] transition hover:bg-[#f6f9fd]"
                  >
                    {t.clearLocation}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#506784]">
                <Filter className="h-4 w-4" aria-hidden="true" />
                {t.filter}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 sm:justify-end sm:pb-0">
                {statusFilters.map((item) => {
                  const count = filterCounts.get(item.value) ?? 0;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => {
                        setFilter(item.value);
                        setSelectedId(null);
                      }}
                      className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition ${filter === item.value ? 'border-[#2563eb] bg-[#2563eb] text-white shadow-[0_10px_24px_rgba(37,99,235,0.24)]' : 'border-[#dbe4ef] bg-white text-[#0f1f33] hover:bg-[#f6f9fd]'}`}
                    >
                      <span>{item.label[language]}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] ${filter === item.value ? 'bg-white/20 text-white' : 'bg-[#edf4ff] text-[#2563eb]'}`}>
                        {count.toLocaleString(numberLocale)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="relative h-[500px] min-h-[500px] bg-[#dfeaf2] sm:h-[620px]">
            <div ref={mapNodeRef} className="h-full w-full" role="img" aria-label={t.mapAria} />
            <div className="pointer-events-none absolute left-4 top-4 rounded-lg border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-[#0f1f33] shadow-[0_10px_24px_rgba(15,31,51,0.12)] backdrop-blur">
              {locationFilter === 'all' ? t.pakistanOnly : locationFilter}
            </div>
            <div className="pointer-events-none absolute right-4 top-4 rounded-lg border border-white/80 bg-[#101c2f]/90 px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(15,31,51,0.18)] backdrop-blur">
              {filteredPoints.length.toLocaleString(numberLocale)} / {points.length.toLocaleString(numberLocale)} {t.homes}
            </div>
            <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-2 rounded-lg border border-white/80 bg-white/95 px-3 py-2 text-xs font-semibold text-[#506784] shadow-[0_12px_28px_rgba(15,31,51,0.14)] backdrop-blur sm:right-auto">
              <LegendDot color="#16a34a" label={statusFilters[2].label[language]} />
              <LegendDot color="#2563eb" label={statusFilters[3].label[language]} />
              <LegendDot color="#e11d48" label={statusFilters[4].label[language]} />
            </div>
          </div>
        </div>

        <aside className="min-w-0 border-t border-white/10 bg-[#f8fbff] p-4 xl:border-l xl:border-t-0">
          <section className="rounded-lg border border-[#cddbeb] bg-white p-4 shadow-[0_14px_30px_rgba(15,31,51,0.08)]">
            <h3 className={`text-sm font-semibold text-[#0f1f33] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>{selectedLocationLevel.ranking[language]}</h3>
            <div className="mt-4 space-y-4">
              {locationCounts.length === 0 ? (
                <p className={`text-sm leading-6 text-[#5f718a] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>{t.noLocationMatches}</p>
              ) : null}
              {locationCounts.map((item, index) => {
                const width = filteredPoints.length ? Math.max(8, Math.round((item.total / filteredPoints.length) * 100)) : 0;
                return (
                  <div key={item.value}>
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-xs font-semibold text-[#506784]">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-[#edf4ff] text-[#2563eb]">{index + 1}</span>
                        <span className="truncate">{item.value}</span>
                      </span>
                      <span className="shrink-0">{item.total.toLocaleString(numberLocale)} {t.homes}</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[#edf2f7]">
                      <div className="h-full rounded-full bg-[#2563eb]" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}

function SummaryTile({ icon: Icon, label, value, tone }: { icon: typeof MapPinned; label: string; value: string; tone: 'blue' | 'violet' | 'emerald' | 'amber' }) {
  const tones = {
    blue: 'bg-[#edf4ff] text-[#2563eb]',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  return (
    <div className="flex min-w-0 items-center gap-3 rounded-lg border border-[#edf2f7] bg-white px-3 py-3">
      <span className={`inline-flex size-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-[#8a9bb3]">{label}</p>
        <p className="mt-1 truncate text-base font-semibold text-[#0f1f33]">{value}</p>
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}
