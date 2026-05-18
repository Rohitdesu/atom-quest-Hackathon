import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal } from "@/types"
import { Target, Plus, AlertCircle } from "lucide-react"
import GoalCard from "@/components/goals/GoalCard"
import GoalModal from "@/components/goals/GoalModal"
import { toast } from "sonner"

export default function Goals() {
  const { profile } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null)

  const fetchGoals = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('owner_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGoals(data || [])
    } catch (error: any) {
      toast.error(error.message || "Failed to load goals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchGoals()
  }, [profile])

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this goal?")) return

    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)

      if (error) throw error
      toast.success("Goal deleted successfully")
      fetchGoals()
    } catch (error: any) {
      toast.error(error.message || "Failed to delete goal")
    }
  }

  const openCreateModal = () => {
    setGoalToEdit(null)
    setIsModalOpen(true)
  }

  const openEditModal = (goal: Goal) => {
    setGoalToEdit(goal)
    setIsModalOpen(true)
  }

  // Calculate metrics
  const totalWeightage = goals.reduce((sum, g) => sum + g.weightage, 0)
  const isMaxGoalsReached = goals.length >= 8

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            My Goals
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your personal performance objectives
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <span className="text-xs text-gray-500 uppercase font-medium tracking-wider">Total Weightage</span>
            <span className={`text-lg font-bold ${totalWeightage === 100 ? 'text-green-600' : totalWeightage > 100 ? 'text-destructive' : 'text-gray-900'}`}>
              {totalWeightage}%
            </span>
          </div>
          <button
            onClick={openCreateModal}
            disabled={isMaxGoalsReached}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Goal
          </button>
        </div>
      </div>

      {/* Validation Banner */}
      {totalWeightage !== 100 && goals.length > 0 && (
        <div className={`p-4 rounded-lg border flex items-start gap-3 ${
          totalWeightage > 100 
            ? 'bg-destructive/10 border-destructive/20 text-destructive' 
            : 'bg-amber-50 border-amber-200 text-amber-800'
        }`}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold">
              {totalWeightage > 100 ? 'Weightage Exceeded' : 'Incomplete Weightage'}
            </h3>
            <p className="text-sm mt-1 opacity-90">
              {totalWeightage > 100 
                ? `Your goals exceed 100% total weightage (Currently: ${totalWeightage}%). Please adjust them.`
                : `Your goals must equal exactly 100% total weightage before final submission. You have ${100 - totalWeightage}% remaining.`}
            </p>
          </div>
        </div>
      )}
      
      {isMaxGoalsReached && (
        <div className="p-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          You have reached the maximum limit of 8 goals.
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white border rounded-xl shadow-sm p-5 h-[240px] flex flex-col animate-pulse">
              <div className="flex justify-between mb-4">
                <div className="h-6 w-24 bg-slate-200 rounded-full" />
                <div className="h-6 w-16 bg-slate-200 rounded-full" />
              </div>
              <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
              <div className="h-4 w-full bg-slate-100 rounded mb-2" />
              <div className="h-4 w-2/3 bg-slate-100 rounded mb-6" />
              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="h-10 bg-slate-50 rounded" />
                <div className="h-10 bg-slate-50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white border border-dashed rounded-xl p-12 text-center flex flex-col items-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <Target className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No goals defined yet</h3>
          <p className="text-gray-500 max-w-sm mx-auto mb-6">
            Get started by creating your first performance goal. Ensure your total weightage equals 100%.
          </p>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create First Goal
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map(goal => (
            <GoalCard 
              key={goal.id} 
              goal={goal} 
              onEdit={openEditModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <GoalModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSaved={fetchGoals}
        goalToEdit={goalToEdit}
        currentTotalWeightage={totalWeightage}
      />
    </div>
  )
}
