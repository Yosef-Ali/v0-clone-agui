"use client";

interface ApprovalMessageProps {
  prdText: string;
  onApprove: () => void;
  onReject: () => void;
}

export function ApprovalMessage({ prdText, onApprove, onReject }: ApprovalMessageProps) {
  return (
    <div className="space-y-4">
      {/* PRD Preview */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 max-h-64 overflow-y-auto">
        <div className="text-sm font-semibold mb-2 text-foreground">📋 Product Requirements Document</div>
        <div className="text-sm whitespace-pre-wrap text-muted-foreground">
          {prdText}
        </div>
      </div>

      {/* Approval Actions */}
      <div className="flex gap-3">
        <button
          onClick={onApprove}
          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approve & Continue
        </button>
        <button
          onClick={onReject}
          className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Request Changes
        </button>
      </div>

      <div className="text-xs text-muted-foreground text-center">
        Review the requirements above. Click &quot;Approve&quot; to continue to design, or &quot;Request Changes&quot; to provide feedback.
      </div>
    </div>
  );
}
