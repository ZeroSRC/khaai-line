'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useShopStore } from '@/store/shopStore'
import { createSupabaseClient } from '@/lib/supabase'
import type { ShopMember } from '@/lib/types'

const ROLE_LABEL: Record<string, string> = {
  owner: 'เจ้าของ',
  staff: 'พนักงาน',
  finance: 'การเงิน',
}

export default function MembersPage() {
  const { shopId } = useParams<{ shopId: string }>()
  const router = useRouter()
  const { shop, member: myMember, lineUid } = useShopStore()
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
      .from('shop_members')
      .select('*')
      .eq('shop_id', shop.id)
      .then(({ data }) => {
        setMembers((data ?? []) as ShopMember[])
        setLoading(false)
      })
  }, [shop, lineUid])

  const inviteLink = typeof window !== 'undefined'
    ? `${window.location.origin}/shop/${shopId}/join`
    : ''

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAdd = async () => {
    const uid = addUid.trim()
    if (!uid || !shop || !lineUid) return
    setAdding(true)
    setAddError('')

    const sb = createSupabaseClient(jwt ?? undefined)

    const existing = members.find((m) => m.line_uid === uid)
    if (existing) {
      setAddError('LINE userId นี้เป็นสมาชิกอยู่แล้ว')
      setAdding(false)
      return
    }

    const { error } = await sb.from('shop_members').insert({
      shop_id: shop.id,
      line_uid: uid,
      role: addRole,
    })

    if (error) {
      setAddError('เพิ่มไม่สำเร็จ: ' + error.message)
    } else {
      const { data } = await sb.from('shop_members').select('*').eq('shop_id', shop.id)
      setMembers((data ?? []) as ShopMember[])
      setAddUid('')
    }
    setAdding(false)
  }

  const handleRemove = async (memberId: string, memberLineUid: string) => {
    if (memberLineUid === lineUid) return // ไม่ให้ลบตัวเอง
    if (!shop || !lineUid) return
    const sb = createSupabaseClient(jwt ?? undefined)
    await sb.from('shop_members').delete().eq('id', memberId)
    setMembers((prev) => prev.filter((m) => m.id !== memberId))
  }

  return (
    <div>
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 text-xl">←</button>
        <h1 className="text-lg font-bold">จัดการสมาชิก</h1>
      </div>

      <div className="px-4 pt-4 space-y-4 pb-8">
        {/* Invite Link */}
        {isOwner && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-2">ลิงก์เชิญสมาชิก</p>
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
              <p className="flex-1 text-xs text-gray-500 truncate">{inviteLink}</p>
            </div>
            <button
              onClick={copyInviteLink}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
                copied ? 'bg-green-50 text-green-700 border-green-200' : 'bg-[#06C755] text-white border-[#06C755]'
              }`}>
              {copied ? '✅ คัดลอกแล้ว!' : '🔗 คัดลอกลิงก์เชิญ'}
            </button>
            <p className="text-[10px] text-gray-400 mt-2 text-center">สมาชิกใหม่จะเข้าร่วมในฐานะ "พนักงาน"</p>
          </div>
        )}

        {/* Add by LINE userId */}
        {isOwner && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-gray-400 mb-3">เพิ่มด้วย LINE User ID</p>
            <input
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm mb-2 focus:outline-none focus:border-[#06C755]"
              placeholder="LINE User ID เช่น Uxxxxxxxx..."
              value={addUid}
              onChange={(e) => { setAddUid(e.target.value); setAddError('') }}
            />
            <div className="flex gap-2 mb-3">
              {(['staff', 'finance'] as const).map((r) => (
                <button key={r} onClick={() => setAddRole(r)}
                  className={`flex-1 py-2 rounded-xl text-xs font-medium border transition-colors ${
                    addRole === r ? 'bg-[#06C755] text-white border-[#06C755]' : 'bg-gray-50 text-gray-500 border-gray-200'
                  }`}>
                  {ROLE_LABEL[r]}
                </button>
              ))}
            </div>
            {addError && <p className="text-xs text-red-500 mb-2">{addError}</p>}
            <button
              onClick={handleAdd}
              disabled={!addUid.trim() || adding}
              className="w-full bg-gray-900 disabled:bg-gray-200 text-white disabled:text-gray-400 font-semibold py-2.5 rounded-xl text-sm transition-colors">
              {adding ? 'กำลังเพิ่ม...' : '+ เพิ่มสมาชิก'}
            </button>
          </div>
        )}

        {/* Member List */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <p className="text-xs font-semibold text-gray-400 px-4 pt-4 pb-2">
            สมาชิกทั้งหมด ({members.length})
          </p>
          {loading && [1, 2].map((i) => (
            <div key={i} className="h-14 mx-4 mb-2 bg-gray-100 rounded-xl animate-pulse" />
          ))}
          {members.map((m) => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 border-t border-gray-50">
              <div className="w-9 h-9 rounded-full bg-[#06C755]/10 flex items-center justify-center text-sm font-bold text-[#06C755]">
                {(m.display_name?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {m.display_name ?? 'ไม่ระบุชื่อ'}
                  {m.line_uid === lineUid && <span className="text-[10px] text-gray-400 ml-1">(คุณ)</span>}
                </p>
                <p className="text-[10px] text-gray-400 truncate">{m.line_uid}</p>
              </div>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                m.role === 'owner' ? 'bg-amber-100 text-amber-700' :
                m.role === 'finance' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-600'
              }`}>
                {ROLE_LABEL[m.role] ?? m.role}
              </span>
              {isOwner && m.line_uid !== lineUid && (
                <button onClick={() => handleRemove(m.id, m.line_uid)}
                  className="text-red-400 text-lg leading-none ml-1">×</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
