import type { RulesData } from '../types';
import StringCopyEditor, { ListEditor } from './StringCopyEditor';
import CoachCopyEditor from '../CoachCopyEditor';
import {
  DEFAULT_GUIDE,
  DEFAULT_UI,
  GUIDE_FIELD_LABELS,
  GUIDE_SECTION_LABELS,
  UI_FIELD_LABELS,
  UI_SECTION_LABELS,
} from '../../data/appDefaults';

interface ContentAdminPanelProps {
  data: RulesData;
  onChange: (data: RulesData) => void;
}

export default function ContentAdminPanel({ data, onChange }: ContentAdminPanelProps) {
  const setUiSection = (section: keyof typeof DEFAULT_UI, value: Record<string, string> | undefined) => {
    const ui = { ...(data.ui || {}) };
    if (!value) delete ui[section];
    else ui[section] = value;
    onChange({ ...data, ui: Object.keys(ui).length ? ui : undefined });
  };

  const setGuideSection = (section: keyof typeof DEFAULT_GUIDE, value: Record<string, string> | undefined) => {
    const guide = { ...(data.guide || {}) };
    if (!value) delete guide[section];
    else guide[section] = value;
    onChange({ ...data, guide: Object.keys(guide).length ? guide : undefined });
  };

  const setGeneral = (field: keyof RulesData['general'], value: string[] | string) => {
    onChange({ ...data, general: { ...data.general, [field]: value } });
  };

  const setMeta = (field: keyof RulesData['meta'], value: string) => {
    onChange({ ...data, meta: { ...data.meta, [field]: value } });
  };

  return (
    <div className="space-y-4">
      <div className="glass-card p-5 space-y-4">
        <h2 className="text-xl font-bold">المرجع العام (الصفحة الرئيسية)</h2>
        <ListEditor
          title="قائمة فحص الكارنية"
          items={data.general.cardChecklist}
          onChange={(v) => setGeneral('cardChecklist', v)}
          placeholder="عنصر فحص..."
          defaultOpen
        />
        <ListEditor
          title="قواعد الكارت الإلكتروني"
          items={data.general.electronicCardRules || []}
          onChange={(v) => setGeneral('electronicCardRules', v)}
          placeholder="قاعدة..."
        />
        <ListEditor
          title="روابط الموافقات"
          items={data.general.approvalLinks}
          onChange={(v) => setGeneral('approvalLinks', v)}
          placeholder="https://..."
        />
      </div>

      <div className="glass-card p-5 space-y-3">
        <h2 className="text-xl font-bold">بيانات التطبيق</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <MetaField label="عنوان التطبيق (عربي)" value={data.meta.titleAr} onChange={(v) => setMeta('titleAr', v)} />
          <MetaField label="عنوان التطبيق (إنجليزي)" value={data.meta.titleEn} onChange={(v) => setMeta('titleEn', v)} />
          <MetaField label="المؤسسة" value={data.meta.organization} onChange={(v) => setMeta('organization', v)} />
          <MetaField label="آخر تحديث" value={data.meta.lastUpdated} onChange={(v) => setMeta('lastUpdated', v)} />
          <MetaField label="المستند المصدر" value={data.meta.sourceDocument} onChange={(v) => setMeta('sourceDocument', v)} className="sm:col-span-2" />
        </div>
      </div>

      <div className="glass-card p-5 space-y-3">
        <h2 className="text-xl font-bold">نصوص الواجهة</h2>
        <p className="text-xs text-muted">كل نص يظهر للصيدلي في التطبيق — عدّل أي حقل</p>
        {(Object.keys(DEFAULT_UI) as (keyof typeof DEFAULT_UI)[]).map((section) => (
          <StringCopyEditor
            key={section}
            title={UI_SECTION_LABELS[section]}
            defaults={DEFAULT_UI[section]}
            labels={UI_FIELD_LABELS[section] || {}}
            value={data.ui?.[section]}
            onChange={(v) => setUiSection(section, v)}
          />
        ))}
      </div>

      <div className="glass-card p-5 space-y-3">
        <h2 className="text-xl font-bold">نصوص دليل الصرف اليدوي</h2>
        {(Object.keys(DEFAULT_GUIDE) as (keyof typeof DEFAULT_GUIDE)[]).map((section) => (
          <StringCopyEditor
            key={section}
            title={GUIDE_SECTION_LABELS[section]}
            defaults={DEFAULT_GUIDE[section]}
            labels={GUIDE_FIELD_LABELS[section] || {}}
            value={data.guide?.[section]}
            onChange={(v) => setGuideSection(section, v)}
          />
        ))}
      </div>

      <div className="glass-card p-5">
        <h2 className="text-xl font-bold mb-3">نصوص المرشد التفاعلي</h2>
        <CoachCopyEditor copy={data.coach} onChange={(coach) => onChange({ ...data, coach })} defaultOpen />
      </div>
    </div>
  );
}

function MetaField({
  label,
  value,
  onChange,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm"
      />
    </div>
  );
}
