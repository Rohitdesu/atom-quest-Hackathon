/**
 * Progress Calculation Engine - BRD Section 11
 * Handles all 4 UoM calculation types:
 * - Numeric   → Higher is better (Min type): achievement / target
 * - Percentage→ Same as Numeric: achievement / target
 * - Timeline  → Based on dates: days elapsed vs deadline
 * - Zero-Based→ If achievement=0 → 100%, else 0%
 */

export function calcProgress(
  uomType: string,
  target: number,
  achievement: number,
  startDate?: string | null,
  endDate?: string | null
): number {
  const normalized = uomType?.toLowerCase() ?? ""

  if (normalized === "zero-based") {
    return achievement === 0 ? 100 : 0
  }

  if (normalized === "timeline") {
    if (!startDate || !endDate) return 0
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()
    if (now >= end) return 100
    if (now <= start) return 0
    const total = end - start
    const elapsed = now - start
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
  }

  // Numeric + Percentage → Min type: higher is better
  if (target <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((achievement / target) * 100)))
}

export function getProgressColor(pct: number, status: string): string {
  if (status === "at_risk" || status === "cancelled") return "bg-red-500"
  if (pct >= 100) return "bg-emerald-500"
  if (pct >= 60) return "bg-primary"
  if (pct >= 30) return "bg-amber-500"
  return "bg-red-400"
}

export function getProgressLabel(uomType: string): string {
  const n = uomType?.toLowerCase() ?? ""
  if (n === "zero-based") return "0 = 100%"
  if (n === "timeline") return "Date-based"
  if (n === "percentage") return "% complete"
  return "Numeric"
}

// Get quarter label from date
export function getQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr)
  const m = d.getMonth()
  const y = d.getFullYear()
  if (m >= 3 && m <= 5) return `Q1 ${y}`   // Apr-Jun
  if (m >= 6 && m <= 8) return `Q2 ${y}`   // Jul-Sep
  if (m >= 9 && m <= 11) return `Q3 ${y}`  // Oct-Dec
  return `Q4 ${y - 1}`                      // Jan-Mar
}

// Current active quarter info
export function getCurrentQuarter() {
  const now = new Date()
  const m = now.getMonth()
  if (m >= 3 && m <= 5) return { label: "Q1", open: "May 1", checkin: "July" }
  if (m >= 6 && m <= 8) return { label: "Q2", open: "July", checkin: "October" }
  if (m >= 9 && m <= 11) return { label: "Q3", open: "October", checkin: "January" }
  return { label: "Q4", open: "January", checkin: "March/April" }
}
