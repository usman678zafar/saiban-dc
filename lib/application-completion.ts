import { calculateApplicationCompletion } from '@/lib/application-review';
import { applicationToWizardData } from '@/lib/application-wizard-data';

type CompletionDocument = {
  documentType?: string | null;
};

type CompletionInput = Record<string, unknown> & {
  siblings?: unknown;
  relatives?: unknown;
  householdAssets?: unknown;
  documents?: CompletionDocument[];
};

type CompletionMetrics = {
  filledFieldsCount: number;
  totalMeaningfulFields: number;
  filledFieldsPercentage: number;
};

function completionDocuments(documents: CompletionDocument[]) {
  return documents
    .map((document) => document.documentType)
    .filter((documentType): documentType is string => typeof documentType === 'string' && documentType.trim() !== '')
    .map((documentType) => ({ documentType }));
}

export function calculateFilledFields(
  application: CompletionInput,
  documents: CompletionDocument[] = application.documents ?? [],
): CompletionMetrics {
  const completion = calculateApplicationCompletion(
    applicationToWizardData(application),
    completionDocuments(documents),
  );

  return {
    filledFieldsCount: completion.complete,
    totalMeaningfulFields: completion.total,
    filledFieldsPercentage: completion.percentage,
  };
}

export function completionSelect() {
  return {
    siblings: true,
    relatives: true,
    householdAssets: true,
    documents: {
      select: {
        documentType: true,
      },
    },
  } as const;
}
