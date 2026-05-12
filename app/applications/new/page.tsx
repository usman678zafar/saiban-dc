import OrphanApplicationWizard from '@/components/orphan-application-wizard';

export default function NewApplicationPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">New Orphan Application</h1>
          <p className="mt-2 text-slate-600">Use the multi-step form to capture orphan registration information in English and Urdu.</p>
        </div>
        <OrphanApplicationWizard />
      </div>
    </main>
  );
}
