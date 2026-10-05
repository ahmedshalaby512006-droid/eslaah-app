export interface ParsedRequestDetails {
  mapUrl: string | null;
  manualAddress: string | null;
  issueDetails: string | null;
}

export function parseLocationAndIssue(raw?: string): ParsedRequestDetails {
  if (!raw) {
    return { mapUrl: null, manualAddress: null, issueDetails: null };
  }

  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let mapUrl: string | null = null;
  let manualAddress: string | null = null;
  let issueDetails: string | null = null;

  // 1. Detect Map URL
  for (const line of lines) {
    if (line.startsWith('http://') || line.startsWith('https://')) {
      mapUrl = line;
      break;
    }
  }

  // 2. Parse non-URL lines
  const nonUrlLines = lines.filter((l) => !l.startsWith('http://') && !l.startsWith('https://'));

  for (const line of nonUrlLines) {
    if (line.startsWith('[LOC]:')) {
      manualAddress = line.replace('[LOC]:', '').trim();
    } else if (line.startsWith('[ISSUE]:')) {
      issueDetails = line.replace('[ISSUE]:', '').trim();
    } else if (/^(الموقع:|العنوان:|Location:)/i.test(line)) {
      manualAddress = line.replace(/^(الموقع:|العنوان:|Location:)/i, '').trim();
    } else if (/^(الوصف:|تفاصيل العطل:|Issue:|العطل:)/i.test(line)) {
      issueDetails = line.replace(/^(الوصف:|تفاصيل العطل:|Issue:|العطل:)/i, '').trim();
    } else {
      // Fallback for un-prefixed lines (legacy records)
      if (!manualAddress) {
        manualAddress = line;
      } else if (!issueDetails) {
        issueDetails = line;
      } else {
        issueDetails += ` - ${line}`;
      }
    }
  }

  return { mapUrl, manualAddress, issueDetails };
}
