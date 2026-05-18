import { useState, useEffect } from "react"
import { X, Loader2, AlertCircle, CheckCircle, XCircle } from "lucide-react"
import type { Goal } from "@/types"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface ApprovalModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  goalToReview: Goal | null
  teamMemberName: string
}

export default function ApprovalModal({ isOpen, onClose, onSaved, goalToReview, teamMemberName }: ApprovalModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    target: "",
    weightage: "",
    manager_feedback: ""
  })

  useEffect(() => {
    if (goalToReview) {
      setFormData({
        target: goalToReview.target.toString(),
        weightage: goalToReview.weightage.toString(),
        manager_feedback: goalToReview.manager_feedback || ""
      })
    }
    setError(null)
  }, [goalToReview, isOpen])

  if (!isOpen || !goalToReview) return null

  const handleAction = async (action: 'approve' | 'reject') => {
    if (action === 'reject' && !formData.manager_feedback.trim()) {
      setError("Feedback is required when returning a goal for rework.")
      return
    }

    if (isNaN(parseFloat(formData.target)) || isNaN(parseInt(formData.weightage))) {
      setError("Target and Weightage must be valid numbers.")
      return
    }

    setLoading(true)
    setError(null)

    const isApproved = action === 'approve'
    const payload = {
      target: parseFloat(formData.target),
      weightage: parseInt(formData.weightage),
      manager_feedback: formData.manager_feedback.trim() || null,
      approval_status: isApproved ? 'approved' : 'rejected',
      status: isApproved ? 'approved' : 'draft',
      locked_state: isApproved // Handled by DB trigger, but good to be explicit
    }

    try {
      const { error: dbError } = await supabase
        .from("goals")
        .update(payload)
        .eq("id", goalToReview.id)
        
      if (dbError) throw dbError
      
      toast.success(isApproved ? "Goal approved and locked!" : "Goal returned for rework.")
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while updating the goal.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Review Goal</h2>
            <p className="text-sm text-gray-500 mt-1">for {teamMemberName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {error && (
            <div className="mb-6 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-md p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mb-6 bg-slate-50 border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-1">{goalToReview.title}</h3>
            <p className="text-sm text-gray-600 mb-3">{goalToReview.description || "No description provided."}</p>
            <div className="flex gap-4 text-sm text-gray-500">
              <span className="bg-white border px-2 py-1 rounded">Area: {goalToReview.thrust_area}</span>
              <span className="bg-white border px-2 py-1 rounded">UoM: {goalToReview.uom_type}</span>
            </div>
          </div>

          <form className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Value</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">Manager can override.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%)</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={formData.weightage}
                  onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <p className="text-xs text-gray-500 mt-1">Ensure team total = 100%.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manager Feedback / Comments</label>
              <textarea
                rows={3}
                placeholder="Explain any target overrides or reasons for rework..."
                value={formData.manager_feedback}
                onChange={(e) => setFormData({ ...formData, manager_feedback: e.target.value })}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>
          </form>
        </div>

        <div className="border-t px-6 py-4 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => handleAction('reject')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
            Return for Rework
          </button>
          <button
            type="button"
            onClick={() => handleAction('approve')}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            Approve Goal
          </button>
        </div>
      </div>
    </div>
  )
}
