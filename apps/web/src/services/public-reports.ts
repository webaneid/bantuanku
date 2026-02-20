const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:50245/v1';

export interface PublicZakatReportRow {
  id: string;
  paidAt: string | null;
  donorName: string;
  amount: number;
  periodId: string;
  periodName: string;
  zakatTypeId: string;
  zakatTypeName: string;
  programKey: string;
  programName: string;
}

export interface PublicZakatActivityRow {
  id: string;
  title: string;
  activityDate: string | null;
  referenceType: string;
  referenceId: string;
  periodId: string | null;
  periodName: string | null;
  zakatTypeId: string | null;
  zakatTypeName: string | null;
  programKey: string;
  programName: string;
}

export interface PublicQurbanReportRow {
  id: string;
  paidAt: string | null;
  donorName: string;
  amount: number;
  quantity: number;
  periodId: string;
  periodName: string;
  packageName: string;
  animalType: string;
  programKey: string;
  programName: string;
}

export async function fetchPublicZakatReport(params: {
  periodId?: string;
  zakatTypeId?: string;
  program?: string;
}) {
  const search = new URLSearchParams();
  if (params.periodId) search.set('periodId', params.periodId);
  if (params.zakatTypeId) search.set('zakatTypeId', params.zakatTypeId);
  if (params.program) search.set('program', params.program);

  const response = await fetch(`${API_URL}/public-stats/zakat-report?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch public zakat report: ${response.statusText}`);
  }

  const json = await response.json();
  return (json.success ? json.data : json) as {
    filters: {
      periods: Array<{ id: string; name: string }>;
      types: Array<{ id: string; name: string }>;
      campaigns: Array<{ id: string; title: string }>;
      programs: Array<{ key: string; label: string }>;
    };
    rows: PublicZakatReportRow[];
    activities: PublicZakatActivityRow[];
  };
}

export async function fetchPublicZakatActivities(params: {
  periodId?: string;
  zakatTypeId?: string;
  program?: string;
}) {
  const search = new URLSearchParams();
  if (params.periodId) search.set('periodId', params.periodId);
  if (params.zakatTypeId) search.set('zakatTypeId', params.zakatTypeId);
  if (params.program) search.set('program', params.program);

  const response = await fetch(`${API_URL}/public-stats/zakat-activities?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch zakat activities: ${response.statusText}`);
  }

  const json = await response.json();
  return (json.success ? json.data : json) as {
    filters: {
      periods: Array<{ id: string; name: string }>;
      types: Array<{ id: string; name: string }>;
      programs: Array<{ key: string; label: string }>;
    };
    rows: PublicZakatActivityRow[];
  };
}

export async function fetchPublicQurbanReport(params: {
  periodId?: string;
  program?: string;
}) {
  const search = new URLSearchParams();
  if (params.periodId) search.set('periodId', params.periodId);
  if (params.program) search.set('program', params.program);

  const response = await fetch(`${API_URL}/public-stats/qurban-report?${search.toString()}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch public qurban report: ${response.statusText}`);
  }

  const json = await response.json();
  return (json.success ? json.data : json) as {
    filters: {
      periods: Array<{ id: string; name: string }>;
      programs: Array<{ key: string; label: string }>;
    };
    rows: PublicQurbanReportRow[];
  };
}
