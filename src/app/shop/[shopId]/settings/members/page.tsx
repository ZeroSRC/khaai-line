'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { confirmDialog } from '@/lib/confirm'
import { useT } from '@/lib/i18n'
import type { ShopMember } from '@/lib/types'

const ROLE_COLOR: Record<string, string> = {
  owner: 'bg-amber-50 text-amber-700',
  staff: 'bg-gray-100 text-gray-600',
  finance: 'bg-blue-50 text-blue-700',
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
  </button>
)

export default function MembersPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, member: myMember, lineUid, jwt } = useShopStore()
  const t = useT()
  const [members, setMembers] = useState<ShopMember[]>([])
  const [loading, setLoading] = useState(true)

  const isOwner = myMember?.role === 'owner'

  const roleLabel = (role: string) =>
    role === 'owner' ? t('members.roleOwner')
      : role === 'finance' ? t('members.roleFinance')
        : role === 'staff' ? t('members.roleStaff')
          : role

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shop_members').select('*').eq('shop_id', shop.id)
      .then(({ data }) => { setMembers((data ?? []) as ShopMember[]); setLoading(false) })
  }, [shop, lineUid])

  const handleRemove = async (memberId: string, memberLineUid: string) => {
    if (memberLineUid === lineUid || !shop || !lineUid) return
    const ok = await confirmDialog({
      title: t('members.removeTitle'),
      text: t('members.removeConfirm'),
      confirmText: t('members.removeTitle'),
      cancelText: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    // soft-delete — flip the flag instead of removing the row
    await createSupabaseClient(jwt ?? undefined)
      .from('shop_members').update({ sys_del_flag: 'Y', last_upd_by: lineUid }).eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('members.title')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Invite CTA */}
        {isOwner && (
          <Link href={`/shop/${shopId}/settings/members/invite`}
            className="flex items-center gap-3 bg-[#1877F2] rounded-3xl p-4 shadow-[0_4px_16px_rgba(24,119,242,0.3)] active:scale-[0.99] transition-transform">
            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{t('members.invite')}</p>
              <p className="text-xs text-white/70 mt-0.5">{t('members.inviteDesc')}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        )}

        {/* List */}
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">{t('members.count', { n: members.length })}</p>
          {loading && [1, 2].map(i => <div key={i} className="h-14 mx-4 mb-2 bg-gray-100 rounded-2xl animate-pulse" />)}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-t-0">
              <div className="w-10 h-10 rounded-full bg-[#1877F2]/10 flex items-center justify-center text-sm font-bold text-[#1877F2] flex-shrink-0">
                {(m.display_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {/* Name is backfilled from LINE on first login; until then a UID-added member has none */}
                  {m.display_name ?? <span className="text-gray-400 font-normal italic">{t('members.pendingName')}</span>}
                  {m.line_uid === lineUid && <span className="text-[10px] text-gray-400 ml-1 font-normal">({t('common.you')})</span>}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{m.line_uid}</p>
              </div>
              <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${ROLE_COLOR[m.role] ?? 'bg-gray-100 text-gray-600'}`}>{roleLabel(m.role)}</span>
              {isOwner && m.line_uid !== lineUid && (
                <button onClick={() => handleRemove(m.id, m.line_uid)}
                  className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
