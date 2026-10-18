import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Ban, KeyRound, Loader2, Monitor, ShieldCheck, Smartphone, Tablet } from 'lucide-react';
import type { SignIn } from '../hooks/useSignIn';
import { deviceText } from '../utils/device';

const RETRY_SECONDS = 15;

const codeInput =
  'w-full py-3 px-4 rounded-xl input-theme text-center text-2xl tracking-[0.4em] font-mono focus:outline-none focus:ring-2 focus:ring-lotus-500/50';

const onlyDigits = (v: string) => v.replace(/\D/g, '').slice(0, 6);

/** The owner's 6-digit Google Authenticator code, shown after a correct password. */
export function OtpField({ auth }: { auth: SignIn }) {
  if (!auth.otpNeeded) return null;
  return (
    <div className="mb-4 space-y-2">
      <label className="flex items-center gap-1.5 text-sm text-primary font-medium">
        <ShieldCheck className="w-4 h-4 text-lotus-500" />
        كود Google Authenticator
      </label>
      <input
        dir="ltr"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        placeholder="000000"
        value={auth.otp}
        onChange={(e) => auth.setOtp(onlyDigits(e.target.value))}
        className={codeInput}
      />
      <p className="text-[11px] text-muted">افتح تطبيق Google Authenticator على موبايلك واكتب الكود الظاهر لـ Lotus Credit.</p>
    </div>
  );
}

const KindIcon = ({ kind }: { kind?: string }) =>
  kind === 'موبايل' ? <Smartphone className="w-7 h-7" /> : kind === 'تابلت' ? <Tablet className="w-7 h-7" /> : <Monitor className="w-7 h-7" />;

/** Replaces the login form while a new device waits for the owner (checks again by itself). */
export function DeviceWaiting({ auth }: { auth: SignIn }) {
  const [code, setCode] = useState('');
  const [left, setLeft] = useState(RETRY_SECONDS);
  const retry = useRef(auth.retry);
  retry.current = auth.retry;
  const w = auth.waiting;

  useEffect(() => {
    if (w?.kind !== 'pending') return;
    const timer = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(timer);
  }, [w?.kind]);

  useEffect(() => {
    if (left > 0) return;
    retry.current();
    setLeft(RETRY_SECONDS);
  }, [left]);

  if (!w) return null;

  if (w.kind === 'blocked') {
    return (
      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/15 text-red-500 flex items-center justify-center mx-auto">
          <Ban className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-primary">الجهاز ده ممنوع من الدخول</h2>
        <p className="text-sm text-muted">الإدارة حظرت الجهاز ده. لو ده غلط، كلّم المدير.</p>
        <button type="button" onClick={auth.reset} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-lotus-500">
          <ArrowRight className="w-4 h-4" />
          رجوع
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-500 flex items-center justify-center mx-auto">
          <KindIcon kind={w.device?.kind} />
        </div>
        <h2 className="text-xl font-bold text-primary">جهاز جديد — مستني موافقة الإدارة</h2>
        {w.device && (
          <p className="text-xs text-muted" dir="auto">
            {deviceText(w.device)}
          </p>
        )}
        <p className="text-sm text-muted leading-relaxed">
          الحساب ده بيتفتح من أجهزة معتمدة بس. الطلب وصل للمدير في لوحة المتابعة، وأول ما يوافق هتدخل لوحدك.
        </p>
        <p className="text-xs text-muted inline-flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          بنتأكد تاني بعد {left} ثانية
        </p>
      </div>

      {w.codeAvailable && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            auth.retry({ deviceCode: code });
            setCode('');
          }}
          className="rounded-xl border border-theme p-4 space-y-3"
        >
          <p className="text-sm font-medium text-primary flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-lotus-500" />
            أو اكتب كود الموافقة من المدير
          </p>
          <p className="text-[11px] text-muted">المدير يقولك الكود الظاهر عنده في Google Authenticator (بيتغيّر كل 30 ثانية).</p>
          <input
            dir="ltr"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(onlyDigits(e.target.value))}
            className={codeInput}
          />
          {w.wrongCode && !auth.busy && <p className="text-xs text-red-500">الكود غلط أو انتهى — اطلب الكود الحالي من المدير.</p>}
          <button
            type="submit"
            disabled={code.length !== 6 || auth.busy}
            className="w-full py-2.5 rounded-xl bg-lotus-500 text-white font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            {auth.busy && <Loader2 className="w-4 h-4 animate-spin" />}
            تأكيد الجهاز
          </button>
        </form>
      )}

      {auth.error && <p className="text-sm text-red-500 text-center">{auth.error}</p>}

      <button type="button" onClick={auth.reset} className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-muted hover:text-lotus-500">
        <ArrowRight className="w-4 h-4" />
        رجوع لصفحة الدخول
      </button>
    </div>
  );
}
