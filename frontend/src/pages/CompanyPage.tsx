import { useParams, Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import DispensingGuide from '../components/DispensingGuide';
import { useRules } from '../hooks/useRules';
import { useAppCopy } from '../hooks/useAppCopy';

export default function CompanyPage() {
  const { id } = useParams<{ id: string }>();
  const { data, online, refetch, loading } = useRules();
  const { u } = useAppCopy(data?.ui);
  const company = data?.companies.find((c) => c.id === id);

  if (!company && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl mb-4 text-primary">{u('company', 'companyNotFound')}</p>
          <Link to="/" className="text-lotus-500 hover:underline">{u('company', 'backHome')}</Link>
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
          <ArrowRight className="w-4 h-4" />
          {u('company', 'backToCompanies')}
        </Link>

        {company && (
          <DispensingGuide
            company={company}
            globalCoach={data?.coach}
            ui={data?.ui}
            guide={data?.guide}
          />
        )}
      </main>
    </div>
  );
}
