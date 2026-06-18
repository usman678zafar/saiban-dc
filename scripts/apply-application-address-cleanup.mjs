import 'dotenv/config';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');
const { pakistanAddressData } = require('../lib/pakistan-address-data.ts');

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fileArgIndex = args.indexOf('--file');
const outputArgIndex = args.indexOf('--output-dir');
const workbookPath = path.resolve(
  fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? args[fileArgIndex + 1]
    : 'District Tehsil Cleaning applications Working.xlsx',
);
const outputDir = path.resolve(
  outputArgIndex >= 0 && args[outputArgIndex + 1]
    ? args[outputArgIndex + 1]
    : 'backups',
);

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function fileTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, '-');
}

function csvEscape(value) {
  const text = String(value ?? '');
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function getSheetRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Workbook is missing sheet "${sheetName}".`);
  }

  return XLSX.utils.sheet_to_json(sheet, {
    defval: '',
    blankrows: false,
  });
}

function buildUpdateMap(rows, config) {
  const updates = new Map();
  const duplicateConflicts = [];
  const skippedBlankNewValueIds = [];

  for (const row of rows) {
    const id = normalizeText(row.id);
    const newValue = normalizeText(row[config.newValueColumn]);

    if (!id) continue;
    if (!newValue) {
      skippedBlankNewValueIds.push(id);
      continue;
    }

    const entry = {
      id,
      currentValue: normalizeText(row[config.currentValueColumn]),
      newValue,
      code: normalizeText(row[config.codeColumn]),
      source: row,
    };

    const existing = updates.get(id);
    if (!existing) {
      updates.set(id, entry);
      continue;
    }

    if (
      existing.currentValue !== entry.currentValue ||
      existing.newValue !== entry.newValue ||
      existing.code !== entry.code
    ) {
      duplicateConflicts.push({
        id,
        first: existing.source,
        second: row,
      });
    }
  }

  if (duplicateConflicts.length > 0) {
    throw new Error(
      `${config.label} sheet has ${duplicateConflicts.length} conflicting duplicate id row(s).`,
    );
  }

  return {
    updates,
    skippedBlankNewValueIds,
  };
}

function buildDatasetIndex() {
  const districtsByProvince = new Map();
  const districtByCode = new Map();
  const tehsilByCode = new Map();

  for (const provinceEntry of pakistanAddressData) {
    const districtMap = new Map();

    for (const district of provinceEntry.districts) {
      districtMap.set(district.name, new Set(district.tehsils.map((tehsil) => tehsil.name)));
      districtByCode.set(district.code, {
        province: provinceEntry.province,
        district: district.name,
        code: district.code,
      });

      for (const tehsil of district.tehsils) {
        tehsilByCode.set(tehsil.code, {
          province: provinceEntry.province,
          district: district.name,
          tehsil: tehsil.name,
          code: tehsil.code,
        });
      }
    }

    districtsByProvince.set(provinceEntry.province, districtMap);
  }

  return {
    districtsByProvince,
    districtByCode,
    tehsilByCode,
  };
}

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
}

function toBackupRow(application, districtUpdate, tehsilUpdate) {
  const finalDistrict = districtUpdate?.newValue ?? application.district ?? '';
  const finalTehsil = tehsilUpdate?.newValue ?? application.tehsil ?? '';

  return {
    id: application.id,
    province: application.province ?? '',
    districtBefore: application.district ?? '',
    districtAfter: finalDistrict,
    tehsilBefore: application.tehsil ?? '',
    tehsilAfter: finalTehsil,
    districtChanged: String((application.district ?? '') !== finalDistrict),
    tehsilChanged: String((application.tehsil ?? '') !== finalTehsil),
    districtWorkbookValue: districtUpdate?.currentValue ?? '',
    districtWorkbookNewValue: districtUpdate?.newValue ?? '',
    districtCode: districtUpdate?.code ?? '',
    tehsilWorkbookDistrict: tehsilUpdate?.source?.district ?? '',
    tehsilWorkbookValue: tehsilUpdate?.currentValue ?? '',
    tehsilWorkbookNewValue: tehsilUpdate?.newValue ?? '',
    tehsilCode: tehsilUpdate?.code ?? '',
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  const workbook = XLSX.readFile(workbookPath);
  const districtRows = getSheetRows(workbook, 'District');
  const tehsilRows = getSheetRows(workbook, 'Tehsil');

  const districtBuild = buildUpdateMap(districtRows, {
    label: 'District',
    currentValueColumn: 'district',
    newValueColumn: 'New Value',
    codeColumn: 'Code',
  });
  const tehsilBuild = buildUpdateMap(tehsilRows, {
    label: 'Tehsil',
    currentValueColumn: 'tehsil',
    newValueColumn: 'New Value',
    codeColumn: 'Tehsil Code',
  });

  const districtUpdates = districtBuild.updates;
  const tehsilUpdates = tehsilBuild.updates;
  const ids = [...new Set([...districtUpdates.keys(), ...tehsilUpdates.keys()])];
  const dataset = buildDatasetIndex();
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const applications = await prisma.orphanApplication.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        province: true,
        district: true,
        tehsil: true,
      },
    });

    const applicationById = new Map(applications.map((application) => [application.id, application]));
    const missingIds = ids.filter((id) => !applicationById.has(id));

    const backupRows = [];
    const changes = [];
    const warnings = [];
    const skippedUnchangedIds = [];

    for (const id of ids) {
      const application = applicationById.get(id);
      if (!application) continue;

      const districtUpdate = districtUpdates.get(id);
      const tehsilUpdate = tehsilUpdates.get(id);
      const finalDistrict = districtUpdate?.newValue ?? application.district ?? '';
      const finalTehsil = tehsilUpdate?.newValue ?? application.tehsil ?? '';
      const districtChanged = (application.district ?? '') !== finalDistrict;
      const tehsilChanged = (application.tehsil ?? '') !== finalTehsil;
      const provinceDistricts = dataset.districtsByProvince.get(application.province ?? '');
      const districtValid = provinceDistricts?.has(finalDistrict) ?? false;
      const tehsilValid =
        !finalTehsil ||
        finalTehsil === 'unknown' ||
        (provinceDistricts?.get(finalDistrict)?.has(finalTehsil) ?? false);

      backupRows.push(toBackupRow(application, districtUpdate, tehsilUpdate));

      if (!districtChanged && !tehsilChanged) {
        skippedUnchangedIds.push(id);
        continue;
      }

      if (districtUpdate) {
        const canonicalDistrict = dataset.districtByCode.get(districtUpdate.code);
        if (
          canonicalDistrict &&
          (canonicalDistrict.province !== application.province ||
            canonicalDistrict.district !== districtUpdate.newValue)
        ) {
          warnings.push({
            type: 'district-code-mismatch',
            id,
            province: application.province,
            workbookDistrict: districtUpdate.newValue,
            workbookCode: districtUpdate.code,
            canonicalDistrict,
          });
        }
      }

      if (tehsilUpdate) {
        const canonicalTehsil = dataset.tehsilByCode.get(tehsilUpdate.code);
        if (
          canonicalTehsil &&
          (canonicalTehsil.province !== application.province ||
            canonicalTehsil.district !== finalDistrict ||
            canonicalTehsil.tehsil !== tehsilUpdate.newValue)
        ) {
          warnings.push({
            type: 'tehsil-code-mismatch',
            id,
            province: application.province,
            finalDistrict,
            workbookTehsil: tehsilUpdate.newValue,
            workbookCode: tehsilUpdate.code,
            canonicalTehsil,
          });
        }
      }

      if (!districtValid || !tehsilValid) {
        warnings.push({
          type: 'final-combination-not-in-built-in-dataset',
          id,
          province: application.province,
          districtBefore: application.district,
          districtAfter: finalDistrict,
          tehsilBefore: application.tehsil,
          tehsilAfter: finalTehsil,
          districtValid,
          tehsilValid,
        });
      }

      changes.push({
        id,
        province: application.province,
        data: {
          ...(districtChanged ? { district: finalDistrict } : {}),
          ...(tehsilChanged ? { tehsil: finalTehsil } : {}),
        },
      });
    }

    const report = {
      mode: apply ? 'apply' : 'dry-run',
      workbookPath,
      workbookRows: {
        district: districtRows.length,
        tehsil: tehsilRows.length,
      },
      workbookUpdates: {
        district: districtUpdates.size,
        tehsil: tehsilUpdates.size,
      },
      matchedApplications: applications.length,
      missingApplicationIds: missingIds,
      missingApplicationCount: missingIds.length,
      skippedBlankNewValueIds: {
        district: districtBuild.skippedBlankNewValueIds.length,
        tehsil: tehsilBuild.skippedBlankNewValueIds.length,
      },
      skippedUnchangedIds,
      skippedUnchangedCount: skippedUnchangedIds.length,
      updatesReady: changes.length,
      districtChangeCount: changes.filter((item) => 'district' in item.data).length,
      tehsilChangeCount: changes.filter((item) => 'tehsil' in item.data).length,
      warningCount: warnings.length,
      warnings,
    };

    if (!apply) {
      console.log(JSON.stringify(report, null, 2));
      console.log('\nDry run only. Run again with --apply to back up and update the matched applications.');
      return;
    }

    await fs.mkdir(outputDir, { recursive: true });
    const stamp = fileTimestamp();
    const baseName = `application-address-cleanup-${stamp}`;
    const backupJsonPath = path.join(outputDir, `${baseName}.json`);
    const backupCsvPath = path.join(outputDir, `${baseName}.csv`);
    const reportPath = path.join(outputDir, `${baseName}.report.json`);

    await fs.writeFile(
      backupJsonPath,
      `${JSON.stringify(
        {
          createdAt: new Date().toISOString(),
          workbookPath,
          rows: backupRows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    const csvHeader = Object.keys(backupRows[0] ?? {
      id: '',
      province: '',
      districtBefore: '',
      districtAfter: '',
      tehsilBefore: '',
      tehsilAfter: '',
      districtChanged: '',
      tehsilChanged: '',
      districtWorkbookValue: '',
      districtWorkbookNewValue: '',
      districtCode: '',
      tehsilWorkbookDistrict: '',
      tehsilWorkbookValue: '',
      tehsilWorkbookNewValue: '',
      tehsilCode: '',
    });
    const csvLines = [
      csvHeader.join(','),
      ...backupRows.map((row) => csvHeader.map((key) => csvEscape(row[key])).join(',')),
    ];
    await fs.writeFile(backupCsvPath, `${csvLines.join('\n')}\n`, 'utf8');

    if (changes.length > 0) {
      for (const group of chunk(changes, 25)) {
        await prisma.$transaction(
          group.map((change) =>
            prisma.orphanApplication.update({
              where: { id: change.id },
              data: change.data,
            }),
          ),
          {
            timeout: 60000,
          },
        );
      }
    }

    const verificationRows = await prisma.orphanApplication.findMany({
      where: { id: { in: changes.map((change) => change.id) } },
      select: {
        id: true,
        district: true,
        tehsil: true,
      },
    });

    const verificationById = new Map(verificationRows.map((row) => [row.id, row]));
    const verificationFailures = changes
      .filter((change) => {
        const row = verificationById.get(change.id);
        if (!row) return true;
        if ('district' in change.data && row.district !== change.data.district) return true;
        if ('tehsil' in change.data && row.tehsil !== change.data.tehsil) return true;
        return false;
      })
      .map((change) => ({
        id: change.id,
        expected: change.data,
        actual: verificationById.get(change.id) ?? null,
      }));

    const finalReport = {
      ...report,
      backupJsonPath,
      backupCsvPath,
      reportPath,
      appliedCount: changes.length,
      verificationFailures,
      verificationFailureCount: verificationFailures.length,
    };

    await fs.writeFile(reportPath, `${JSON.stringify(finalReport, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(finalReport, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
