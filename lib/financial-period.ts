
function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function getFinancialPeriod(
  startDay: number,
  now: Date = new Date()
) {
  if (!Number.isInteger(startDay) || startDay < 1 || startDay > 28) {
    throw new Error("Financial start day must be between 1 and 28.");
  }

  let year = now.getFullYear();
  let month = now.getMonth();

  // If the current day is before the selected start day,
  // the current financial period began in the previous month.
  if (now.getDate() < startDay) {
    month -= 1;

    if (month < 0) {
      month = 11;
      year -= 1;
    }
  }

  const start = new Date(year, month, startDay);

  // The period ends one day before the next period starts.
  const end = new Date(year, month + 1, startDay - 1);

  return {
    startDate: formatLocalDate(start),
    endDate: formatLocalDate(end),
    label: `${formatDisplayDate(start)} – ${formatDisplayDate(end)}`,
  };
}
