'use client';

import { createContext, useContext, useState } from 'react';

interface Step2Data {
  category: string;
  phone: string;
  businessDescription: string;
}

interface Step3Data {
  name: string;
  price: string;
}

interface OnboardingContextValue {
  userName: string;
  step2: Step2Data;
  setStep2: (data: Step2Data) => void;
  step3: Step3Data;
  setStep3: (data: Step3Data) => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  userName: '',
  step2: { category: '', phone: '', businessDescription: '' },
  setStep2: () => {},
  step3: { name: '', price: '' },
  setStep3: () => {},
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({
  userName,
  children,
}: {
  userName: string;
  children: React.ReactNode;
}) {
  const [step2, setStep2] = useState<Step2Data>({
    category: '',
    phone: '',
    businessDescription: '',
  });
  const [step3, setStep3] = useState<Step3Data>({ name: '', price: '' });

  return (
    <OnboardingContext.Provider value={{ userName, step2, setStep2, step3, setStep3 }}>
      {children}
    </OnboardingContext.Provider>
  );
}
