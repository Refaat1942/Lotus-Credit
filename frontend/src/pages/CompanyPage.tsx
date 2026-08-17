import { useParams, Link } from 'react-router-dom';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import Header from '../components/Header';
import DispensingGuide from '../components/DispensingGuide';
import { useRules } from '../hooks/useRules';
import { useLanguage } from '../context/LanguageContext';
import { uiText } from '../data/uiStrings';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, online, refetch, loading } = useRules();
  const { lang } = useLanguage();
  const company = data?.companies.find((c) => c.id === id);
  const BackIcon = lang === 'ar' ? ArrowRight : ArrowLeft;

  if (!company && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4 text-primary">{uiText('companyNotFound', lang)}</p>
          <Link to="/" className="text-lotus-500 hover:underline">{uiText('backHome', lang)}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header online={online} onRefresh={refetch} loading={loading} />

      <main className="max-w-4xl mx-auto px-4 py-5 sm:py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-muted hover:text-lotus-500 mb-4 transition-colors text-sm"
        >
          <BackIcon className="w-4 h-4" />
          {uiText('backToCompanies', lang)}
        </Link>

        {company && <DispensingGuide company={company} globalCoach={data?.coach} />}
      </main>
    </div>
  );
}
