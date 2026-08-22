export function formatRelativeDate(isoDate: string): string {
  const elapsedMs = Date.now() - new Date(isoDate).getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour

  const span = (amount: number, unit: string) =>
    `${amount} ${unit}${amount === 1 ? "" : "s"} ago`

  if (elapsedMs < hour) return span(Math.max(1, Math.floor(elapsedMs / minute)), "minute")
  if (elapsedMs < day) return span(Math.floor(elapsedMs / hour), "hour")
  if (elapsedMs < 7 * day) return span(Math.floor(elapsedMs / day), "day")
  if (elapsedMs < 30 * day) return span(Math.floor(elapsedMs / (7 * day)), "week")
  if (elapsedMs < 365 * day) return span(Math.floor(elapsedMs / (30 * day)), "month")
  return span(Math.floor(elapsedMs / (365 * day)), "year")
}
