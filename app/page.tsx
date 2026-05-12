import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-8">
        <div className="rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900">Saiban Orphan Support</h1>
          <p className="mt-4 text-lg text-slate-600">
            Temporary field data collection app for orphan registration. Build forms, upload documents, and manage application status.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Link href="/dashboard" className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-slate-700">
              Dashboard
            </Link>
            <Link href="/applications" className="rounded-2xl bg-slate-900 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-slate-700">
              Applications
            </Link>
            <Link href="/applications/new" className="rounded-2xl bg-blue-600 px-5 py-4 text-center text-sm font-semibold text-white transition hover:bg-blue-500">
              New Application
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
