import type { CompanyLink } from '../types';

interface MediaLinksProps {
  links: CompanyLink[];
  accentColor?: string;
}

export default function MediaLinks({ links, accentColor = '#14b8a6' }: MediaLinksProps) {
  if (!links?.length) return null;

  return (
    <div className="flex flex-wrap gap-2 px-3 py-2 border-t border-theme bg-surface/30">
      {links.map((link) => (
        <a
          key={link.id}
          href={link.url}
          target={link.type === 'portal' || link.type === 'website' ? '_blank' : undefined}
          rel={link.type === 'portal' || link.type === 'website' ? 'noopener noreferrer' : undefined}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-theme hover:bg-surface transition-colors"
          style={{ borderColor: `${accentColor}40`, color: accentColor }}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
