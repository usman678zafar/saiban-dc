import 'dotenv/config';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const BUILT_IN_PROJECTS = ['Link Road', 'Talagang', 'Makatib', 'Volunteer', 'Self Registered'];

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const fileArgIndex = args.indexOf('--file');
const workbookPath = path.resolve(
  fileArgIndex >= 0 && args[fileArgIndex + 1]
    ? args[fileArgIndex + 1]
    : 'final.xlsx',
);

function digitsOnly(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function normalizePakistanMobile(value) {
  let digits = digitsOnly(value).slice(0, 14);
  if (digits.startsWith('0092') && digits.length === 14) return `0${digits.slice(4)}`;
  if (digits.startsWith('92') && digits.length === 12) return `0${digits.slice(2)}`;
  if (digits.startsWith('3') && digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

function formatCnic(value) {
  const digits = digitsOnly(value).slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return `${digits.slice(0, 5)}-${digits.slice(5, 12)}-${digits.slice(12)}`;
}

function cnicVariants(value) {
  const digits = digitsOnly(value);
  return digits ? [digits, formatCnic(digits)] : [];
}

function normalizeText(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

function matchKey(name, project) {
  return `${normalizeText(name).toLocaleLowerCase()}|${normalizeText(project).toLocaleLowerCase()}`;
}

function readWorkbookRows(filePath) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (rows.length === 0) {
    throw new Error('Workbook is empty.');
  }

  return {
    sheetName,
    rows: rows.slice(1).map((row, index) => {
      const [cnicRaw, projectRaw, supervisorRaw, phoneRaw, addressRaw, nameRaw] = row;
      return {
        rowNumber: index + 2,
        name: normalizeText(nameRaw),
        phoneNumber: normalizePakistanMobile(phoneRaw),
        cnic: formatCnic(cnicRaw),
        address: normalizeText(addressRaw),
        project: normalizeText(projectRaw),
        supervisorName: normalizeText(supervisorRaw),
      };
    }),
  };
}

async function generateNextFieldWorkerIds(prisma, count) {
  const existingIds = await prisma.user.findMany({
    where: {
      role: 'field_worker',
      fieldWorkerId: { startsWith: 'FW-' },
    },
    select: { fieldWorkerId: true },
  });

  const used = new Set(existingIds.map((item) => item.fieldWorkerId).filter(Boolean));
  let nextNumber = existingIds.reduce((highest, item) => {
    const value = Number(item.fieldWorkerId?.replace('FW-', '') ?? '0');
    return Number.isFinite(value) ? Math.max(highest, value) : highest;
  }, 0);

  const ids = [];
  while (ids.length < count) {
    nextNumber += 1;
    const nextId = `FW-${String(nextNumber).padStart(6, '0')}`;
    if (!used.has(nextId)) {
      used.add(nextId);
      ids.push(nextId);
    }
  }

  return ids;
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is missing.');
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const { sheetName, rows } = readWorkbookRows(workbookPath);
    const customProjects = await prisma.projectOption.findMany({ select: { name: true } });
    const allowedProjects = new Set([...BUILT_IN_PROJECTS, ...customProjects.map((project) => project.name)]);
    const supervisors = await prisma.user.findMany({
      where: { role: 'supervisor' },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        project: true,
        supervisorDepartments: {
          select: { project: true },
        },
      },
    });
    const supervisorByKey = new Map();
    const duplicateSupervisorKeys = new Set();

    for (const supervisor of supervisors) {
      const projects = supervisor.supervisorDepartments.length
        ? supervisor.supervisorDepartments.map((department) => department.project)
        : supervisor.project ? [supervisor.project] : [];
      for (const project of projects) {
        const key = matchKey(supervisor.name, project);
        if (supervisorByKey.has(key)) duplicateSupervisorKeys.add(key);
        supervisorByKey.set(key, supervisor);
      }
    }

    const phoneRows = new Map();
    const cnicRows = new Map();
    for (const row of rows) {
      if (row.phoneNumber) {
        phoneRows.set(row.phoneNumber, [...(phoneRows.get(row.phoneNumber) ?? []), row.rowNumber]);
      }
      if (digitsOnly(row.cnic)) {
        cnicRows.set(digitsOnly(row.cnic), [...(cnicRows.get(digitsOnly(row.cnic)) ?? []), row.rowNumber]);
      }
    }

    const existingUsers = await prisma.user.findMany({
      where: {
        OR: [
          ...[...phoneRows.keys()].map((phoneNumber) => ({ phoneNumber })),
          ...[...cnicRows.keys()].flatMap((cnic) => [
            { cnic },
            { cnic: formatCnic(cnic) },
            { email: `${formatCnic(cnic)}@field.saiban.local` },
          ]),
        ],
      },
      select: { phoneNumber: true, cnic: true, email: true },
    });

    const existingPhones = new Set(existingUsers.map((user) => user.phoneNumber).filter(Boolean));
    const existingCnicValues = new Set(existingUsers.flatMap((user) => [
      ...cnicVariants(user.cnic ?? ''),
      ...cnicVariants(user.email?.replace('@field.saiban.local', '') ?? ''),
    ]));

    const validRows = [];
    const skippedRows = [];

    for (const row of rows) {
      const issues = [];
      const cnicDigits = digitsOnly(row.cnic);
      const supervisorKey = matchKey(row.supervisorName, row.project);

      if (!row.name) issues.push('missing name');
      if (!row.project) issues.push('missing department');
      if (row.project && !allowedProjects.has(row.project)) issues.push(`unknown department: ${row.project}`);
      if (!row.supervisorName) issues.push('missing supervisor');
      if (!row.address) issues.push('missing address');
      if (!/^03\d{9}$/.test(row.phoneNumber)) issues.push(`invalid phone: ${row.phoneNumber || 'blank'}`);
      if (!/^\d{5}-\d{7}-\d$/.test(row.cnic)) issues.push(`invalid/missing CNIC: ${row.cnic || 'blank'}`);
      if (phoneRows.get(row.phoneNumber)?.length > 1) issues.push(`duplicate phone in workbook: ${row.phoneNumber}`);
      if (cnicRows.get(cnicDigits)?.length > 1) issues.push(`duplicate CNIC in workbook: ${row.cnic}`);
      if (existingPhones.has(row.phoneNumber)) issues.push(`phone already exists in database: ${row.phoneNumber}`);
      if (cnicVariants(row.cnic).some((variant) => existingCnicValues.has(variant))) issues.push(`CNIC already exists in database: ${row.cnic}`);
      if (duplicateSupervisorKeys.has(supervisorKey)) issues.push(`multiple matching supervisors for ${row.supervisorName} / ${row.project}`);

      const supervisor = supervisorByKey.get(supervisorKey);
      if (!supervisor) {
        issues.push(`supervisor not found in department: ${row.supervisorName} / ${row.project}`);
      }

      if (issues.length > 0) {
        skippedRows.push({ rowNumber: row.rowNumber, name: row.name, issues });
      } else {
        validRows.push({ ...row, supervisorId: supervisor.id });
      }
    }

    const report = {
      mode: apply ? 'apply' : 'dry-run',
      file: workbookPath,
      sheetName,
      totalRows: rows.length,
      readyToImport: validRows.length,
      skipped: skippedRows.length,
      skippedRows,
    };

    if (!apply) {
      console.log(JSON.stringify(report, null, 2));
      console.log('\nDry run only. Run again with --apply to create the ready rows.');
      return;
    }

    const fieldWorkerIds = await generateNextFieldWorkerIds(prisma, validRows.length);
    const created = [];

    for (let index = 0; index < validRows.length; index += 1) {
      const row = validRows[index];
      const password = row.phoneNumber.slice(-4);
      const passwordHash = await bcrypt.hash(password, 10);
      const createdUser = await prisma.user.create({
        data: {
          name: row.name,
          email: `${row.cnic}@field.saiban.local`,
          phoneNumber: row.phoneNumber,
          cnic: row.cnic,
          fieldWorkerId: fieldWorkerIds[index],
          address: row.address,
          reference: 'Bulk import from final.xlsx',
          project: row.project,
          supervisorId: row.supervisorId,
          passwordHash,
          role: 'field_worker',
        },
        select: {
          fieldWorkerId: true,
          name: true,
          phoneNumber: true,
          cnic: true,
          project: true,
        },
      });
      created.push(createdUser);
    }

    console.log(JSON.stringify({ ...report, created: created.length, createdUsers: created }, null, 2));
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
