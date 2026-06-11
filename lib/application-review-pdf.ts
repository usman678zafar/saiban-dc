import fs from 'fs';
import path from 'path';
import serverlessChromium from '@sparticuz/chromium';
import { chromium, type Browser, type LaunchOptions } from 'playwright-core';
import { applicationToWizardData } from '@/lib/application-wizard-data';
import { applicationStatusLabel } from '@/lib/application-workflow';
import {
  buildApplicationReview,
  type ApplicationReviewItem,
  type ApplicationReviewStep,
} from '@/lib/application-review';

type ReviewPdfApplication = {
  id: string;
  registrationNumber: string | null;
  childName: string | null;
  collectorProject: string | null;
  status: string;
  documents: { documentType: string }[];
} & Record<string, unknown>;

const pageMargin = 42;
const rtlPattern = /[\u0600-\u06ff\u0750-\u077f\u08a0-\u08ff\ufb50-\ufdff\ufe70-\ufeff]/;
const longExpandedLabels = new Set(['Siblings', 'Relatives', 'Household Assets']);

let browserPromise: Promise<Browser> | null = null;

async function launchBrowser() {
  const fontArgs = ['--font-render-hinting=medium'];

  if (process.env.VERCEL) {
    return chromium.launch({
      args: [...serverlessChromium.args, ...fontArgs],
      executablePath: await serverlessChromium.executablePath(),
      headless: true,
    });
  }

  const localOptions: LaunchOptions = {
    args: ['--no-sandbox', '--disable-dev-shm-usage', ...fontArgs],
    headless: true,
  };
  const localExecutablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;

  if (localExecutablePath) {
    localOptions.executablePath = localExecutablePath;
  } else {
    localOptions.channel = process.env.PLAYWRIGHT_CHANNEL ?? 'chrome';
  }

  return chromium.launch(localOptions);
}

function getBrowser() {
  if (!browserPromise) {
    browserPromise = launchBrowser();
  }

  return browserPromise;
}

function assetPath(...parts: string[]) {
  return path.join(process.cwd(), ...parts);
}

function existingAsset(...parts: string[]) {
  const filePath = assetPath(...parts);
  return fs.existsSync(filePath) ? filePath : null;
}

function readRequiredFont() {
  const fontPath = existingAsset('public', 'fonts', 'NotoNastaliqUrdu-Regular.ttf');
  if (!fontPath) {
    throw new Error('Missing PDF Urdu font: public/fonts/NotoNastaliqUrdu-Regular.ttf');
  }

  return `data:font/ttf;base64,${fs.readFileSync(fontPath).toString('base64')}`;
}

function escapeHtml(value: unknown) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isRtlText(value: string) {
  return rtlPattern.test(value);
}

function isExpandedItem(item: ApplicationReviewItem) {
  return item.value.includes('\n') || item.value.length > 180 || longExpandedLabels.has(item.label);
}

function itemClasses(item: ApplicationReviewItem) {
  const classes = ['field-card'];
  if (!item.filled) classes.push('missing');
  if (isExpandedItem(item)) classes.push('expanded');
  if (item.value.length > 420 || item.value.split('\n').length > 9) classes.push('long');
  return classes.join(' ');
}

function valueAttributes(value: string) {
  if (!isRtlText(value)) return 'dir="auto"';
  return 'dir="rtl" lang="ur"';
}

function valueClasses(value: string) {
  return isRtlText(value) ? 'value rtl' : 'value';
}

function repeatedRecordPrefix(value: string) {
  if (/^Sibling \d+/m.test(value)) return 'Sibling';
  if (/^Relative \d+/m.test(value)) return 'Relative';
  return null;
}

function renderStructuredRecords(value: string) {
  const prefix = repeatedRecordPrefix(value);
  if (!prefix) return null;

  const records = value
    .split(/\n{2,}/)
    .map((record) => record.split('\n').map((line) => line.trim()).filter(Boolean))
    .filter((lines) => lines[0]?.startsWith(prefix));

  if (!records.length) return null;

  return `
    <div class="record-list">
      ${records.map(([title, ...rows]) => `
        <div class="record-block">
          <div class="record-title">${escapeHtml(title)}</div>
          <div class="record-grid">
            ${rows.map((row) => {
              const separator = row.indexOf(':');
              if (separator < 0) return `<div class="record-row full">${escapeHtml(row)}</div>`;
              const label = row.slice(0, separator);
              const recordValue = row.slice(separator + 1).trim();
              return `
                <div class="record-row">
                  <span>${escapeHtml(label)}</span>
                  <strong ${valueAttributes(recordValue)}>${escapeHtml(recordValue)}</strong>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderValue(value: string) {
  const structuredRecords = renderStructuredRecords(value);
  if (structuredRecords) return structuredRecords;

  return `<div class="${valueClasses(value)}" ${valueAttributes(value)}>${escapeHtml(value)}</div>`;
}

function renderItem(item: ApplicationReviewItem) {
  return `
    <article class="${itemClasses(item)}">
      <div class="field-head">
        <span class="label">${escapeHtml(item.label)}</span>
        ${item.filled ? '' : '<span class="missing-badge">Missing</span>'}
      </div>
      ${renderValue(item.value)}
    </article>
  `;
}

function renderSection(section: ApplicationReviewStep['sections'][number]) {
  return `
    <section class="review-section">
      <h3>${escapeHtml(section.title)}</h3>
      <div class="review-grid">
        ${section.items.map(renderItem).join('')}
      </div>
    </section>
  `;
}

function renderStep(step: ApplicationReviewStep) {
  return `
    <section class="review-step">
      <h2>${escapeHtml(step.number ? `Step ${step.number}: ${step.title}` : step.title)}</h2>
      ${step.sections.map(renderSection).join('')}
    </section>
  `;
}

function renderHeader(application: ReviewPdfApplication) {
  const registration = application.registrationNumber ?? application.id;

  return `
    <div style="box-sizing:border-box;width:100%;height:78px;padding:26px ${pageMargin}px 0;font-family:Arial,sans-serif;color:#0f172a;">
      <div style="text-align:center;padding-top:2px;">
        <div style="font-size:14px;font-weight:700;line-height:1.35;">Application Review</div>
        <div style="margin-top:3px;font-size:9px;color:#64748b;">${escapeHtml(registration)}</div>
      </div>
    </div>
  `;
}

function renderFooter() {
  return `
    <div style="box-sizing:border-box;width:100%;height:46px;padding:0 ${pageMargin}px;font-family:Arial,sans-serif;color:#64748b;font-size:8px;">
      <div style="border-top:1px solid #e2e8f0;padding-top:10px;text-align:right;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>
    </div>
  `;
}

function buildStyles(fontDataUri: string) {
  return `
    @font-face {
      font-family: 'SaibanPdfNastaliq';
      src: url('${fontDataUri}') format('truetype');
      font-weight: 400;
      font-style: normal;
      font-display: block;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #0f172a;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      line-height: 1.45;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .document {
      padding: 0 ${pageMargin}px 6px;
    }

    .summary {
      break-inside: avoid;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
      padding: 14px;
      margin: 0 0 18px;
    }

    .summary-title {
      margin: 0 0 8px;
      font-size: 17px;
      line-height: 1.8;
      font-weight: 700;
    }

    .summary-title.rtl {
      direction: rtl;
      text-align: right;
      font-family: 'SaibanPdfNastaliq', 'Noto Nastaliq Urdu', serif;
      font-size: 19px;
      font-weight: 400;
      unicode-bidi: plaintext;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 18px;
      color: #334155;
      font-size: 9px;
    }

    .metric {
      display: flex;
      gap: 5px;
      min-width: 0;
    }

    .metric span:first-child {
      color: #64748b;
      font-weight: 700;
    }

    .review-step {
      break-before: auto;
      margin: 0 0 16px;
    }

    .review-step h2 {
      break-after: avoid;
      margin: 0 0 9px;
      font-size: 15px;
      line-height: 1.35;
    }

    .review-section {
      margin: 0 0 13px;
    }

    .review-section h3 {
      break-after: avoid;
      margin: 0 0 7px;
      color: #64748b;
      font-size: 9px;
      line-height: 1.35;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .review-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .field-card {
      break-inside: avoid;
      min-height: 54px;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #f8fafc;
      padding: 12px 10px 10px;
      overflow-wrap: anywhere;
    }

    .field-card.expanded {
      grid-column: 1 / -1;
    }

    .field-card.long {
      break-inside: auto;
    }

    .field-card.missing {
      border-color: #fde68a;
      background: #fffbeb;
    }

    .field-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 8px;
    }

    .label {
      color: #64748b;
      font-size: 8.5px;
      font-weight: 700;
      line-height: 1.25;
    }

    .missing-badge {
      flex: 0 0 auto;
      color: #b45309;
      font-size: 7px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .value {
      color: #0f172a;
      font-size: 9.6px;
      line-height: 1.6;
      white-space: pre-wrap;
      unicode-bidi: plaintext;
    }

    .record-list {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 8px;
    }

    .record-block {
      break-inside: avoid;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      background: #ffffff;
      padding: 8px;
    }

    .record-title {
      margin-bottom: 6px;
      color: #0f172a;
      font-size: 9px;
      font-weight: 700;
      line-height: 1.25;
    }

    .record-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 5px 10px;
    }

    .record-row {
      min-width: 0;
      color: #0f172a;
      font-size: 8.6px;
      line-height: 1.35;
    }

    .record-row.full {
      grid-column: 1 / -1;
    }

    .record-row span {
      display: block;
      color: #64748b;
      font-size: 7.4px;
      font-weight: 700;
      line-height: 1.2;
    }

    .record-row strong {
      display: block;
      margin-top: 1px;
      font-weight: 600;
      overflow-wrap: anywhere;
    }

    .value.rtl {
      direction: rtl;
      text-align: right;
      font-family: 'SaibanPdfNastaliq', 'Noto Nastaliq Urdu', 'Segoe UI', serif;
      font-size: 12.5px;
      line-height: 2.05;
      word-break: normal;
      overflow-wrap: anywhere;
      text-rendering: optimizeLegibility;
    }

    .field-card.long .value {
      font-size: 8.8px;
      line-height: 1.38;
    }

    .field-card.long .value.rtl {
      font-size: 11.6px;
      line-height: 1.95;
    }

  `;
}

function buildHtml(application: ReviewPdfApplication) {
  const wizardData = applicationToWizardData(application);
  const reviewSteps = buildApplicationReview(wizardData, application.documents);
  const fontDataUri = readRequiredFont();
  const childName = application.childName ?? 'No child name';
  const childNameRtl = isRtlText(childName);
  const registration = application.registrationNumber ?? application.id;
  const generatedAt = new Intl.DateTimeFormat('en-PK', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Karachi',
  }).format(new Date());
  const summaryItems = [
    ['Application', registration],
    ['Status', applicationStatusLabel(application.status)],
    ['Department', application.collectorProject ?? '-'],
    ['Generated', generatedAt],
  ];

  return `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Application Review - ${escapeHtml(registration)}</title>
        <style>${buildStyles(fontDataUri)}</style>
      </head>
      <body>
        <main class="document">
          <section class="summary">
            <h1 class="summary-title${childNameRtl ? ' rtl' : ''}" ${childNameRtl ? 'dir="rtl" lang="ur"' : ''}>${escapeHtml(childName)}</h1>
            <div class="summary-grid">
              ${summaryItems.map(([label, value]) => `
                <div class="metric">
                  <span>${escapeHtml(label)}:</span>
                  <strong>${escapeHtml(value)}</strong>
                </div>
              `).join('')}
            </div>
          </section>
          ${reviewSteps.map(renderStep).join('')}
        </main>
      </body>
    </html>
  `;
}

export async function buildApplicationReviewPdf(application: ReviewPdfApplication) {
  const browser = await getBrowser();
  const page = await browser.newPage({
    viewport: { width: 794, height: 1123 },
    deviceScaleFactor: 1,
  });

  try {
    await page.setContent(buildHtml(application), { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await page.emulateMedia({ media: 'print' });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: renderHeader(application),
      footerTemplate: renderFooter(),
      margin: {
        top: '86px',
        right: '0px',
        bottom: '54px',
        left: '0px',
      },
    });
  } finally {
    await page.close();
  }
}
