import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import ProjectsDirectoryPage from './projects-directory';

export default async function ProjectsPage() {
  const t = await getTranslations('common');

  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">{t('loadingPage')}</div>
      }
    >
      <ProjectsDirectoryPage />
    </Suspense>
  );
}
