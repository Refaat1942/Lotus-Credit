import { useEffect, useRef, useState } from 'react';
import { Bot, CheckCircle2, KeyRound, Loader2, ScanText, Send, Sparkles } from 'lucide-react';

interface Status {
  hasKey: boolean;
  keySource: 'panel' | 'server' | null;
  keyHint: string;
  model: string;
  models: string[];
  mediaTotal: number;
  mediaRead: number;
  unread: { id: string; companyId: string; title: string }[];
}

/** Owner only: the smart assistant's AI key and model, reading the pictures' text, and a test box. */
export default function AssistantSettings({ adminToken }: { adminToken: string }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [key, setKey] = useState('');
  const [model, setModel] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [reading, setReading] = useState<{ done: number; total: number; failed: number } | null>(null);
  const stop = useRef(false);
  const [q, setQ] = useState('');
  const [testing, setTesting] = useState(false);
  const [reply, setReply] = useState<{ answer: string; engine: string } | null>(null);
  const auth = { Authorization: `Bearer ${adminToken}` };
  const json = { ...auth, 'Content-Type': 'application/json' };

  const load = () =>
    fetch('/api/admin/assistant', { headers: auth })
      .then((r) => r.json())
      .then((s: Status) => {
        setStatus(s);
        setModel(s.model);
      })
      .catch(() => {});

  useEffect(() => {
    load();
    return () => {
      stop.current = true;
    };
  }, []);

  const save = async (body: Record<string, unknown>) => {
    setSaving(true);
    setMsg('');
    try {
      const res = await fetch('/api/admin/assistant', { method: 'PUT', headers: json, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'فشل الحفظ');
      setKey('');
      setMsg('تم الحفظ ✓');
      await load();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const readAll = async () => {
    if (!status) return;
    stop.current = false;
    const list = status.unread;
    let failed = 0;
    setReading({ done: 0, total: list.length, failed: 0 });
    for (let i = 0; i < list.length && !stop.current; i++) {
      const res = await fetch(`/api/admin/assistant/read-media/${encodeURIComponent(list[i].id)}`, { method: 'POST', headers: auth }).catch(() => null);
      if (!res?.ok) failed += 1;
      setReading({ done: i + 1, total: list.length, failed });
    }
    await load();
  };

  const test = async () => {
    if (!q.trim()) return;
    setTesting(true);
    setReply(null);
    try {
      const res = await fetch('/api/admin/assistant/test', { method: 'POST', headers: json, body: JSON.stringify({ message: q }) });
      setReply(await res.json());
    } finally {
      setTesting(false);
    }
  };

  if (!status) return null;
  const input = 'py-2 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50';
  const busyReading = reading !== null && reading.done < reading.total;

  return (
    <div className="glass-card p-5 space-y-5 mb-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Bot className="w-5 h-5 text-lotus-400" />
            المساعد الذكي
          </h2>
          <p className="text-xs text-muted mt-1 max-w-2xl leading-relaxed">
            المساعد بيجاوب من كل بيانات الشركات اللي في البرنامج: الشروط والخطوات والنقاط والملاحظات والمحظورات و«قبل ما تقفل
            الفاتورة» والروابط — وكمان النص المكتوب جوه صور النماذج بعد ما تخليه يقراها تحت. وبيفتكر الكلام اللي قبله.
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full ${
            status.hasKey ? 'bg-emerald-500/15 text-emerald-300' : 'bg-amber-500/15 text-amber-400'
          }`}
        >
          {status.hasKey ? <Sparkles className="w-3.5 h-3.5" /> : null}
          {status.hasKey ? `شغال بالذكاء الاصطناعي (${status.model})` : 'شغال بالبحث العادي — حط مفتاح للذكاء الاصطناعي'}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <p className="text-sm font-medium flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-lotus-400" />
            مفتاح OpenAI
          </p>
          <div className="flex gap-2">
            <input
              dir="ltr"
              type="password"
              autoComplete="off"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={status.hasKey ? `محفوظ ${status.keyHint}${status.keySource === 'server' ? ' (من السيرفر)' : ''}` : 'sk-...'}
              className={`${input} flex-1 min-w-0`}
            />
            <button
              type="button"
              disabled={!key.trim() || saving}
              onClick={() => save({ apiKey: key })}
              className="px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ'}
            </button>
          </div>
          <p className="text-[11px] text-muted">
            من platform.openai.com ← API keys. بنتأكد إن المفتاح شغال قبل ما يتحفظ، وبيتحفظ على السيرفر بس ومش بيظهر تاني.
            {status.keySource === 'panel' && (
              <button type="button" onClick={() => confirm('مسح المفتاح؟ المساعد هيرجع للبحث العادي.') && save({ removeKey: true })} className="text-red-400 hover:underline mr-1">
                مسح المفتاح
              </button>
            )}
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">الموديل</p>
          <div className="flex gap-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className={`${input} flex-1 text-primary`}>
              {[...new Set([status.model, ...status.models])].map((m) => (
                <option key={m} value={m} className="text-black">
                  {m}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={model === status.model || saving}
              onClick={() => save({ model })}
              className="px-4 py-2 rounded-xl bg-white/10 text-sm disabled:opacity-40"
            >
              حفظ
            </button>
          </div>
          <p className="text-[11px] text-muted">gpt-4o-mini رخيص وسريع. gpt-4.1 / gpt-4o أذكى وأغلى. لو اخترت موديل مش متاح لحسابك بيرجع لـ gpt-4o-mini لوحده.</p>
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-300">{msg}</p>}

      <div className="rounded-xl border border-white/10 p-4 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium flex items-center gap-1.5">
              <ScanText className="w-4 h-4 text-lotus-400" />
              قراءة النص اللي جوه الصور والنماذج
            </p>
            <p className="text-[11px] text-muted mt-0.5">
              كتير من الشروط مكتوبة في جداول جوه صور النماذج. الذكاء الاصطناعي بيقراها مرة واحدة وتتحفظ، وأي صورة جديدة أو متغيّرة بتحتاج تتقري.
            </p>
          </div>
          <span className="text-sm tabular-nums">
            {status.mediaRead} / {status.mediaTotal} مقروءة
          </span>
        </div>
        {busyReading ? (
          <div className="space-y-1">
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div className="h-full bg-lotus-500 transition-all" style={{ width: `${(reading.done / reading.total) * 100}%` }} />
            </div>
            <p className="text-xs text-muted flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              بيقرا {reading.done} من {reading.total}… (سيب الصفحة مفتوحة)
              <button type="button" onClick={() => (stop.current = true)} className="text-red-400 hover:underline mr-2">
                إيقاف
              </button>
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!status.hasKey || status.unread.length === 0}
              onClick={readAll}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-lotus-500 text-white text-sm font-medium disabled:opacity-40"
            >
              <ScanText className="w-4 h-4" />
              {status.unread.length ? `اقرا ${status.unread.length} صورة` : 'كل الصور مقروءة'}
            </button>
            {status.unread.length === 0 && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {!status.hasKey && <span className="text-xs text-amber-400">محتاج مفتاح OpenAI الأول</span>}
            {reading && reading.failed > 0 && <span className="text-xs text-red-400">{reading.failed} صورة ماتقرتش — دوس تاني</span>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">جرّب المساعد</p>
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && test()}
            placeholder="مثلاً: ميتلايف لو الروشتة عدّت 1500 جنيه أعمل إيه؟"
            className={`${input} flex-1 min-w-0`}
          />
          <button type="button" onClick={test} disabled={testing || !q.trim()} className="px-4 py-2 rounded-xl bg-lotus-500 text-white disabled:opacity-50">
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        {reply && (
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 text-sm whitespace-pre-wrap leading-relaxed">
            <span className="block text-[11px] text-muted mb-1">{reply.engine === 'ai' ? '✨ رد الذكاء الاصطناعي' : '🔎 رد البحث العادي'}</span>
            {reply.answer}
          </div>
        )}
      </div>
    </div>
  );
}
