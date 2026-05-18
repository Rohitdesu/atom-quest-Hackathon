import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import { Share2, Users, X, Plus, Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import type { Goal } from "@/types"

interface SharedGoal {
  id: string
  goal_id: string
  shared_with_id: string
  permission_level: string
  user?: { full_name: string; email: string }
}

export default function SharedGoals() {
  const { profile } = useAuth()
  const [myGoals, setMyGoals] = useState<Goal[]>([])
  const [employees, setEmployees] = useState<any[]>([])
  const [sharedGoals, setSharedGoals] = useState<SharedGoal[]>([])
  const [loading, setLoading] = useState(true)
  const [sharing, setSharing] = useState(false)

  const [selectedGoal, setSelectedGoal] = useState("")
  const [selectedEmployee, setSelectedEmployee] = useState("")

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)
    try {
      // Fetch manager's goals (approved ones to push)
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('owner_id', profile.id)
        .in('status', ['approved', 'in_progress'])

      setMyGoals(goalsData || [])

      // Fetch team members
      const { data: teamData } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('manager_id', profile.id)

      setEmployees(teamData || [])

      // Fetch existing shares (goals shared from manager)
      if (goalsData && goalsData.length > 0) {
        const goalIds = goalsData.map(g => g.id)
        const { data: sharesData } = await supabase
          .from('shared_goals')
          .select('*, users:shared_with_id(full_name, email)')
          .in('goal_id', goalIds)

        setSharedGoals((sharesData as any) || [])
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load shared goals data")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [profile])

  const handleShare = async () => {
    if (!selectedGoal || !selectedEmployee) {
      toast.error("Please select both a goal and an employee to share with.")
      return
    }
    // Check if already shared
    const alreadyShared = sharedGoals.find(sg => sg.goal_id === selectedGoal && sg.shared_with_id === selectedEmployee)
    if (alreadyShared) {
      toast.warning("This goal is already shared with this employee.")
      return
    }

    setSharing(true)
    try {
      const { error } = await supabase
        .from('shared_goals')
        .insert([{
          goal_id: selectedGoal,
          shared_with_id: selectedEmployee,
          permission_level: 'edit'
        }])

      if (error) throw error

      // Send notification to the employee
      await supabase.from('notifications').insert([{
        user_id: selectedEmployee,
        title: 'A goal has been shared with you',
        content: `Your manager shared a goal: "${myGoals.find(g => g.id === selectedGoal)?.title}"`,
        link_url: '/check-ins'
      }])

      toast.success("Goal shared successfully!")
      setSelectedGoal("")
      setSelectedEmployee("")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to share goal")
    } finally {
      setSharing(false)
    }
  }

  const handleRemoveShare = async (shareId: string) => {
    try {
      const { error } = await supabase.from('shared_goals').delete().eq('id', shareId)
      if (error) throw error
      toast.success("Goal unshared successfully")
      fetchData()
    } catch (err: any) {
      toast.error(err.message || "Failed to remove share")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Share2 className="w-6 h-6 text-primary" />
          Shared Goals
        </h1>
        <p className="text-sm text-gray-500 mt-1">Push goals to your team members for collaborative tracking.</p>
      </div>

      {/* Share a goal */}
      <div className="bg-white border rounded-xl shadow-sm p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Push Goal to Employee
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <select
            value={selectedGoal}
            onChange={(e) => setSelectedGoal(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          >
            <option value="">Select a goal to share...</option>
            {myGoals.map(g => (
              <option key={g.id} value={g.id}>{g.title}</option>
            ))}
          </select>

          <select
            value={selectedEmployee}
            onChange={(e) => setSelectedEmployee(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-lg bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
          >
            <option value="">Select team member...</option>
            {employees.map(e => (
              <option key={e.id} value={e.id}>{e.full_name}</option>
            ))}
          </select>

          <button
            onClick={handleShare}
            disabled={sharing || !selectedGoal || !selectedEmployee}
            className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {sharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share Goal
          </button>
        </div>

        {myGoals.length === 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            You need at least one approved goal to share with your team.
          </div>
        )}
        {employees.length === 0 && (
          <div className="mt-4 p-3 bg-slate-50 border rounded-lg flex items-start gap-2 text-sm text-gray-600">
            <Users className="w-4 h-4 shrink-0 mt-0.5" />
            No team members assigned to you yet. Ask your Admin to set manager_id.
          </div>
        )}
      </div>

      {/* Active shares */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-base font-semibold text-gray-900">Active Shared Goals ({sharedGoals.length})</h2>
        </div>
        {sharedGoals.length === 0 ? (
          <div className="p-8 text-center text-gray-500 text-sm">
            No goals have been shared with team members yet.
          </div>
        ) : (
          <div className="divide-y">
            {sharedGoals.map(sg => {
              const goal = myGoals.find(g => g.id === sg.goal_id)
              const user = (sg as any).users
              return (
                <div key={sg.id} className="px-6 py-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                      {user?.full_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">{user?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500 truncate">{goal?.title || 'Unknown goal'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3 h-3" /> {sg.permission_level}
                    </span>
                    <button
                      onClick={() => handleRemoveShare(sg.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Remove share"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
