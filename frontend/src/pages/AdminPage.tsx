import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Save, LogOut, ArrowRight, Edit3, Trash2, Plus, Palette, Sun, Moon, ChevronUp, ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import LotusLogo from '../components/LotusLogo';
import CompanyLogo from '../components/CompanyLogo';
import CompanyLogoUpload from '../components/CompanyLogoUpload';
import CoachMediaEditor from '../components/CoachMediaEditor';
import CoachCopyEditor from '../components/CoachCopyEditor';
import { useRules } from '../hooks/useRules';
import { useTheme } from '../context/ThemeContext';
import type { Branding, Company, CompanyLink, RulesData } from '../types';
import { DEFAULT_BRANDING } from '../types';

type AdminTab = 'companies' | 'branding';

export default function AdminPage() {
  const { data, online, refetch, loading } = useRules();
  const { theme, toggleTheme } = useTheme();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editData, setEditData] = useState<RulesData | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('companies');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    localStorage.removeItem('admin-token');
    sessionStorage.removeItem('admin-token');
    setToken('');
    setPassword('');
  }, []);

  useEffect(() => {
    if (data && token && !editData) setEditData(data);
  }, [data, token, editData]);

  const isLoggedIn = !!token;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Invalid');
      const { token: t } = await res.json();
      setToken(t);
      setPassword('');
      setEditData(data || null);
    } catch {
      setLoginError('كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = () => {
    setToken('');
    setEditData(null);
    setSelectedCompany(null);
    setPassword('');
  };

  const handleSave = async () => {
    if (!editData) return;
    setSaving(true);
    setMessage('');
    try {
      const res = await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error('Save failed');
      setMessage('تم الحفظ بنجاح ✓');
      refetch();
    } catch {
      setMessage('فشل الحفظ - تحقق من الاتصال');
    } finally {
      setSaving(false);
    }
  };

  const updateCompany = (updated: Company) => {
    if (!editData) return;
    setEditData({
      ...editData,
      companies: editData.companies.map((c) =>
        c.id === updated.id ? updated : c
      ),
    });
    setSelectedCompany(updated);
  };

  const updateBranding = (branding: Branding) => {
    if (!editData) return;
    setEditData({ ...editData, branding });
  };

  const deleteCompany = (id: string) => {
    if (!editData || !confirm('حذف هذه الشركة؟')) return;
    setEditData({
      ...editData,
      companies: editData.companies.filter((c) => c.id !== id),
    });
    setSelectedCompany(null);
  };

  const addCompany = () => {
    if (!editData) return;
    const maxOrder = Math.max(0, ...editData.companies.map((c) => c.order || 0));
    const newCo: Company = {
      id: `new-${Date.now()}`,
      nameAr: 'شركة جديدة',
      nameEn: 'New Company',
      order: maxOrder + 1,
      rules: {},
      forms: [],
      contacts: [],
      media: [],
      links: [],
    };
    setEditData({ ...editData, companies: [...editData.companies, newCo] });
    setSelectedCompany(newCo);
    setActiveTab('companies');
  };

  const sortedCompanies = editData
    ? [...editData.companies].sort((a, b) => (a.order || 0) - (b.order || 0))
    : [];

  const moveCompany = (id: string, direction: 'up' | 'down') => {
    if (!editData) return;
    const list = [...sortedCompanies];
    const idx = list.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const reordered = [...list];
    [reordered[idx], reordered[swapIdx]] = [reordered[swapIdx], reordered[idx]];
    const companies = reordered.map((c, i) => ({ ...c, order: i + 1 }));
    setEditData({ ...editData, companies });
    const sel = companies.find((c) => c.id === id);
    if (sel) setSelectedCompany(sel);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <button
          type="button"
          onClick={toggleTheme}
          className="absolute top-4 left-4 p-2 rounded-xl glass hover:bg-white/10"
          title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
        >
          {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-lotus-600" />}
        </button>
        <motion.form
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleLogin}
          className="glass-card p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <LotusLogo size="md" />
            </div>
            <div className="w-12 h-12 rounded-2xl bg-lotus-500/20 flex items-center justify-center mx-auto mb-3">
              <Lock className="w-6 h-6 text-lotus-400" />
            </div>
            <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
            <p className="text-slate-400 text-sm mt-1">أدخل كلمة المرور للمتابعة</p>
          </div>

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            className="w-full py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-white mb-4 focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
          />
          {loginError && <p className="text-red-400 text-sm mb-4">{loginError}</p>}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-600 text-white font-bold"
          >
            دخول
          </motion.button>

          <Link to="/" className="block text-center text-slate-400 text-sm mt-4 hover:text-lotus-400">
            العودة للتطبيق
          </Link>
        </motion.form>
      </div>
    );
  }

  const branding = { ...DEFAULT_BRANDING, ...editData?.branding };

  return (
    <div className="min-h-screen">
      <Header online={online} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
            <p className="text-slate-400 text-sm">تعديل الشركات والمرشد التفاعلي</p>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white font-medium disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? 'جاري الحفظ...' : 'حفظ الكل'}
            </motion.button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass hover:bg-white/10"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </button>
          </div>
        </div>

        {message && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 rounded-xl bg-emerald-500/20 text-emerald-300 text-center"
          >
            {message}
          </motion.p>
        )}

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('companies')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'companies'
                ? 'bg-lotus-500/20 text-lotus-300 border border-lotus-500/30'
                : 'glass hover:bg-white/10'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            شركات التأمين
          </button>
          <button
            onClick={() => setActiveTab('branding')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
              activeTab === 'branding'
                ? 'bg-lotus-500/20 text-lotus-300 border border-lotus-500/30'
                : 'glass hover:bg-white/10'
            }`}
          >
            <Palette className="w-4 h-4" />
            الهوية والشعار
          </button>
        </div>

        {activeTab === 'branding' && (
          <div className="glass-card p-6">
            <h2 className="text-xl font-bold mb-6">الهوية البصرية</h2>
            <div className="flex flex-col sm:flex-row gap-6 mb-6 p-4 rounded-xl bg-white/5">
              <div className="flex justify-center">
                <LotusLogo size="lg" logoUrl={branding.logoUrl} />
              </div>
              <div className="flex-1 text-center sm:text-right">
                <p className="text-2xl font-bold gradient-text">{branding.titleAr}</p>
                <p className="text-lg font-semibold text-primary">{branding.departmentAr}</p>
                <p className="text-muted mt-1">{branding.subtitleAr}</p>
              </div>
            </div>
            <BrandingEditor branding={branding} onChange={updateBranding} />
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="glass-card p-4 lg:sticky lg:top-20 lg:self-start">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold">الشركات</h2>
                <button
                  onClick={addCompany}
                  className="p-2 rounded-lg bg-lotus-500/20 text-lotus-300 hover:bg-lotus-500/30"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 max-h-[70vh] overflow-y-auto">
                {sortedCompanies.map((c, i) => (
                  <div
                    key={c.id}
                    className={`flex items-center gap-1 rounded-xl transition-colors ${
                      selectedCompany?.id === c.id ? 'bg-lotus-500/20' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex flex-col p-1">
                      <button
                        type="button"
                        disabled={i === 0}
                        onClick={() => moveCompany(c.id, 'up')}
                        className="p-1 rounded text-muted hover:text-primary disabled:opacity-25"
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={i === sortedCompanies.length - 1}
                        onClick={() => moveCompany(c.id, 'down')}
                        className="p-1 rounded text-muted hover:text-primary disabled:opacity-25"
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedCompany(c)}
                      className="flex-1 text-right p-2 flex items-center gap-2 min-w-0"
                    >
                      <CompanyLogo company={c} size="sm" />
                      <span className="truncate flex-1">{c.nameAr}</span>
                    </button>
                  </div>
                ))}
              </div>

              {editData && (
                <div className="mt-4 pt-4 border-t border-white/10">
                  <CoachCopyEditor
                    copy={editData.coach}
                    onChange={(coach) => setEditData({ ...editData, coach })}
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-2">
              {selectedCompany ? (
                <CompanyEditor
                  company={selectedCompany}
                  adminToken={token}
                  onChange={updateCompany}
                  onDelete={() => deleteCompany(selectedCompany.id)}
                />
              ) : (
                <div className="glass-card p-12 text-center text-slate-400">
                  اختر شركة من القائمة للتعديل
                </div>
              )}
            </div>
          </div>
        )}

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-lotus-400 mt-8"
        >
          <ArrowRight className="w-4 h-4" />
          العودة للتطبيق
        </Link>
      </main>
    </div>
  );
}

function BrandingEditor({
  branding,
  onChange,
}: {
  branding: Branding;
  onChange: (b: Branding) => void;
}) {
  const set = (field: keyof Branding, value: string) => {
    onChange({ ...branding, [field]: value });
  };

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <Field label="رابط الشعار" value={branding.logoUrl} onChange={(v) => set('logoUrl', v)} className="sm:col-span-2" />
      <Field label="الاسم (السطر الأول)" value={branding.titleAr} onChange={(v) => set('titleAr', v)} />
      <Field label="القسم / الفرع" value={branding.departmentAr} onChange={(v) => set('departmentAr', v)} />
      <Field label="العنوان الفرعي" value={branding.subtitleAr} onChange={(v) => set('subtitleAr', v)} />
      <Field label="عنوان الصفحة الرئيسية" value={branding.heroTitleAr} onChange={(v) => set('heroTitleAr', v)} />
      <Field label="وصف الصفحة الرئيسية" value={branding.heroSubtitleAr} onChange={(v) => set('heroSubtitleAr', v)} multiline className="sm:col-span-2" />
      <Field label="نص التذييل" value={branding.footerText} onChange={(v) => set('footerText', v)} className="sm:col-span-2" />
    </div>
  );
}

function CompanyEditor({
  company,
  adminToken,
  onChange,
  onDelete,
}: {
  company: Company;
  adminToken: string;
  onChange: (c: Company) => void;
  onDelete: () => void;
}) {
  const update = (field: keyof Company, value: unknown) => {
    onChange({ ...company, [field]: value });
  };

  const updateRule = (field: string, value: string | string[]) => {
    onChange({
      ...company,
      rules: { ...company.rules, [field]: value },
    });
  };

  return (
    <div className="space-y-5">
      <div className="glass-card p-5">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-bold">{company.nameAr}</h2>
          <button onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <CompanyLogoUpload
          company={company}
          logoUrl={company.logoUrl}
          adminToken={adminToken}
          onLogoChange={(url) => update('logoUrl', url)}
        />

        <div className="grid sm:grid-cols-2 gap-4 mt-4">
          <Field label="الاسم بالعربية" value={company.nameAr} onChange={(v) => update('nameAr', v)} />
          <Field label="الاسم بالإنجليزية" value={company.nameEn} onChange={(v) => update('nameEn', v)} />
          <Field label="الخط الساخن" value={company.hotline || ''} onChange={(v) => update('hotline', v)} />
          <Field label="نظام الموافقات" value={company.approvalSystem || ''} onChange={(v) => update('approvalSystem', v)} />
          <Field label="رابط البوابة" value={company.approvalPortal || ''} onChange={(v) => update('approvalPortal', v)} className="sm:col-span-2" />
          <Field label="اللون" value={company.color || ''} onChange={(v) => update('color', v)} />
          <Field label="الترتيب" value={String(company.order)} onChange={(v) => update('order', Number(v) || 0)} />
        </div>
      </div>

      <AdminSection title="المرشد التفاعلي — النماذج والصور">
        <Field
          label="طرق الصرف (سطر لكل نوع — يظهر كزر للصيدلي)"
          value={company.forms?.join('\n') || ''}
          onChange={(v) => update('forms', v.split('\n').filter(Boolean))}
          multiline
        />
        <CoachMediaEditor
          company={company}
          adminToken={adminToken}
          onChange={onChange}
        />
        <CoachCopyEditor
          copy={company.coachCopy}
          onChange={(coachCopy) => onChange({ ...company, coachCopy })}
        />
      </AdminSection>

      <AdminSection title="شروط الصرف">
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="صلاحية الروشتة" value={company.rules?.prescriptionValidity || ''} onChange={(v) => updateRule('prescriptionValidity', v)} />
          <Field label="أقصى مدة صرف" value={company.rules?.maxDispensePeriod || ''} onChange={(v) => updateRule('maxDispensePeriod', v)} />
          <Field label="الحد المالي" value={company.rules?.financialLimit || ''} onChange={(v) => updateRule('financialLimit', v)} />
          <Field label="نسبة التحمل" value={company.rules?.copay || ''} onChange={(v) => updateRule('copay', v)} />
        </div>
        <Field
          label="ملاحظات هامة"
          value={company.rules?.importantNotes?.join('\n') || ''}
          onChange={(v) => updateRule('importantNotes', v.split('\n').filter(Boolean))}
          multiline
        />
        <Field
          label="محظورات"
          value={company.rules?.prohibitions?.join('\n') || ''}
          onChange={(v) => updateRule('prohibitions', v.split('\n').filter(Boolean))}
          multiline
        />
      </AdminSection>

      <AdminSection title="روابط مهمة">
        <p className="text-xs text-muted mb-2">سطر لكل رابط: العنوان | الرابط | النوع (portal/email/phone/website)</p>
        <Field
          label="الروابط"
          value={(company.links || [])
            .map((l) => `${l.label} | ${l.url} | ${l.type}`)
            .join('\n')}
          onChange={(v) => {
            const links: CompanyLink[] = v
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line, i) => {
                const parts = line.split('|').map((p) => p.trim());
                const label = parts[0] || 'رابط';
                const url = parts[1] || '';
                const type = (parts[2] || 'portal') as CompanyLink['type'];
                return {
                  id: `${company.id}-link-${i}`,
                  label,
                  url,
                  type: ['portal', 'email', 'phone', 'website'].includes(type) ? type : 'portal',
                };
              });
            onChange({ ...company, links });
          }}
          multiline
        />
      </AdminSection>
    </div>
  );
}

function AdminSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="glass-card p-5 space-y-4">
      <h3 className="font-bold text-lg border-b border-white/10 pb-2">{title}</h3>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  multiline,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  className?: string;
}) {
  const cls = `w-full py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50 ${className}`;
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
