import { useState, useEffect } from "react"
import { Bell, CheckCheck, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/contexts/AuthContext"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  title: string
  content: string | null
  is_read: boolean
  link_url: string | null
  created_at: string
}

export default function NotificationCenter() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter(n => !n.is_read).length

  const fetchNotifications = async () => {
    if (!profile) return
    setLoading(true)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
    setNotifications(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
    // Real-time subscription
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${profile?.id}`
      }, () => fetchNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const markAllRead = async () => {
    if (!profile) return
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false)
    fetchNotifications()
  }

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open) fetchNotifications() }}
        className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-20 overflow-hidden animate-in slide-in-from-top-2 fade-in duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900 text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-medium px-1.5 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <CheckCheck className="w-3.5 h-3.5" /> Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  No notifications yet.
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => markRead(n.id)}
                    className={cn(
                      "px-4 py-3 border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors",
                      !n.is_read && "bg-blue-50/50"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className={cn(
                        "w-2 h-2 rounded-full mt-1.5 shrink-0",
                        n.is_read ? "bg-gray-300" : "bg-primary"
                      )} />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        {n.content && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.content}</p>}
                        <p className="text-[10px] text-gray-400 mt-1">
                          {new Date(n.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
