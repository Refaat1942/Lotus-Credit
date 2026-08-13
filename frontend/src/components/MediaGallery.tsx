import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ImageIcon, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CompanyMedia } from '../types';
import { galleryMedia } from '../utils/mediaFilters';

interface MediaGalleryProps {
  media: CompanyMedia[];
  companyName: string;
  accentColor?: string;
}

type Filter = 'all' | 'card' | 'photo';

export default function MediaGallery({ media, companyName, accentColor = '#14b8a6' }: MediaGalleryProps) {
  const [filter, setFilter] = useState<Filter>('card');
  const [lightbox, setLightbox] = useState<number | null>(null);

  const visible = useMemo(() => galleryMedia(media), [media]);

  const filtered = useMemo(() => {
    if (filter === 'all') return visible;
    return visible.filter((m) => m.type === filter);
  }, [visible, filter]);

  const cards = visible.filter((m) => m.type === 'card');
  const photos = visible.filter((m) => m.type === 'photo');

  if (!visible.length) return null;

  const open = (index: number) => setLightbox(index);
  const close = () => setLightbox(null);
  const prev = () => setLightbox((i) => (i !== null && i > 0 ? i - 1 : i));
  const next = () =>
    setLightbox((i) => (i !== null && i < filtered.length - 1 ? i + 1 : i));

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 mb-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <ImageIcon className="w-6 h-6 text-lotus-400" />
          البطاقات والصور
          <span className="text-sm font-normal text-slate-400">({visible.length})</span>
        </h2>
        <div className="flex gap-2">
          {(
            [
              ['all', `الكل (${visible.length})`],
              ['card', `بطاقات (${cards.length})`],
              ['photo', `صور (${photos.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === key
                  ? 'bg-lotus-500/25 text-lotus-300 border border-lotus-500/40'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -4, scale: 1.02 }}
            onClick={() => open(index)}
            className="group relative rounded-xl overflow-hidden bg-black/30 border border-white/10 text-right"
          >
            <div className="aspect-[4/3] overflow-hidden">
              <img
                src={item.url}
                alt={item.title}
                loading="lazy"
                className="w-full h-full object-contain bg-black/40 group-hover:scale-105 transition-transform duration-300"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
              <ZoomIn className="w-4 h-4 text-white absolute top-2 left-2" />
            </div>
            <div className="p-2 border-t border-white/5">
              <span
                className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded mb-1"
                style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
              >
                {item.type === 'card' ? (
                  <CreditCard className="w-3 h-3" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
                {item.type === 'card' ? 'بطاقة' : 'صورة'} · ص {item.page}
              </span>
              <p className="text-xs text-slate-300 line-clamp-2 leading-snug">{item.title}</p>
            </div>
          </motion.button>
        ))}
      </div>

      <AnimatePresence>
        {lightbox !== null && filtered[lightbox] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col"
            onClick={close}
          >
            <div
              className="flex items-center justify-between p-4 border-b border-white/10"
              onClick={(e) => e.stopPropagation()}
            >
              <div>
                <p className="font-bold text-white">{companyName}</p>
                <p className="text-sm text-slate-400">{filtered[lightbox].title}</p>
              </div>
              <button
                onClick={close}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div
              className="flex-1 flex items-center justify-center p-4 relative min-h-0"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox > 0 && (
                <button
                  onClick={prev}
                  className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
              <motion.img
                key={filtered[lightbox].id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                src={filtered[lightbox].url}
                alt={filtered[lightbox].title}
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl"
              />
              {lightbox < filtered.length - 1 && (
                <button
                  onClick={next}
                  className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
            </div>
            <p className="text-center text-sm text-slate-500 pb-4">
              {lightbox + 1} / {filtered.length}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
