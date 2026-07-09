'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { ShopMember } from '@/lib/types'

const ROLE_LABEL: Record<string, { label: string; color: string }> = {
  owner:   { label: 'เจ้าของ',   color: 'bg-amber-50 text-amber-700' },
  staff:   { label: 'พนักงาน',   color: 'bg-gray-100 text-gray-600' },
  finance: { label: 'การเงิน',   color: 'bg-blue-50 text-blue-700' },
}

const BackBtn = ({ onClick }: { onClick: () => void }) => (
  <button onClick={onClick} className="w-9 h-9 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-500 active:bg-gray-100 transition-colors">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  </button>
)

export default function MembersPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, member: myMember, lineUid, jwt } = useShopStore()
  const [members, setMembers] = useState<ShopMember[]>([])
  const [loading, setLoading] = useState(true)
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
      .then(({ data }) => { setMembers((data ?? []) as ShopMember[]); setLoading(false) })
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
    if (members.find((m) => m.line_uid === uid)) { setAddError('LINE userId นี้เป็นสมาชิกอยู่แล้ว'); setAdding(false); return }
    const { error } = await sb.from('shop_members').insert({ shop_id: shop.id, line_uid: uid, role: addRole })
    if (error) { setAddError('เพิ่มไม่สำเร็จ: ' + error.message) }
    else {
      const { data } = await sb.from('shop_members').select('*').eq('shop_id', shop.id)
      setMembers((data ?? []) as ShopMember[])
      setAddUid('')
    }
    setAdding(false)
  }

  const handleRemove = async (memberId: string, memberLineUid: string) => {
    if (memberLineUid === lineUid || !shop || !lineUid) return
    await createSupabaseClient(jwt ?? undefined).from('shop_members').delete().eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div className="pb-10">
      <div className="px-4 pt-12 pb-4 flex items-center gap-3">
        <BackBtn onClick={() => router.back()} />
        <h1 className="text-lg font-bold text-gray-900">จัดการสมาชิก</h1>
      </div>

      <div className="px-4 space-y-3">
        {/* Invite link */}
        {isOwner && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">ลิงก์เชิญสมาชิก</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-2xl px-4 py-3 mb-3">
              <p className="flex-1 text-xs text-gray-500 truncate">{inviteLink}</p>
            </div>
            <button onClick={copyInviteLink}
              className={`w-full py-3 rounded-2xl text-sm font-semibold transition-colors ${copied ? 'bg-[#06C755]/10 text-[#06C755]' : 'bg-[#06C755] text-white shadow-[0_4px_12px_rgba(6,199,85,0.35)]'}`}>
              {copied ? 'คัดลอกแล้ว!' : 'คัดลอกลิงก์เชิญ'}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center">สมาชิกใหม่จะเข้าร่วมในฐานะ "พนักงาน"</p>
          </div>
        )}

        {/* Add by UID */}
        {isOwner && (
          <div className="bg-white rounded-3xl p-4 shadow-[0_2px_16px_rgba(0,0,0,0.07)]">
            <p className="text-xs font-bold text-gray-400 mb-3">เพิ่มด้วย LINE User ID</p>
            <input className="w-full bg-gray-50 border-0 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#06C755]/30 mb-2"
              placeholder="LINE User ID เช่น Uxxxxxxxx..." value={addUid}
              onChange={(e) => { setAddUid(e.target.value); setAddError('') }}
            />
            <div className="flex gap-2 mb-3">
              {(['staff', 'finance'] as const).map((r) => (
                <button key={r} onClick={() => setAddRole(r)}
                  className={`flex-1 py-2.5 rounded-2xl text-xs font-semibold transition-colors ${addRole === r ? 'bg-[#06C755] text-white' : 'bg-gray-50 text-gray-500'}`}>
                  {ROLE_LABEL[r].label}
                </button>
              ))}
            </div>
            {addError && <p className="text-xs text-red-500 mb-2 px-1">{addError}</p>}
            <button onClick={handleAdd} disabled={!addUid.trim() || adding}
              className="w-full bg-gray-900 disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-3 rounded-2xl text-sm transition-colors">
              {adding ? 'กำลังเพิ่ม...' : '+ เพิ่มสมาชิก'}
            </button>
          </div>
        )}

        {/* List */}
        <div className="bg-white rounded-3xl shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          <p className="text-xs font-bold text-gray-400 px-4 pt-4 pb-3">สมาชิกทั้งหมด ({members.length})</p>
          {loading && [1,2].map(i => <div key={i} className="h-14 mx-4 mb-2 bg-gray-100 rounded-2xl animate-pulse" />)}
          {members.map((m) => {
            const roleInfo = ROLE_LABEL[m.role] ?? { label: m.role, color: 'bg-gray-100 text-gray-600' }
            return (
              <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50 first:border-t-0">
                <div className="w-10 h-10 rounded-full bg-[#06C755]/10 flex items-center justify-center text-sm font-bold text-[#06C755] flex-shrink-0">
                  {(m.display_name?.[0] ?? '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {m.display_name ?? 'ไม่ระบุชื่อ'}
                    {m.line_uid === lineUid && <span className="text-[10px] text-gray-400 ml-1 font-normal">(คุณ)</span>}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{m.line_uid}</p>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded-full font-semibold flex-shrink-0 ${roleInfo.color}`}>{roleInfo.label}</span>
                {isOwner && m.line_uid !== lineUid && (
                  <button onClick={() => handleRemove(m.id, m.line_uid)}
                    className="w-6 h-6 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
