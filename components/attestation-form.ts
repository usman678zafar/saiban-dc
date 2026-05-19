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

const urduFontFamily = '"Jameel Noori Nastaleeq", "Noto Nastaliq Urdu", "Segoe UI", Arial, sans-serif';
const englishFontFamily = '"Segoe UI", Inter, Arial, sans-serif';

function canvasFont(size: number, weight = '') {
  return `${weight ? `${weight} ` : ''}${size}px ${urduFontFamily}`;
}

function englishCanvasFont(size: number, weight = '') {
  return `${weight ? `${weight} ` : ''}${size}px ${englishFontFamily}`;
}

async function ensureUrduFontLoaded() {
  if (!document.fonts?.load) return;
  await Promise.all([
    document.fonts.load(canvasFont(24)),
    document.fonts.load(canvasFont(24, 'bold')),
  ]);
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

function drawWorkerDetails(context: CanvasRenderingContext2D, data: AttestationFormData, y: number) {
  context.strokeStyle = '#e5e7eb';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(95, y - 38);
  context.lineTo(1145, y - 38);
  context.stroke();

  context.fillStyle = '#111827';
  context.font = canvasFont(28, 'bold');
  context.textAlign = 'center';
  context.direction = 'rtl';
  context.fillText('\u0641\u06cc\u0644\u0688 \u0648\u0631\u06a9\u0631 \u06a9\u06cc \u062a\u0641\u0635\u06cc\u0644\u0627\u062a', 620, y);

  drawDetailLine(context, '\u0646\u0627\u0645:', data.collectorName, 1110, y + 50, 260);
  drawDetailLine(context, '\u0622\u0626\u06cc \u0688\u06cc:', data.collectorId, 590, y + 50, 260);
  drawDetailLine(context, '\u0631\u0627\u0628\u0637\u06c1:', data.collectorContact, 1110, y + 95, 260);

  context.font = canvasFont(26, 'bold');
  context.textAlign = 'center';
  context.direction = 'rtl';
  context.fillText('\u06cc\u062a\u06cc\u0645 \u0628\u0686\u06d2 \u06a9\u06cc \u062a\u0641\u0635\u06cc\u0644\u0627\u062a', 620, y + 145);

  drawDetailLine(context, '\u06cc\u062a\u06cc\u0645 \u0628\u0686\u06d2 \u06a9\u0627 \u0646\u0627\u0645:', data.childName, 1110, y + 190, 260);
  drawDetailLine(context, '\u0648\u0627\u0644\u062f \u06a9\u0627 \u0646\u0627\u0645:', data.fatherName, 590, y + 190, 260);
  drawDetailLine(context, '\u0628 \u0641\u0627\u0631\u0645 \u0646\u0645\u0628\u0631:', data.bFormNumber, 1110, y + 235, 260);

  context.beginPath();
  context.moveTo(95, y + 265);
  context.lineTo(1145, y + 265);
  context.stroke();
  context.strokeStyle = '#6b7280';

  return y + 320;
}

function drawDetailLine(context: CanvasRenderingContext2D, label: string, value: string | null | undefined, x: number, y: number, valueWidth: number) {
  context.direction = 'rtl';
  context.textAlign = 'right';
  context.font = canvasFont(22);
  context.fillText(label, x, y);

  const valueX = x - 95 - valueWidth / 2;
  const lineRight = x - 90;
  const lineLeft = lineRight - valueWidth;
  context.strokeStyle = '#111827';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(lineLeft, y + 7);
  context.lineTo(lineRight, y + 7);
  context.stroke();

  context.direction = 'ltr';
  context.textAlign = 'center';
  context.font = englishCanvasFont(21);
  context.fillText(value?.trim() || '', valueX, y, valueWidth - 12);
}

function drawInlineField(context: CanvasRenderingContext2D, label: string, x: number, y: number, labelWidth: number, lineWidth: number) {
  context.direction = 'rtl';
  context.textAlign = 'right';
  context.font = canvasFont(22);
  context.fillText(label, x, y);

  const lineRight = x - labelWidth;
  const lineLeft = lineRight - lineWidth;
  context.strokeStyle = '#111827';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(lineLeft, y + 7);
  context.lineTo(lineRight, y + 7);
  context.stroke();
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function buildWorkerDetailsHtml(data: AttestationFormData) {
  return `<section class="worker">
        <h3>&#1601;&#1740;&#1604;&#1672; &#1608;&#1585;&#1705;&#1585; &#1705;&#1740; &#1578;&#1601;&#1589;&#1740;&#1604;&#1575;&#1578;</h3>
        <div class="worker-grid">
          <div>&#1606;&#1575;&#1605;: <span class="line wide">${printValue(data.collectorName)}</span></div>
          <div>&#1570;&#1574;&#1740; &#1672;&#1740;: <span class="line wide">${printValue(data.collectorId)}</span></div>
          <div>&#1585;&#1575;&#1576;&#1591;&#1729;: <span class="line wide">${printValue(data.collectorContact)}</span></div>
        </div>
        <h3 class="orphan-title">&#1740;&#1578;&#1740;&#1605; &#1576;&#1670;&#1746; &#1705;&#1740; &#1578;&#1601;&#1589;&#1740;&#1604;&#1575;&#1578;</h3>
        <div class="orphan-grid">
          <div>&#1740;&#1578;&#1740;&#1605; &#1576;&#1670;&#1746; &#1705;&#1575; &#1606;&#1575;&#1605;: <span class="line wide">${printValue(data.childName)}</span></div>
          <div>&#1608;&#1575;&#1604;&#1583; &#1705;&#1575; &#1606;&#1575;&#1605;: <span class="line wide">${printValue(data.fatherName)}</span></div>
          <div>&#1576; &#1601;&#1575;&#1585;&#1605; &#1606;&#1605;&#1576;&#1585;: <span class="line wide">${printValue(data.bFormNumber)}</span></div>
        </div>
      </section>`;
}

export function buildAttestationHtml(data: AttestationFormData) {
  let pageIndex = 0;
  return `<!doctype html><html lang="ur" dir="rtl"><head><meta charset="utf-8" /><title>Attestation Confirmation</title><style>
    @page{size:A4;margin:12mm}*{box-sizing:border-box}html,body{width:100%;margin:0;overflow-x:hidden}body{background:white;color:#111827;font-family:"Jameel Noori Nastaleeq","Noto Nastaliq Urdu","Segoe UI",Arial,sans-serif}.page{width:186mm;min-height:273mm;margin:0 auto;border:2px solid #111827;padding:10mm 11mm;page-break-after:always;overflow:hidden;direction:rtl}.page:last-child{page-break-after:auto}.header{display:grid;grid-template-columns:1fr auto 1fr;align-items:start;gap:12px;margin-bottom:7mm}.brand{direction:ltr;text-align:left}.brand img{width:35mm;height:auto}.mark{text-align:right}.mark img{width:25mm;height:auto}.title{text-align:center}.title h1{margin:0;font-size:30px}.title p{margin:4px 0;font-size:13px}h2{width:fit-content;margin:7mm auto 5mm;padding:4px 18px;font-size:20px}h3{width:fit-content;margin:8mm auto 4mm;padding-bottom:2px;font-size:19px}p,li{font-size:14px;line-height:2.15}p,ol{max-width:100%}.line{display:inline-block;min-width:90px;max-width:100%;border-bottom:1px dotted #111827;padding:0 8px;direction:ltr;text-align:center;font-family:"Segoe UI",Inter,Arial,sans-serif;vertical-align:baseline}.wide{min-width:190px}.worker{border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;margin:2mm 0 6mm;padding:3mm 0}.worker h3{margin:0 auto 3mm}.worker .orphan-title{margin:3mm auto 2mm}.worker-grid,.orphan-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:2mm 8mm;font-size:13px;line-height:2}.worker-grid>div,.orphan-grid>div{min-width:0;white-space:nowrap}.orphan-grid{border-top:1px solid #f1f5f9;margin-top:2mm;padding-top:2mm}.check-row{display:grid;grid-template-columns:18px 1fr;gap:8px;align-items:start;margin:3mm 0;font-size:14px;line-height:2}.box{width:15px;height:15px;border:1px solid #6b7280;margin-top:7px}.signature-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:8mm;margin-top:8mm}.signature-grid-3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6mm;margin-top:8mm}.sig-line{border-bottom:1px dotted #111827;min-height:8mm;direction:ltr;text-align:center;font-family:"Segoe UI",Inter,Arial,sans-serif}.label{margin-top:2mm;font-size:13px}ol{list-style-position:inside;margin:0;padding:0;text-align:right}.guardian{margin-top:8mm;font-weight:700}.print-actions{direction:ltr;position:fixed;left:16px;top:16px;display:flex;gap:8px;z-index:10}.print-actions button{border:0;border-radius:8px;padding:10px 14px;color:white;background:#2563eb;font:600 14px Arial,sans-serif;cursor:pointer}@media print{.print-actions{display:none}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{margin:0}}
  </style></head><body>
    <div class="print-actions"><button onclick="window.print()">Print / Save PDF</button></div>
    <section class="page">
      <header class="header"><div class="brand"><img src="${logo.src}" alt="Saiban" /></div><div class="title"><h1>بیت السلام کا سائبان</h1><p>یتیم بچوں کی کفالت کا ادارہ</p></div><div class="mark"><img src="${baitussalamLogo.src}" alt="Baitussalam" /></div></header>
      <section class="worker">
        <h3>فیلڈ ورکر کی تفصیلات</h3>
        <div class="worker-grid">
          <div>نام: <span class="line wide">${printValue(data.collectorName)}</span></div>
          <div>آئی ڈی: <span class="line wide">${printValue(data.collectorId)}</span></div>
          <div>رابطہ: <span class="line wide">${printValue(data.collectorContact)}</span></div>
        </div>
      </section>
      <h2>تعلیمی ادارے کے پرنسپل / ناظم اعلیٰ کی تصدیق</h2>
      <p>تصدیق کی جاتی ہے کہ مذکورہ بالا بچہ ہمارے ادارہ <span class="line wide">${printValue(data.schoolName)}</span> میں زیر تعلیم ہے۔ ادارے کی معلومات کے مطابق یہ بچہ مستحق امداد ہے۔</p>
      <div class="signature-grid-3">
        <div><div class="sig-line"></div><div class="label">دستخط</div></div>
        <div><div class="sig-line"></div><div class="label">مہر</div></div>
        <div><div class="sig-line"></div><div class="label">تاریخ</div></div>
      </div>
      <h2>امام مسجد کی تصدیق</h2>
      <p>میں درخواست کنندہ کے حالات سے واقف ہوں، امام مسجد تصدیق کرتا ہوں کہ یہ خاندان محلے کے مستحق خاندانوں میں شامل ہے۔</p>
      <div class="check-row"><span class="box"></span><span>صاحب نصاب نہیں ہیں اور زکوٰۃ وصول کرنے کے اہل ہیں۔</span></div>
      <div class="check-row"><span class="box"></span><span>صاحب نصاب ہیں اور زکوٰۃ وصول کرنے کے اہل نہیں ہیں۔</span></div>
      <div class="check-row"><span class="box"></span><span>خاندان کی مالی حالت مدد کی متقاضی ہے۔</span></div>
      <div class="signature-grid"><div><div class="sig-line"></div><div class="label">تصدیق کنندہ امام صاحب کا نام</div></div><div><div class="sig-line"></div><div class="label">مسجد / محلہ</div></div><div><div class="sig-line"></div><div class="label">موبائل نمبر</div></div><div><div class="sig-line"></div><div class="label">دستخط / مہر</div></div></div>
    </section>
    <section class="page">
      <header class="header"><div class="brand"><img src="${logo.src}" alt="Saiban" /></div><div class="title"><h1>بیت السلام کا سائبان</h1><p>یتیم بچوں کی کفالت کا ادارہ</p></div><div class="mark"><img src="${baitussalamLogo.src}" alt="Baitussalam" /></div></header>
      <h3>اصول و ضوابط</h3>
      <ol><li>بیت السلام سائبان پروگرام کے تحت گھر کا دورہ ضروری ہوگا اور درست معلومات فراہم کرنا لازم ہے۔</li><li>بچے کی عمر رجسٹریشن کے وقت 12 سال سے کم ہونی چاہیے۔</li><li>رجسٹریشن کے بعد بچے کی تعلیمی، دینی اور اخلاقی تربیت کی نگرانی کی جائے گی۔</li><li>تعلیمی ادارے میں حاضری، کارکردگی اور فیس/اخراجات کی معلومات وقتاً فوقتاً طلب کی جا سکتی ہیں۔</li><li>غلط، نامکمل یا گمراہ کن معلومات کی صورت میں درخواست مسترد یا امداد بند کی جا سکتی ہے۔</li><li>سرپرست بچے کی تعلیم، صحت، حفاظت اور بہتر تربیت کے لیے ادارے سے تعاون کرے گا۔</li><li>ادارے کو ضرورت کے مطابق گھر، اسکول، مسجد یا محلے سے تصدیق کرنے کا حق حاصل ہوگا۔</li><li>سرپرست بچے کے متعلق تبدیلی، بیماری، اسکول تبدیلی، رہائش تبدیلی یا مالی حالت کی تبدیلی سے آگاہ کرے گا۔</li><li>جمع شدہ معلومات صرف ادارے کے فلاحی اور انتظامی مقاصد کے لیے استعمال ہوں گی۔</li><li>ادارہ درخواست کی منظوری یا عدم منظوری کا حتمی اختیار رکھتا ہے۔</li></ol>
      <p class="guardian">میں تصدیق کرتا/کرتی ہوں کہ میں نے مندرجہ بالا تمام شرائط و ضوابط کو پڑھ/سن لیا ہے، سمجھ لیا ہے، اور ان پر عمل کرنے کا پابند ہوں۔</p>
      <div class="signature-grid"><div><div class="sig-line">${printValue(data.guardianName || data.motherName)}</div><div class="label">سرپرست / والدہ کا نام</div></div><div><div class="sig-line"></div><div class="label">سرپرست کے دستخط / انگوٹھا</div></div><div><div class="sig-line">${printValue(data.guardianContact || data.motherContact)}</div><div class="label">رابطہ نمبر</div></div><div><div class="sig-line"></div><div class="label">تاریخ</div></div></div>
    </section>
  </body></html>`
    .replace(/<section class="worker">[\s\S]*?<\/section>/, buildWorkerDetailsHtml(data))
    .replace(/(<section class="page">\s*<header class="header">[\s\S]*?<\/header>\s*)/g, (pageStart) => {
      pageIndex += 1;
      return pageIndex === 2 ? `${pageStart}      ${buildWorkerDetailsHtml(data)}\n` : pageStart;
    });
}

async function renderAttestationPage(data: AttestationFormData, pageNumber: 1 | 2) {
  const canvas = document.createElement('canvas');
  canvas.width = 1240;
  canvas.height = 1754;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Unable to create PDF canvas.');
  await ensureUrduFontLoaded();

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
  context.font = canvasFont(42);
  context.fillText('بیت السلام کا سائبان', canvas.width / 2, 115);
  context.font = canvasFont(22);
  context.fillText('یتیم بچوں کی کفالت کا ادارہ', canvas.width / 2, 158);

  context.direction = 'rtl';
  context.textAlign = 'right';
  context.fillStyle = '#111827';

  if (pageNumber === 1) {
    drawWorkerDetails(context, data, 245);
    context.font = canvasFont(30, 'bold');
    context.textAlign = 'center';
    context.fillText('تعلیمی ادارے کے پرنسپل / ناظم اعلیٰ کی تصدیق', canvas.width / 2, 620);
    context.font = canvasFont(24);
    context.textAlign = 'right';
    let y = 685;
    y = drawRtlText(context, `تصدیق کی جاتی ہے کہ مذکورہ بالا بچہ ہمارے ادارہ ${data.schoolName || '____________'} میں زیر تعلیم ہے۔ ادارے کی معلومات کے مطابق یہ بچہ مستحق امداد ہے۔`, 1110, y, 980, 46);
    y += 48;
    drawInlineField(context, 'دستخط:', 1110, y, 70, 220);
    drawInlineField(context, 'مہر:', 720, y, 50, 220);
    drawInlineField(context, 'تاریخ:', 350, y, 60, 180);
    y += 120;
    context.font = canvasFont(30, 'bold');
    context.textAlign = 'center';
    context.fillText('امام مسجد کی تصدیق', canvas.width / 2, y);
    y += 72;
    context.font = canvasFont(24);
    context.textAlign = 'right';
    y = drawRtlText(context, 'میں درخواست کنندہ کے حالات سے واقف ہوں، امام مسجد تصدیق کرتا ہوں کہ یہ خاندان محلے کے مستحق خاندانوں میں شامل ہے۔', 1110, y, 980, 46);
    ['صاحب نصاب نہیں ہیں اور زکوٰۃ وصول کرنے کے اہل ہیں۔', 'صاحب نصاب ہیں اور زکوٰۃ وصول کرنے کے اہل نہیں ہیں۔', 'خاندان کی مالی حالت مدد کی متقاضی ہے۔'].forEach((item) => {
      y += 56;
      context.strokeRect(1070, y - 26, 28, 28);
      context.fillText(item, 1048, y);
    });
    y += 100;
    drawInlineField(context, 'تصدیق کنندہ امام صاحب کا نام:', 1110, y, 260, 220);
    drawInlineField(context, 'مسجد / محلہ:', 590, y, 120, 320);
    y += 62;
    drawInlineField(context, 'موبائل نمبر:', 1110, y, 120, 360);
    drawInlineField(context, 'دستخط / مہر:', 590, y, 120, 320);
  } else {
    drawWorkerDetails(context, data, 245);
    context.direction = 'rtl';
    context.textAlign = 'center';
    context.font = canvasFont(30, 'bold');
    context.fillText('اصول و ضوابط', canvas.width / 2, 610);
    context.direction = 'rtl';
    context.textAlign = 'right';
    context.font = canvasFont(24);
    const rules = ['بیت السلام سائبان پروگرام کے تحت گھر کا دورہ ضروری ہوگا اور درست معلومات فراہم کرنا لازم ہے۔', 'بچے کی عمر رجسٹریشن کے وقت 12 سال سے کم ہونی چاہیے۔', 'رجسٹریشن کے بعد بچے کی تعلیمی، دینی اور اخلاقی تربیت کی نگرانی کی جائے گی۔', 'تعلیمی ادارے میں حاضری، کارکردگی اور فیس/اخراجات کی معلومات وقتاً فوقتاً طلب کی جا سکتی ہیں۔', 'غلط، نامکمل یا گمراہ کن معلومات کی صورت میں درخواست مسترد یا امداد بند کی جا سکتی ہے۔', 'سرپرست بچے کی تعلیم، صحت، حفاظت اور بہتر تربیت کے لیے ادارے سے تعاون کرے گا۔', 'ادارے کو ضرورت کے مطابق گھر، اسکول، مسجد یا محلے سے تصدیق کرنے کا حق حاصل ہوگا۔', 'سرپرست بچے کے متعلق تبدیلی، بیماری، اسکول تبدیلی، رہائش تبدیلی یا مالی حالت کی تبدیلی سے آگاہ کرے گا۔', 'جمع شدہ معلومات صرف ادارے کے فلاحی اور انتظامی مقاصد کے لیے استعمال ہوں گی۔', 'ادارہ درخواست کی منظوری یا عدم منظوری کا حتمی اختیار رکھتا ہے۔'];
    let y = 685;
    rules.forEach((rule, index) => {
      y = drawRtlText(context, `${index + 1}. ${rule}`, 1110, y, 980, 42);
      y += 8;
    });
    y += 50;
    context.font = canvasFont(25, 'bold');
    y = drawRtlText(context, 'میں تصدیق کرتا/کرتی ہوں کہ میں نے مندرجہ بالا تمام شرائط و ضوابط کو پڑھ/سن لیا ہے، سمجھ لیا ہے، اور ان پر عمل کرنے کا پابند ہوں۔', 1110, y, 980, 46);
    y += 80;
    context.font = canvasFont(24);
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
