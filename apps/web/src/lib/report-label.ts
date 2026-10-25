export function formatReportDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function getReportReferenceLabel(type: string) {
  switch (type) {
    case 'campaign': return 'Program';
    case 'zakat_period': return 'Zakat';
    case 'zakat_disbursement': return 'Penyaluran Zakat';
    case 'qurban_period': return 'Qurban';
    default: return 'Laporan';
  }
}

export function formatReportDateShort(dateString: string) {
  return new Date(dateString).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function getReportReferenceColor(type: string) {
  switch (type) {
    case 'campaign': return 'bg-info-50 text-info-700';
    case 'zakat_period':
    case 'zakat_disbursement': return 'bg-primary-50 text-primary-700';
    case 'qurban_period': return 'bg-warning-50 text-warning-700';
    default: return 'bg-light text-gray-700';
  }
}

export function stripReportHtml(html: string) {
  return html.replace(/<[^>]*>/g, '').substring(0, 150);
}
