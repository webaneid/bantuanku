"use client";

import { useEffect, useState } from "react";
import {
  subscribeFeedbackToast,
  type FeedbackToastPayload,
} from "@/lib/feedback-toast";

export default function FeedbackToastHost() {
  const [feedback, setFeedback] = useState<FeedbackToastPayload | null>(null);

  useEffect(() => {
    return subscribeFeedbackToast((payload) => {
      setFeedback(payload);
    });
  }, []);

  if (!feedback) return null;

  const isSuccess = feedback.type === "success";

  return (
    <div className="feedback-dialog__overlay" onClick={() => setFeedback(null)}>
      <div className="feedback-dialog" onClick={(e) => e.stopPropagation()}>
        <div
          className={`feedback-dialog__icon ${
            isSuccess
              ? "feedback-dialog__icon--success"
              : "feedback-dialog__icon--error"
          }`}
        >
          {isSuccess ? (
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>
        <h3 className="feedback-dialog__title">{feedback.title}</h3>
        <p className="feedback-dialog__message">{feedback.message}</p>
        <button
          type="button"
          className={`feedback-dialog__button ${
            isSuccess
              ? "feedback-dialog__button--success"
              : "feedback-dialog__button--error"
          }`}
          onClick={() => setFeedback(null)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
