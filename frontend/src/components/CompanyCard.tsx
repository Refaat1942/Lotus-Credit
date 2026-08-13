import { motion } from 'framer-motion';
import {
  Shield, Heart, Globe, Activity, Network, Building2, Stethoscope,
  CheckCircle, FileText, Mail, User, Atom, HeartPulse, Cpu, Plus,
  Zap, Droplets, Users, ExternalLink, Phone, ChevronLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Company } from '../types';

const iconMap: Record<string, React.ElementType> = {
  shield: Shield, heart: Heart, globe: Globe, pulse: Activity,
  network: Network, hospital: Building2, medical: Stethoscope,
  check: CheckCircle, file: FileText, mail: Mail, user: User,
  atom: Atom, care: HeartPulse, tech: Cpu, plus: Plus,
  direct: Zap, oil: Droplets, group: Users,
};

interface CompanyCardProps {
  company: Company;
  index: number;
}

export default function CompanyCard({ company, index }: CompanyCardProps) {
  const Icon = iconMap[company.icon || 'shield'] || Shield;
  const color = company.color || '#14b8a6';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
    >
      <Link to={`/company/${company.id}`} className="block">
        <div className="glass-card p-5 h-full relative overflow-hidden group">
          <div
            className="absolute top-0 left-0 w-full h-1 rounded-t-2xl"
            style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
          />
          <div
            className="absolute -top-10 -left-10 w-32 h-32 rounded-full opacity-10 blur-2xl group-hover:opacity-20 transition-opacity"
            style={{ backgroundColor: color }}
          />

          <div className="flex items-start justify-between mb-4">
            <motion.div
              whileHover={{ rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
              style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
            >
              <Icon className="w-7 h-7 text-white" />
            </motion.div>
            {company.hotline && (
              <span className="flex items-center gap-1 text-xs text-slate-400 bg-white/5 px-2 py-1 rounded-lg">
                <Phone className="w-3 h-3" />
                {company.hotline}
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{company.nameAr}</h3>
          <p className="text-sm text-slate-400 mb-3">{company.nameEn}</p>

          {company.approvalSystem && (
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-white/10 text-lotus-300 mb-3">
              {company.approvalSystem}
            </span>
          )}

          {company.media && company.media.length > 0 && (
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-400 mb-3 mr-2">
              {company.media.length} بطاقة/صورة
            </span>
          )}
          {company.links && company.links.length > 0 && (
            <span className="inline-block text-xs px-2.5 py-1 rounded-full bg-white/5 text-slate-400 mb-3">
              {company.links.length} رابط
            </span>
          )}

          <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
            <span className="text-xs text-slate-500">
              {company.forms?.length || 0} طرق صرف
            </span>
            <motion.span
              className="flex items-center gap-1 text-sm text-lotus-400 group-hover:text-lotus-300"
              whileHover={{ x: -4 }}
            >
              التفاصيل
              <ChevronLeft className="w-4 h-4" />
            </motion.span>
          </div>

          {company.approvalPortal && (
            <div className="mt-2 flex items-center gap-1 text-xs text-slate-500 truncate">
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{company.approvalPortal.replace('https://', '')}</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
