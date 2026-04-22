export function isOutsideWorkingHours(
  timezone = 'Asia/Jakarta',
  offStartMinutes = 20 * 60 + 30,
  offEndMinutes = 10 * 60
) {
  const now = new Date();

  // Ambil waktu WIB langsung, bukan waktu container
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const hour = Number(parts.find(p => p.type === 'hour').value);
  const minute = Number(parts.find(p => p.type === 'minute').value);

  const current = hour * 60 + minute;

  return current >= offStartMinutes || current < offEndMinutes;
}
