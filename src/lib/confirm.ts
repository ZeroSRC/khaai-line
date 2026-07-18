import Swal, { type SweetAlertIcon } from 'sweetalert2'

const baseClass = {
  title: 'text-base font-bold text-gray-900',
  htmlContainer: 'text-sm text-gray-500',
  actions: 'gap-2 w-full',
} as const

/** Render each line as its own evenly-spaced, centred paragraph (SweetAlert's raw
 *  <br><br> would leave big uneven gaps). */
function toHtml(text?: string): string | undefined {
  if (!text) return undefined
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const paras = lines.map((l) => `<p style="margin:0">${escapeHtml(l)}</p>`).join('')
  return `<div style="display:flex;flex-direction:column;gap:0.4rem">${paras}</div>`
}

/**
 * App-themed confirm dialog (replaces the native `confirm()` — which showed an ugly
 * "localhost:3000 says…" box). Structure: icon → title → detail → buttons.
 * Returns true if the user confirmed.
 *
 * `text` keeps newlines (the delete warnings use \n bullet lists), rendered via html.
 */
export async function confirmDialog(opts: {
  title: string
  text?: string
  confirmText: string
  cancelText: string
  danger?: boolean              // red confirm button + warning icon for destructive actions
  icon?: SweetAlertIcon         // override the icon if needed
}): Promise<boolean> {
  const res = await Swal.fire({
    icon: opts.icon ?? (opts.danger ? 'warning' : 'question'),
    title: opts.title,
    html: toHtml(opts.text),
    showCancelButton: true,
    confirmButtonText: opts.confirmText,
    cancelButtonText: opts.cancelText,
    reverseButtons: true,         // cancel on the left, confirm on the right
    buttonsStyling: false,        // use our classes instead of SweetAlert's gradients
    customClass: {
      ...baseClass,
      confirmButton: `flex-1 py-2.5 rounded-xl text-[13px] font-bold text-white ${opts.danger ? 'bg-red-500' : 'bg-[#1877F2]'}`,
      cancelButton: 'flex-1 py-2.5 rounded-xl text-[13px] font-semibold bg-gray-100 text-gray-600',
    },
  })
  return res.isConfirmed
}

/** Single-button result dialog (success / error) — replaces native alert(). */
export async function alertDialog(opts: {
  title: string
  text?: string
  okText: string
  icon?: SweetAlertIcon         // defaults to success
}): Promise<void> {
  await Swal.fire({
    icon: opts.icon ?? 'success',
    title: opts.title,
    html: toHtml(opts.text),
    confirmButtonText: opts.okText,
    buttonsStyling: false,
    customClass: {
      ...baseClass,
      confirmButton: 'w-full py-2.5 rounded-xl text-[13px] font-bold text-white bg-[#1877F2]',
    },
  })
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
