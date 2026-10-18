import { useRef, useState } from 'react';
import type { Account } from '../utils/session';
import { deviceHints, getDeviceId, setDeviceId, type DeviceSummary } from '../utils/device';

export type DeviceWait =
  | { kind: 'pending'; device: DeviceSummary; codeAvailable: boolean; wrongCode: boolean }
  | { kind: 'blocked' };

/**
 * Sign-in with the extra steps: the owner's Google Authenticator code,
 * and a new device waiting for the owner's approval (or approved on the spot with the owner's code).
 */
export function useSignIn(url: string, onSuccess: (s: { token: string; user: Account }) => Promise<void> | void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [otpNeeded, setOtpNeeded] = useState(false);
  const [otp, setOtp] = useState('');
  const [waiting, setWaiting] = useState<DeviceWait | null>(null);
  const creds = useRef({ username: '', password: '' });
  const running = useRef(false);

  const run = async (extra: { deviceCode?: string } = {}) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...creds.current,
          ...(otpNeeded && otp ? { otp } : {}),
          ...extra,
          deviceId: getDeviceId() || undefined,
          device: await deviceHints(),
        }),
      });
      if (res.status === 429) throw new Error('محاولات كتير — استنى دقيقة وجرب تاني');
      const body = await res.json().catch(() => ({}));
      if (body.deviceId) setDeviceId(body.deviceId);

      if (res.ok) {
        setWaiting(null);
        await onSuccess(body);
      } else if (body.error === 'otp_required') {
        setOtpNeeded(true);
        setOtp('');
        if (body.wrong) setError('كود Google Authenticator غلط أو اتستخدم قبل كده — اكتب الكود الحالي');
      } else if (body.error === 'device_pending') {
        setWaiting({ kind: 'pending', device: body.device, codeAvailable: !!body.codeAvailable, wrongCode: !!body.wrongCode });
      } else if (body.error === 'device_blocked') {
        setWaiting({ kind: 'blocked' });
      } else {
        throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  };

  return {
    busy,
    error,
    otpNeeded,
    otp,
    setOtp,
    waiting,
    submit: (username: string, password: string) => {
      creds.current = { username, password };
      return run();
    },
    retry: run,
    reset: () => {
      setWaiting(null);
      setOtpNeeded(false);
      setOtp('');
      setError('');
    },
  };
}

export type SignIn = ReturnType<typeof useSignIn>;
