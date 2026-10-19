import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const WATERMARK = 'صيدليات لوتس';

// a faint repeating, tilted "صيدليات لوتس" (grey works on both the dark and light theme)
const tile = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="280" height="170"><text x="140" y="95" text-anchor="middle" transform="rotate(-25 140 85)" font-family="Segoe UI, Tahoma, Arial, sans-serif" font-size="18" font-weight="600" fill="rgb(128,128,128)" fill-opacity="0.09">${WATERMARK}</text></svg>`,
);

/** Replaces whatever was just copied (e.g. a Print Screen image) with nothing useful. */
function wipeClipboard() {
  try {
    navigator.clipboard?.writeText(' ').catch(() => {});
  } catch {
    /* not allowed here */
  }
  // works on plain http too, where navigator.clipboard doesn't exist
  const onCopy = (e: ClipboardEvent) => {
    e.clipboardData?.setData('text/plain', ' ');
    e.preventDefault();
  };
  document.addEventListener('copy', onCopy);
  try {
    document.execCommand('copy');
  } catch {
    /* not allowed without a key press or click */
  }
  document.removeEventListener('copy', onCopy);
}

/** Hides the page at once (before the screen is grabbed) for a moment. */
function shield(ms: number) {
  const root = document.documentElement;
  root.classList.add('lotus-shield');
  window.setTimeout(() => root.classList.remove('lotus-shield'), ms);
}

/**
 * Content protection for this site only: a faint "صيدليات لوتس" watermark everywhere, printing blocked,
 * Print Screen wipes the copied picture, and Win+Shift (the Windows snipping shortcut) blanks and reloads the page.
 */
export default function ScreenGuard() {
  const onAdmin = useLocation().pathname.startsWith('/admin');

  useEffect(() => {
    // after a Print Screen, wipe again as soon as the page gets a key press or click (the snip lands later)
    let wipePending = false;
    const wipeSoon = () => {
      wipePending = true;
      wipeClipboard();
    };
    const onActivity = () => {
      if (!wipePending) return;
      wipePending = false;
      wipeClipboard();
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        shield(1500);
        wipeSoon();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        return;
      }
      const winShift = (e.key === 'Meta' && e.shiftKey) || (e.key === 'Shift' && e.metaKey) || (e.metaKey && e.shiftKey);
      if (e.type === 'keydown' && winShift) {
        shield(3000);
        wipeSoon();
        // the admin panel is only blanked, so unsaved edits are never lost
        if (!onAdmin) window.setTimeout(() => window.location.reload(), 150);
      }
    };

    window.addEventListener('keydown', onKey, true);
    window.addEventListener('keyup', onKey, true);
    window.addEventListener('pointerdown', onActivity, true);
    window.addEventListener('keydown', onActivity, true);
    window.addEventListener('focus', onActivity);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('keyup', onKey, true);
      window.removeEventListener('pointerdown', onActivity, true);
      window.removeEventListener('keydown', onActivity, true);
      window.removeEventListener('focus', onActivity);
    };
  }, [onAdmin]);

  return (
    <div
      aria-hidden
      className="lotus-watermark fixed inset-0 pointer-events-none select-none z-[9999]"
      style={{ backgroundImage: `url("data:image/svg+xml,${tile}")`, backgroundRepeat: 'repeat' }}
    />
  );
}
