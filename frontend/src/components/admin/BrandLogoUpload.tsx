import { useRef, useState } from 'react';
import { ImageUp, Loader2, RotateCcw } from 'lucide-react';
import LotusLogo from '../LotusLogo';
import { IMAGE_ACCEPT, prepareLogo } from '../../utils/mediaApi';

const DEFAULT_LOGO = '/lotus-logo.png';

/** The app's own logo (header, login pages): upload any picture format, saved at once. */
export default function BrandLogoUpload({
  logoUrl,
  adminToken,
  onChange,
}: {
  logoUrl: string;
  adminToken: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const upload = async (file: File) => {
    setBusy(true);
    setError('');
    setDone(false);
    try {
      const dataUrl = await prepareLogo(file);
      const res = await fetch('/api/admin/branding/logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error('فشل رفع الشعار');
      onChange((await res.json()).logoUrl);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sm:col-span-2 rounded-xl border border-theme bg-surface/40 p-4">
      <p className="text-sm font-medium text-primary mb-3">شعار التطبيق (يظهر في أعلى كل الصفحات وصفحات الدخول)</p>
      <div className="flex flex-wrap items-center gap-4">
        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <LotusLogo size="lg" logoUrl={logoUrl || DEFAULT_LOGO} />
        </div>
        <div className="flex-1 min-w-[220px] space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept={IMAGE_ACCEPT}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
              e.target.value = '';
            }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-lotus-500 text-white text-sm font-medium hover:bg-lotus-600 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageUp className="w-4 h-4" />}
              رفع شعار من الجهاز
            </button>
            {logoUrl && logoUrl !== DEFAULT_LOGO && (
              <button
                type="button"
                onClick={() => onChange(DEFAULT_LOGO)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 text-xs hover:bg-white/15"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                الشعار الأصلي
              </button>
            )}
          </div>
          <p className="text-[11px] text-muted">
            أي صيغة صورة: PNG، JPG، SVG، WebP، GIF، BMP، ICO، AVIF — وكمان TIFF وHEIC لو المتصفح بيفتحهم (زي Safari). الحجم والمقاس بيتظبطوا تلقائياً.
          </p>
          {done && <p className="text-xs text-emerald-400">تم رفع الشعار وحفظه ✓</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}
