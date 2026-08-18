import { useEffect } from 'react';
import { useRules } from '../hooks/useRules';

export default function DocumentTitle() {
  const { data } = useRules();

  useEffect(() => {
    if (data?.meta?.titleAr) {
      document.title = data.meta.titleAr;
    }
  }, [data?.meta?.titleAr]);

  return null;
}
