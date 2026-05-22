export const HOUSEHOLD_ASSET_KEYS = [
  'fridge',
  'sewing_machine',
  'furniture',
  'vehicle',
  'livestock',
  'property',
  'smartphone',
  'cash_savings',
  'business_inventory',
  'gold',
  'silver',
  'other',
] as const;

export type HouseholdAssetKey = (typeof HOUSEHOLD_ASSET_KEYS)[number];

export type HouseholdAssetEntry = {
  has: boolean;
  answered: boolean;
  value: string;
  grams: string;
};

export type HouseholdAssetSelection = Record<HouseholdAssetKey, HouseholdAssetEntry>;

export const HOUSEHOLD_ASSET_LABELS: Record<HouseholdAssetKey, string> = {
  fridge: 'فریج',
  sewing_machine: 'سلائی مشین',
  furniture: 'فرنیچر',
  vehicle: 'سواری',
  livestock: 'مویشی/جانور',
  property: 'کوئی جائیداد',
  smartphone: 'اسمارٹ فون',
  cash_savings: 'کیش/سیونگ',
  business_inventory: 'مال تجارت',
  gold: 'سونا',
  silver: 'چاندی',
  other: 'دیگر',
};

export const HOUSEHOLD_ASSET_ENGLISH_LABELS: Record<HouseholdAssetKey, string> = {
  fridge: 'Fridge',
  sewing_machine: 'Sewing Machine',
  furniture: 'Furniture',
  vehicle: 'Vehicle',
  livestock: 'Livestock/Animals',
  property: 'Property',
  smartphone: 'Smartphone',
  cash_savings: 'Cash/Savings',
  business_inventory: 'Business Inventory',
  gold: 'Gold',
  silver: 'Silver',
  other: 'Other',
};

export function householdAssetDisplayLabel(key: HouseholdAssetKey): string {
  return `${HOUSEHOLD_ASSET_ENGLISH_LABELS[key]} / ${HOUSEHOLD_ASSET_LABELS[key]}`;
}

const USES_GRAMS: Partial<Record<HouseholdAssetKey, true>> = {
  gold: true,
  silver: true,
};

export function assetUsesGrams(key: HouseholdAssetKey): boolean {
  return USES_GRAMS[key] === true;
}

export function createDefaultHouseholdAssetSelection(): HouseholdAssetSelection {
  const base: HouseholdAssetEntry = { has: false, answered: false, value: '', grams: '' };
  return Object.fromEntries(HOUSEHOLD_ASSET_KEYS.map((key) => [key, { ...base }])) as HouseholdAssetSelection;
}

type AssetRow = {
  assetType: string;
  quantity?: number | string | null;
  value?: number | string | null;
};

const NO_ASSET_PREFIX = 'no:';

const LEGACY_ASSET_TYPE_ALIASES: Record<string, HouseholdAssetKey> = {
  fridge: 'fridge',
  sewing_machine: 'sewing_machine',
  furniture: 'furniture',
  vehicle: 'vehicle',
  livestock: 'livestock',
  property: 'property',
  smartphone: 'smartphone',
  cash_savings: 'cash_savings',
  business_inventory: 'business_inventory',
  gold: 'gold',
  silver: 'silver',
  other: 'other',
  'فریج': 'fridge',
  'سلائی مشین': 'sewing_machine',
  'فرنیچر': 'furniture',
  'سواری': 'vehicle',
  'مویشی/جانور': 'livestock',
  'کوئی جائیداد': 'property',
  'اسمارٹ فون': 'smartphone',
  'کیش/سیونگ': 'cash_savings',
  'مال_تجارت': 'business_inventory',
  'مال تجارت': 'business_inventory',
  'سونا': 'gold',
  'چاندی': 'silver',
  'دیگر': 'other',
};

function resolveAssetKey(raw: string): HouseholdAssetKey | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (LEGACY_ASSET_TYPE_ALIASES[trimmed]) return LEGACY_ASSET_TYPE_ALIASES[trimmed];
  const lower = trimmed.toLowerCase();
  if (LEGACY_ASSET_TYPE_ALIASES[lower]) return LEGACY_ASSET_TYPE_ALIASES[lower];
  for (const key of HOUSEHOLD_ASSET_KEYS) {
    if (HOUSEHOLD_ASSET_LABELS[key] === trimmed) return key;
  }
  return null;
}

function resolveNoAssetKey(raw: string): HouseholdAssetKey | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed.startsWith(NO_ASSET_PREFIX)) return null;
  const key = trimmed.slice(NO_ASSET_PREFIX.length);
  return HOUSEHOLD_ASSET_KEYS.includes(key as HouseholdAssetKey) && key !== 'other' ? key as HouseholdAssetKey : null;
}

export function householdAssetRowsToSelection(rows: AssetRow[]): HouseholdAssetSelection {
  const selection = createDefaultHouseholdAssetSelection();
  const unmatched: AssetRow[] = [];

  for (const row of rows) {
    const noAssetKey = resolveNoAssetKey(row.assetType);
    if (noAssetKey) {
      selection[noAssetKey] = { has: false, answered: true, value: '', grams: '' };
      continue;
    }

    const key = resolveAssetKey(row.assetType);
    if (!key) {
      unmatched.push(row);
      continue;
    }
    const entry = selection[key];
    entry.has = true;
    entry.answered = true;
    if (row.value != null && row.value !== '') {
      entry.value = String(row.value);
    }
    if (assetUsesGrams(key) && row.quantity != null && !Number.isNaN(Number(row.quantity))) {
      entry.grams = String(row.quantity);
    } else if (!assetUsesGrams(key) && !entry.value && row.quantity != null && !Number.isNaN(Number(row.quantity))) {
      entry.value = String(row.quantity);
    }
  }

  if (unmatched.length) {
    const other = selection.other;
    other.has = true;
    other.answered = true;
    const parts = unmatched.map((row) => {
      const q = row.quantity != null ? `${row.quantity}` : '';
      const v = row.value != null ? `${row.value}` : '';
      const type = row.assetType.trim();
      return [type, q, v].filter(Boolean).join(' — ');
    });
    const merged = parts.join('؛ ');
    other.value = other.value ? `${other.value}؛ ${merged}` : merged;
  }

  return selection;
}

export type HouseholdAssetApiRow = {
  assetType: string;
  quantity?: number;
  value?: number;
};

export type OtherHouseholdAssetInput = {
  item: string;
  value: string;
};

export function householdAssetRowsToOtherItems(rows: AssetRow[]): OtherHouseholdAssetInput[] {
  return rows
    .filter((row) => !resolveNoAssetKey(row.assetType) && !resolveAssetKey(row.assetType))
    .map((row) => ({
      item: row.assetType.trim(),
      value: row.value == null ? '' : String(row.value),
    }))
    .filter((row) => row.item || row.value);
}

export function mergeHouseholdAssetSelection(partial?: Partial<HouseholdAssetSelection>): HouseholdAssetSelection {
  const defaults = createDefaultHouseholdAssetSelection();
  if (!partial) return defaults;
  const next = { ...defaults };
  for (const key of HOUSEHOLD_ASSET_KEYS) {
    const entry = partial[key];
    if (entry) {
      next[key] = {
        has: Boolean(entry.has),
        answered: Boolean(entry.answered || entry.has),
        value: entry.value ?? '',
        grams: entry.grams ?? '',
      };
    }
  }
  return next;
}

export function householdSelectionToApiRows(selection: HouseholdAssetSelection, options: { includeNoAnswers?: boolean } = {}): HouseholdAssetApiRow[] {
  const rows: HouseholdAssetApiRow[] = [];

  for (const key of HOUSEHOLD_ASSET_KEYS) {
    if (key === 'other') continue;
    const entry = selection[key];
    if (!entry.has) {
      if (options.includeNoAnswers && entry.answered) {
        rows.push({
          assetType: `${NO_ASSET_PREFIX}${key}`,
          value: 0,
        });
      }
      continue;
    }

    const value =
      entry.value.trim() === '' ? undefined : Number(entry.value);
    const gramsRaw = entry.grams.trim();
    const quantity =
      assetUsesGrams(key) && gramsRaw !== '' ? Number(gramsRaw) : undefined;

    rows.push({
      assetType: key,
      quantity: quantity !== undefined && !Number.isNaN(quantity) ? quantity : undefined,
      value: value !== undefined && !Number.isNaN(value) ? value : undefined,
    });
  }

  return rows;
}

