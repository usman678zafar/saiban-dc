import logo from '@/assests/logo.png';
import baitussalamLogo from '@/assests/baitussalam.webp';

export type AttestationFormData = {
  applicationId?: string | null;
  registrationNumber?: string;
  childName?: string;
  fatherName?: string;
  schoolName?: string;
  bFormNumber?: string;
  guardianName?: string;
  motherName?: string;
  guardianContact?: string;
  motherContact?: string;
  collectorId?: string;
  collectorName?: string;
  collectorContact?: string;
};

function escapePrintValue(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function printValue(value?: string | null) {
  return escapePrintValue(value?.trim() || '________________');
}

function drawRtlText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = '';
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, y);
      line = word;
      y += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) context.fillText(line, x, y);
  return y + lineHeight;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export function buildAttestationHtml(data: AttestationFormData) {
  return `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8" /><title>Attestation Confirmation</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}body{margin:0;background:white;color:#111827;font-family:"Noto Nastaliq Urdu","Jameel Noori Nastaleeq","Segoe UI",Arial,sans-serif}.page{min-height:273mm;border:2px solid #111827;padding:10mm 11mm;page-break-after:always}.page:last-child{page-break-after:auto}.header{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:12px;margin-bottom:7mm}.brand{direction:ltr;text-align:left}.brand img{width:35mm;height:auto}.mark{text-align:right}.mark img{width:25mm;height:auto}.title{text-align:center}.title h1{margin:0;font-size:30px}.title p{margin:4px 0;font-size:13px}h2{width:fit-content;margin:7mm auto 5mm;padding:4px 18px;font-size:20px}h3{width:fit-content;margin:8mm auto 4mm;padding-bottom:2px;font-size:19px}p,li{font-size:14px;line-height:2.15}.line{display:inline-block;min-width:90px;border-bottom:1px dotted #111827;padding:0 8px;direction:ltr;text-align:center}.wide{min-width:190px}.worker{border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:2mm 0 6mm;padding:3mm 0}.worker h3{margin:0 auto 3mm}.worker-grid{display:grid;grid-template-columns:1fr 1fr;gap:2mm 8mm;font-size:13px;line-height:2}.check-row{display:grid;grid-template-columns:18px 1fr;gap:8px;align-items:start;margin:3mm 0;font-size:14px;line-height:2}.box{width:15px;height:15px;border:1px solid #6b7280;margin-top:7px}.signature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8mm;margin-top:8mm}.sig-line{border-bottom:1px dotted #111827;min-height:8mm}.label{margin-top:2mm;font-size:13px}ol{margin:0;padding-right:20px}.guardian{margin-top:8mm;font-weight:700}.print-actions{direction:ltr;position:fixed;left:16px;top:16px;display:flex;gap:8px;z-index:10}.print-actions button{border:0;border-radius:8px;padding:10px 14px;color:white;background:#2563eb;font:600 14px Arial,sans-serif;cursor:pointer}@media print{.print-actions{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body>
    <div class="print-actions"><button onclick="window.print()">Print / Save PDF</button></div>
    <section class="page">
      <header class="header"><div class="brand"><img src="${logo.src}" alt="Saiban" /></div><div class="title"><h1>بیت السلام کا سائبان</h1><p>یتیم بچوں کی کفالت - تعلیمی ادارہ</p></div><div class="mark"><img src="${baitussalamLogo.src}" alt="Baitussalam" /></div></header>
      <section class="worker">
        <h3>فیلڈ ورکر کی تفصیلات</h3>
        <div class="worker-grid">
          <div>نام: <span class="line wide">${printValue(data.collectorName)}</span></div>
          <div>آئی ڈی: <span class="line wide">${printValue(data.collectorId)}</span></div>
          <div>رابطہ: <span class="line wide">${printValue(data.collectorContact)}</span></div>
        </div>
      </section>
      <h2>تعلیمی ادارے کے پرنسپل / ناظم اعلیٰ کی تصدیق</h2>
      <p>تصدیق کی جاتی ہے کہ <span class="line wide">${printValue(data.childName)}</span> ولد / بنت <span class="line wide">${printValue(data.fatherName)}</span> ہمارے ادارہ <span class="line wide">${printValue(data.schoolName)}</span> میں زیر تعلیم ہے۔ طالب علم کا بی فارم نمبر <span class="line wide">${printValue(data.bFormNumber)}</span> ہے۔ ادارے کی معلومات کے مطابق یہ بچہ مستحق امداد ہے۔</p>
      <p>دستخط: <span class="line wide"></span> مہر: <span class="line wide"></span> تاریخ: <span class="line"></span></p>
      <h2>امام مسجد کی تصدیق</h2>
      <p>میں درخواست کنندہ کے حالات سے واقف ہوں، امام مسجد تصدیق کرتا ہوں کہ یہ خاندان محلے کے مستحق خاندانوں میں شامل ہے۔</p>
      <div class="check-row"><span class="box"></span><span>صاحب نصاب نہیں ہیں اور زکوٰۃ وصول کرنے کے اہل ہیں۔</span></div>
      <div class="check-row"><span class="box"></span><span>صاحب نصاب ہیں اور زکوٰۃ وصول کرنے کے اہل نہیں ہیں۔</span></div>
      <div class="check-row"><span class="box"></span><span>خاندان کی مالی حالت مدد کی متقاضی ہے۔</span></div>
      <div class="signature-grid"><div><div class="sig-line"></div><div class="label">تصدیق کنندہ امام صاحب کا نام</div></div><div><div class="sig-line"></div><div class="label">مسجد / محلہ</div></div><div><div class="sig-line"></div><div class="label">موبائل نمبر</div></div><div><div class="sig-line"></div><div class="label">دستخط / مہر</div></div></div>
    </section>
    <section class="page">
      <header class="header"><div class="brand"><img src="${logo.src}" alt="Saiban" /></div><div class="title"><h1>بیت السلام کا سائبان</h1><p>یتیم بچوں کی کفالت - تعلیمی ادارہ</p></div><div class="mark"><img src="${baitussalamLogo.src}" alt="Baitussalam" /></div></header>
      <h3>اصول و ضوابط</h3>
      <ol><li>بیت السلام سائبان پروگرام کے تحت گھر کا دورہ ضروری ہوگا اور درست معلومات فراہم کرنا لازم ہے۔</li><li>بچے کی عمر رجسٹریشن کے وقت 12 سال سے کم ہونی چاہیے۔</li><li>رجسٹریشن کے بعد بچے کی تعلیمی، دینی اور اخلاقی تربیت کی نگرانی کی جائے گی۔</li><li>تعلیمی ادارے میں حاضری، کارکردگی اور فیس/اخراجات کی معلومات وقتاً فوقتاً طلب کی جا سکتی ہیں۔</li><li>غلط، نامکمل یا گمراہ کن معلومات کی صورت میں درخواست مسترد یا امداد بند کی جا سکتی ہے۔</li><li>سرپرست بچے کی تعلیم، صحت، حفاظت اور بہتر تربیت کے لیے ادارے سے تعاون کرے گا۔</li><li>ادارے کو ضرورت کے مطابق گھر، اسکول، مسجد یا محلے سے تصدیق کرنے کا حق حاصل ہوگا۔</li><li>سرپرست بچے کے متعلق تبدیلی، بیماری، اسکول تبدیلی، رہائش تبدیلی یا مالی حالت کی تبدیلی سے آگاہ کرے گا۔</li><li>جمع شدہ معلومات صرف ادارے کے فلاحی اور انتظامی مقاصد کے لیے استعمال ہوں گی۔</li><li>ادارہ درخواست کی منظوری یا عدم منظوری کا حتمی اختیار رکھتا ہے۔</li></ol>
      <p class="guardian">میں تصدیق کرتا/کرتی ہوں کہ میں نے مندرجہ بالا تمام شرائط و ضوابط کو پڑھ/سن لیا ہے، سمجھ لیا ہے، اور ان پر عمل کرنے کا پابند ہوں۔</p>
      <div class="signature-grid"><div><div class="sig-line">${printValue(data.guardianName || data.motherName)}</div><div class="label">سرپرست / والدہ کا نام</div></div><div><div class="sig-line"></div><div class="label">سرپرست کے دستخط / انگوٹھا</div></div><div><div class="sig-line">${printValue(data.guardianContact || data.motherContact)}</div><div class="label">رابطہ نمبر</div></div><div><div class="sig-line"></div><div class="label">تاریخ</div></div></div>
    </section>
  </body></html>`;
}

async function renderAttestationPage(data: AttestationFormData, pageNumber: 1 | 2) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create PDF canvas.');

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#111827';
  context.lineWidth = 4;
  context.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

  try {
    const logoImage = await loadImage(logo.src);
    context.drawImage(logoImage, 75, 78, 180, 110);
  } catch {
    context.fillStyle = '#0f75bc';
    context.font = 'bold 48px Arial';
    context.textAlign = 'left';
    context.direction = 'ltr';
    context.fillText('Saiban', 75, 135);
  }

  try {
    const baitussalamImage = await loadImage(baitussalamLogo.src);
    context.drawImage(baitussalamImage, 1020, 75, 125, 125);
  } catch {
    context.fillStyle = '#334155';
    context.font = 'bold 28px Arial';
    context.textAlign = 'right';
    context.direction = 'ltr';
    context.fillText('BAITUSSALAM', 1145, 135);
  }

  context.fillStyle = '#111827';
  context.textAlign = 'center';
  context.direction = 'rtl';
  context.font = '42px "Segoe UI", Arial, sans-serif';
  context.fillText('بیت السلام کا سائبان', canvas.width / 2, 115);
  context.font = '22px "Segoe UI", Arial, sans-serif';
  context.fillText('یتیم بچوں کی کفالت - تعلیمی ادارہ', canvas.width / 2, 158);

  context.direction = 'rtl';
  context.textAlign = 'right';
  context.fillStyle = '#111827';

  if (pageNumber === 1) {
    context.font = 'bold 28px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('فیلڈ ورکر کی تفصیلات', canvas.width / 2, 245);
    context.font = '22px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'right';
    context.fillText(`نام: ${data.collectorName || '____________'}      آئی ڈی: ${data.collectorId || '____________'}`, 1110, 292);
    context.fillText(`رابطہ: ${data.collectorContact || '____________'}`, 1110, 335);

    context.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('تعلیمی ادارے کے پرنسپل / ناظم اعلیٰ کی تصدیق', canvas.width / 2, 425);
    context.font = '24px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'right';
    let y = 490;
    y = drawRtlText(context, `تصدیق کی جاتی ہے کہ ${data.childName || '____________'} ولد / بنت ${data.fatherName || '____________'} ہمارے ادارہ ${data.schoolName || '____________'} میں زیر تعلیم ہے۔ طالب علم کا بی فارم نمبر ${data.bFormNumber || '____________'} ہے۔ ادارے کی معلومات کے مطابق یہ بچہ مستحق امداد ہے۔`, 1110, y, 980, 46);
    y += 38;
    context.fillText('دستخط: ____________________      مہر: ____________________      تاریخ: ______________', 1110, y);
    y += 120;
    context.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText('امام مسجد کی تصدیق', canvas.width / 2, y);
    y += 72;
    context.font = '24px "Segoe UI", Arial, sans-serif';
    context.textAlign = 'right';
    y = drawRtlText(context, 'میں درخواست کنندہ کے حالات سے واقف ہوں، امام مسجد تصدیق کرتا ہوں کہ یہ خاندان محلے کے مستحق خاندانوں میں شامل ہے۔', 1110, y, 980, 46);
    ['صاحب نصاب نہیں ہیں اور زکوٰۃ وصول کرنے کے اہل ہیں۔', 'صاحب نصاب ہیں اور زکوٰۃ وصول کرنے کے اہل نہیں ہیں۔', 'خاندان کی مالی حالت مدد کی متقاضی ہے۔'].forEach((item) => {
      y += 56;
      context.strokeRect(1070, y - 26, 28, 28);
      context.fillText(item, 1048, y);
    });
    y += 100;
    context.fillText('تصدیق کنندہ امام صاحب کا نام: ____________________      مسجد / محلہ: ____________________', 1110, y);
    y += 62;
    context.fillText('موبائل نمبر: ____________________      دستخط / مہر: ____________________', 1110, y);
  } else {
    context.font = 'bold 30px "Segoe UI", Arial, sans-serif';
    context.fillText('اصول و ضوابط', 690, 290);
    context.font = '24px "Segoe UI", Arial, sans-serif';
    const rules = ['بیت السلام سائبان پروگرام کے تحت گھر کا دورہ ضروری ہوگا اور درست معلومات فراہم کرنا لازم ہے۔', 'بچے کی عمر رجسٹریشن کے وقت 12 سال سے کم ہونی چاہیے۔', 'رجسٹریشن کے بعد بچے کی تعلیمی، دینی اور اخلاقی تربیت کی نگرانی کی جائے گی۔', 'تعلیمی ادارے میں حاضری، کارکردگی اور فیس/اخراجات کی معلومات وقتاً فوقتاً طلب کی جا سکتی ہیں۔', 'غلط، نامکمل یا گمراہ کن معلومات کی صورت میں درخواست مسترد یا امداد بند کی جا سکتی ہے۔', 'سرپرست بچے کی تعلیم، صحت، حفاظت اور بہتر تربیت کے لیے ادارے سے تعاون کرے گا۔', 'ادارے کو ضرورت کے مطابق گھر، اسکول، مسجد یا محلے سے تصدیق کرنے کا حق حاصل ہوگا۔', 'سرپرست بچے کے متعلق تبدیلی، بیماری، اسکول تبدیلی، رہائش تبدیلی یا مالی حالت کی تبدیلی سے آگاہ کرے گا۔', 'جمع شدہ معلومات صرف ادارے کے فلاحی اور انتظامی مقاصد کے لیے استعمال ہوں گی۔', 'ادارہ درخواست کی منظوری یا عدم منظوری کا حتمی اختیار رکھتا ہے۔'];
    let y = 365;
    rules.forEach((rule, index) => {
      y = drawRtlText(context, `${index + 1}. ${rule}`, 1110, y, 980, 42);
      y += 8;
    });
    y += 50;
    context.font = 'bold 25px "Segoe UI", Arial, sans-serif';
    y = drawRtlText(context, 'میں تصدیق کرتا/کرتی ہوں کہ میں نے مندرجہ بالا تمام شرائط و ضوابط کو پڑھ/سن لیا ہے، سمجھ لیا ہے، اور ان پر عمل کرنے کا پابند ہوں۔', 1110, y, 980, 46);
    y += 80;
    context.font = '24px "Segoe UI", Arial, sans-serif';
    context.fillText(`سرپرست / والدہ کا نام: ${data.guardianName || data.motherName || '____________________'}      دستخط / انگوٹھا: ____________________`, 1110, y);
    y += 68;
    context.fillText(`رابطہ نمبر: ${data.guardianContact || data.motherContact || '____________________'}      تاریخ: ____________________`, 1110, y);
  }

  return canvas.toDataURL('image/jpeg', 0.92);
}

function buildPdfFromImages(images: string[]) {
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objects: string[] = [];
  const imageBuffers = images.map((image) => {
    const binary = atob(image.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  });

  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push(`<< /Type /Pages /Kids [${images.map((_, index) => `${3 + index * 3} 0 R`).join(' ')}] /Count ${images.length} >>`);
  images.forEach((_, index) => {
    const pageObject = 3 + index * 3;
    const contentObject = pageObject + 1;
    const imageObject = pageObject + 2;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index + 1} ${imageObject} 0 R >> >> /Contents ${contentObject} 0 R >>`);
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${index + 1} Do\nQ`;
    objects.push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`);
    objects.push(`<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBuffers[index].length} >>\nstream\n__IMAGE_${index}__\nendstream`);
  });

  const chunks: Uint8Array[] = [new TextEncoder().encode('%PDF-1.4\n')];
  const offsets: number[] = [0];
  let position = chunks[0].length;
  objects.forEach((object, index) => {
    offsets.push(position);
    const imageIndex = object.match(/__IMAGE_(\d+)__/)?.[1];
    if (imageIndex === undefined) {
      const chunk = new TextEncoder().encode(`${index + 1} 0 obj\n${object}\nendobj\n`);
      chunks.push(chunk);
      position += chunk.length;
      return;
    }
    const [before, after] = object.split(`__IMAGE_${imageIndex}__`);
    const beforeChunk = new TextEncoder().encode(`${index + 1} 0 obj\n${before}`);
    const imageChunk = imageBuffers[Number(imageIndex)];
    const afterChunk = new TextEncoder().encode(`${after}\nendobj\n`);
    chunks.push(beforeChunk, imageChunk, afterChunk);
    position += beforeChunk.length + imageChunk.length + afterChunk.length;
  });

  const xrefOffset = position;
  const xref = [`xref\n0 ${objects.length + 1}`, '0000000000 65535 f ', ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n `), `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>`, `startxref\n${xrefOffset}\n%%EOF`].join('\n');
  chunks.push(new TextEncoder().encode(xref));
  return new Blob(chunks, { type: 'application/pdf' });
}

export async function downloadAttestationPdf(data: AttestationFormData) {
  const pageImages = await Promise.all([renderAttestationPage(data, 1), renderAttestationPage(data, 2)]);
  const blob = buildPdfFromImages(pageImages);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `attestation-confirmation-${data.registrationNumber || data.applicationId || 'application'}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export function printAttestationForm(data: AttestationFormData) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(buildAttestationHtml(data));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
