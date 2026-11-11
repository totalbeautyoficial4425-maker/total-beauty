export function getTodayDate(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export function formatBRL(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatDateBR(dateString?: string): string {
  if (!dateString) return '-';
  // Check if already in DD/MM/YYYY format
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return dateString;
  
  // Format YYYY-MM-DD or ISO
  const parts = dateString.split('T')[0].split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
  }
  return dateString;
}

export function formatDateTimeBR(isoString?: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return isoString;
  }
}

export function maskPhoneBR(phone: string): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').trim();
  }
  return digits.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').trim();
}

/**
 * Normalizes a Brazilian phone number to standard international wa.me format
 * e.g., "(11) 98765-4321" -> "5511987654321"
 */
export function normalizePhoneForWhatsApp(phone: string): { isValid: boolean; normalized: string; link: string } {
  if (!phone) return { isValid: false, normalized: '', link: '' };
  
  let digits = phone.replace(/\D/g, '');
  
  // If user entered without country code (e.g. 11987654321 or 1187654321)
  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  } else if (digits.length === 12 || digits.length === 13) {
    // Already has 55
    if (!digits.startsWith('55')) {
      // unknown foreign or extra prefix
    }
  }

  const isValid = digits.length >= 12 && digits.length <= 13;
  return {
    isValid,
    normalized: digits,
    link: isValid ? `https://wa.me/${digits}` : '',
  };
}

export function createWhatsAppLink(phone: string, message: string): string {
  const { isValid, normalized } = normalizePhoneForWhatsApp(phone);
  if (!isValid) return '';
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${normalized}?text=${encoded}`;
}

export function generateId(prefix = 'tb'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

export function downloadCSV(filename: string, headers: string[], rows: (string | number | undefined | null)[][]): void {
  const formatCell = (cell: string | number | undefined | null): string => {
    if (cell === undefined || cell === null) return '""';
    const str = String(cell).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvContent = [
    headers.map(formatCell).join(';'),
    ...rows.map(row => row.map(formatCell).join(';')),
  ].join('\r\n');

  // UTF-8 BOM for Brazilian Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

export function isTimeOverlapping(
  startA: string,
  endA: string,
  startB: string,
  endB: string
): boolean {
  return startA < endB && endA > startB;
}

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseBirthMonthDay(birthDate?: string): { month: number; day: number } | null {
  if (!birthDate) return null;
  const clean = birthDate.trim();
  const separator = clean.includes('-') ? '-' : clean.includes('/') ? '/' : null;
  if (!separator) return null;

  const parts = clean.split(separator).map(p => p.trim());
  if (parts.length === 3) {
    // If first part is 4 digits (e.g. 1995-10-25 or 1995/10/25) -> YYYY-MM-DD
    if (parts[0].length === 4) {
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);
      if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { month: m, day: d };
      }
    }
    // If third part is 4 digits (e.g. 25-10-1995 or 25/10/1995) -> DD-MM-YYYY
    if (parts[2].length === 4) {
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
        return { month: m, day: d };
      }
    }
    // Fallback for 2-digit years
    const p0 = parseInt(parts[0], 10);
    const p1 = parseInt(parts[1], 10);
    if (!isNaN(p0) && !isNaN(p1)) {
      if (p1 >= 1 && p1 <= 12 && p0 >= 1 && p0 <= 31) {
        return { month: p1, day: p0 };
      }
    }
  } else if (parts.length === 2) {
    // Day and Month format (e.g. 25/10 or 25-10)
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(m) && !isNaN(d) && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return { month: m, day: d };
    }
  }
  return null;
}

export function isClientBirthdayToday(birthDate?: string): boolean {
  const parsed = parseBirthMonthDay(birthDate);
  if (!parsed) return false;
  const now = new Date();
  return parsed.month === (now.getMonth() + 1) && parsed.day === now.getDate();
}

export function isClientBirthdayThisMonth(birthDate?: string): boolean {
  const parsed = parseBirthMonthDay(birthDate);
  if (!parsed) return false;
  const now = new Date();
  return parsed.month === (now.getMonth() + 1);
}

export function formatBirthdayDayMonth(birthDate?: string): string {
  const parsed = parseBirthMonthDay(birthDate);
  if (!parsed) return '';
  return `${String(parsed.day).padStart(2, '0')}/${String(parsed.month).padStart(2, '0')}`;
}
