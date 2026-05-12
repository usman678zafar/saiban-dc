import OrphanApplicationWizard from '@/components/orphan-application-wizard';
import AppShell from '@/components/app-shell';

export default function NewApplicationPage() {
  return (
    <AppShell
      title="New Orphan Application"
      description="Follow the numbered steps from collector details through review and submission."
      maxWidth="max-w-5xl"
    >
      <OrphanApplicationWizard />
    </AppShell>
  );
}
