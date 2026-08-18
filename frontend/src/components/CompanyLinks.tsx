import { motion } from 'framer-motion';
import {
  ExternalLink, Mail, Phone, Globe, Link2, Copy, Check,
} from 'lucide-react';
import { useState } from 'react';
import type { CompanyLink } from '../types';

interface CompanyLinksProps {
  links: CompanyLink[];
  accentColor?: string;
  linksTitle?: string;
  copyLabel?: string;
}

const typeIcons = {
  portal: Globe,
  email: Mail,
  phone: Phone,
  website: ExternalLink,
};

export default function CompanyLinks({
  links,
  accentColor = '#14b8a6',
  linksTitle = 'روابط مهمة',
  copyLabel = 'نسخ',
}: CompanyLinksProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!links.length) return null;

  const copy = (url: string, id: string) => {
    const text = url.replace(/^mailto:/, '').replace(/^tel:/, '');
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-6 mb-6"
    >
      <h2 className="flex items-center gap-2 text-xl font-bold mb-4">
        <Link2 className="w-6 h-6 text-lotus-400" />
        {linksTitle}
        <span className="text-sm font-normal text-muted">({links.length})</span>
      </h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {links.map((link, i) => {
          const Icon = typeIcons[link.type] || ExternalLink;
          const href = link.url;
          const isExternal = link.type === 'portal' || link.type === 'website';
          const isMail = link.type === 'email';
          const isPhone = link.type === 'phone';

          return (
            <motion.div
              key={link.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="flex items-stretch gap-2 rounded-xl border border-theme overflow-hidden bg-surface/50"
            >
              <a
                href={href}
                target={isExternal ? '_blank' : undefined}
                rel={isExternal ? 'noopener noreferrer' : undefined}
                className="flex-1 flex items-center gap-3 p-3 hover:bg-surface-hover transition-colors min-w-0"
              >
                <span
                  className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
                >
                  <Icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary truncate">{link.label}</p>
                  <p className="text-xs text-muted truncate dir-ltr text-left">
                    {link.url.replace(/^mailto:/, '').replace(/^tel:/, '')}
                  </p>
                </div>
                {isExternal && <ExternalLink className="w-4 h-4 text-muted flex-shrink-0" />}
              </a>
              {(isMail || isPhone) && (
                <button
                  type="button"
                  onClick={() => copy(link.url, link.id)}
                  className="px-3 border-r border-theme hover:bg-surface-hover transition-colors"
                  title={copyLabel}
                >
                  {copied === link.id ? (
                    <Check className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <Copy className="w-4 h-4 text-muted" />
                  )}
                </button>
              )}
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}
