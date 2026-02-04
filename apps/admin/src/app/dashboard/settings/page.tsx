"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to general settings by default
    router.replace("/dashboard/settings/general");
  }, [router]);

  return null;
}
