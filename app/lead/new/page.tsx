'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Step1 from '@/components/LeadForm/Step1';
import Step2 from '@/components/LeadForm/Step2';
import Step3 from '@/components/LeadForm/Step3';
import Step4 from '@/components/LeadForm/Step4';
import { Step1Data, Step2Data, Step3Data, Step4Data } from '@/lib/types';

type CurrentStep = 1 | 2 | 3 | 4;

export default function NewLeadPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<CurrentStep>(1);
  const [loading, setLoading] = useState(false);

  const [step1Data, setStep1Data] = useState<Step1Data>({ name: '', phone: '' });
  const [step2Data, setStep2Data] = useState<Step2Data>({ categoryId: '' });
  const [step3Data, setStep3Data] = useState<Step3Data>({ dealSize: 0, modelName: '' });

  const handleStep1Next = (data: Step1Data) => {
    setStep1Data(data);
    setCurrentStep(2);
  };

  const handleStep2Next = (data: Step2Data) => {
    setStep2Data(data);
    setCurrentStep(3);
  };

  const handleStep3Next = (data: Step3Data) => {
    setStep3Data(data);
    setCurrentStep(4);
  };

  const handleStep4Submit = async (data: Step4Data) => {
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
          dealSize: step3Data.dealSize,
          modelName: step3Data.modelName,
          purchaseTimeline: data.purchaseTimeline,
          notTodayReason: data.notTodayReason,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        alert(result.error || 'Failed to create lead');
        setLoading(false);
        return;
      }

      // Show success message
      router.push('/dashboard?success=true');
    } catch (error) {
      console.error('Submit error:', error);
      alert('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white min-h-screen shadow-lg">
          {currentStep === 1 && (
            <Step1 initialData={step1Data} onNext={handleStep1Next} />
          )}

          {currentStep === 2 && (
            <Step2
              initialData={step2Data}
              onNext={handleStep2Next}
              onBack={() => setCurrentStep(1)}
            />
          )}

          {currentStep === 3 && (
            <Step3
              initialData={step3Data}
              onNext={handleStep3Next}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <Step4
              onSubmit={handleStep4Submit}
              onBack={() => setCurrentStep(3)}
              loading={loading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
