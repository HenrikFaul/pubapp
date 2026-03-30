'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { timeAgo } from '@/lib/utils'
import { ArrowLeft, Bell, Check, Info, Sparkles } from 'lucide-react'
import type { Notification } from '@/types'

const TYPE_ICONS: Record<string, string> = {
  order_update: '🔔',
  promotion: '🎉',
  loyalty: '⭐',
  system: '⚙️',
  info: 'ℹ️',
}

export default function NotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchNotifications() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('recipient_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50)

      setNotifications((data || []) as Notification[])
      setLoading(false)
      await supabase.from('notifications').update({ is_read: true }).eq('recipient_id', user.id).eq('is_read', false)
    }

    fetchNotifications()
  }, [])

  return (
    <div className="app-shell min-h-screen pb-14">
      <div className="customer-container pt-5 sm:pt-8">
        <div className="hero-card p-5 sm:p-7">
          <div className="relative z-10">
            <button onClick={() => router.back()} className="btn-outline mb-5 w-auto px-4 py-3">
              <ArrowLeft className="h-4 w-4" /> Vissza
            </button>
            <div className="section-kicker mb-4">
              <Bell className="h-4 w-4" /> élő értesítések
            </div>
            <h1 className="section-title">Minden fontos frissítésed egy feedben.</h1>
            <p className="section-subtitle mt-3 max-w-2xl">Rendelésállapot, foglalási visszajelzés, közösségi meghívó és venue hírek egy helyen.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="modern-card p-8 text-center text-white/45">Betöltés…</div>
          ) : notifications.length === 0 ? (
            <div className="modern-card p-10 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-white/35" />
              <p className="mt-4 text-lg font-semibold text-white">Nincs új értesítésed.</p>
              <p className="mt-2 text-sm text-white/45">Amint jön frissítés a rendelésedről vagy a közösségi listáidról, itt megjelenik.</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div key={notification.id} className="order-panel p-5">
                <div className="flex items-start gap-4">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] border border-white/10 bg-white/5 text-xl">
                    {TYPE_ICONS[notification.type] || '🔔'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold text-white">{notification.title}</h3>
                        <p className="mt-2 text-sm text-white/55">{notification.body}</p>
                      </div>
                      {!notification.is_read && (
                        <span className="info-chip text-green-300"><Check className="h-4 w-4" /> új</span>
                      )}
                    </div>
                    <div className="mt-4 flex items-center gap-4 text-xs text-white/35">
                      <span className="inline-flex items-center gap-1"><Info className="h-3.5 w-3.5" /> {notification.type}</span>
                      <span>{timeAgo(notification.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
