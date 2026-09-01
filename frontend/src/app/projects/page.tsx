import { Suspense } from 'react';
import ProjectsDirectoryPage from './projects-directory';

export default function ProjectsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500">جاري التحميل...</div>
      }
    >
      <ProjectsDirectoryPage />
    </Suspense>
  );
}
