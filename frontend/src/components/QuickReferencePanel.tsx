import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Link2, X, ExternalLink, ChevronDown } from 'lucide-react';
import type { AppCopyBundle } from '../types';
import { useAppCopy } from '../hooks/useAppCopy';

interface QuickReferencePanelProps {
  cardChecklist: string[];
  electronicCardRules?: string[];
  approvalLinks: string[];
  ui?: AppCopyBundle;
}

function linkLabel(url: string, mailPrefix: string): string {
  if (url.startsWith('mailto:')) {
    return url.replace('mailto:', `${mailPrefix} `);
  }
  try {
    return new URL(url).hostname.replace('www.', '');
  } catch {
    return url.slice(0, 40);
  }
}

export default function QuickReferencePanel({
  cardChecklist,
  electronicCardRules = [],
  approvalLinks,
  ui,
}: QuickReferencePanelProps) {
  const { u } = useAppCopy(ui);
  const [modal, setModal] = useState<'card' | 'links' | null>(null);

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-theme">
        <button
          type="button"
          onClick={() => setModal('card')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme bg-surface/60 hover:bg-surface text-sm font-medium text-primary transition-colors"
        >
          <CreditCard className="w-4 h-4 text-lotus-500" />
          {u('quickRef', 'cardButton')}
          <span className="text-xs text-muted">({cardChecklist.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setModal('links')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-theme bg-surface/60 hover:bg-surface text-sm font-medium text-primary transition-colors"
        >
          <Link2 className="w-4 h-4 text-lotus-500" />
          {u('quickRef', 'linksButton')}
          <span className="text-xs text-muted">({approvalLinks.length})</span>
        </button>
      </div>

      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setModal(null)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full sm:max-w-lg max-h-[85vh] overflow-hidden rounded-t-2xl sm:rounded-2xl border border-theme bg-[var(--color-glass-bg)] shadow-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-theme">
                <h2 className="text-base font-bold text-primary flex items-center gap-2">
                  {modal === 'card' ? (
                    <>
                      <CreditCard className="w-5 h-5 text-lotus-500" />
                      {u('quickRef', 'cardModalTitle')}
                    </>
                  ) : (
                    <>
                      <Link2 className="w-5 h-5 text-lotus-500" />
                      {u('quickRef', 'linksModalTitle')}
                    </>
                  )}
                </h2>
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="p-2 rounded-lg hover:bg-surface transition-colors"
                  aria-label={u('quickRef', 'close')}
                >
                  <X className="w-5 h-5 text-muted" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(85vh-4rem)]">
                {modal === 'card' ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold text-primary mb-2">{u('quickRef', 'checklistHeading')}</h3>
                      <ul className="space-y-2">
                        {cardChecklist.map((item, i) => (
                          <li key={i} className="flex gap-2 text-sm text-muted leading-relaxed">
                            <span className="text-lotus-500 font-bold shrink-0">{i + 1}.</span>
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    {electronicCardRules.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold text-primary mb-2">{u('quickRef', 'ecardHeading')}</h3>
                        <ul className="space-y-2">
                          {electronicCardRules.map((item, i) => (
                            <li key={i} className="text-sm text-muted leading-relaxed">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {approvalLinks.map((url, i) => (
                      <li key={i}>
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-3 rounded-xl border border-theme bg-surface/50 hover:bg-surface hover:border-lotus-500/40 transition-colors group"
                        >
                          <ExternalLink className="w-4 h-4 text-lotus-500 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-primary truncate">
                              {linkLabel(url, u('quickRef', 'mailPrefix'))}
                            </p>
                            <p className="text-xs text-muted truncate dir-ltr text-left">
                              {url.replace('mailto:', '')}
                            </p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-muted -rotate-90 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
