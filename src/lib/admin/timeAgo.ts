/** Formats an ISO timestamp as WordPress-style relative time, e.g. "5 minutes ago". */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return iso;
  const now = Date.now();
  const diffSec = Math.round((now - then) / 1000);

  if (diffSec < 10) return 'a second ago';
  if (diffSec < 60) return `${diffSec} seconds ago`;

  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return diffMin === 1 ? 'a minute ago' : `${diffMin} minutes ago`;

  const diffHour = Math.round(diffMin / 60);
  if (diffHour < 24) return diffHour === 1 ? 'an hour ago' : `${diffHour} hours ago`;

  const diffDay = Math.round(diffHour / 24);
  if (diffDay < 30) return diffDay === 1 ? 'a day ago' : `${diffDay} days ago`;

  const diffMonth = Math.round(diffDay / 30);
  if (diffMonth < 12) return diffMonth === 1 ? 'a month ago' : `${diffMonth} months ago`;

  const diffYear = Math.round(diffMonth / 12);
  return diffYear === 1 ? 'a year ago' : `${diffYear} years ago`;
}
