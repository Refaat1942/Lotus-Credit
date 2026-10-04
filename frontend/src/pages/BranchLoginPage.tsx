import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, Store } from 'lucide-react';
import LotusLogo from '../components/LotusLogo';
import { useBranding } from '../hooks/useBranding';
import { setSession } from '../utils/session';

export default function BranchLoginPage({ required }: { required?: boolean }) {
  const branding = useBranding();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.status === 429) throw new Error('محاولات كتير — استنى دقيقة وجرب تاني');
      if (!res.ok) throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
      setSession(await res.json());
      navigate('/', { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.form initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} onSubmit={submit} className="glass-card p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <LotusLogo size="md" />
          </div>
          <div className="w-12 h-12 rounded-2xl bg-lotus-500/20 flex items-center justify-center mx-auto mb-3">
            <Store className="w-6 h-6 text-lotus-500" />
          </div>
          <h1 className="text-2xl font-bold text-primary">دخول الفرع</h1>
          <p className="text-muted text-sm mt-1">
            {required ? `سجّل دخول عشان تستخدم ${branding.titleAr}` : 'سجّل دخول باسم الفرع أو المستخدم'}
          </p>
        </div>

        <input
          placeholder="اسم المستخدم"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoFocus
          autoComplete="username"
          className="w-full py-3 px-4 rounded-xl input-theme mb-3 focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          className="w-full py-3 px-4 rounded-xl input-theme mb-4 focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
        />
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={busy || !username || !password}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-lotus-500 to-lotus-600 text-white font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <LogIn className="w-5 h-5" />
          {busy ? 'جاري الدخول...' : 'دخول'}
        </button>

        {!required && (
          <Link to="/" className="block text-center text-muted text-sm mt-4 hover:text-lotus-500">
            العودة للتطبيق
          </Link>
        )}
      </motion.form>
    </div>
  );
}
