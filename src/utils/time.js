export function isOutsideWorkingHours() {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
  
    const current = hour * 60 + minute;
  
    const startOff = 20 * 60 + 30; // 20:30
    const endOff = 10 * 60;        // 10:00
  
    // malam sampai pagi
    return current >= startOff || current < endOff;
  }
  