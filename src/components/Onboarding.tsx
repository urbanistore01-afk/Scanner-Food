import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Activity, Zap } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Descubra o que você está comendo",
      description: "O Scanner Food ajuda você a entender a nutrição de cada refeição com apenas uma foto.",
      icon: <Zap className="w-24 h-24 text-scan-primary mb-8" />
    },
    {
      title: "Tire uma foto do seu alimento",
      description: "Aponte a câmera para o seu prato e deixe nossa inteligência artificial fazer o resto.",
      icon: <Camera className="w-24 h-24 text-scan-primary mb-8" />
    },
    {
      title: "Receba dados nutricionais instantaneamente",
      description: "Calorias, proteínas, carboidratos e muito mais, direto na sua tela.",
      icon: <Activity className="w-24 h-24 text-scan-primary mb-8" />
    }
  ];

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-bg-base text-text-base">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md w-full text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center"
          >
            {steps[step].icon}
            <h1 className="text-3xl font-bold mb-4">{steps[step].title}</h1>
            <p className="text-lg opacity-80">{steps[step].description}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="w-full max-w-md flex flex-col gap-6 pb-12">
        <div className="flex justify-center gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step ? 'w-8 bg-scan-primary' : 'w-2 bg-border-base'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center w-full">
          {step > 0 ? (
            <button
              onClick={handlePrev}
              className="px-6 py-3 font-medium opacity-70 hover:opacity-100 transition-opacity"
            >
              Voltar
            </button>
          ) : (
            <div className="px-6 py-3"></div> // Placeholder for alignment
          )}

          <button
            onClick={handleNext}
            className="px-8 py-3 bg-scan-primary text-white rounded-full font-medium hover:bg-scan-primary-hover transition-colors shadow-lg"
          >
            {step === steps.length - 1 ? "Começar agora" : "Avançar"}
          </button>
        </div>
      </div>
    </div>
  );
}
