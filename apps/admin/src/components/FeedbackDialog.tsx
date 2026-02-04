"use client";

import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";

type FeedbackDialogProps = {
  open: boolean;
  type: "success" | "error";
  title: string;
  message?: string;
  onClose: () => void;
};

export function FeedbackDialog({ open, type, title, message, onClose }: FeedbackDialogProps) {
  if (!open) return null;

  const isSuccess = type === "success";

  return (
    <div className="feedback-dialog__overlay" onClick={onClose}>
      <div className="feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <div className={`feedback-dialog__icon ${isSuccess ? "feedback-dialog__icon--success" : "feedback-dialog__icon--error"}`}>
          {isSuccess ? (
            <CheckCircleIcon className="w-10 h-10" />
          ) : (
            <XCircleIcon className="w-10 h-10" />
          )}
        </div>
        <h3 className="feedback-dialog__title">{title}</h3>
        {message && <p className="feedback-dialog__message">{message}</p>}
        <button type="button" className={`feedback-dialog__button ${isSuccess ? "feedback-dialog__button--success" : "feedback-dialog__button--error"}`} onClick={onClose}>
          OK
        </button>
      </div>
    </div>
  );
}

export default FeedbackDialog;
