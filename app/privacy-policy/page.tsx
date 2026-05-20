export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <section className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Saiban</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Privacy Policy</h1>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Saiban uses account information only to support volunteer registration, sign in, and orphan data collection workflows.
          Personal details are stored for operational use by authorized users and are not sold or shared for marketing.
        </p>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          Volunteers should enter accurate contact information and keep their login details private. Access may be reviewed or
          revoked to protect applicant and household information.
        </p>
        <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Saiban. All rights reserved.
        </div>
      </section>
    </main>
  );
}

