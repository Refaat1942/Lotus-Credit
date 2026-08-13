import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface ChatImage {
  url: string;
  title: string;
  type: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  images?: ChatImage[];
}

export default function SmartAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'أهلاً يا فندم! 👋\n\nأنا **مساعد لوتس** — اسألني أي حاجة عن شروط صرف التعاقدات بالمصري.\n\nمثال:\n• "AXA بصرف إزاي؟"\n• "كارنية MetLife"\n• "رابط يوداوي"\n• "محظورات Medmark"',
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: q }]);
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content: data.answer || 'معلش مقدرتش أجاوب دلوقتي.',
          images: data.images,
        },
      ]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'في مشكلة في الاتصال. تأكد من النت وجرب تاني.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-lotus-500 to-lotus-700 text-white shadow-lg shadow-lotus-500/40 flex items-center justify-center"
        title="مساعد لوتس الذكي"
      >
        <MessageCircle className="w-7 h-7" />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-amber-900" />
        </span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 left-6 z-50 w-[min(100vw-2rem,400px)] h-[min(70vh,560px)] glass rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-theme"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-theme bg-lotus-500/10">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-lotus-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-lotus-500" />
                </div>
                <div>
                  <p className="font-bold text-sm text-primary">مساعد لوتس</p>
                  <p className="text-[10px] text-muted">بيعرف كل الشروط · عامية مصرية</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-surface">
                <X className="w-5 h-5 text-muted" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${
                      msg.role === 'user' ? 'bg-lotus-500/20' : 'bg-surface'
                    }`}
                  >
                    {msg.role === 'user' ? (
                      <User className="w-4 h-4 text-lotus-600" />
                    ) : (
                      <Bot className="w-4 h-4 text-lotus-500" />
                    )}
                  </div>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      msg.role === 'user'
                        ? 'bg-lotus-500 text-white rounded-tl-sm'
                        : 'bg-surface text-primary rounded-tr-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">
                      {msg.content.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
                        part.startsWith('**') && part.endsWith('**') ? (
                          <strong key={j}>{part.slice(2, -2)}</strong>
                        ) : (
                          <span key={j}>{part}</span>
                        )
                      )}
                    </div>
                    {msg.images && msg.images.length > 0 && (
                      <div className="mt-2 grid gap-2">
                        {msg.images.map((img, j) => (
                          <a
                            key={j}
                            href={img.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block rounded-lg overflow-hidden border border-theme"
                          >
                            <img
                              src={img.url}
                              alt={img.title}
                              className="w-full max-h-40 object-contain bg-black/5"
                            />
                            <p className="text-[10px] p-1 text-muted truncate">{img.title}</p>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2 items-center text-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  بفكر...
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-3 border-t border-theme flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && send()}
                placeholder="اسأل بالمصري... مثلاً: AXA بصرف إزاي؟"
                className="flex-1 input-theme rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-lotus-500/50"
              />
              <button
                onClick={send}
                disabled={loading || !input.trim()}
                className="p-2 rounded-xl bg-lotus-500 text-white disabled:opacity-50"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
