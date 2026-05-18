import { useState } from "react"
import { X, Loader2, AlertCircle } from "lucide-react"
import type { Goal, CheckinStatus } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface CheckinModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  goal: Goal | null
}

const STATUS_OPTIONS: { value: CheckinStatus, label: string, desc: string }[] = [
  { value: 'on_track', label: 'On Track', desc: 'Progressing as expected' },
  { value: 'needs_attention', label: 'Needs Attention', desc: 'Falling behind but recoverable' },
  { value: 'blocked', label: 'Blocked', desc: 'Cannot proceed without help' }
]

export default function CheckinModal({ isOpen, onClose, onSaved, goal }: CheckinModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    status: 'on_track' as CheckinStatus,
    achievement_update: "",
    notes: ""
  })

  // Set initial achievement when modal opens
  useState(() => {
    if (goal) {
      setFormData(prev => ({ ...prev, achievement_update: goal.achievement.toString() }))
    }
  })

  if (!isOpen || !goal) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return

    const updateValue = parseFloat(formData.achievement_update)
    if (isNaN(updateValue)) {
      setError("Achievement update must be a valid number.")
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Insert checkin record
      const { error: checkinError } = await supabase
        .from('checkins')
        .insert([{
          goal_id: goal.id,
          author_id: profile.id,
          status: formData.status,
          achievement_update: updateValue,
          notes: formData.notes.trim() || null
        }])

      if (checkinError) throw checkinError

      // 2. Update the goal's achievement & status
      let nextGoalStatus = goal.status
      // Simple status mapping logic based on tracking type
      if (updateValue >= goal.target) {
        nextGoalStatus = 'completed'
      } else if (formData.status === 'blocked') {
        nextGoalStatus = 'at_risk'
      } else if (goal.status === 'draft' || goal.status === 'approved') {
        nextGoalStatus = 'in_progress'
      }

      const { error: goalError } = await supabase
        .from('goals')
        .update({
          achievement: updateValue,
          status: nextGoalStatus
        })
        .eq('id', goal.id)

      if (goalError) throw goalError

      toast.success("Check-in submitted successfully!")
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while submitting the check-in.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Quarterly Check-in</h2>
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{goal.title}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Target</p>
              <p className="text-lg font-bold text-gray-900">{goal.target} {goal.uom_type}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Current</p>
              <p className="text-lg font-bold text-primary">{goal.achievement} {goal.uom_type}</p>
            </div>
          </div>

          <form id="checkin-form" onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Achievement Value</label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.achievement_update}
                onChange={(e) => setFormData({ ...formData, achievement_update: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-xs text-gray-500 mt-1">Enter the cumulative total value (not just the increment).</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Health Status</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, status: opt.value })}
                    className={`p-3 rounded-lg border text-left flex flex-col gap-1 transition-all ${
                      formData.status === opt.value 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                  >
                    <span className={`text-sm font-semibold ${
                      opt.value === 'on_track' ? 'text-green-700' : 
                      opt.value === 'needs_attention' ? 'text-amber-700' : 'text-red-700'
                    }`}>
                      {opt.label}
                    </span>
                    <span className="text-xs text-gray-500 leading-tight">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes & Next Steps</label>
              <textarea
                required
                rows={3}
                placeholder="What progress was made? Any blockers?"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </form>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors"
          >
            Cancel
          </button>
          <button
            form="checkin-form"
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit Check-in
          </button>
        </div>
      </div>
    </div>
  )
}
