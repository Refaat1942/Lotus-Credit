import { motion } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, Info, Ban } from 'lucide-react';

interface RuleItemProps {
  label: string;
  value: string | boolean | undefined;
  type?: 'text' | 'boolean';
}

export function RuleItem({ label, value, type = 'text' }: RuleItemProps) {
  if (value === undefined || value === null || value === '') return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 p-3 rounded-xl bg-surface/60 border border-theme"
    >
      {type === 'boolean' ? (
        value ? (
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
        ) : (
          <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
        )
      ) : (
        <Info className="w-5 h-5 text-lotus-400 flex-shrink-0 mt-0.5" />
      )}
      <div>
        <p className="text-sm text-muted">{label}</p>
        <p className="text-primary font-medium">
          {type === 'boolean' ? (value ? 'نعم / يلزم' : 'لا / غير يلزم') : String(value)}
        </p>
      </div>
    </motion.div>
  );
}

interface NotesListProps {
  title: string;
  items: string[];
  variant?: 'info' | 'warning' | 'danger';
}

export function NotesList({ title, items, variant = 'info' }: NotesListProps) {
  if (!items?.length) return null;

  const icons = { info: Info, warning: AlertTriangle, danger: Ban };
  const colors = {
    info: 'text-lotus-400 bg-lotus-500/10 border-lotus-500/30',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    danger: 'text-red-400 bg-red-500/10 border-red-500/30',
  };
  const Icon = icons[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl border p-5 ${colors[variant]}`}
    >
      <h4 className="flex items-center gap-2 font-bold mb-4">
        <Icon className="w-5 h-5" />
        {title}
      </h4>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="flex items-start gap-2 text-sm text-primary/90"
          >
            <span className="text-lotus-400 mt-1">•</span>
            {item}
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

interface StepWizardProps {
  steps: { title: string; content: string }[];
}

export function StepWizard({ steps }: StepWizardProps) {
  return (
    <div className="space-y-4">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
          className="flex gap-4"
        >
          <div className="flex flex-col items-center">
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="w-10 h-10 rounded-full bg-gradient-to-br from-lotus-400 to-lotus-600 flex items-center justify-center font-bold text-white shadow-lg shadow-lotus-500/30"
            >
              {i + 1}
            </motion.div>
            {i < steps.length - 1 && (
              <div className="w-0.5 h-full min-h-[40px] bg-gradient-to-b from-lotus-500/50 to-transparent mt-2" />
            )}
          </div>
          <div className="flex-1 pb-6">
            <h4 className="font-bold text-primary mb-1">{step.title}</h4>
            <p className="text-sm text-muted leading-relaxed">{step.content}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
