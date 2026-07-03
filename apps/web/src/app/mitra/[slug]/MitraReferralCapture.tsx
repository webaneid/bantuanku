"use client";

import { useEffect } from "react";
import { saveReferralCode } from "@/lib/referral";

export default function MitraReferralCapture({ code }: { code: string }) {
  useEffect(() => {
    saveReferralCode(code);
  }, [code]);
  return null;
}
