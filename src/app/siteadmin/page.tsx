'use client'

import Link from 'next/link'
import CommonAdminPanel from '@/components/siteadmin/CommonAdminPanel'
import { Building2, ChevronRight, ScrollText, Shield } from 'lucide-react'

export default function SiteAdminPage() {
  return (
    <div className="space-y-5">
      <section className="admin-card p-5 sm:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="section-kicker mb-3">
              <Shield className="h-4 w-4" />
              separated common_admin control plane
            </div>
            <h2 className="text-3xl font-bold text-white lg:text-4xl">A Site Admin külön platformszintű adminfelület.</h2>
            <p className="mt-3 max-w-3xl text-sm text-white/60">
              Itt a Kapakka / Pubapp közös platformfunkciói érhetők el: integrációk, hosting, release snapshot,
              lokális adatforrás-állapot és teljes venue inventory. Ez a felület különül el a venue-admin üzemeltetői
              felülettől.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/siteadmin/venues" className="btn-kapakka justify-between px-5 py-4">
              <span className="inline-flex items-center gap-2"><Building2 className="h-4 w-4" /> Venue registry</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
            <Link href="/admin" className="btn-outline justify-between px-5 py-4">
              <span className="inline-flex items-center gap-2"><ScrollText className="h-4 w-4" /> Venue admin</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <CommonAdminPanel />
    </div>
  )
}
