import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Save, LogOut, ArrowRight, Edit3, Trash2, Plus } from 'lucide-react';
import Header from '../components/Header';
import { useRules } from '../hooks/useRules';
import type { Company, RulesData } from '../types';

export default function AdminPage() {
  const { data, online, refetch, loading } = useRules();
  const [token, setToken] = useState(localStorage.getItem('admin-token') || '');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [editData, setEditData] = useState<RulesData | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

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
      localStorage.setItem('admin-token', t);
      setToken(t);
      setEditData(data);
    } catch {
      setLoginError('كلمة المرور غير صحيحة');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('admin-token');
    setToken('');
    setEditData(null);
    setSelectedCompany(null);
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
    const newCo: Company = {
      id: `new-${Date.now()}`,
      nameAr: 'شركة جديدة',
      nameEn: 'New Company',
      order: editData.companies.length + 1,
      rules: {},
      forms: [],
      contacts: [],
    };
    setEditData({ ...editData, companies: [...editData.companies, newCo] });
    setSelectedCompany(newCo);
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.form
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onSubmit={handleLogin}
          className="glass-card p-8 w-full max-w-md"
        >
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-lotus-500/20 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-lotus-400" />
            </div>
            <h1 className="text-2xl font-bold">لوحة الإدارة</h1>
            <p className="text-slate-400 text-sm mt-1">تعديل شروط صرف التعاقدات</p>
          </div>

          <input
            type="password"
            placeholder="كلمة المرور"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

  useEffect(() => {
    if (data && !editData) setEditData(data);
  }, [data, editData]);

  return (
    <div className="min-h-screen">
      <Header online={online} />

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">إدارة الشروط</h1>
            <p className="text-slate-400 text-sm">تعديل بيانات شركات التأمين</p>
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

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold">الشركات</h2>
              <button
                onClick={addCompany}
                className="p-2 rounded-lg bg-lotus-500/20 text-lotus-300 hover:bg-lotus-500/30"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1 max-h-[60vh] overflow-y-auto">
              {editData?.companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCompany(c)}
                  className={`w-full text-right p-3 rounded-xl transition-colors flex items-center justify-between ${
                    selectedCompany?.id === c.id
                      ? 'bg-lotus-500/20 text-lotus-300'
                      : 'hover:bg-white/5'
                  }`}
                >
                  <span>{c.nameAr}</span>
                  <Edit3 className="w-4 h-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 glass-card p-6">
            {selectedCompany ? (
              <CompanyEditor
                company={selectedCompany}
                onChange={updateCompany}
                onDelete={() => deleteCompany(selectedCompany.id)}
              />
            ) : (
              <p className="text-slate-400 text-center py-12">
                اختر شركة للتعديل
              </p>
            )}
          </div>
        </div>

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

function CompanyEditor({
  company,
  onChange,
  onDelete,
}: {
  company: Company;
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
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <h2 className="text-xl font-bold">{company.nameAr}</h2>
        <button onClick={onDelete} className="p-2 rounded-lg text-red-400 hover:bg-red-500/10">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="الاسم بالعربية" value={company.nameAr} onChange={(v) => update('nameAr', v)} />
        <Field label="الاسم بالإنجليزية" value={company.nameEn} onChange={(v) => update('nameEn', v)} />
        <Field label="الخط الساخن" value={company.hotline || ''} onChange={(v) => update('hotline', v)} />
        <Field label="نظام الموافقات" value={company.approvalSystem || ''} onChange={(v) => update('approvalSystem', v)} />
        <Field label="رابط البوابة" value={company.approvalPortal || ''} onChange={(v) => update('approvalPortal', v)} className="sm:col-span-2" />
        <Field label="اللون" value={company.color || ''} onChange={(v) => update('color', v)} />
        <Field label="الترتيب" value={String(company.order)} onChange={(v) => update('order', Number(v))} />
      </div>

      <h3 className="font-bold pt-4 border-t border-white/10">شروط الصرف</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="صلاحية الروشتة" value={company.rules?.prescriptionValidity || ''} onChange={(v) => updateRule('prescriptionValidity', v)} />
        <Field label="أقصى مدة صرف" value={company.rules?.maxDispensePeriod || ''} onChange={(v) => updateRule('maxDispensePeriod', v)} />
        <Field label="الحد المالي" value={company.rules?.financialLimit || ''} onChange={(v) => updateRule('financialLimit', v)} />
        <Field label="نسبة التحمل" value={company.rules?.copay || ''} onChange={(v) => updateRule('copay', v)} />
      </div>

      <Field
        label="طرق الصرف (سطر لكل طريقة)"
        value={company.forms?.join('\n') || ''}
        onChange={(v) => update('forms', v.split('\n').filter(Boolean))}
        multiline
      />

      <Field
        label="ملاحظات هامة (سطر لكل ملاحظة)"
        value={company.rules?.importantNotes?.join('\n') || ''}
        onChange={(v) => updateRule('importantNotes', v.split('\n').filter(Boolean))}
        multiline
      />

      <Field
        label="محظورات (سطر لكل محظور)"
        value={company.rules?.prohibitions?.join('\n') || ''}
        onChange={(v) => updateRule('prohibitions', v.split('\n').filter(Boolean))}
        multiline
      />
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
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className={cls} />
      )}
    </div>
  );
}
