import fs from 'fs';
import path from 'path';
import PDFDocument from 'pdfkit';
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { applicationToWizardData } from '@/lib/application-wizard-data';
import { applicationStatusLabel } from '@/lib/application-workflow';
import { buildApplicationReview, calculateApplicationCompletion, type ApplicationReviewItem, type ApplicationReviewStep } from '@/lib/application-review';

export const runtime = 'nodejs';

interface ApplicationReviewRouteProps {
  params: {
    id: string;
  };
}

type PdfApplication = NonNullable<Awaited<ReturnType<typeof getApplication>>>;

const pageMargin = 42;
const headerHeight = 92;
const footerHeight = 34;
const border = '#dbe4ef';
const text = '#0f172a';
const muted = '#64748b';

async function getApplication(id: string) {
  return prisma.orphanApplication.findUnique({
    where: { id },
    include: {
      siblings: true,
      relatives: true,
      householdAssets: true,
      documents: {
        select: {
          documentType: true,
        },
      },
    },
  });
}

function filenamePart(value: string) {
  return value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'application';
}

function loadAsset(...parts: string[]) {
  const assetPath = path.join(process.cwd(), ...parts);
  return fs.existsSync(assetPath) ? assetPath : null;
}

function collectPdfBuffer(doc: PDFKit.PDFDocument) {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));
  });
}

function hasUnicodeText(value: string) {
  return /[^\x00-\x7F]/.test(value);
}

function useValueFont(doc: PDFKit.PDFDocument, value: string) {
  const hasUnicodeFont = Boolean((doc as PDFKit.PDFDocument & { hasUnicodeFont?: boolean }).hasUnicodeFont);
  doc.font(hasUnicodeFont && hasUnicodeText(value) ? 'unicode' : 'regular');
}

function isExpandedPdfItem(item: ApplicationReviewItem) {
  return item.value.includes('\n') || item.value.length > 180 || ['Siblings', 'Relatives', 'Household Assets'].includes(item.label);
}

function valueTextStyle(item: ApplicationReviewItem) {
  const longValue = item.value.length > 320 || item.value.split('\n').length > 7;
  return {
    fontSize: longValue ? 8.6 : 9.6,
    lineGap: longValue ? 1 : 1.5,
  };
}

function addHeader(doc: PDFKit.PDFDocument, application: PdfApplication, logos: { saiban: string | null; bwt: string | null }) {
  const top = 24;
  const contentWidth = doc.page.width - pageMargin * 2;

  if (logos.saiban) {
    doc.image(logos.saiban, pageMargin, top, { fit: [92, 45] });
  }
  if (logos.bwt) {
    doc.image(logos.bwt, doc.page.width - pageMargin - 76, top, { fit: [76, 45] });
  }

  doc
    .font('heading')
    .fontSize(14)
    .fillColor(text)
    .text('Application Review', pageMargin + 105, top + 2, { width: contentWidth - 200, align: 'center' });

  doc
    .font('regular')
    .fontSize(9)
    .fillColor(muted)
    .text(application.registrationNumber ?? application.id, pageMargin + 105, top + 22, { width: contentWidth - 200, align: 'center' });

  doc
    .moveTo(pageMargin, headerHeight - 12)
    .lineTo(doc.page.width - pageMargin, headerHeight - 12)
    .strokeColor(border)
    .lineWidth(1)
    .stroke();

  doc.x = pageMargin;
  doc.y = headerHeight;
}

function addFooter(doc: PDFKit.PDFDocument) {
  const y = doc.page.height - footerHeight;
  doc
    .moveTo(pageMargin, y)
    .lineTo(doc.page.width - pageMargin, y)
    .strokeColor('#e2e8f0')
    .lineWidth(1)
    .stroke();
  doc
    .font('regular')
    .fontSize(8)
    .fillColor(muted)
    .text(`Page ${doc.bufferedPageRange().count}`, pageMargin, y + 10, {
      width: doc.page.width - pageMargin * 2,
      align: 'right',
    });
}

function ensureSpace(doc: PDFKit.PDFDocument, neededHeight: number, application: PdfApplication, logos: { saiban: string | null; bwt: string | null }) {
  if (doc.y + neededHeight <= doc.page.height - pageMargin - footerHeight) return;
  addFooter(doc);
  doc.addPage();
  addHeader(doc, application, logos);
}

function drawFieldCard(doc: PDFKit.PDFDocument, item: ApplicationReviewItem, x: number, y: number, width: number, height: number) {
  doc
    .roundedRect(x, y, width, height, 6)
    .fillAndStroke(item.filled ? '#f8fafc' : '#fffbeb', item.filled ? '#e2e8f0' : '#fde68a');

  doc
    .font('heading')
    .fontSize(8.5)
    .fillColor(muted)
    .text(item.label, x + 10, y + 9, { width: width - 20 });

  if (!item.filled) {
    doc
      .font('heading')
      .fontSize(7)
      .fillColor('#b45309')
      .text('Missing', x + 10, y + 9, { width: width - 20, align: 'right' });
  }

  const style = valueTextStyle(item);
  useValueFont(doc, item.value);
  doc
    .fontSize(style.fontSize)
    .fillColor(text)
    .text(item.value, x + 10, y + 27, {
      width: width - 20,
      lineGap: style.lineGap,
    });
}

function itemHeight(doc: PDFKit.PDFDocument, item: ApplicationReviewItem, width: number) {
  const style = valueTextStyle(item);
  useValueFont(doc, item.value);
  const valueHeight = doc
    .fontSize(style.fontSize)
    .heightOfString(item.value, { width: width - 20, lineGap: style.lineGap });
  return Math.max(54, valueHeight + 38);
}

function drawItemGrid(doc: PDFKit.PDFDocument, items: ApplicationReviewItem[], application: PdfApplication, logos: { saiban: string | null; bwt: string | null }) {
  const gap = 8;
  const contentWidth = doc.page.width - pageMargin * 2;
  const columnWidth = (contentWidth - gap) / 2;

  for (let index = 0; index < items.length;) {
    const left = items[index];
    if (isExpandedPdfItem(left)) {
      const height = itemHeight(doc, left, contentWidth);
      ensureSpace(doc, height + 8, application, logos);
      const rowY = doc.y;
      drawFieldCard(doc, left, pageMargin, rowY, contentWidth, height);
      doc.y = rowY + height + gap;
      index += 1;
      continue;
    }

    const right = items[index + 1];
    if (right && isExpandedPdfItem(right)) {
      const leftHeight = itemHeight(doc, left, columnWidth);
      ensureSpace(doc, leftHeight + 8, application, logos);
      const rowY = doc.y;
      drawFieldCard(doc, left, pageMargin, rowY, columnWidth, leftHeight);
      doc.y = rowY + leftHeight + gap;
      index += 1;
      continue;
    }

    const leftHeight = itemHeight(doc, left, columnWidth);
    const rightHeight = right ? itemHeight(doc, right, columnWidth) : 0;
    const rowHeight = Math.max(leftHeight, rightHeight);

    ensureSpace(doc, rowHeight + 8, application, logos);
    const rowY = doc.y;
    drawFieldCard(doc, left, pageMargin, rowY, columnWidth, rowHeight);
    if (right) drawFieldCard(doc, right, pageMargin + columnWidth + gap, rowY, columnWidth, rowHeight);
    doc.y = rowY + rowHeight + gap;
    index += 2;
  }
}

function drawStep(doc: PDFKit.PDFDocument, step: ApplicationReviewStep, application: PdfApplication, logos: { saiban: string | null; bwt: string | null }) {
  ensureSpace(doc, 58, application, logos);

  doc
    .font('heading')
    .fontSize(15)
    .fillColor(text)
    .text(step.number ? `Step ${step.number}: ${step.title}` : step.title, pageMargin, doc.y, {
      width: doc.page.width - pageMargin * 2,
    });

  doc.moveDown(0.7);

  step.sections.forEach((section) => {
    ensureSpace(doc, 42, application, logos);
    doc
      .font('heading')
      .fontSize(9)
      .fillColor(muted)
      .text(section.title.toUpperCase(), pageMargin, doc.y, {
        characterSpacing: 1.1,
        width: doc.page.width - pageMargin * 2,
      });
    doc.moveDown(0.4);
    drawItemGrid(doc, section.items, application, logos);
    doc.moveDown(0.4);
  });

  doc.moveDown(0.4);
}

function drawSummary(doc: PDFKit.PDFDocument, application: PdfApplication, completion: ReturnType<typeof calculateApplicationCompletion>, logos: { saiban: string | null; bwt: string | null }) {
  ensureSpace(doc, 92, application, logos);
  const width = doc.page.width - pageMargin * 2;
  const y = doc.y;

  doc.roundedRect(pageMargin, y, width, 78, 8).fillAndStroke('#eff6ff', '#bfdbfe');
  useValueFont(doc, application.childName ?? 'No child name');
  doc
    .fontSize(16)
    .fillColor(text)
    .text(application.childName ?? 'No child name', pageMargin + 14, y + 12, { width: width - 28 });

  const summary = [
    `Application: ${application.registrationNumber ?? application.id}`,
    `Status: ${applicationStatusLabel(application.status)}`,
    `Department: ${application.collectorProject ?? '-'}`,
    `Completion: ${completion.percentage}% (${completion.complete}/${completion.total})`,
  ];

  doc
    .font('regular')
    .fontSize(9)
    .fillColor('#334155')
    .text(summary.join('\n'), pageMargin + 14, y + 34, {
      width: width - 28,
      columns: 2,
      columnGap: 18,
      lineGap: 2,
    });

  doc.y = y + 92;
}

function buildReviewPdf(application: PdfApplication) {
  const wizardData = applicationToWizardData(application);
  const reviewSteps = buildApplicationReview(wizardData, application.documents);
  const completion = calculateApplicationCompletion(wizardData, application.documents);
  const logos = {
    saiban: loadAsset('assests', 'logo.png'),
    bwt: loadAsset('assests', 'BWT Logo-02.png'),
  };
  const unicodeFont = loadAsset('public', 'fonts', 'Jameel-Noori-Nastaleeq.woff');

  const doc = new PDFDocument({
    size: 'A4',
    margins: {
      top: headerHeight,
      left: pageMargin,
      right: pageMargin,
      bottom: pageMargin + footerHeight,
    },
    bufferPages: true,
    autoFirstPage: false,
    info: {
      Title: `Application Review - ${application.registrationNumber ?? application.id}`,
      Author: 'Saiban Data Collection System',
    },
  });

  doc.registerFont('heading', 'Helvetica-Bold');
  doc.registerFont('regular', 'Helvetica');
  if (unicodeFont) {
    doc.registerFont('unicode', unicodeFont);
    (doc as PDFKit.PDFDocument & { hasUnicodeFont?: boolean }).hasUnicodeFont = true;
  }

  doc.addPage();
  addHeader(doc, application, logos);
  drawSummary(doc, application, completion, logos);
  reviewSteps.forEach((step) => drawStep(doc, step, application, logos));
  addFooter(doc);

  doc.end();
  return collectPdfBuffer(doc);
}

export async function GET(_request: Request, { params }: ApplicationReviewRouteProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }
  if (!['admin', 'super_admin'].includes(session.user.role ?? '')) {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }

  const application = await getApplication(params.id);
  if (!application) {
    return NextResponse.json({ message: 'Application not found' }, { status: 404 });
  }

  const pdf = await buildReviewPdf(application);
  const title = application.registrationNumber ?? application.id;

  return new NextResponse(pdf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="application-review-${filenamePart(title)}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
