import type { Goal } from "@/types"
import { Edit2, Trash2, Target, CheckCircle2, AlertCircle, Clock, Lock, Send } from "lucide-react"
import { cn } from "@/lib/utils"
import { calcProgress, getProgressColor } from "@/lib/progress"

interface GoalCardProps {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (id: string) => void
}

const statusConfig: Record<string, { label: string; className: string }> = {
  draft:       { label: "Draft",       className: "badge-draft" },
  in_review:   { label: "In Review",   className: "badge-in_review" },
  approved:    { label: "Approved",    className: "badge-approved" },
  in_progress: { label: "In Progress", className: "badge-in_progress" },
  completed:   { label: "Completed",   className: "badge-completed" },
  at_risk:     { label: "At Risk",     className: "badge-at_risk" },
  cancelled:   { label: "Cancelled",   className: "badge-cancelled" },
}

const approvalConfig: Record<string, { label: string; className: string }> = {
  pending:  { label: "Pending Review", className: "bg-amber-50 text-amber-700 border-amber-200" },
  approved: { label: "Approved",       className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  rejected: { label: "Needs Rework",   className: "bg-red-50 text-red-700 border-red-200" },
}

export default function GoalCard({ goal, onEdit, onDelete }: GoalCardProps) {
  const completionPct = calcProgress(goal.uom_type, goal.target, goal.achievement, goal.start_date, goal.end_date)

  const status = statusConfig[goal.status] ?? { label: goal.status, className: "badge-draft" }
  const approval = approvalConfig[goal.approval_status]

  const progressColor = getProgressColor(completionPct, goal.status)

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 overflow-hidden group flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-2 mb-3">
          {/* Status badges */}
          <div className="flex flex-wrap gap-1.5 min-w-0">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
              status.className
            )}>
              {goal.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
              {goal.status === 'at_risk' && <AlertCircle className="w-3 h-3" />}
              {goal.status === 'in_progress' && <Target className="w-3 h-3" />}
              {['draft', 'in_review', 'approved', 'cancelled'].includes(goal.status) && <Clock className="w-3 h-3" />}
              {status.label}
            </span>

            {goal.approval_status !== 'approved' && (
              <span className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
                approval?.className
              )}>
                <Send className="w-2.5 h-2.5" />
                {approval?.label}
              </span>
            )}

            {goal.locked_state && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                <Lock className="w-2.5 h-2.5" /> Locked
              </span>
            )}
          </div>

          {/* Action buttons (visible on hover) */}
          {!goal.locked_state && (
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(goal)}
                className="p-1.5 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                title="Edit goal"
                aria-label="Edit goal"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(goal.id)}
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                title="Delete goal"
                aria-label="Delete goal"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Title & Description */}
        <h3 className="text-base font-semibold text-gray-900 mb-1 line-clamp-2 leading-snug" title={goal.title}>
          {goal.title}
        </h3>
        <p className="text-sm text-gray-500 line-clamp-2 min-h-[40px]" title={goal.description ?? ""}>
          {goal.description || "No description provided."}
        </p>
      </div>

      {/* Meta grid */}
      <div className="mx-5 mb-3 grid grid-cols-2 gap-3">
        <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">Thrust Area</p>
          <p className="text-sm font-semibold text-gray-800 truncate" title={goal.thrust_area}>{goal.thrust_area}</p>
        </div>
        <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-0.5">Target ({goal.uom_type})</p>
          <p className="text-sm font-semibold text-gray-800">
            <span className="text-primary">{goal.achievement}</span>
            <span className="text-gray-400 mx-0.5">/</span>
            {goal.target}
          </p>
        </div>
      </div>

      {/* Manager feedback */}
      {goal.manager_feedback && (
        <div className="mx-5 mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
          <p className="text-[10px] text-amber-700 uppercase tracking-wider font-semibold mb-1">💬 Manager Feedback</p>
          <p className="text-xs text-amber-900 line-clamp-2" title={goal.manager_feedback}>
            {goal.manager_feedback}
          </p>
        </div>
      )}

      {/* Progress footer */}
      <div className="mt-auto px-5 py-4 border-t border-gray-50 bg-slate-50/60">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Completion</span>
          <span className={cn(
            "text-xs font-bold",
            completionPct >= 100 ? "text-emerald-600" : goal.status === 'at_risk' ? "text-red-500" : "text-primary"
          )}>
            {completionPct}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn("h-1.5 rounded-full transition-all duration-700", progressColor)}
            style={{ width: `${completionPct}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-[10px] text-gray-400">Weightage: {goal.weightage}%</span>
          {goal.approval_status === 'approved' && goal.locked_state && (
            <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-2.5 h-2.5" /> Approved & Locked
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
