import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Goal, Checkin } from "@/types"
import { ClipboardList, Plus, Loader2, Target, CheckCircle2, AlertCircle, Clock, BarChart3 } from "lucide-react"
import CheckinModal from "@/components/checkins/CheckinModal"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function Checkins() {
  const { profile } = useAuth()
  const [goals, setGoals] = useState<Goal[]>([])
  const [checkins, setCheckins] = useState<Checkin[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [viewMode, setViewMode] = useState<'my_goals' | 'team_goals'>('my_goals')

  const fetchData = async () => {
    if (!profile) return
    setLoading(true)
    try {
      let targetOwnerIds = [profile.id]

      if (viewMode === 'team_goals' && (profile.role === 'manager' || profile.role === 'admin')) {
        const { data: teamMembers } = await supabase
          .from('users')
          .select('id')
          .eq('manager_id', profile.id)
        if (teamMembers) {
          targetOwnerIds = teamMembers.map(tm => tm.id)
        }
      }

      // Fetch approved/in-progress goals
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('*')
        .in('owner_id', targetOwnerIds)
        .in('status', ['approved', 'in_progress', 'completed', 'at_risk'])
        .order('created_at', { ascending: false })

      if (goalsError) throw goalsError
      setGoals(goalsData || [])

      if (goalsData && goalsData.length > 0) {
        const goalIds = goalsData.map(g => g.id)
        const { data: checkinsData, error: checkinsError } = await supabase
          .from('checkins')
          .select('*')
          .in('goal_id', goalIds)
          .order('created_at', { ascending: false })

        if (checkinsError) throw checkinsError
        setCheckins(checkinsData || [])
      } else {
        setCheckins([])
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to load check-ins")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [profile, viewMode])

  const handleOpenModal = (goal: Goal) => {
    setSelectedGoal(goal)
    setIsModalOpen(true)
  }

  // Analytics Calculation
  const getCompletionPercentage = (goal: Goal) => {
    if (goal.target <= 0) return 0
    return Math.min(100, Math.max(0, (goal.achievement / goal.target) * 100))
  }

  const overallProgress = goals.length > 0 
    ? goals.reduce((acc, g) => acc + (getCompletionPercentage(g) * (g.weightage / 100)), 0)
    : 0

  const chartData = goals.map(g => ({
    name: g.title.substring(0, 15) + (g.title.length > 15 ? '...' : ''),
    progress: getCompletionPercentage(g),
    status: g.status
  }))

  const getStatusColor = (status: string) => {
    if (status === 'completed') return '#22c55e' // green
    if (status === 'at_risk') return '#ef4444' // red
    return '#3b82f6' // blue
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            Check-ins & Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Submit achievements and track quarterly performance
          </p>
        </div>

        {(profile?.role === 'manager' || profile?.role === 'admin') && (
          <div className="bg-slate-100 p-1 rounded-lg flex inline-flex">
            <button
              onClick={() => setViewMode('my_goals')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'my_goals' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              My Goals
            </button>
            <button
              onClick={() => setViewMode('team_goals')}
              className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === 'team_goals' ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              Team Progress
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Analytics Widgets */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border rounded-xl p-5 shadow-sm col-span-1 md:col-span-2 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">Weighted Quarterly Progress</h3>
                <span className="text-2xl font-bold text-primary">{overallProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 mb-2">
                <div 
                  className="bg-primary h-3 rounded-full transition-all duration-1000" 
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">Based on {goals.length} active goals and their assigned weightages.</p>
            </div>

            <div className="bg-white border rounded-xl p-5 shadow-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="text-3xl font-bold text-gray-900">{checkins.length}</h3>
                <p className="text-sm text-gray-500">Total Check-ins</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Active Goals List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Active Goals</h2>
              </div>
              
              {goals.length === 0 ? (
                <div className="bg-white border border-dashed rounded-xl p-8 text-center text-gray-500 text-sm">
                  No active goals available for check-in.
                </div>
              ) : (
                <div className="grid gap-4">
                  {goals.map(goal => {
                    const progress = getCompletionPercentage(goal)
                    const lastCheckin = checkins.find(c => c.goal_id === goal.id)
                    
                    return (
                      <div key={goal.id} className="bg-white border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-semibold text-gray-900">{goal.title}</h3>
                          {viewMode === 'my_goals' && (
                            <button
                              onClick={() => handleOpenModal(goal)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-medium rounded-md transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Update
                            </button>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-1">
                            <Target className="w-4 h-4 text-gray-400" />
                            {goal.achievement} / {goal.target} {goal.uom_type}
                          </div>
                          {lastCheckin && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4 text-gray-400" />
                              Last update: {new Date(lastCheckin.created_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div 
                              className={cn(
                                "h-2 rounded-full",
                                goal.status === 'at_risk' ? 'bg-destructive' : 'bg-primary'
                              )}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-10 text-right">{progress.toFixed(0)}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Completion Chart */}
              {goals.length > 0 && (
                <div className="bg-white border rounded-xl p-5 shadow-sm mt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-6 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-gray-500" />
                    Goal Completion Overview
                  </h3>
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                        <XAxis dataKey="name" tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: '#6b7280'}} axisLine={false} tickLine={false} domain={[0, 100]} />
                        <Tooltip 
                          cursor={{fill: '#f3f4f6'}}
                          contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                        />
                        <Bar dataKey="progress" radius={[4, 4, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getStatusColor(entry.status)} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* Quarterly Timeline */}
            <div className="bg-white border rounded-xl shadow-sm flex flex-col h-[calc(100vh-12rem)] sticky top-6">
              <div className="p-5 border-b">
                <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
              </div>
              <div className="p-5 overflow-y-auto flex-1 space-y-6">
                {checkins.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center mt-4">No check-in history yet.</p>
                ) : (
                  checkins.map((checkin, idx) => {
                    const goal = goals.find(g => g.id === checkin.goal_id)
                    const isLast = idx === checkins.length - 1
                    
                    return (
                      <div key={checkin.id} className="relative flex gap-4">
                        {!isLast && (
                          <div className="absolute top-8 left-[11px] bottom-[-24px] w-[2px] bg-slate-100" />
                        )}
                        <div className={cn(
                          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 ring-4 ring-white z-10",
                          checkin.status === 'on_track' ? "bg-green-100 text-green-600" :
                          checkin.status === 'needs_attention' ? "bg-amber-100 text-amber-600" :
                          "bg-red-100 text-red-600"
                        )}>
                          {checkin.status === 'on_track' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        </div>
                        <div className="flex-1 pb-1">
                          <div className="flex justify-between items-start mb-1">
                            <p className="text-sm font-medium text-gray-900">{goal?.title || 'Unknown Goal'}</p>
                            <span className="text-xs text-gray-500 whitespace-nowrap ml-2">
                              {new Date(checkin.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2">
                            Status: <span className="font-medium capitalize">{checkin.status.replace('_', ' ')}</span> &bull; 
                            Reached: <span className="font-medium text-gray-900">{checkin.achievement_update}</span>
                          </p>
                          {checkin.notes && (
                            <div className="bg-slate-50 border rounded p-2.5 text-sm text-gray-700">
                              {checkin.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <CheckinModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={fetchData}
        goal={selectedGoal}
      />
    </div>
  )
}
