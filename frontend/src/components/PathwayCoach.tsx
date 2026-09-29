import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, ExternalLink, RotateCcw, Sparkles, Undo2, X, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Company, CompanyMedia, PathwayOption } from '../types';
import CompanyLogo from './CompanyLogo';
import { ChatBubble, type ChatLine } from './DispensingCoach';
import { stepMedia } from '../utils/pathway';

interface PathwayCoachProps {
  company: Company;
  onExit?: () => void;
  /** Admin preview: no navigation to home */
  preview?: boolean;
}

let seq = 0;
const lid = () => `pw-${++seq}`;

export default function PathwayCoach({ company, onExit, preview }: PathwayCoachProps) {
  const pathway = company.pathway!;
  const media = company.media || [];
  const color = company.color || '#14b8a6';
  const byId = useMemo(() => new Map(pathway.steps.map((s) => [s.id, s])), [pathway.steps]);

  const [history, setHistory] = useState<ChatLine[]>([]);
  const [trail, setTrail] = useState<{ stepId: string | null; lines: number }[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<CompanyMedia | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const coachLineFor = (stepId: string): ChatLine | null => {
    const step = byId.get(stepId);
    if (!step) return null;
    const docs = stepMedia(step, media);
    return {
      id: lid(),
      from: 'coach',
      text: step.message || step.title,
      bullets: step.bullets?.filter(Boolean),
      ...(docs[0] ? { doc: docs[0] } : {}),
      ...(docs.length > 1 ? { docs: docs.slice(1) } : {}),
    };
  };

  const start = () => {
    const line = coachLineFor(pathway.startId);
    setHistory(line ? [line] : []);
    setTrail([]);
    setCurrentId(pathway.startId);
  };

  useEffect(start, [pathway.startId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const choose = (opt: PathwayOption) => {
    const userLine: ChatLine = { id: lid(), from: 'user', text: opt.label };
    const next = opt.next && byId.has(opt.next) ? opt.next : null;
    const coachLine = next ? coachLineFor(next) : null;
    setTrail((t) => [...t, { stepId: currentId, lines: history.length }]);
    setHistory((h) => [
      ...h,
      userLine,
      coachLine ?? { id: lid(), from: 'coach', text: 'تم ✓ انتهى المسار.' },
    ]);
    setCurrentId(next);
  };

  const back = () => {
    const last = trail[trail.length - 1];
    if (!last) return;
    setTrail((t) => t.slice(0, -1));
    setHistory((h) => h.slice(0, last.lines));
    setCurrentId(last.stepId);
  };

  const current = currentId ? byId.get(currentId) : null;
  const finished = !current || current.options.length === 0;

  return (
    <div className={`flex flex-col ${preview ? 'h-full' : 'min-h-[calc(100vh-120px)]'}`}>
      <div className={`${preview ? '' : 'sticky top-[52px]'} z-40 -mx-1 px-1 py-2 bg-[var(--color-bg-start)]/95 backdrop-blur-md border-b border-theme`}>
        <div className="flex items-center gap-3">
          <CompanyLogo company={company} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-primary text-sm truncate flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-lotus-500 shrink-0" />
              مسار الصرف — {company.nameAr}
            </p>
            <p className="text-[11px] text-muted">اختار الإجابة المناسبة في كل خطوة</p>
          </div>
          {trail.length > 0 && (
            <button
              type="button"
              onClick={back}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary hover:bg-surface border border-theme"
            >
              <Undo2 className="w-3.5 h-3.5" />
              رجوع
            </button>
          )}
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs text-muted hover:text-primary hover:bg-surface border border-theme"
            >
              <BookOpen className="w-3.5 h-3.5" />
              المرجع
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-1 py-4 space-y-4">
        {history.map((line) => (
          <ChatBubble key={line.id} line={line} color={color} onZoom={setLightbox} />
        ))}
        <div ref={bottomRef} />
      </div>

      <div className={`${preview ? '' : 'sticky bottom-0'} z-40 -mx-1 px-1 pt-2 pb-4 bg-gradient-to-t from-[var(--color-bg-start)] via-[var(--color-bg-start)] to-transparent`}>
          <motion.div
            key={`${currentId}-${history.length}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-wrap gap-2 justify-end"
          >
            {current?.link?.url && (
              <a
                href={current.link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-surface border border-lotus-500/40 text-primary"
              >
                <ExternalLink className="w-4 h-4" />
                {current.link.label || 'فتح الرابط'}
              </a>
            )}
            {!finished &&
              current!.options.map((opt, i) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => choose(opt)}
                  className={`inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                    i === 0
                      ? 'bg-gradient-to-r from-lotus-500 to-lotus-600 text-white shadow-lg shadow-lotus-500/25'
                      : 'bg-surface border border-theme text-primary hover:bg-surface/80'
                  }`}
                >
                  {opt.label || '—'}
                </button>
              ))}
            {finished && (
              <>
                <button
                  type="button"
                  onClick={start}
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-gradient-to-r from-lotus-500 to-lotus-600 text-white"
                >
                  <RotateCcw className="w-4 h-4" />
                  ابدأ من جديد
                </button>
                {!preview && (
                  <Link
                    to="/"
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-surface border border-theme text-primary"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    الرئيسية
                  </Link>
                )}
              </>
            )}
          </motion.div>
      </div>

      {lightbox && (
        <div className="fixed inset-0 z-[300] bg-black/90 flex flex-col" onClick={() => setLightbox(null)}>
          <div className="flex items-center justify-between p-4 border-b border-white/10" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-medium truncate">{lightbox.title}</p>
            <button type="button" onClick={() => setLightbox(null)} className="p-2 rounded-lg bg-white/10">
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 min-h-0" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.title} className="max-w-full max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}
