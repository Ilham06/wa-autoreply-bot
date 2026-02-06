export function isOutsideWorkingHours() {
  const now = new Date();

  // Ambil waktu WIB langsung, bukan waktu container
  const parts = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now);

  const hour = Number(parts.find(p => p.type === 'hour').value);
  const minute = Number(parts.find(p => p.type === 'minute').value);

  const current = hour * 60 + minute;

  const startOff = 20 * 60 + 30; // 20:30
  const endOff = 10 * 60;        // 10:00

  return current >= startOff || current < endOff;
}
