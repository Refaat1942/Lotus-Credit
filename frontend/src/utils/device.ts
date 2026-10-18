const KEY = 'lotus-device-id';

/** This browser's device ID (given by the server on first sign-in; a cookie keeps a second copy). */
export function getDeviceId(): string {
  try {
    return localStorage.getItem(KEY) || '';
  } catch {
    return '';
  }
}

export function setDeviceId(id: string) {
  try {
    if (id) localStorage.setItem(KEY, id);
  } catch {
    /* storage unavailable: the server's cookie still identifies the device */
  }
}

/** Extra hints so the owner sees which phone it is (Chrome on Android reports the real model here). */
export async function deviceHints(): Promise<Record<string, string | number>> {
  const hints: Record<string, string | number> = {
    screen: `${screen.width}×${screen.height}`,
    touchPoints: navigator.maxTouchPoints || 0,
  };
  const uad = (navigator as Navigator & {
    userAgentData?: { getHighEntropyValues: (k: string[]) => Promise<Record<string, string>> };
  }).userAgentData;
  if (uad) {
    try {
      const v = await uad.getHighEntropyValues(['model', 'platformVersion']);
      if (v.model) hints.model = v.model;
      if (v.platformVersion) hints.platformVersion = v.platformVersion;
    } catch {
      /* not allowed: the user agent alone is used */
    }
  }
  return hints;
}

export interface DeviceSummary {
  kind: string;
  model?: string;
  os: string;
  browser: string;
}

export const deviceText = (d: DeviceSummary) => [d.kind, d.model, d.os, d.browser].filter(Boolean).join(' · ');
