"use client";

import { useComponentState } from "../app/providers";

export function ApprovalPanel() {
  const { componentState } = useComponentState();

  const handleApprove = () => {
    console.log("Component approved!");
    // TODO: Implement approval logic
    alert("Component approved! You can now export or copy the code.");
  };

  const handleRequestChanges = () => {
    console.log("Requesting changes");
    // TODO: Implement feedback flow
    const feedback = prompt("What changes would you like?");
    if (feedback) {
      console.log("Feedback:", feedback);
      alert("Send your feedback in the chat to request changes.");
    }
  };

  if (!componentState.componentCode || componentState.currentStep !== "approval") {
    return null;
  }

  return (
    <div className="p-4 bg-muted/10 border-t border-border">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Ready to approve?</h3>
          <p className="text-sm text-muted-foreground">
            Review the component and approve or request changes
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRequestChanges}
            className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            Request Changes
          </button>

          <button
            onClick={handleApprove}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            ✓ Approve
          </button>
        </div>
      </div>
    </div>
  );
}
