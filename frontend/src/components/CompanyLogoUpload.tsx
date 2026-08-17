import { useRef, useState } from 'react';
import { Upload, Loader2 } from 'lucide-react';
import CompanyLogo from './CompanyLogo';
import type { Company } from '../types';

interface CompanyLogoUploadProps {
  company: Pick<Company, 'id' | 'nameAr' | 'logoUrl' | 'color' | 'icon'>;
  logoUrl?: string;
  onLogoChange: (url: string) => void;
  adminToken?: string;
  onUpload?: (file: File) => Promise<string>;
}

export default function CompanyLogoUpload({
  company,
  logoUrl,
  onLogoChange,
  adminToken,
  onUpload,
}: CompanyLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const preview = { ...company, logoUrl: logoUrl || company.logoUrl };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('اختر ملف صورة (PNG, JPG, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('الحد الأقصى 2MB');
      return;
    }
    setError('');
    setUploading(true);
    try {
      if (onUpload) {
        const url = await onUpload(file);
        onLogoChange(url);
      } else if (adminToken) {
        const dataUrl = await readAsDataUrl(file);
        const res = await fetch(`/api/admin/companies/${company.id}/logo`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ dataUrl }),
        });
        if (!res.ok) throw new Error('Upload failed');
        const { logoUrl: url } = await res.json();
        onLogoChange(url);
      } else {
        const dataUrl = await readAsDataUrl(file);
        onLogoChange(dataUrl);
      }
    } catch {
      setError('فشل رفع الصورة');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="sm:col-span-2 rounded-xl border border-theme bg-surface/40 p-4">
      <p className="text-sm font-medium text-primary mb-3">لوجو الشركة</p>
      <div className="flex flex-wrap items-center gap-4">
        <CompanyLogo company={preview} size="lg" />
        <div className="flex-1 min-w-[200px] space-y-2">
          <input
            type="text"
            value={logoUrl || company.logoUrl || ''}
            onChange={(e) => onLogoChange(e.target.value)}
            placeholder="/logos/company.png أو https://..."
            className="w-full py-2 px-3 rounded-lg input-theme text-sm"
          />
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-lotus-500/20 text-lotus-600 dark:text-lotus-300 text-sm font-medium hover:bg-lotus-500/30 disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع صورة من الجهاز
          </button>
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
