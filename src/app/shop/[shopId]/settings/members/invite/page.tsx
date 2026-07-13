'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import { useT } from '@/lib/i18n'
import type { ShopMember } from '@/lib/types'

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

export default function InviteMemberPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, member: myMember, lineUid, jwt } = useShopStore()
  const t = useT()
  const [members, setMembers] = useState<ShopMember[]>([])
  const [addUid, setAddUid] = useState('')
  const [addRole, setAddRole] = useState<'staff' | 'finance'>('staff')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState('')
  const [copied, setCopied] = useState(false)

  const isOwner = myMember?.role === 'owner'

  useEffect(() => {
    if (!shop || !lineUid) return
    createSupabaseClient(jwt ?? undefined)
      .from('shop_members').select('*').eq('shop_id', shop.id)
      .then(({ data }) => setMembers((data ?? []) as ShopMember[]))
  }, [shop, lineUid])

  const inviteLink = typeof window !== 'undefined' ? `${window.location.origin}/shop/${shopId}/join` : ''

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const handleAdd = async () => {
    const uid = addUid.trim()
    if (!uid || !shop || !lineUid) return
    setAdding(true); setAddError('')
    const sb = createSupabaseClient(jwt ?? undefined)
    if (members.find((m) => m.line_uid === uid)) { setAddError(t('invite.alreadyMember')); setAdding(false); return }
    const { error } = await sb.from('shop_members').insert({ shop_id: shop.id, line_uid: uid, role: addRole })
    if (error) { setAddError(t('invite.addFailed') + error.message) }
    else {
      const { data } = await sb.from('shop_members').select('*').eq('shop_id', shop.id)
      setMembers((data ?? []) as ShopMember[])
      setAddUid('')
      router.push(`/shop/${shopId}/settings/members`)
    }
    setAdding(false)
  }

  const roleLabel = (r: string) => r === 'finance' ? t('members.roleFinance') : t('members.roleStaff')

  return (
    <div className="pb-10">
      <div className="px-4 pt-8 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">{t('invite.title')}</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Invite link */}
        <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
          <p className="text-xs font-bold text-gray-400 mb-3">{t('invite.linkLabel')}</p>
          <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-3">
            <p className="flex-1 text-xs text-gray-500 truncate">{inviteLink}</p>
          </div>
          <button onClick={copyInviteLink}
            className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${copied ? 'bg-[#1877F2]/10 text-[#1877F2]' : 'bg-[#1877F2] text-white shadow-[0_4px_12px_rgba(24,119,242,0.35)]'}`}>
            {copied ? t('invite.copied') : t('invite.copyLink')}
          </button>
          <p className="text-[10px] text-gray-400 mt-2 text-center">{t('invite.newMemberHint')}</p>
        </div>

        {/* Add by UID */}
        {isOwner && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">{t('invite.addByUid')}</p>
            <input className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#1877F2]/30 mb-2"
              placeholder={t('invite.uidPlaceholder')} value={addUid}
              onChange={(e) => { setAddUid(e.target.value); setAddError('') }}
            />
            <div className="flex gap-2 mb-3">
              {(['staff', 'finance'] as const).map((r) => (
                <button key={r} onClick={() => setAddRole(r)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${addRole === r ? 'bg-[#1877F2] text-white' : 'bg-gray-50 text-gray-500'}`}>
                  {roleLabel(r)}
                </button>
              ))}
            </div>
            {addError && <p className="text-xs text-red-500 mb-2 px-1">{addError}</p>}
            <button onClick={handleAdd} disabled={!addUid.trim() || adding}
              className="w-full bg-gray-900 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-3 rounded-2xl text-sm transition-colors">
              {adding ? t('invite.adding') : t('invite.addBtn')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
