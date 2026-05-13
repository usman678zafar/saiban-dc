'use client';

import { useMemo, useState } from 'react';
import { labels } from '@/lib/labels';
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

type AssetInput = {
  id?: string;
  assetType: string;
  quantity: string;
  value: string;
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
  houseOwner: string;
  houseCondition: string;
  furnishingCondition: string;
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
  householdAssets: AssetInput[];
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
  houseOwner: '',
  houseCondition: '',
  furnishingCondition: '',
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
  householdAssets: [],
  documents: [],
};

function fieldLabel(field: keyof FormData) {
  const label = labels[field];
  return label ? `${label.ur} (${label.en})` : field;
}

interface OrphanApplicationWizardProps {
  initialData?: Partial<FormData>;
  initialDocuments?: DocumentInput[];
  initialApplicationId?: string;
}

export default function OrphanApplicationWizard({ initialData, initialDocuments, initialApplicationId }: OrphanApplicationWizardProps) {
  const mergedData = useMemo(() => ({ ...defaultData, ...initialData }), [initialData]);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(mergedData);
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState<string | null>(initialApplicationId ?? null);
  const [documents, setDocuments] = useState<DocumentInput[]>(initialDocuments ?? []);

  const updateField = (field: keyof FormData, value: string | boolean) => {
    setFormData((current) => ({ ...current, [field]: value }));
  };

  const updateArrayItem = <T extends object>(
    key: 'siblings' | 'relatives' | 'householdAssets',
    index: number,
    value: Partial<T>,
  ) => {
    setFormData((current) => {
      const list = [...current[key]] as any[];
      list[index] = { ...list[index], ...value };
      return { ...current, [key]: list };
    });
  };

  const addArrayItem = (key: 'siblings' | 'relatives' | 'householdAssets') => {
    setFormData((current) => {
      const item = key === 'siblings'
        ? { name: '', age: '', occupation: '', monthlyIncomeOrFee: '' }
        : key === 'relatives'
          ? { relativeType: 'paternal_uncle', name: '', age: '', occupation: '', monthlyIncome: '' }
          : { assetType: '', quantity: '', value: '' };
      return { ...current, [key]: [...current[key], item] };
    });
  };

  const removeArrayItem = (key: 'siblings' | 'relatives' | 'householdAssets', index: number) => {
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

  const submit = async (saveStatus: 'draft' | 'submitted') => {
    setIsSubmitting(true);
    setMessage(null);

    try {
      const method = applicationId ? 'PATCH' : 'POST';
      const body = { ...formData, status: saveStatus, id: applicationId } as any;
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
      if (!applicationId) {
        setStep(14);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const documentTypes = [
    { type: 'child_photo', label: 'Child Photo' },
    { type: 'child_b_form', label: 'Child B-Form' },
    { type: 'father_cnic', label: 'Father CNIC' },
    { type: 'mother_cnic', label: 'Mother CNIC' },
  ];
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
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              'motherName',
              'motherDob',
              'motherAge',
              'motherCnic',
              'motherEducation',
              'motherTongue',
              'motherNativeArea',
              'motherContact',
              'motherIsHousewife',
              'motherOccupation',
              'motherMonthlyIncome',
              'motherRemarried',
              'motherDeathDate',
              'motherDeathCause',
            ].map((field) =>
              field === 'motherDob' || field === 'motherDeathDate'
                ? renderTextField(field as keyof FormData, 'date')
                : field === 'motherIsHousewife' || field === 'motherRemarried'
                  ? renderCheckbox(field as keyof FormData)
                  : renderTextField(field as keyof FormData),
            )}
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Guardian Details</h2>
            <p className="mt-1 text-sm text-slate-600">Record the guardian's contact, occupation, and zakat status.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['guardianName', 'guardianRelationship', 'guardianCnic', 'guardianEducation', 'guardianMotherTongue', 'guardianNativeArea', 'guardianContact', 'guardianZakatStatus', 'guardianOccupation', 'guardianMonthlyIncome'].map((field) => renderTextField(field as keyof FormData))}
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Close Relatives</h2>
            <p className="mt-1 text-sm text-slate-600">Include grandparent and uncle details for migration and verification.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['paternalGrandfatherName', 'paternalGrandfatherAge', 'paternalGrandfatherOccupation', 'paternalGrandfatherIncome', 'maternalGrandfatherName', 'maternalGrandfatherAge', 'maternalGrandfatherOccupation', 'maternalGrandfatherIncome'].map((field) => renderTextField(field as keyof FormData))}
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Uncles</h3>
                <p className="text-sm text-slate-600">Add paternal and maternal uncles.</p>
              </div>
              <button type="button" onClick={() => addArrayItem('relatives')} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Add Relative
              </button>
            </div>
            <div className="space-y-4">
              {formData.relatives.map((relative, index) => (
                <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Relative Type</span>
                      <select
                        value={relative.relativeType}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { relativeType: event.target.value as RelativeInput['relativeType'] })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      >
                        <option value="paternal_uncle">Paternal Uncle</option>
                        <option value="maternal_uncle">Maternal Uncle</option>
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Name</span>
                      <input
                        value={relative.name}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { name: event.target.value })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Age</span>
                      <input
                        value={relative.age}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { age: event.target.value })}
                        type="number"
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Occupation</span>
                      <input
                        value={relative.occupation}
                        onChange={(event) => updateArrayItem<RelativeInput>('relatives', index, { occupation: event.target.value })}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                      />
                    </label>
                    <label className="grid gap-2 text-sm text-slate-700">
                      <span>Monthly Income</span>
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
                    Remove Relative
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
            {['city', 'district', 'tehsil', 'residentialArea', 'fullAddress', 'longitude', 'latitude', 'houseOwnershipStatus', 'monthlyRent', 'houseOwner', 'houseCondition', 'furnishingCondition'].map((field) => renderTextField(field as keyof FormData))}
          </div>
        </div>
      )}

      {step === 7 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Household Assets</h2>
            <p className="mt-1 text-sm text-slate-600">Track household assets for support assessment.</p>
          </div>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">Add asset type, quantity, and value.</p>
              <button type="button" onClick={() => addArrayItem('householdAssets')} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500">
                Add Asset
              </button>
            </div>
            {formData.householdAssets.map((asset, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Asset Type</span>
                    <input
                      value={asset.assetType}
                      onChange={(event) => updateArrayItem<AssetInput>('householdAssets', index, { assetType: event.target.value })}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Quantity</span>
                    <input
                      value={asset.quantity}
                      onChange={(event) => updateArrayItem<AssetInput>('householdAssets', index, { quantity: event.target.value })}
                      type="number"
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                  <label className="grid gap-2 text-sm text-slate-700">
                    <span>Value</span>
                    <input
                      value={asset.value}
                      onChange={(event) => updateArrayItem<AssetInput>('householdAssets', index, { value: event.target.value })}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => removeArrayItem('householdAssets', index)}
                  className="mt-4 rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
                >
                  Remove Asset
                </button>
              </div>
            ))}
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
          <div className="grid gap-4 sm:grid-cols-2">
            {['healthStatus', 'disabilityDetails', 'treatmentPlace', 'monthlyMedicalExpenses', 'currentlyStudying', 'notStudyingReason', 'educationStartCondition', 'currentClass', 'schoolName', 'schoolAddress', 'enrolledInMadrasa', 'madrasaName', 'madrasaEducationDetails', 'educationFeeStatus', 'monthlySchoolFee'].map((field) =>
              field === 'currentlyStudying' || field === 'enrolledInMadrasa'
                ? renderCheckbox(field as keyof FormData)
                : field === 'monthlyMedicalExpenses' || field === 'monthlySchoolFee'
                  ? renderTextField(field as keyof FormData, 'number')
                  : renderTextField(field as keyof FormData),
            )}
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
            {['careerGoal', 'technicalInterest', 'learningSkill', 'childMonthlyIncome', 'householdEarnersCount', 'totalHouseholdIncome', 'receivingOtherAid', 'otherAidSource', 'monthlyAidAmount', 'notAppliedElsewhereReason'].map((field) =>
              field === 'receivingOtherAid'
                ? renderCheckbox(field as keyof FormData)
                : field === 'childMonthlyIncome' || field === 'householdEarnersCount' || field === 'totalHouseholdIncome' || field === 'monthlyAidAmount'
                  ? renderTextField(field as keyof FormData, 'number')
                  : renderTextField(field as keyof FormData),
            )}
          </div>
        </div>
      )}

      {step === 11 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Educational Institution Verification</h2>
            <p className="mt-1 text-sm text-slate-600">Capture principal verification details.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['principalName', 'institutionName', 'verifiedStudentName', 'verifiedFatherName', 'verifiedClass', 'verifiedMonthlyFee'].map((field) =>
              field === 'verifiedMonthlyFee'
                ? renderTextField(field as keyof FormData, 'number')
                : renderTextField(field as keyof FormData),
            )}
          </div>
        </div>
      )}

      {step === 12 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Mosque Imam Verification</h2>
            <p className="mt-1 text-sm text-slate-600">Capture imam verification and mosque details.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {['imamName', 'mosqueName', 'neighborhoodCity', 'imamMobile', 'motherZakatStatus'].map((field) => renderTextField(field as keyof FormData))}
          </div>
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
