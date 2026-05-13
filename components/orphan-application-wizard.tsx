'use client';

import { useEffect, useMemo, useState } from 'react';
import { labels } from '@/lib/labels';
import {
  HOUSEHOLD_ASSET_KEYS,
  assetUsesGrams,
  createDefaultHouseholdAssetSelection,
  householdAssetDisplayLabel,
  mergeHouseholdAssetSelection,
  householdAssetRowsToSelection,
  householdSelectionToApiRows,
  type HouseholdAssetKey,
  type HouseholdAssetEntry,
  type HouseholdAssetSelection,
} from '@/lib/household-assets';
import FileUpload from './file-upload';

type SiblingInput = {
  id?: string;
  name: string;
  age: string;
  occupation: string;
  monthlyIncomeOrFee: string;
};

type RelativeInput = {
  id?: string;
  relativeType: 'paternal_uncle' | 'maternal_uncle';
  name: string;
  age: string;
  occupation: string;
  monthlyIncome: string;
};

type DocumentInput = {
  id: string;
  documentType: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  fileKey: string;
};

export type FormData = {
  registrationNumber: string;
  collectorId: string;
  collectorName: string;
  collectorProject: string;
  collectorCnic: string;
  collectorAddress: string;
  collectorContact: string;
  fatherName: string;
  fatherDob: string;
  fatherAge: string;
  fatherCnic: string;
  fatherEducation: string;
  fatherOccupation: string;
  fatherDateOfDeath: string;
  fatherCauseOfDeath: string;
  motherName: string;
  motherDob: string;
  motherAge: string;
  motherCnic: string;
  motherEducation: string;
  motherTongue: string;
  motherNativeArea: string;
  motherAlive: string;
  motherEmploymentStatus: string;
  motherIsGuardian: string;
  motherContact: string;
  motherIsHousewife: boolean;
  motherOccupation: string;
  motherMonthlyIncome: string;
  motherRemarried: boolean;
  motherDeathDate: string;
  motherDeathCause: string;
  guardianName: string;
  guardianRelationship: string;
  guardianCnic: string;
  guardianEducation: string;
  guardianMotherTongue: string;
  guardianNativeArea: string;
  guardianContact: string;
  guardianZakatStatus: string;
  guardianOccupation: string;
  guardianFamilyHolder: string;
  guardianFamilyHolderAmount: string;
  guardianFamilyMembersCount: string;
  guardianMonthlyIncome: string;
  paternalGrandfatherName: string;
  paternalGrandfatherAge: string;
  paternalGrandfatherOccupation: string;
  paternalGrandfatherIncome: string;
  maternalGrandfatherName: string;
  maternalGrandfatherAge: string;
  maternalGrandfatherOccupation: string;
  maternalGrandfatherIncome: string;
  city: string;
  district: string;
  tehsil: string;
  residentialArea: string;
  fullAddress: string;
  longitude: string;
  latitude: string;
  houseOwnershipStatus: string;
  monthlyRent: string;
  rentPaidBy: string;
  houseOwner: string;
  houseCondition: string;
  houseConditionRemarks: string;
  furnishingCondition: string;
  furnishingConditionRemarks: string;
  childName: string;
  gender: string;
  caste: string;
  sect: string;
  bFormNumber: string;
  dateOfBirth: string;
  age: string;
  totalBrothers: string;
  totalSisters: string;
  registeredBrothers: string;
  registeredSisters: string;
  siblingsUnder12: string;
  childLivesWithMother: boolean;
  livingSituationNotes: string;
  healthStatus: string;
  disabilityDetails: string;
  treatmentPlace: string;
  monthlyMedicalExpenses: string;
  currentlyStudying: boolean;
  notStudyingReason: string;
  educationStartCondition: string;
  currentClass: string;
  schoolName: string;
  schoolAddress: string;
  enrolledInMadrasa: boolean;
  madrasaName: string;
  madrasaEducationDetails: string;
  educationFeeStatus: string;
  monthlySchoolFee: string;
  careerGoal: string;
  technicalInterest: string;
  learningSkill: string;
  childMonthlyIncome: string;
  householdEarnersCount: string;
  totalHouseholdIncome: string;
  receivingOtherAid: boolean;
  otherAidSource: string;
  monthlyAidAmount: string;
  notAppliedElsewhereReason: string;
  principalName: string;
  institutionName: string;
  verifiedStudentName: string;
  verifiedFatherName: string;
  verifiedClass: string;
  verifiedMonthlyFee: string;
  imamName: string;
  mosqueName: string;
  neighborhoodCity: string;
  imamMobile: string;
  motherZakatStatus: string;
  guardianSignatureFileKey: string;
  termsAccepted: boolean;
  status: 'draft' | 'submitted';
  siblings: SiblingInput[];
  relatives: RelativeInput[];
  householdAssetSelection: HouseholdAssetSelection;
  documents: DocumentInput[];
};

const defaultData: FormData = {
  registrationNumber: '',
  collectorId: '',
  collectorName: '',
  collectorProject: '',
  collectorCnic: '',
  collectorAddress: '',
  collectorContact: '',
  fatherName: '',
  fatherDob: '',
  fatherAge: '',
  fatherCnic: '',
  fatherEducation: '',
  fatherOccupation: '',
  fatherDateOfDeath: '',
  fatherCauseOfDeath: '',
  motherName: '',
  motherDob: '',
  motherAge: '',
  motherCnic: '',
  motherEducation: '',
  motherTongue: '',
  motherNativeArea: '',
  motherAlive: '',
  motherEmploymentStatus: '',
  motherIsGuardian: '',
  motherContact: '',
  motherIsHousewife: false,
  motherOccupation: '',
  motherMonthlyIncome: '',
  motherRemarried: false,
  motherDeathDate: '',
  motherDeathCause: '',
  guardianName: '',
  guardianRelationship: '',
  guardianCnic: '',
  guardianEducation: '',
  guardianMotherTongue: '',
  guardianNativeArea: '',
  guardianContact: '',
  guardianZakatStatus: '',
  guardianOccupation: '',
  guardianFamilyHolder: '',
  guardianFamilyHolderAmount: '',
  guardianFamilyMembersCount: '',
  guardianMonthlyIncome: '',
  paternalGrandfatherName: '',
  paternalGrandfatherAge: '',
  paternalGrandfatherOccupation: '',
  paternalGrandfatherIncome: '',
  maternalGrandfatherName: '',
  maternalGrandfatherAge: '',
  maternalGrandfatherOccupation: '',
  maternalGrandfatherIncome: '',
  city: '',
  district: '',
  tehsil: '',
  residentialArea: '',
  fullAddress: '',
  longitude: '',
  latitude: '',
  houseOwnershipStatus: '',
  monthlyRent: '',
  rentPaidBy: '',
  houseOwner: '',
  houseCondition: '',
  houseConditionRemarks: '',
  furnishingCondition: '',
  furnishingConditionRemarks: '',
  childName: '',
  gender: '',
  caste: '',
  sect: '',
  bFormNumber: '',
  dateOfBirth: '',
  age: '',
  totalBrothers: '',
  totalSisters: '',
  registeredBrothers: '',
  registeredSisters: '',
  siblingsUnder12: '',
  childLivesWithMother: false,
  livingSituationNotes: '',
  healthStatus: '',
  disabilityDetails: '',
  treatmentPlace: '',
  monthlyMedicalExpenses: '',
  currentlyStudying: false,
  notStudyingReason: '',
  educationStartCondition: '',
  currentClass: '',
  schoolName: '',
  schoolAddress: '',
  enrolledInMadrasa: false,
  madrasaName: '',
  madrasaEducationDetails: '',
  educationFeeStatus: '',
  monthlySchoolFee: '',
  careerGoal: '',
  technicalInterest: '',
  learningSkill: '',
  childMonthlyIncome: '',
  householdEarnersCount: '',
  totalHouseholdIncome: '',
  receivingOtherAid: false,
  otherAidSource: '',
  monthlyAidAmount: '',
  notAppliedElsewhereReason: '',
  principalName: '',
  institutionName: '',
  verifiedStudentName: '',
  verifiedFatherName: '',
  verifiedClass: '',
  verifiedMonthlyFee: '',
  imamName: '',
  mosqueName: '',
  neighborhoodCity: '',
  imamMobile: '',
  motherZakatStatus: '',
  guardianSignatureFileKey: '',
  termsAccepted: false,
  status: 'draft',
  siblings: [],
  relatives: [],
  householdAssetSelection: createDefaultHouseholdAssetSelection(),
  documents: [],
};

function fieldLabel(field: keyof FormData) {
  const label = labels[field];
  return label ? `${label.en} / ${label.ur}` : field;
}

interface OrphanApplicationWizardProps {
  initialData?: Partial<FormData>;
  initialDocuments?: DocumentInput[];
  initialApplicationId?: string;
}

type PersistedWizardState = {
  step?: number;
  formData?: Partial<FormData>;
  applicationId?: string | null;
  documents?: DocumentInput[];
};

function normalizeInitialData(data: FormData): FormData {
  const next = { ...data };

  if (!next.motherAlive) {
    if (next.motherDeathDate || next.motherDeathCause) {
      next.motherAlive = 'no';
    } else if (next.motherContact || next.motherOccupation || next.motherMonthlyIncome || next.motherRemarried) {
      next.motherAlive = 'yes';
    }
  }

  if (!next.motherEmploymentStatus) {
    if (next.motherIsHousewife) {
      next.motherEmploymentStatus = 'housewife';
    } else if (next.motherOccupation || next.motherMonthlyIncome) {
      next.motherEmploymentStatus = 'working';
    }
  }

  if (!next.motherIsGuardian && next.motherAlive === 'yes') {
    next.motherIsGuardian = next.guardianName || next.guardianContact ? 'no' : 'yes';
  }

  next.householdAssetSelection = mergeHouseholdAssetSelection(next.householdAssetSelection);

  return next;
}

export default function OrphanApplicationWizard({ initialData, initialDocuments, initialApplicationId }: OrphanApplicationWizardProps) {
  const mergedData = useMemo(() => normalizeInitialData({ ...defaultData, ...initialData }), [initialData]);
  const storageKey = useMemo(() => {
    const collectorKey = mergedData.collectorId || mergedData.collectorCnic || 'unknown';
    return `saiban-orphan-application:new:${collectorKey}`;
  }, [mergedData.collectorCnic, mergedData.collectorId]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(mergedData);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(initialApplicationId ?? null);
  const [documents, setDocuments] = useState<DocumentInput[]>(initialDocuments ?? []);
  const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(Boolean(initialApplicationId));
  const [shouldPersistNewApplication, setShouldPersistNewApplication] = useState(!initialApplicationId);

  useEffect(() => {
    if (initialApplicationId) return;

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setHasLoadedPersistedState(true);
        return;
      }

      const persisted = JSON.parse(raw) as PersistedWizardState;
      const persistedFormData = persisted.formData ?? {};

      if (Array.isArray((persistedFormData as { householdAssets?: unknown }).householdAssets)) {
        const rawAssets = (persistedFormData as { householdAssets: { assetType: string; quantity?: string; value?: string }[] }).householdAssets;
        (persistedFormData as Partial<FormData>).householdAssetSelection = householdAssetRowsToSelection(
          rawAssets.map((a) => ({
            assetType: a.assetType,
            quantity: a.quantity === '' || a.quantity === undefined ? undefined : Number(a.quantity),
            value: a.value === '' || a.value === undefined ? undefined : Number(a.value),
          })),
        );
        delete (persistedFormData as { householdAssets?: unknown }).householdAssets;
      }

      if (persistedFormData.status === 'submitted') {
        window.localStorage.removeItem(storageKey);
        setHasLoadedPersistedState(true);
        return;
      }

      setFormData(normalizeInitialData({
        ...defaultData,
        ...mergedData,
        ...persistedFormData,
        collectorId: mergedData.collectorId,
        collectorName: mergedData.collectorName,
        collectorProject: mergedData.collectorProject,
        collectorCnic: mergedData.collectorCnic,
        collectorAddress: mergedData.collectorAddress,
        collectorContact: mergedData.collectorContact,
      }));
      setStep(Math.min(Math.max(Number(persisted.step) || 1, 1), 14));
      setApplicationId(persisted.applicationId ?? null);
      setDocuments(Array.isArray(persisted.documents) ? persisted.documents : []);
      setHasLoadedPersistedState(true);
    } catch (error) {
      window.localStorage.removeItem(storageKey);
      setHasLoadedPersistedState(true);
    }
  }, [initialApplicationId, mergedData, storageKey]);

  useEffect(() => {
    if (initialApplicationId || !shouldPersistNewApplication || !hasLoadedPersistedState) return;

    const persisted: PersistedWizardState & { updatedAt: string } = {
      step,
      formData,
      applicationId,
      documents,
      updatedAt: new Date().toISOString(),
    };

    window.localStorage.setItem(storageKey, JSON.stringify(persisted));
  }, [applicationId, documents, formData, hasLoadedPersistedState, initialApplicationId, shouldPersistNewApplication, step, storageKey]);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const clearFields = (fields: Array<keyof FormData>) => {
    setFormData((current) => {
      const next = { ...current };
      fields.forEach((field) => {
        (next as any)[field] = defaultData[field];
      });
      return next;
    });
  };

  const updateFields = (values: Partial<FormData>) => {
    setFormData((current) => ({ ...current, ...values }));
  };

  const handleMotherAliveChange = (value: string) => {
    updateFields({
      motherAlive: value,
      ...(value === 'no'
        ? {
            motherContact: '',
            motherIsHousewife: false,
            motherEmploymentStatus: '',
            motherOccupation: '',
            motherMonthlyIncome: '',
            motherRemarried: false,
            motherIsGuardian: 'no',
          }
        : {
            motherDeathDate: '',
            motherDeathCause: '',
          }),
    });
  };

  const handleMotherEmploymentStatusChange = (value: string) => {
    updateFields({
      motherEmploymentStatus: value,
      motherIsHousewife: value === 'housewife',
      ...(value === 'working'
        ? {}
        : {
            motherOccupation: '',
            motherMonthlyIncome: '',
          }),
    });
  };

  const handleMotherIsGuardianChange = (value: string) => {
    updateFields({
      motherIsGuardian: value,
      ...(value === 'yes'
        ? {
            guardianName: '',
            guardianRelationship: '',
            guardianCnic: '',
            guardianEducation: '',
            guardianMotherTongue: '',
            guardianNativeArea: '',
            guardianContact: '',
            guardianZakatStatus: '',
            guardianOccupation: '',
            guardianFamilyHolder: '',
            guardianFamilyHolderAmount: '',
            guardianFamilyMembersCount: '',
            guardianMonthlyIncome: '',
            guardianSignatureFileKey: '',
          }
        : {}),
    });
  };

  const handleGuardianFamilyHolderChange = (value: string) => {
    updateFields({
      guardianFamilyHolder: value,
      guardianFamilyHolderAmount: '',
      ...(value === 'yes' ? {} : { guardianFamilyMembersCount: '' }),
    });
  };

  const handleHouseOwnershipStatusChange = (value: string) => {
    updateFields({
      houseOwnershipStatus: value,
      ...(value === 'rent' ? {} : { monthlyRent: '', rentPaidBy: '', houseOwner: '' }),
    });
  };

  const handleHealthStatusChange = (value: string) => {
    updateFields({
      healthStatus: value,
      ...(value === 'healthy'
        ? { disabilityDetails: '', treatmentPlace: '', monthlyMedicalExpenses: '' }
        : value === 'sick'
          ? { disabilityDetails: '' }
          : value === 'disabled'
            ? { treatmentPlace: '' }
            : {}),
    });
  };

  const handleCurrentlyStudyingChange = (value: boolean) => {
    updateFields({
      currentlyStudying: value,
      ...(value
        ? { notStudyingReason: '', educationStartCondition: '' }
        : {
            currentClass: '',
            schoolName: '',
            schoolAddress: '',
            educationFeeStatus: '',
            monthlySchoolFee: '',
          }),
    });
  };

  const handleEducationFeeStatusChange = (value: string) => {
    updateFields({
      educationFeeStatus: value,
      ...(value === 'paid' ? {} : { monthlySchoolFee: '' }),
    });
  };

  const handleMadrasaChange = (value: boolean) => {
    updateFields({
      enrolledInMadrasa: value,
      ...(value ? {} : { madrasaName: '', madrasaEducationDetails: '' }),
    });
  };

  const handleOtherAidChange = (value: boolean) => {
    updateFields({
      receivingOtherAid: value,
      ...(value ? {} : { otherAidSource: '', monthlyAidAmount: '' }),
    });
  };

  const handleHouseholdAssetHasChange = (key: HouseholdAssetKey, has: boolean) => {
    setFormData((current) => ({
      ...current,
      householdAssetSelection: {
        ...current.householdAssetSelection,
        [key]: has
          ? { ...current.householdAssetSelection[key], has: true }
          : { has: false, value: '', grams: '' },
      },
    }));
  };

  const updateHouseholdAssetEntry = (key: HouseholdAssetKey, patch: Partial<HouseholdAssetEntry>) => {
    setFormData((current) => ({
      ...current,
      householdAssetSelection: {
        ...current.householdAssetSelection,
        [key]: { ...current.householdAssetSelection[key], ...patch },
      },
    }));
  };

  const updateArrayItem = <T extends object>(
    key: 'siblings' | 'relatives',
    index: number,
    value: Partial<T>,
  ) => {
    setFormData((current) => {
      const list = [...current[key]] as any[];
      list[index] = { ...list[index], ...value };
      return { ...current, [key]: list };
    });
  };

  const addArrayItem = (key: 'siblings' | 'relatives') => {
    setFormData((current) => {
      const item = key === 'siblings'
        ? { name: '', age: '', occupation: '', monthlyIncomeOrFee: '' }
        : { relativeType: 'paternal_uncle' as const, name: '', age: '', occupation: '', monthlyIncome: '' };
      return { ...current, [key]: [...current[key], item] };
    });
  };

  const removeArrayItem = (key: 'siblings' | 'relatives', index: number) => {
    setFormData((current) => ({
      ...current,
      [key]: current[key].filter((_, idx) => idx !== index),
    }));
  };

  const handleDocumentUpload = (document: DocumentInput) => {
    setDocuments((current) => [...current, document]);
  };

  const handleDocumentRemove = async (documentId: string) => {
    try {
      await fetch(`/api/upload?documentId=${documentId}`, { method: 'DELETE' });
      setDocuments((current) => current.filter((doc) => doc.id !== documentId));
      setMessage('Document removed successfully.');
    } catch (error) {
      setMessage('Failed to remove document.');
    }
  };

  const goNext = () => setStep((current) => Math.min(current + 1, 14));
  const goBack = () => setStep((current) => Math.max(current - 1, 1));

  const buildApplicationRequestBody = (saveStatus: 'draft' | 'submitted') => {
    const { householdAssetSelection, ...formFields } = formData;
    const householdAssets = householdSelectionToApiRows(householdAssetSelection);

    return { ...formFields, householdAssets, status: saveStatus, id: applicationId } as any;
  };

  const ensureDraftForUpload = async () => {
    if (applicationId) return applicationId;

    setMessage(null);
    const response = await fetch('/api/applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildApplicationRequestBody('draft')),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error?.message ?? 'Unable to save draft before upload');
    }

    const application = await response.json();
    setApplicationId(application.id);
    setMessage('Draft saved. Uploading verification image...');

    return application.id as string;
  };

  const submit = async (saveStatus: 'draft' | 'submitted') => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const method = applicationId ? 'PATCH' : 'POST';
      const body = buildApplicationRequestBody(saveStatus);
      const response = await fetch('/api/applications', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error?.message ?? 'Unable to save application');
      }

      const application = await response.json();
      setApplicationId(application.id);
      setMessage(saveStatus === 'submitted' ? 'Application submitted successfully.' : 'Draft saved successfully.');
      if (saveStatus === 'submitted' && !initialApplicationId) {
        window.localStorage.removeItem(storageKey);
        setShouldPersistNewApplication(false);
      }
      if (!applicationId) {
        setStep(14);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const guardianDetailsNeeded = formData.motherAlive !== 'yes' || formData.motherIsGuardian !== 'yes';
  const documentTypes = useMemo(() => {
    const types = [
      { type: 'child_photo', label: 'Child Photo' },
      { type: 'child_b_form', label: 'Child B-Form' },
      { type: 'father_cnic', label: 'Father CNIC' },
    ];

    if (formData.motherAlive !== 'no') {
      types.push({ type: 'mother_cnic', label: 'Mother CNIC' });
    }

    if (formData.motherAlive === 'no') {
      types.push({ type: 'mother_death_certificate', label: 'Mother Death Certificate' });
    }

    if (guardianDetailsNeeded) {
      types.push({ type: 'guardian_cnic', label: 'Guardian CNIC' });
    }

    if (formData.healthStatus === 'sick' || formData.healthStatus === 'disabled') {
      types.push({ type: 'medical_report', label: 'Medical Report' });
    }

    return types;
  }, [formData.healthStatus, formData.motherAlive, guardianDetailsNeeded]);
  const stepTitles = [
    'Collector / جمع کنندہ',
    'Father / والد',
    'Mother / والدہ',
    'Guardian / سرپرست',
    'Relatives / رشتہ دار',
    'Home / گھر',
    'Assets / اثاثے',
    'Child / بچہ',
    'Health / صحت',
    'Income / آمدنی',
    'School / سکول',
    'Imam / امام',
    'Documents / دستاویزات',
    'Review / جائزہ',
  ];

  const lockedFormFillerFields: Array<keyof FormData> = [
    'collectorId',
    'collectorName',
    'collectorProject',
    'collectorCnic',
    'collectorAddress',
    'collectorContact',
  ];

  const renderTextField = (field: keyof FormData, type = 'text', locked = false) => (
    <label key={field} className="grid gap-2 text-sm text-slate-700">
      <span>{fieldLabel(field)}</span>
      <input
        value={formData[field] as string}
        onChange={(event) => updateField(field, event.target.value)}
        type={type}
        readOnly={locked}
        className={`min-h-12 rounded-lg border border-slate-300 px-4 py-3 text-base outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm ${locked ? 'cursor-not-allowed bg-slate-100 text-slate-600' : 'bg-slate-50 text-slate-900'}`}
      />
    </label>
  );

  const renderSelectField = (
    field: keyof FormData,
    options: Array<{ value: string; label: string }>,
    onChange?: (value: string) => void,
  ) => (
    <label key={field} className="grid gap-2 text-sm text-slate-700">
      <span>{fieldLabel(field)}</span>
      <select
        value={formData[field] as string}
        onChange={(event) => (onChange ? onChange(event.target.value) : updateField(field, event.target.value))}
        className="min-h-12 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );

  const renderBooleanSelect = (
    field: keyof FormData,
    onChange?: (value: boolean) => void,
    yesLabel = 'Yes',
    noLabel = 'No',
  ) => (
    <label key={field} className="grid gap-2 text-sm text-slate-700">
      <span>{fieldLabel(field)}</span>
      <select
        value={formData[field] ? 'yes' : 'no'}
        onChange={(event) => {
          const nextValue = event.target.value === 'yes';
          if (onChange) {
            onChange(nextValue);
          } else {
            updateField(field, nextValue);
          }
        }}
        className="min-h-12 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 text-base text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 sm:text-sm"
      >
        <option value="no">{noLabel}</option>
        <option value="yes">{yesLabel}</option>
      </select>
    </label>
  );

  const renderCheckbox = (field: keyof FormData, labelText?: string) => (
    <label key={field} className="flex min-h-12 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
      <input
        type="checkbox"
        checked={formData[field] as boolean}
        onChange={(event) => updateField(field, event.target.checked)}
        className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      <span>{labelText ?? fieldLabel(field)}</span>
    </label>
  );

  const renderVerificationUpload = (documentType: string, label: string) => {
    const existingDocument = documents.find((doc) => doc.documentType === documentType);

    return (
      <FileUpload
        documentType={documentType}
        applicationId={applicationId}
        ensureApplicationId={ensureDraftForUpload}
        onUpload={handleDocumentUpload}
        onRemove={handleDocumentRemove}
        existingDocument={existingDocument}
        label={label}
        accept="image/*"
      />
    );
  };

  const shouldShowField = (field: keyof FormData) => {
    if (['motherDeathDate', 'motherDeathCause'].includes(field)) return formData.motherAlive === 'no';
    if (['motherContact', 'motherEmploymentStatus', 'motherRemarried'].includes(field)) return formData.motherAlive === 'yes';
    if (['motherOccupation', 'motherMonthlyIncome'].includes(field)) return formData.motherAlive === 'yes' && formData.motherEmploymentStatus === 'working';
    if (['guardianName', 'guardianRelationship', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianOccupation', 'guardianFamilyHolder', 'guardianMonthlyIncome'].includes(field)) return guardianDetailsNeeded;
    if (field === 'guardianFamilyMembersCount') return guardianDetailsNeeded && formData.guardianFamilyHolder === 'yes';
    if (['monthlyRent', 'rentPaidBy', 'houseOwner'].includes(field)) return formData.houseOwnershipStatus === 'rent';
    if (field === 'disabilityDetails') return formData.healthStatus === 'disabled';
    if (field === 'treatmentPlace') return formData.healthStatus === 'sick';
    if (field === 'monthlyMedicalExpenses') return formData.healthStatus === 'sick' || formData.healthStatus === 'disabled';
    if (['currentClass', 'schoolName', 'schoolAddress', 'educationFeeStatus'].includes(field)) return formData.currentlyStudying;
    if (['notStudyingReason', 'educationStartCondition'].includes(field)) return !formData.currentlyStudying;
    if (field === 'monthlySchoolFee') return formData.currentlyStudying && formData.educationFeeStatus === 'paid';
    if (['madrasaName', 'madrasaEducationDetails'].includes(field)) return formData.enrolledInMadrasa;
    if (['otherAidSource', 'monthlyAidAmount'].includes(field)) return formData.receivingOtherAid;
    return true;
  };

  const formatReviewValue = (field: keyof FormData): string => {
    if (field === 'householdAssetSelection') {
      const selected = HOUSEHOLD_ASSET_KEYS
        .filter((key) => formData.householdAssetSelection[key].has)
        .map((key) => {
          const entry = formData.householdAssetSelection[key];
          const grams = assetUsesGrams(key) && entry.grams ? `, ${entry.grams} grams` : '';
          const amount = entry.value ? `${entry.value} PKR` : 'value missing';
          return `${householdAssetDisplayLabel(key)}: ${amount}${grams}`;
        });

      return selected.length ? selected.join('; ') : '-';
    }

    const value = formData[field];
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (Array.isArray(value)) return value.length ? `${value.length} record(s)` : '-';
    return typeof value === 'string' ? value || '-' : '-';
  };

  const reviewSections: Array<{ title: string; fields: Array<keyof FormData> }> = [
    { title: 'Collector', fields: lockedFormFillerFields },
    { title: 'Mother', fields: ['motherName', 'motherAlive', 'motherContact', 'motherEmploymentStatus', 'motherOccupation', 'motherMonthlyIncome', 'motherRemarried', 'motherDeathDate', 'motherDeathCause'] },
    { title: 'Guardian', fields: ['motherIsGuardian', 'guardianName', 'guardianRelationship', 'guardianContact', 'guardianCnic', 'guardianOccupation', 'guardianFamilyHolder', 'guardianFamilyMembersCount', 'guardianMonthlyIncome'] },
    { title: 'Home', fields: ['city', 'district', 'tehsil', 'fullAddress', 'houseOwnershipStatus', 'monthlyRent', 'rentPaidBy', 'houseOwner', 'houseCondition', 'houseConditionRemarks', 'furnishingCondition', 'furnishingConditionRemarks'] },
    { title: 'Household Assets', fields: ['householdAssetSelection'] },
    { title: 'Health and Education', fields: ['healthStatus', 'disabilityDetails', 'treatmentPlace', 'monthlyMedicalExpenses', 'currentlyStudying', 'currentClass', 'schoolName', 'educationFeeStatus', 'monthlySchoolFee', 'notStudyingReason', 'educationStartCondition', 'enrolledInMadrasa', 'madrasaName', 'madrasaEducationDetails'] },
    { title: 'Income and Aid', fields: ['careerGoal', 'childMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'receivingOtherAid', 'otherAidSource', 'monthlyAidAmount', 'notAppliedElsewhereReason'] },
  ];

  return (
    <div className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:space-y-6 sm:p-8">
      
      <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0">
        {Array.from({ length: 14 }, (_, index) => index + 1).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStep(item)}
            className={`min-w-[168px] snap-start rounded-lg border px-3 py-3 text-sm font-semibold leading-5 transition sm:min-w-0 ${item === step ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100'}`}
          >
            {item}. {stepTitles[item - 1]}
          </button>
        ))}
      </div>

      {message ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{message}</div>
      ) : null}

      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Form Filler Details</h2>
            <p className="mt-1 text-sm text-slate-600">Capture the collector and application metadata.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {lockedFormFillerFields.map((field) => renderTextField(field, 'text', true))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Deceased Father Details</h2>
            <p className="mt-1 text-sm text-slate-600">Add the father's personal, educational, and death information.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['fatherName', 'fatherDob', 'fatherAge', 'fatherCnic', 'fatherEducation', 'fatherOccupation', 'fatherDateOfDeath', 'fatherCauseOfDeath'].map((field) =>
              field === 'fatherDob' || field === 'fatherDateOfDeath'
                ? renderTextField(field as keyof FormData, 'date')
                : renderTextField(field as keyof FormData),
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mother Details</h2>
            <p className="mt-1 text-sm text-slate-600">Capture the mother's identity, income, and marital status.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Changing mother status or employment may clear fields that are no longer relevant.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['motherName', 'motherDob', 'motherAge', 'motherCnic', 'motherEducation', 'motherTongue', 'motherNativeArea'].map((field) =>
              field === 'motherDob'
                ? renderTextField(field as keyof FormData, 'date')
                : renderTextField(field as keyof FormData),
            )}
            {renderSelectField('motherAlive', [
              { value: '', label: 'Select status' },
              { value: 'yes', label: 'Alive / زندہ' },
              { value: 'no', label: 'Deceased / وفات شدہ' },
            ], handleMotherAliveChange)}
            {formData.motherAlive === 'no' ? (
              <>
                {renderTextField('motherDeathDate', 'date')}
                {renderTextField('motherDeathCause')}
              </>
            ) : null}
            {formData.motherAlive === 'yes' ? (
              <>
                {renderTextField('motherContact')}
                {renderSelectField('motherEmploymentStatus', [
                  { value: '', label: 'Select employment status' },
                  { value: 'housewife', label: 'Housewife / گھریلو' },
                  { value: 'working', label: 'Working / کام کرتی ہیں' },
                  { value: 'unemployed', label: 'Unemployed / بے روزگار' },
                ], handleMotherEmploymentStatusChange)}
                {formData.motherEmploymentStatus === 'working' ? (
                  <>
                    {renderTextField('motherOccupation')}
                    {renderTextField('motherMonthlyIncome', 'number')}
                  </>
                ) : null}
                {renderBooleanSelect('motherRemarried')}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Guardian Details</h2>
            <p className="mt-1 text-sm text-slate-600">Record the guardian's contact, occupation, family holder status, and income.</p>
          </div>
          {formData.motherAlive === 'yes' ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {renderSelectField('motherIsGuardian', [
                { value: '', label: 'Select guardian status' },
                { value: 'yes', label: 'Mother is guardian / والدہ سرپرست ہیں' },
                { value: 'no', label: 'Other guardian / دوسرا سرپرست' },
              ], handleMotherIsGuardianChange)}
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                Changing guardian status may clear guardian fields that are no longer relevant.
              </div>
            </div>
          ) : null}
          {formData.motherAlive === 'yes' && formData.motherIsGuardian === 'yes' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Guardian details are hidden because the mother is marked as the guardian.
            </div>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            {guardianDetailsNeeded ? (
              <>
                {['guardianName', 'guardianRelationship', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianOccupation'].map((field) => renderTextField(field as keyof FormData))}
                {renderSelectField('guardianFamilyHolder', [
                  { value: '', label: 'Select family holder status' },
                  { value: 'yes', label: 'Yes / ہاں' },
                  { value: 'no', label: 'No / نہیں' },
                ], handleGuardianFamilyHolderChange)}
                {formData.guardianFamilyHolder === 'yes' ? renderTextField('guardianFamilyMembersCount', 'number') : null}
                {renderTextField('guardianMonthlyIncome', 'number')}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Close Relatives / قریبی رشتہ دار</h2>
            <p className="mt-1 text-sm text-slate-600">Include grandparent and uncle details for migration and verification.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['paternalGrandfatherName', 'paternalGrandfatherAge', 'paternalGrandfatherOccupation', 'paternalGrandfatherIncome', 'maternalGrandfatherName', 'maternalGrandfatherAge', 'maternalGrandfatherOccupation', 'maternalGrandfatherIncome'].map((field) => renderTextField(field as keyof FormData))}
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Uncles / چچا اور ماموں</h3>
                <p className="text-sm text-slate-600">Add paternal and maternal uncles / چچا اور ماموں شامل کریں۔</p>
              </div>
              <button type="button" onClick={() => addArrayItem('relatives')} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Add Relative / رشتہ دار شامل کریں
              </button>
            </div>
            <div className="space-y-4">
              {formData.relatives.map((relative, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Relative Type / رشتہ داری</span>
                      <select
                        value={relative.relativeType}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { relativeType: event.target.value as RelativeInput['relativeType'] })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      >
                        <option value="paternal_uncle">Paternal Uncle / چچا</option>
                        <option value="maternal_uncle">Maternal Uncle / ماموں</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Name / نام</span>
                      <input
                        value={relative.name}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { name: event.target.value })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Age / عمر</span>
                      <input
                        value={relative.age}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { age: event.target.value })}
                        type="number"
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Occupation / پیشہ</span>
                      <input
                        value={relative.occupation}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { occupation: event.target.value })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Monthly Income / ماہانہ آمدنی</span>
                      <input
                        value={relative.monthlyIncome}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { monthlyIncome: event.target.value })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeArrayItem('relatives', index)}
                    className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                  >
                    Remove Relative / رشتہ دار ہٹائیں
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {step === 6 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Home Details</h2>
            <p className="mt-1 text-sm text-slate-600">Capture the household address, property status, and coordinates.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['city', 'district', 'tehsil', 'residentialArea', 'fullAddress', 'longitude', 'latitude'].map((field) => renderTextField(field as keyof FormData))}
            {renderSelectField('houseOwnershipStatus', [
              { value: '', label: 'Select ownership status' },
              { value: 'owned', label: 'Owned / ذاتی' },
              { value: 'rent', label: 'Rent / کرایہ' },
              { value: 'other', label: 'Other / دیگر' },
            ], handleHouseOwnershipStatusChange)}
            {formData.houseOwnershipStatus === 'rent' ? (
              <>
                {renderTextField('monthlyRent', 'number')}
                {renderTextField('rentPaidBy')}
                {renderTextField('houseOwner')}
              </>
            ) : null}
            {renderSelectField('houseCondition', [
              { value: '', label: 'Select house condition' },
              { value: 'better', label: 'Better / بہتر' },
              { value: 'appropriate', label: 'Appropriate / مناسب' },
              { value: 'worst', label: 'Worst / خراب' },
            ])}
            {renderTextField('houseConditionRemarks')}
            {renderSelectField('furnishingCondition', [
              { value: '', label: 'Select furnishing condition' },
              { value: 'better', label: 'Better / بہتر' },
              { value: 'appropriate', label: 'Appropriate / مناسب' },
              { value: 'worst', label: 'Worst / خراب' },
            ])}
            {renderTextField('furnishingConditionRemarks')}
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Household Assets</h2>
            
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {HOUSEHOLD_ASSET_KEYS.map((key) => {
              const entry = formData.householdAssetSelection[key];
              const showGrams = assetUsesGrams(key);
              return (
                <div key={key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <span className="text-base font-semibold text-slate-900">
                      {householdAssetDisplayLabel(key)}
                    </span>
                    <div className="flex shrink-0 items-center gap-3 text-sm text-slate-700" role="group" aria-label={`${householdAssetDisplayLabel(key)} موجود ہے؟`}>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`household-asset-${key}`}
                          className="h-4 w-4 accent-blue-600"
                          checked={!entry.has}
                          onChange={() => handleHouseholdAssetHasChange(key, false)}
                        />
                        <span dir="rtl">نہیں</span>
                      </label>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="radio"
                          name={`household-asset-${key}`}
                          className="h-4 w-4 accent-blue-600"
                          checked={entry.has}
                          onChange={() => handleHouseholdAssetHasChange(key, true)}
                        />
                        <span dir="rtl">ہاں</span>
                      </label>
                    </div>
                  </div>
                  {entry.has ? (
                    <div className={`mt-3 grid gap-3 ${showGrams ? 'sm:grid-cols-2' : ''}`}>
                      {showGrams ? (
                        <label className="grid gap-1.5 text-sm text-slate-700">
                          <span>
                            گرام <span className="text-slate-500">(Grams)</span>
                          </span>
                          <input
                            value={entry.grams}
                            onChange={(event) => updateHouseholdAssetEntry(key, { grams: event.target.value })}
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="any"
                            className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                            placeholder="0"
                          />
                        </label>
                      ) : null}
                      <label className={`grid gap-1.5 text-sm text-slate-700 ${showGrams ? '' : 'sm:col-span-2'}`}>
                        <span>
                          قدر (روپے) <span className="text-slate-500">/ Value (PKR)</span>
                        </span>
                        <input
                          value={entry.value}
                          onChange={(event) => updateHouseholdAssetEntry(key, { value: event.target.value })}
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="any"
                          className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                          placeholder="0"
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {step === 8 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Orphan Child Details</h2>
            <p className="mt-1 text-sm text-slate-600">Add child family counts, siblings, and living situation.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['caste', 'sect', 'totalBrothers', 'totalSisters', 'registeredBrothers', 'registeredSisters', 'siblingsUnder12'].map((field) => renderTextField(field as keyof FormData))}
            {renderCheckbox('childLivesWithMother')}
            {renderTextField('livingSituationNotes')}
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">Add siblings information.</p>
              <button type="button" onClick={() => addArrayItem('siblings')} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Add Sibling
              </button>
            </div>
            {formData.siblings.map((sibling, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Name</span>
                    <input
                      value={sibling.name}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { name: event.target.value })}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Age</span>
                    <input
                      value={sibling.age}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { age: event.target.value })}
                      type="number"
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Occupation</span>
                    <input
                      value={sibling.occupation}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { occupation: event.target.value })}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Monthly Income or Fee</span>
                    <input
                      value={sibling.monthlyIncomeOrFee}
                      onChange={(event) => updateArrayItem<SiblingInput>('siblings', index, { monthlyIncomeOrFee: event.target.value })}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                </div>
                <button type="button" onClick={() => removeArrayItem('siblings', index)} className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500">
                  Remove Sibling
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {step === 9 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Education and Health Details</h2>
            <p className="mt-1 text-sm text-slate-600">Record attendance, health, and education support details.</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Changing health or education status may clear fields that are no longer relevant.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {renderSelectField('healthStatus', [
              { value: '', label: 'Select health status' },
              { value: 'healthy', label: 'Healthy / صحت مند' },
              { value: 'sick', label: 'Sick / بیمار' },
              { value: 'disabled', label: 'Disabled / معذور' },
            ], handleHealthStatusChange)}
            {formData.healthStatus === 'sick' ? (
              <>
                {renderTextField('treatmentPlace')}
                {renderTextField('monthlyMedicalExpenses', 'number')}
              </>
            ) : null}
            {formData.healthStatus === 'disabled' ? (
              <>
                {renderTextField('disabilityDetails')}
                {renderTextField('monthlyMedicalExpenses', 'number')}
              </>
            ) : null}
            {renderBooleanSelect('currentlyStudying', handleCurrentlyStudyingChange)}
            {formData.currentlyStudying ? (
              <>
                {renderTextField('currentClass')}
                {renderTextField('schoolName')}
                {renderTextField('schoolAddress')}
                {renderSelectField('educationFeeStatus', [
                  { value: '', label: 'Select fee status' },
                  { value: 'free', label: 'Free / مفت' },
                  { value: 'paid', label: 'Paid / ادا شدہ' },
                ], handleEducationFeeStatusChange)}
                {formData.educationFeeStatus === 'paid' ? renderTextField('monthlySchoolFee', 'number') : null}
              </>
            ) : (
              <>
                {renderTextField('notStudyingReason')}
                {renderTextField('educationStartCondition')}
              </>
            )}
            {renderBooleanSelect('enrolledInMadrasa', handleMadrasaChange)}
            {formData.enrolledInMadrasa ? (
              <>
                {renderTextField('madrasaName')}
                {renderTextField('madrasaEducationDetails')}
              </>
            ) : null}
          </div>
        </div>
      )}

      {step === 10 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Other Aid / Household Income</h2>
            <p className="mt-1 text-sm text-slate-600">Share other aid details and household income capacity.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['careerGoal', 'technicalInterest', 'learningSkill'].map((field) => renderTextField(field as keyof FormData))}
            {['childMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome'].map((field) => renderTextField(field as keyof FormData, 'number'))}
            {renderBooleanSelect('receivingOtherAid', handleOtherAidChange)}
            {formData.receivingOtherAid ? (
              <>
                {renderTextField('otherAidSource')}
                {renderTextField('monthlyAidAmount', 'number')}
              </>
            ) : null}
            {renderTextField('notAppliedElsewhereReason')}
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Educational Institution Verification</h2>
            <p className="mt-1 text-sm text-slate-600">Upload the school verification letter image.</p>
          </div>
          {renderVerificationUpload('principal_verification', 'School Verification Letter Image')}
        </div>
      )}

      {step === 12 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mosque Imam Verification</h2>
            <p className="mt-1 text-sm text-slate-600">Upload the mosque imam verification letter image.</p>
          </div>
          {renderVerificationUpload('imam_verification', 'Imam Verification Letter Image')}
        </div>
      )}

      {step === 13 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Documents Upload</h2>
            <p className="mt-1 text-sm text-slate-600">Upload the required documents after saving the draft.</p>
          </div>
          {!applicationId ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              Save a draft first to upload documents. Once the application exists, you can upload files and remove them as needed.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {documentTypes.map((documentType) => {
                const existingDocument = documents.find((doc) => doc.documentType === documentType.type);
                return (
                  <FileUpload
                    key={documentType.type}
                    documentType={documentType.type}
                    applicationId={applicationId}
                    onUpload={handleDocumentUpload}
                    onRemove={handleDocumentRemove}
                    existingDocument={existingDocument}
                    label={documentType.label}
                    accept="image/*,.pdf"
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === 14 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Terms and Review</h2>
            <p className="mt-1 text-sm text-slate-600">Review the collected details and submit or save as draft.</p>
          </div>
          {renderCheckbox('termsAccepted')}
          <div className="space-y-4">
            {reviewSections.map((section) => {
              const fields = section.fields.filter((field) => shouldShowField(field));
              if (fields.length === 0) return null;

              return (
                <section key={section.title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {fields.map((field) => (
                      <div key={field} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <p className="text-xs font-semibold text-slate-500">{fieldLabel(field)}</p>
                        <p className="mt-1 break-words text-sm text-slate-900">{formatReviewValue(field)}</p>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-semibold text-slate-900">Important</p>
            <p className="mt-2">A draft allows later editing. Submitting marks the form ready for review.</p>
          </div>
        </div>
      )}

      <div className="sticky bottom-0 z-20 -mx-4 flex flex-col gap-3 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:static sm:mx-0 sm:flex-row sm:justify-between sm:border-t-0 sm:bg-transparent sm:px-0 sm:py-0 sm:shadow-none">
        <div className="grid grid-cols-2 gap-3 sm:flex">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1}
            className="min-h-12 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Back
          </button>
          {step < 14 ? (
            <button
              type="button"
              onClick={goNext}
              className="min-h-12 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Next
            </button>
          ) : null}
        </div>
        {step === 14 ? (
          <div className="grid gap-3 sm:flex">
            <button
              type="button"
              onClick={() => submit('draft')}
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-slate-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Saving…' : 'Save Draft'}
            </button>
            <button
              type="button"
              onClick={() => submit('submitted')}
              disabled={isSubmitting}
              className="min-h-12 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Application'}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
