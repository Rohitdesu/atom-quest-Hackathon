import { useState, useEffect } from "react"
import { X, Loader2, AlertCircle, Send, Save } from "lucide-react"
import type { Goal } from "@/types"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface GoalModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  goalToEdit?: Goal | null
  currentTotalWeightage: number
}

const THRUST_AREAS = [
  "Financial Performance",
  "Customer Satisfaction",
  "Operational Excellence",
  "Innovation & Learning",
  "Team Development",
  "Process Improvement",
  "Quality & Compliance",
  "Strategic Growth"
]

// 4 official UoM types as per BRD
const UOM_TYPES = [
  { value: "Numeric",     label: "Numeric",     desc: "Higher is better (Min type)" },
  { value: "Percentage",  label: "Percentage %", desc: "Target as a percentage" },
  { value: "Timeline",    label: "Timeline",     desc: "Completion date vs deadline" },
  { value: "Zero-Based",  label: "Zero-Based",   desc: "0 = 100% achievement" },
]

export default function GoalModal({ isOpen, onClose, onSaved, goalToEdit, currentTotalWeightage }: GoalModalProps) {
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    thrust_area: THRUST_AREAS[0],
    uom_type: UOM_TYPES[0].value,
    target: "",
    weightage: "10",
    start_date: "",
    end_date: "",
  })

  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        title: goalToEdit.title,
        description: goalToEdit.description || "",
        thrust_area: goalToEdit.thrust_area,
        uom_type: goalToEdit.uom_type,
        target: goalToEdit.target.toString(),
        weightage: goalToEdit.weightage.toString(),
        start_date: goalToEdit.start_date || "",
        end_date: goalToEdit.end_date || "",
      })
    } else {
      setFormData({
        title: "", description: "",
        thrust_area: THRUST_AREAS[0],
        uom_type: UOM_TYPES[0].value,
        target: "", weightage: "10",
        start_date: "", end_date: "",
      })
    }
    setError(null)
  }, [goalToEdit, isOpen])

  if (!isOpen) return null

  // Real-time validation
  const editingWeightage = goalToEdit ? goalToEdit.weightage : 0
  const proposedWeightage = parseInt(formData.weightage) || 0
  const newTotalWeightage = currentTotalWeightage - editingWeightage + proposedWeightage
  const isOverWeight = newTotalWeightage > 100
  const isUnderMinWeight = proposedWeightage < 10
  const canSubmit = !isOverWeight && !isUnderMinWeight

  const saveGoal = async (submitForReview: boolean) => {
    if (!profile) return
    if (!canSubmit) { setError("Please fix validation errors before saving."); return }
    if (isNaN(parseFloat(formData.target))) { setError("Target must be a valid number."); return }

    setLoading(true)
    setError(null)

    const payload: any = {
      owner_id: profile.id,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      thrust_area: formData.thrust_area,
      uom_type: formData.uom_type,
      target: parseFloat(formData.target),
      weightage: parseInt(formData.weightage),
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
    }

    // If submitting for review, change status
    if (submitForReview) {
      payload.status = 'in_review'
      payload.approval_status = 'pending'
    }

    try {
      if (goalToEdit) {
        const { error: dbError } = await supabase.from("goals").update(payload).eq("id", goalToEdit.id)
        if (dbError) throw dbError
        toast.success(submitForReview ? "Goal submitted for review! 🎯" : "Goal saved as draft.")
      } else {
        const { error: dbError } = await supabase.from("goals").insert([payload])
        if (dbError) throw dbError
        toast.success(submitForReview ? "Goal submitted for review! 🎯" : "Goal created as draft.")
      }
      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      setError(err.message || "An error occurred while saving the goal.")
    } finally {
      setLoading(false)
    }
  }

  const selectedUom = UOM_TYPES.find(u => u.value === formData.uom_type)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {goalToEdit ? "Edit Goal" : "Create New Goal"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              All fields marked * are required
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Weightage progress bar */}
          <div className="bg-slate-50 border rounded-lg p-3">
            <div className="flex justify-between text-xs font-medium mb-1.5">
              <span className="text-gray-600">Total Weightage</span>
              <span className={cn(newTotalWeightage > 100 ? "text-red-600" : newTotalWeightage === 100 ? "text-emerald-600" : "text-primary")}>
                {newTotalWeightage}% / 100%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={cn("h-1.5 rounded-full transition-all duration-300", newTotalWeightage > 100 ? "bg-red-500" : newTotalWeightage === 100 ? "bg-emerald-500" : "bg-primary")}
                style={{ width: `${Math.min(100, newTotalWeightage)}%` }}
              />
            </div>
          </div>

          {/* Goal Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input
              type="text" required
              placeholder="E.g., Increase Q3 Sales Revenue by 20%"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="How will this goal be achieved?"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          {/* Thrust Area + UoM */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area *</label>
              <select
                required value={formData.thrust_area}
                onChange={(e) => setFormData({ ...formData, thrust_area: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              >
                {THRUST_AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UoM Type *</label>
              <select
                required value={formData.uom_type}
                onChange={(e) => setFormData({ ...formData, uom_type: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-white"
              >
                {UOM_TYPES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
              {selectedUom && (
                <p className="text-[10px] text-gray-400 mt-0.5">{selectedUom.desc}</p>
              )}
            </div>
          </div>

          {/* Target + Weightage */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Value *</label>
              <input
                type="number" required step="0.01" placeholder="0"
                value={formData.target}
                onChange={(e) => setFormData({ ...formData, target: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">
                {formData.uom_type === 'Zero-Based' ? 'Enter 0 for 100% achievement' : 
                 formData.uom_type === 'Percentage' ? 'Enter % value (e.g. 85)' : 'Enter numeric target'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%) *</label>
              <input
                type="number" required min="10" max="100"
                value={formData.weightage}
                onChange={(e) => setFormData({ ...formData, weightage: e.target.value })}
                className={cn(
                  "w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1",
                  isOverWeight || isUnderMinWeight
                    ? "border-red-400 focus:border-red-400 focus:ring-red-400"
                    : "border-gray-300 focus:border-primary focus:ring-primary"
                )}
              />
              {isOverWeight && <p className="text-[10px] text-red-600 mt-0.5">Exceeds 100% ({newTotalWeightage}%)</p>}
              {isUnderMinWeight && <p className="text-[10px] text-red-600 mt-0.5">Minimum 10%</p>}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date" value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Deadline / End Date</label>
              <input
                type="date" value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </div>

        {/* Footer with dual action */}
        <div className="border-t px-6 py-4 bg-gray-50 flex justify-between items-center gap-3">
          <button
            type="button" onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => saveGoal(false)}
              disabled={loading || !canSubmit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save Draft
            </button>
            <button
              type="button"
              onClick={() => saveGoal(true)}
              disabled={loading || !canSubmit}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Submit for Review
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
