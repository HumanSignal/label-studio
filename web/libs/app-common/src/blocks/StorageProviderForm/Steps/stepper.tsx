import { cn } from "@humansignal/ui";

interface StepperProps {
  steps: { title: string }[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  isEditMode?: boolean;
}

const MAX_STEPS_COUNT = 4;

export const Stepper = ({ steps, currentStep, onStepClick, isEditMode = false }: StepperProps) => {
  // Calculate progress that aligns with circle centers
  const calculateProgressWidth = () => {
    if (currentStep === 0) return 0;
    if (currentStep >= steps.length - 1) return 100;

    // Calculate the position of the current step circle (left edge)
    const stepWidth = 100 / MAX_STEPS_COUNT;
    // Stop at the current step's circle, not extend to the next step
    const progressToCurrentStep = currentStep * stepWidth;

    return Math.max(0, Math.min(100, progressToCurrentStep));
  };

  const handleStepClick = (stepIndex: number) => {
    // In edit mode, allow clicking on all steps
    // In create mode, only allow clicking on completed steps
    if (onStepClick && (isEditMode || stepIndex < currentStep)) {
      onStepClick(stepIndex);
    }
  };

  return (
    <div className="w-full mb-tight py-base bg-neutral-background border-b border-neutral-border px-wide">
      <div className="flex flex-col">
        {/* Step titles at the top */}
        <div className="grid grid-cols-4 mb-tight">
          {steps.map((step, index) => (
            <div key={index} className="text-left">
              <span
                className={cn(
                  "text-body-small",
                  currentStep >= index ? "text-primary-content font-semibold" : "text-neutral-content-subtle",
                  // Make steps clickable in edit mode or completed steps in create mode
                  ((isEditMode && onStepClick) || (index < currentStep && onStepClick)) &&
                    "cursor-pointer hover:text-primary-content-subtle transition-colors",
                )}
                onClick={() => handleStepClick(index)}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>

        {/* Progress bar with integrated circles */}
        <div className="relative w-full h-6 flex items-center">
          {/* Background progress bar */}
          <div className="absolute inset-y-0 right-0 h-1 bg-neutral-emphasis rounded-full my-auto left-0" />

          {/* Progress fill */}
          <div
            className="absolute inset-y-0 h-1 left-0 bg-primary-surface transition-all duration-300 rounded-full my-auto "
            style={{
              width: `calc(${calculateProgressWidth()}% + 10px)`,
            }}
          />

          {/* Step circles positioned along the progress bar */}
          <div className="w-full grid grid-cols-4 absolute justify-center">
            {steps.map((_step, index) => (
              <div key={index}>
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-body-small border-2 transition-all duration-300",
                    currentStep > index
                      ? "bg-primary-surface text-primary-surface-content shadow-sm border-primary-surface cursor-pointer hover:bg-primary-emphasis" // completed - clickable
                      : currentStep === index
                        ? isEditMode
                          ? "bg-primary-surface text-primary-surface-content shadow-sm border-primary-surface cursor-pointer hover:bg-primary-emphasis" // current - clickable in edit mode
                          : "bg-primary-surface text-primary-surface-content shadow-sm border-primary-surface" // current - not clickable in create mode
                        : isEditMode
                          ? "bg-neutral-surface border-neutral-border text-neutral-content-subtle cursor-pointer hover:bg-neutral-emphasis" // upcoming - clickable in edit mode
                          : "bg-neutral-surface border-neutral-border text-neutral-content-subtle", // upcoming - not clickable in create mode
                  )}
                  onClick={() => handleStepClick(index)}
                >
                  {currentStep > index ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3 h-3"
                    >
                      <title>Line</title>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
