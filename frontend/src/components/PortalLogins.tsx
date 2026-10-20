import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, ExternalLink, Eye, EyeOff, KeyRound, X } from 'lucide-react';
import type { Company } from '../types';
import type { PortalLogin } from '../utils/portalLogins';
import { linkHref } from '../utils/links';
import CompanyLogo from './CompanyLogo';

function CopyButton({ text, title }: { text: string; title: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      title={title}
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        if (!navigator.clipboard) {
          const t = document.createElement('textarea');
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
        setDone(true);
        setTimeout(() => setDone(false), 1500);
      }}
      className="p-1.5 rounded-lg hover:bg-surface-hover shrink-0"
    >
      {done ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4 text-muted" />}
    </button>
  );
}

/** One saved portal login: open the portal, copy the username, show or copy the password. */
export function PortalLoginCard({ login, company }: { login: PortalLogin; company?: Company }) {
  const [show, setShow] = useState(false);
  const href = linkHref(login.url || company?.approvalPortal || undefined);
  const title = login.label || company?.nameAr || 'بوابة';
  return (
    <div className="rounded-xl border border-theme bg-surface/50 p-3 space-y-2">
      <div className="flex items-center gap-2.5">
        {company ? (
          <CompanyLogo company={company} size="sm" />
        ) : (
          <span className="w-9 h-9 rounded-lg bg-lotus-500/15 text-lotus-500 flex items-center justify-center shrink-0">
            <KeyRound className="w-4 h-4" />
          </span>
        )}
        <p className="flex-1 min-w-0 font-medium text-primary truncate">{title}</p>
        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-lotus-500/15 text-lotus-600 dark:text-lotus-300 text-xs font-medium shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            فتح البوابة
          </a>
        )}
      </div>
      {login.username && (
        <div className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-1.5">
          <span className="text-xs text-muted w-20 shrink-0">اسم المستخدم</span>
          <span dir="ltr" className="flex-1 min-w-0 truncate font-mono text-sm text-primary text-left">
            {login.username}
          </span>
          <CopyButton text={login.username} title="نسخ اسم المستخدم" />
        </div>
      )}
      {login.password && (
        <div className="flex items-center gap-2 rounded-lg bg-black/5 dark:bg-white/5 px-3 py-1.5">
          <span className="text-xs text-muted w-20 shrink-0">كلمة المرور</span>
          <span dir="ltr" className="flex-1 min-w-0 truncate font-mono text-sm text-primary text-left">
            {show ? login.password : '••••••••'}
          </span>
          <button type="button" onClick={() => setShow(!show)} className="p-1.5 rounded-lg hover:bg-surface-hover" title={show ? 'إخفاء' : 'إظهار'}>
            {show ? <EyeOff className="w-4 h-4 text-muted" /> : <Eye className="w-4 h-4 text-muted" />}
          </button>
          <CopyButton text={login.password} title="نسخ كلمة المرور" />
        </div>
      )}
      {login.note && <p className="text-xs text-muted leading-relaxed">{login.note}</p>}
    </div>
  );
}

/** The branch's whole list, opened from the header. */
export function PortalLoginsModal({ logins, companies, onClose }: { logins: PortalLogin[]; companies: Company[]; onClose: () => void }) {
  const byId = Object.fromEntries(companies.map((c) => [c.id, c]));
  return createPortal(
    <div className="fixed inset-0 z-[150] bg-black/70 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-[var(--color-bg-start)] border border-theme p-5 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-lotus-500" />
            بيانات دخول البوابات
          </h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-surface">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-muted">بيانات خاصة بفرعك من الإدارة — ماتشاركهاش مع حد.</p>
        <div className="space-y-3">
          {logins.length === 0 && (
            <p className="text-sm text-muted text-center py-6">لسه الإدارة ماضافتش بيانات دخول لفرعك.</p>
          )}
          {logins.map((l) => (
            <PortalLoginCard key={l.id} login={l} company={byId[l.companyId]} />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
