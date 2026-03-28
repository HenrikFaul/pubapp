'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { Notification } from '@/types'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
import { timeAgo } from '@/lib/utils'

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)
      setNotifications(data as Notification[] || [])
      setLoading(false)

      // Mark all as read
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false)
    }
    fetch()
  }, [])

  const TYPE_ICONS: Record<string, string> = {
    order_update: '🔔',
    promotion: '🎉',
    loyalty: '❤️',
    system: '⚙️',
    info: 'ℹ️',
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="bg-amber-950 text-white px-4 pt-12 pb-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-amber-300 mb-4">
          <ArrowLeft className="w-5 h-5" /> Vissza
        </button>
        <h1 className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>Értesítések</h1>
      </div>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-amber-500 animate-pulse">Betöltés...</div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-16">
            <BellOff className="w-12 h-12 text-amber-200 mx-auto mb-3" />
            <p className="text-amber-400">Nincs értesítésed</p>
          </div>
        ) : (
          notifications.map(n => (
            <div key={n.id} className={`bg-white rounded-2xl p-4 border ${n.is_read ? 'border-amber-100' : 'border-amber-300 bg-amber-50'}`}>
              <div className="flex gap-3">
                <div className="text-2xl">{TYPE_ICONS[n.type] || '🔔'}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-950 text-sm">{n.title}</h3>
                  <p className="text-amber-600 text-sm mt-0.5">{n.body}</p>
                  <p className="text-amber-400 text-xs mt-2">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && <div className="w-2 h-2 bg-amber-500 rounded-full mt-1 flex-shrink-0" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
