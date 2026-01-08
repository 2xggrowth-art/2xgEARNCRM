'use client';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Step1 from '@/components/LeadForm/Step1';
import Step2 from '@/components/LeadForm/Step2';
import WinStep3 from '@/components/LeadForm/WinStep3';
import WinSuccess from '@/components/LeadForm/WinSuccess';
import LostStep3 from '@/components/LeadForm/LostStep3';
import LostStep4 from '@/components/LeadForm/LostStep4';
import LostSuccess from '@/components/LeadForm/LostSuccess';
import {
  Step1Data,
  Step2Data,
  WinStep3Data,
  LostStep3Data,
  LostStep4Data,
  Step4Data,
  LeadStatus,
} from '@/lib/types';

type WinStep = 1 | 2 | 3 | 'success';
type LostStep = 1 | 2 | 3 | 4 | 'success';

export default function NewLeadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [leadStatus, setLeadStatus] = useState<LeadStatus>('lost');
  const [loading, setLoading] = useState(false);

  // Form data
  const [step1Data, setStep1Data] = useState<Step1Data>({
    name: '',
    phone: '',
    status: 'lost',
  });
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

  const handleStep1Next = (data: Step1Data) => {
    setStep1Data(data);
    setLeadStatus(data.status);
    setCurrentStep(2);
  };

  const handleStep2Next = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep2Back = () => {
    setCurrentStep(1);
  };

  // Win Flow - Step 3
  const handleWinStep3Next = async (data: WinStep3Data) => {
    setWinStep3Data(data);
    setLoading(true);

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerName: step1Data.name,
          customerPhone: step1Data.phone,
          categoryId: step2Data.categoryId,
          status: 'win',
          invoiceNo: data.invoiceNo,
          salePrice: data.salePrice,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to create lead');
        setLoading(false);
        return;
      }

      // Show success screen
      setCurrentStep(4); // Using 4 as 'success' step
      setLoading(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
      setLoading(false);
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
    setLoading(true);

    try {
      const response = await fetch('/api/leads/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          customerName: step1Data.name,
          customerPhone: step1Data.phone,
          categoryId: step2Data.categoryId,
          status: 'lost',
          dealSize: lostStep3Data.dealSize,
          modelName: lostStep3Data.modelName,
          purchaseTimeline: data.purchaseTimeline,
          notTodayReason: data.notTodayReason,
          otherReason: data.otherReason, // Custom reason text
          leadRating: data.leadRating, // 5-star rating
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to create lead');
        setLoading(false);
        return;
      }

      // Save the lead ID and show success screen with WhatsApp button
      setCreatedLeadId(result.leadId || result.data?.id || '');
      setCurrentStep(5); // Show LostSuccess screen
      setLoading(false);
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
      setLoading(false);
    }
  };

  const renderStep = () => {
    // Step 1: Always the same
    if (currentStep === 1) {
      return <Step1 initialData={step1Data} onNext={handleStep1Next} />;
    }

    // Step 2: Always the same (category selection)
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
    } else {
      // Lost flow
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
            loading={loading}
          />
        );
      }
      if (currentStep === 5) {
        // Get the lost reason text
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
            customerName={step1Data.name}
            customerPhone={step1Data.phone}
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
