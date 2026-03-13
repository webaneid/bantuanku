'use client';

import { useEffect } from 'react';
import * as fbPixel from '@/lib/fbPixel';

interface ViewContentTrackerProps {
  contentName: string;
  contentIds: string[];
  contentType: string;
  value?: number;
}

export default function ViewContentTracker({
  contentName,
  contentIds,
  contentType,
  value,
}: ViewContentTrackerProps) {
  useEffect(() => {
    fbPixel.viewContent({
      content_name: contentName,
      content_ids: contentIds,
      content_type: contentType,
      value,
      currency: 'IDR',
    });
  }, []);

  return null;
}
