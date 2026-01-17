'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Step2 from '@/components/LeadForm/Step2';
import WinStep3 from '@/components/LeadForm/WinStep3';
import WinSuccess from '@/components/LeadForm/WinSuccess';
import LostStep3 from '@/components/LeadForm/LostStep3';
import LostStep4 from '@/components/LeadForm/LostStep4';
import LostSuccess from '@/components/LeadForm/LostSuccess';
import {
  Step2Data,
  WinStep3Data,
  LostStep3Data,
  Step4Data,
  LeadStatus,
  OfferLead,
} from '@/lib/types';

function FromOfferContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const offerLeadId = searchParams.get('id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [offerLead, setOfferLead] = useState<OfferLead | null>(null);
  const [error, setError] = useState('');

  // Step tracking - starts at status selection (step 1 for this flow)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [leadStatus, setLeadStatus] = useState<LeadStatus | null>(null);

  // Form data
  const [step2Data, setStep2Data] = useState<Step2Data>({ categoryId: '' });
  const [winStep3Data, setWinStep3Data] = useState<WinStep3Data>({
    invoiceNo: '',
    salePrice: 0,
  });
  const [lostStep3Data, setLostStep3Data] = useState<LostStep3Data>({
    dealSize: 0,
    modelName: '',
  });
  const [lostStep4Data, setLostStep4Data] = useState<Step4Data>({
    purchaseTimeline: 'today',
  });
  const [createdLeadId, setCreatedLeadId] = useState<string>('');

  // Fetch the offer lead details
  useEffect(() => {
    if (!offerLeadId) {
      router.push('/dashboard');
      return;
    }

    const fetchOfferLead = async () => {
      try {
        const response = await fetch('/api/offers/pending');
        const data = await response.json();

        if (data.success) {
          const found = data.data.find((o: OfferLead) => o.id === offerLeadId);
          if (found) {
            setOfferLead(found);
          } else {
            setError('Offer lead not found or already converted');
          }
        } else {
          setError('Failed to load offer lead');
        }
      } catch (err) {
        console.error('Error fetching offer lead:', err);
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    fetchOfferLead();
  }, [offerLeadId, router]);

  const handleStatusSelect = (status: LeadStatus) => {
    setLeadStatus(status);
    setCurrentStep(2);
  };

  const handleStep2Next = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
    setLeadStatus(null);
  };

  // Win Flow - Step 3
  const handleWinStep3Next = async (data: WinStep3Data) => {
    setWinStep3Data(data);
    setSubmitting(true);

    try {
      const response = await fetch('/api/offers/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          offerLeadId,
          categoryId: step2Data.categoryId,
          status: 'win',
          invoiceNo: data.invoiceNo,
          salePrice: data.salePrice,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to convert lead');
        setSubmitting(false);
        return;
      }

      setCurrentStep(4);
      setSubmitting(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  // Lost Flow - Step 3
  const handleLostStep3Next = (data: LostStep3Data) => {
    setLostStep3Data(data);
    setCurrentStep(4);
  };

  // Lost Flow - Step 4
  const handleLostStep4Submit = async (data: Step4Data) => {
    setLostStep4Data(data);
    setSubmitting(true);

    try {
      const response = await fetch('/api/offers/convert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          offerLeadId,
          categoryId: step2Data.categoryId,
          status: 'lost',
          dealSize: lostStep3Data.dealSize,
          modelName: lostStep3Data.modelName,
          purchaseTimeline: data.purchaseTimeline,
          notTodayReason: data.notTodayReason,
          otherReason: data.otherReason,
          leadRating: data.leadRating,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to convert lead');
        setSubmitting(false);
        return;
      }

      setCreatedLeadId(result.leadId || result.data?.id || '');
      setCurrentStep(5);
      setSubmitting(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error || !offerLead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-8 max-w-md w-full text-center shadow-lg">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {error || 'Offer lead not found'}
          </h2>
          <p className="text-gray-600 mb-6">
            This offer may have already been converted to a lead.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    // Step 1: Status selection (Win/Lost) - shows customer info
    if (currentStep === 1) {
      return (
        <div className="flex flex-col h-full p-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-gray-500 hover:text-gray-700 mb-4 flex items-center text-sm"
          >
            ← Back to Dashboard
          </button>

          <div className="mb-2 text-sm text-gray-500">
            Step 1/{leadStatus === 'win' ? 3 : 4}
          </div>
          <h2 className="text-2xl font-bold mb-6">Convert Offer Lead</h2>

          {/* Customer Info Card */}
          <div className="bg-gradient-to-r from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg font-semibold text-gray-900">
                {offerLead.customer_name}
              </span>
              {offerLead.prize_won && offerLead.prize_won !== 'Try Again' && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Won: {offerLead.prize_won}
                </span>
              )}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>📱 {offerLead.phone}</p>
              {offerLead.locality && <p>📍 {offerLead.locality}</p>}
              {offerLead.coupon_code && (
                <p className="font-mono text-pink-600">
                  Coupon: {offerLead.coupon_code}
                </p>
              )}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-3">
              Lead Status:
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleStatusSelect('win')}
                className="py-4 px-6 rounded-lg text-lg font-semibold border-2 transition-all bg-white text-gray-700 border-gray-300 hover:bg-green-50 hover:border-green-500 active:bg-green-600 active:text-white"
              >
                ✓ WIN
              </button>
              <button
                type="button"
                onClick={() => handleStatusSelect('lost')}
                className="py-4 px-6 rounded-lg text-lg font-semibold border-2 transition-all bg-white text-gray-700 border-gray-300 hover:bg-red-50 hover:border-red-500 active:bg-red-600 active:text-white"
              >
                ✗ LOST
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Step 2: Category selection
    if (currentStep === 2) {
      return (
        <Step2
          initialData={step2Data}
          onNext={handleStep2Next}
          onBack={handleStep2Back}
        />
      );
    }

    // Step 3+: Different based on Win/Lost status
    if (leadStatus === 'win') {
      if (currentStep === 3) {
        return (
          <WinStep3
            initialData={winStep3Data}
            onNext={handleWinStep3Next}
            onBack={() => setCurrentStep(2)}
          />
        );
      }
      if (currentStep === 4) {
        return (
          <WinSuccess
            invoiceNo={winStep3Data.invoiceNo}
            salePrice={winStep3Data.salePrice}
          />
        );
      }
    } else if (leadStatus === 'lost') {
      if (currentStep === 3) {
        return (
          <LostStep3
            initialData={lostStep3Data}
            onNext={handleLostStep3Next}
            onBack={() => setCurrentStep(2)}
          />
        );
      }
      if (currentStep === 4) {
        return (
          <LostStep4
            onSubmit={handleLostStep4Submit}
            onBack={() => setCurrentStep(3)}
            loading={submitting}
          />
        );
      }
      if (currentStep === 5) {
        const getLostReasonText = () => {
          if (!lostStep4Data.notTodayReason) return undefined;

          if (lostStep4Data.notTodayReason === 'other' && lostStep4Data.otherReason) {
            return lostStep4Data.otherReason;
          }

          const reasonMap: Record<string, string> = {
            need_family_approval: 'Need to discuss with family',
            price_high: 'Price concern',
            want_more_options: 'Want to see more options',
            just_browsing: 'Just looking around',
          };

          return reasonMap[lostStep4Data.notTodayReason] || lostStep4Data.notTodayReason;
        };

        return (
          <LostSuccess
            leadId={createdLeadId}
            customerName={offerLead.customer_name}
            customerPhone={offerLead.phone}
            lostReason={getLostReasonText()}
            dealSize={lostStep3Data.dealSize}
            modelName={lostStep3Data.modelName}
          />
        );
      }
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white min-h-screen shadow-lg">{renderStep()}</div>
      </div>
    </div>
  );
}

export default function FromOfferPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <FromOfferContent />
    </Suspense>
  );
}
