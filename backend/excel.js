const ExcelJS = require('exceljs');

const ROLE_LABELS = { owner: 'المالك', admin: 'مدير', branch: 'فرع', guest: 'زائر', unknown: '—' };
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };

/** A right-to-left sheet with a bold teal header row, frozen under the header. */
function addTable(wb, name, columns, rows) {
  const ws = wb.addWorksheet(name, { views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }] });
  ws.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width || 16, style: c.style }));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = HEADER_FILL;
  head.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  head.height = 22;
  for (const r of rows) ws.addRow(r);
  if (rows.length) ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return ws;
}

/** Local time of an event as a real Excel date (the viewer's timezone offset is applied). */
const localDate = (iso, offset) => new Date(Date.parse(iso) + offset);

function addLogSheet(wb, events, range, labels) {
  addTable(
    wb,
    'سجل النشاط',
    [
      { header: 'الوقت', key: 't', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
      { header: 'النوع', key: 'type', width: 22 },
      { header: 'المستخدم', key: 'user', width: 16 },
      { header: 'الاسم', key: 'name', width: 24 },
      { header: 'الصلاحية', key: 'role', width: 10 },
      { header: 'الشركة', key: 'company', width: 22 },
      { header: 'التفاصيل', key: 'detail', width: 60 },
    ],
    events.map((e) => ({
      t: localDate(e.t, range.offset),
      type: labels[e.type] || e.type,
      user: e.user,
      name: e.userName,
      role: ROLE_LABELS[e.role] || e.role,
      company: e.companyName || e.companyId || '',
      detail: e.detail || '',
    })),
  );
}

/** The whole dashboard for a date range as an .xlsx file (summary, days, companies, branches, activity log). */
async function reportWorkbook({ report, events, range, labels, title }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = title;
  wb.created = new Date();
  const t = report.totals;

  const summary = addTable(
    wb,
    'ملخص',
    [
      { header: 'البند', key: 'k', width: 34 },
      { header: 'العدد', key: 'v', width: 14 },
    ],
    [
      { k: 'الفترة', v: `${range.from} → ${range.to}` },
      { k: 'زيارات الشركات', v: t.companyViews },
      { k: 'بدء المرشد التفاعلي', v: t.coachStarts },
      { k: 'صرف مكتمل بالمرشد', v: t.coachFinishes },
      { k: 'نسبة الإكمال', v: t.coachStarts ? `${Math.round((t.coachFinishes / t.coachStarts) * 100)}%` : '—' },
      { k: 'أسئلة للمساعد الذكي', v: t.assistantQuestions },
      { k: 'فروع ومستخدمين نشطين', v: t.activeUsers },
      { k: 'تسجيلات دخول', v: t.logins },
      { k: 'محاولات دخول فاشلة', v: t.failedLogins },
    ],
  );
  summary.getColumn('k').font = { bold: true };

  addTable(
    wb,
    'يومي',
    [
      { header: 'اليوم', key: 'date', width: 14 },
      { header: 'زيارات الشركات', key: 'companyViews', width: 16 },
      { header: 'بدء المرشد', key: 'coachStarts', width: 14 },
      { header: 'أسئلة المساعد', key: 'assistantQuestions', width: 14 },
    ],
    report.daily,
  );

  addTable(
    wb,
    'الشركات',
    [
      { header: 'الشركة', key: 'name', width: 28 },
      { header: 'الزيارات', key: 'views', width: 12 },
      { header: 'بدء المرشد', key: 'coachStarts', width: 12 },
      { header: 'صرف مكتمل', key: 'coachFinishes', width: 12 },
    ],
    report.topCompanies,
  );

  addTable(
    wb,
    'الفروع والمستخدمين',
    [
      { header: 'الاسم', key: 'name', width: 26 },
      { header: 'اسم الدخول', key: 'user', width: 16 },
      { header: 'الصلاحية', key: 'role', width: 10 },
      { header: 'زيارات الشركات', key: 'companyViews', width: 14 },
      { header: 'بدء المرشد', key: 'coachStarts', width: 12 },
      { header: 'صرف مكتمل', key: 'coachFinishes', width: 12 },
      { header: 'أسئلة المساعد', key: 'assistantQuestions', width: 13 },
      { header: 'تسجيلات الدخول', key: 'logins', width: 13 },
      { header: 'آخر نشاط', key: 'lastSeen', width: 20, style: { numFmt: 'yyyy-mm-dd hh:mm' } },
    ],
    report.byUser.map((u) => ({ ...u, role: ROLE_LABELS[u.role] || u.role, lastSeen: localDate(u.lastSeen, range.offset) })),
  );

  addLogSheet(wb, events, range, labels);
  return wb.xlsx.writeBuffer();
}

/** Only the activity log (as filtered on screen). */
async function logWorkbook({ events, range, labels, title }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = title;
  addLogSheet(wb, events, range, labels);
  return wb.xlsx.writeBuffer();
}

module.exports = { reportWorkbook, logWorkbook };
