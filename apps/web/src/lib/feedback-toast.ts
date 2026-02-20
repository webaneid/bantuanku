"use client";

export type FeedbackToastType = "success" | "error";

export type FeedbackToastPayload = {
  id: number;
  type: FeedbackToastType;
  title: string;
  message: string;
};

type Listener = (payload: FeedbackToastPayload) => void;

const listeners = new Set<Listener>();
let sequence = 0;

const emit = (type: FeedbackToastType, message: string, title: string) => {
  const payload: FeedbackToastPayload = {
    id: ++sequence,
    type,
    title,
    message,
  };

  listeners.forEach((listener) => listener(payload));
  return payload.id;
};

export const subscribeFeedbackToast = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const feedbackToast = {
  success(message: string) {
    return emit("success", message, "Berhasil");
  },
  error(message: string) {
    return emit("error", message, "Gagal");
  },
};

export default feedbackToast;
