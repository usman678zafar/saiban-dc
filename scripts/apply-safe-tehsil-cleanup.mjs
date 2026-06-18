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
    : 'Tehsil Data (1).xlsx',
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

function chunk(array, size) {
  const result = [];
  for (let index = 0; index < array.length; index += size) {
    result.push(array.slice(index, index + size));
  }
  return result;
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

function buildDatasetIndex() {
  const districtsByProvince = new Map();
  const tehsilByCode = new Map();

  for (const provinceEntry of pakistanAddressData) {
    const districtMap = new Map();

    for (const district of provinceEntry.districts) {
      districtMap.set(district.name, new Set(district.tehsils.map((tehsil) => tehsil.name)));

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
    tehsilByCode,
  };
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is missing.');
  }

  const workbook = XLSX.readFile(workbookPath);
  const rows = getSheetRows(workbook, 'Tehsil');
  const dataset = buildDatasetIndex();

  const updatesById = new Map();
  const duplicateConflicts = [];
  const skippedBlankUpdateIds = [];

  for (const row of rows) {
    const id = normalizeText(row.id);
    const tehsilUpdate = normalizeText(row.tehsilupdates);
    const tehsilCode = normalizeText(row.tehsil_code);
    const workbookDistrict = normalizeText(row.district);
    const workbookTehsil = normalizeText(row.tehsil);

    if (!id) continue;
    if (!tehsilUpdate) {
      skippedBlankUpdateIds.push(id);
      continue;
    }

    const entry = {
      id,
      workbookDistrict,
      workbookTehsil,
      tehsilUpdate,
      tehsilCode,
      source: row,
    };

    const existing = updatesById.get(id);
    if (!existing) {
      updatesById.set(id, entry);
      continue;
    }

    if (
      existing.workbookDistrict !== entry.workbookDistrict ||
      existing.workbookTehsil !== entry.workbookTehsil ||
      existing.tehsilUpdate !== entry.tehsilUpdate ||
      existing.tehsilCode !== entry.tehsilCode
    ) {
      duplicateConflicts.push({
        id,
        first: existing.source,
        second: row,
      });
    }
  }

  if (duplicateConflicts.length > 0) {
    throw new Error(`Workbook has ${duplicateConflicts.length} conflicting duplicate id row(s).`);
  }

  const ids = [...updatesById.keys()];
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
    const safeRows = [];
    const backupRows = [];
    const changes = [];
    const skippedMissingIds = [];
    const skippedInvalidCodeIds = [];
    const skippedCodeMismatchIds = [];
    const skippedInvalidFinalIds = [];
    const skippedUnchangedIds = [];

    for (const [id, update] of updatesById.entries()) {
      const application = applicationById.get(id);
      if (!application) {
        skippedMissingIds.push(id);
        continue;
      }

      const canonicalTehsil = dataset.tehsilByCode.get(update.tehsilCode);
      if (!canonicalTehsil) {
        skippedInvalidCodeIds.push(id);
        continue;
      }

      if (canonicalTehsil.tehsil !== update.tehsilUpdate) {
        skippedCodeMismatchIds.push(id);
        continue;
      }

      const provinceDistricts = dataset.districtsByProvince.get(application.province ?? '');
      const districtValid = provinceDistricts?.has(application.district ?? '') ?? false;
      const tehsilValid = provinceDistricts?.get(application.district ?? '')?.has(update.tehsilUpdate) ?? false;
      if (!districtValid || !tehsilValid) {
        skippedInvalidFinalIds.push(id);
        continue;
      }

      safeRows.push({
        id,
        province: application.province ?? '',
        district: application.district ?? '',
        tehsilBefore: application.tehsil ?? '',
        tehsilAfter: update.tehsilUpdate,
        workbookDistrict: update.workbookDistrict,
        workbookTehsil: update.workbookTehsil,
        tehsilCode: update.tehsilCode,
      });

      if ((application.tehsil ?? '') === update.tehsilUpdate) {
        skippedUnchangedIds.push(id);
        continue;
      }

      backupRows.push({
        id,
        province: application.province ?? '',
        district: application.district ?? '',
        tehsilBefore: application.tehsil ?? '',
        tehsilAfter: update.tehsilUpdate,
        workbookDistrict: update.workbookDistrict,
        workbookTehsil: update.workbookTehsil,
        tehsilCode: update.tehsilCode,
      });

      changes.push({
        id,
        data: {
          tehsil: update.tehsilUpdate,
        },
      });
    }

    const report = {
      mode: apply ? 'apply' : 'dry-run',
      workbookPath,
      workbookRowCount: rows.length,
      workbookUniqueIds: ids.length,
      skippedBlankUpdateCount: skippedBlankUpdateIds.length,
      matchedApplicationCount: applications.length,
      safeRowCount: safeRows.length,
      skippedMissingCount: skippedMissingIds.length,
      skippedMissingIds,
      skippedInvalidCodeCount: skippedInvalidCodeIds.length,
      skippedInvalidCodeIds,
      skippedCodeMismatchCount: skippedCodeMismatchIds.length,
      skippedCodeMismatchIds,
      skippedInvalidFinalCount: skippedInvalidFinalIds.length,
      skippedInvalidFinalIds,
      skippedUnchangedCount: skippedUnchangedIds.length,
      skippedUnchangedIds,
      updatesReady: changes.length,
    };

    if (!apply) {
      console.log(JSON.stringify(report, null, 2));
      console.log('\nDry run only. Run again with --apply to back up and update the safe tehsil rows.');
      return;
    }

    await fs.mkdir(outputDir, { recursive: true });
    const stamp = fileTimestamp();
    const baseName = `safe-tehsil-cleanup-${stamp}`;
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
      district: '',
      tehsilBefore: '',
      tehsilAfter: '',
      workbookDistrict: '',
      workbookTehsil: '',
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
        tehsil: true,
      },
    });
    const verificationById = new Map(verificationRows.map((row) => [row.id, row]));
    const verificationFailures = changes
      .filter((change) => verificationById.get(change.id)?.tehsil !== change.data.tehsil)
      .map((change) => ({
        id: change.id,
        expectedTehsil: change.data.tehsil,
        actualTehsil: verificationById.get(change.id)?.tehsil ?? null,
      }));

    const finalReport = {
      ...report,
      backupJsonPath,
      backupCsvPath,
      reportPath,
      appliedCount: changes.length,
      verificationFailureCount: verificationFailures.length,
      verificationFailures,
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
