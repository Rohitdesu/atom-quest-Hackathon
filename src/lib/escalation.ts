/**
 * Escalation Engine — BRD Section 20
 * Detects:
 *   1. Goals not submitted (still draft after goal-setting phase)
 *   2. Goals not approved (pending for > 7 days)
 *   3. Check-ins incomplete (no check-in this quarter)
 *
 * Escalation flow: Employee → Manager → HR/Admin
 * Creates entries in public.notifications table.
 */

import { supabase } from "@/lib/supabase"
import { getCurrentQuarter } from "./progress"

export type EscalationIssue = {
  type: "not_submitted" | "not_approved" | "checkin_missing"
  severity: "warning" | "critical"
  employeeId: string
  employeeName: string
  managerId: string | null
  detail: string
}

/**
 * Run the full escalation scan. Returns all detected issues.
 * Call this from the Admin Dashboard.
 */
export async function runEscalationScan(): Promise<EscalationIssue[]> {
  const issues: EscalationIssue[] = []

  // Fetch all users and goals
  const [usersRes, goalsRes, checkinsRes] = await Promise.all([
    supabase.from("users").select("*"),
    supabase.from("goals").select("*"),
    supabase.from("checkins").select("*").order("created_at", { ascending: false }),
  ])

  const users: any[] = usersRes.data || []
  const goals: any[] = goalsRes.data || []
  const checkins: any[] = checkinsRes.data || []

  const employees = users.filter(u => u.role === "employee")
  const now = new Date()

  // Quarter start: approximate current quarter start date
  const m = now.getMonth()
  const y = now.getFullYear()
  let qStart: Date
  if (m >= 3 && m <= 5) qStart = new Date(y, 3, 1)       // Q1: Apr
  else if (m >= 6 && m <= 8) qStart = new Date(y, 6, 1)  // Q2: Jul
  else if (m >= 9 && m <= 11) qStart = new Date(y, 9, 1) // Q3: Oct
  else qStart = new Date(y, 0, 1)                         // Q4: Jan

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  for (const emp of employees) {
    const empGoals = goals.filter(g => g.owner_id === emp.id)

    // Issue 1: No goals submitted — still all drafts
    const hasSubmitted = empGoals.some(g => g.status !== "draft")
    if (empGoals.length > 0 && !hasSubmitted) {
      issues.push({
        type: "not_submitted",
        severity: "warning",
        employeeId: emp.id,
        employeeName: emp.full_name,
        managerId: emp.manager_id,
        detail: `${emp.full_name} has ${empGoals.length} goal(s) still in Draft — not yet submitted for review.`,
      })
    }

    // Issue 2: Goals pending approval for > 7 days
    const pendingOld = empGoals.filter(g =>
      g.approval_status === "pending" &&
      g.status === "in_review" &&
      new Date(g.updated_at) < sevenDaysAgo
    )
    if (pendingOld.length > 0) {
      issues.push({
        type: "not_approved",
        severity: "critical",
        employeeId: emp.id,
        employeeName: emp.full_name,
        managerId: emp.manager_id,
        detail: `${emp.full_name} has ${pendingOld.length} goal(s) awaiting manager approval for over 7 days.`,
      })
    }

    // Issue 3: No check-in this quarter
    const approvedGoals = empGoals.filter(g => g.approval_status === "approved")
    if (approvedGoals.length > 0) {
      const approvedGoalIds = approvedGoals.map(g => g.id)
      const recentCheckin = checkins.find(c =>
        approvedGoalIds.includes(c.goal_id) &&
        new Date(c.created_at) >= qStart
      )
      if (!recentCheckin) {
        issues.push({
          type: "checkin_missing",
          severity: "warning",
          employeeId: emp.id,
          employeeName: emp.full_name,
          managerId: emp.manager_id,
          detail: `${emp.full_name} has not submitted a check-in this quarter (${getCurrentQuarter().label}).`,
        })
      }
    }
  }

  return issues
}

/**
 * Send notification to an employee and their manager for an escalation.
 */
export async function sendEscalationNotifications(
  issues: EscalationIssue[],
  adminId: string
): Promise<number> {
  if (issues.length === 0) return 0

  const notifications = issues.flatMap(issue => {
    const notifs: any[] = []

    // Notify employee
    notifs.push({
      user_id: issue.employeeId,
      title: getIssueTitle(issue.type),
      content: issue.detail,
      link_url: issue.type === "checkin_missing" ? "/check-ins" : "/goals",
    })

    // Notify manager if assigned
    if (issue.managerId) {
      notifs.push({
        user_id: issue.managerId,
        title: `Team Alert: ${getIssueTitle(issue.type)}`,
        content: issue.detail,
        link_url: "/manager-dashboard",
      })
    }

    return notifs
  })

  const { error } = await supabase.from("notifications").insert(notifications)
  if (error) throw error

  // Log the escalation run in audit_logs
  await supabase.from("audit_logs").insert([{
    actor_id: adminId,
    action: "escalation_run",
    entity_type: "system",
    entity_id: null,
    details: { issues_count: issues.length, timestamp: new Date().toISOString() },
  }])

  return notifications.length
}

function getIssueTitle(type: EscalationIssue["type"]): string {
  switch (type) {
    case "not_submitted": return "⚠️ Goals Not Submitted"
    case "not_approved":  return "🚨 Goals Pending Approval"
    case "checkin_missing": return "⚠️ Quarterly Check-in Missing"
  }
}
