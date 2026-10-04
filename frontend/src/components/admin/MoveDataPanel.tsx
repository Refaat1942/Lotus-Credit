import { useRef, useState } from 'react';
import { Download, Loader2, Truck, Upload } from 'lucide-react';

/** Owner only: all data (database + photos) as one file, to move to another VPS or a local server. */
export default function MoveDataPanel({ adminToken }: { adminToken: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const download = async () => {
    setDownloading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/export', { headers: { Authorization: `Bearer ${adminToken}` } });
      if (!res.ok) throw new Error();
      const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1] || 'lotus-data.tar.gz';
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('فشل تنزيل البيانات');
    } finally {
      setDownloading(false);
    }
  };

  const upload = (file: File) => {
    if (
      !confirm(
        `استرجاع كل البيانات من «${file.name}»؟\n\nده هيستبدل كل الشركات والمستخدمين والصور على السيرفر ده بالبيانات اللي في الملف. هتتاخد نسخة احتياطية من الوضع الحالي الأول تلقائياً.`,
      )
    ) {
      return;
    }
    setError('');
    setMessage('');
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/admin/import');
    xhr.setRequestHeader('Authorization', `Bearer ${adminToken}`);
    xhr.setRequestHeader('Content-Type', 'application/gzip');
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { error?: string; companies?: number; users?: number } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {
        /* keep empty */
      }
      if (xhr.status === 200) {
        setMessage(`تم الاسترجاع ✓ — ${body.companies} شركة و ${body.users} مستخدم. هيتم تحديث الصفحة...`);
        setTimeout(() => window.location.reload(), 2500);
      } else {
        setError(body.error || 'فشل الاسترجاع');
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setError('انقطع الاتصال أثناء الرفع');
    };
    xhr.send(file);
  };

  return (
    <div className="glass-card p-5 space-y-3">
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Truck className="w-5 h-5 text-lotus-400" />
          نقل البيانات لسيرفر تاني
        </h2>
        <p className="text-xs text-muted mt-1 leading-relaxed">
          نزّل كل البيانات في ملف واحد (الشركات، المستخدمين والصلاحيات، سجل النشاط، سجل الحفظ، وكل الصور). على السيرفر
          الجديد (VPS تاني أو شبكة محلية) بعد التنصيب، ادخل كمالك وارفع نفس الملف هنا. احتفظ بالملف في مكان آمن — هو نسخة
          كاملة من كل حاجة.
        </p>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {message && <p className="text-xs text-emerald-300">{message}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={download}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-50"
        >
          {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {downloading ? 'جاري التجهيز...' : 'تنزيل كل البيانات (ملف واحد)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".gz,.tgz,application/gzip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) upload(f);
            e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={progress !== null}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 text-sm hover:bg-white/15 border border-white/10 disabled:opacity-50"
        >
          {progress !== null ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {progress !== null ? `جاري الرفع ${progress}%` : 'رفع ملف بيانات واسترجاعه'}
        </button>
      </div>
    </div>
  );
}
