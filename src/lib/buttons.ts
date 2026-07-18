/**
 * Shared Tailwind CSS class patterns for buttons to keep visual styles consistent across the project.
 */

// Primary blue action buttons (e.g. Save, Submit)
export const btnPrimary = 'w-full bg-[#1877F2] disabled:bg-gray-200 text-white disabled:text-gray-400 font-bold py-3.5 rounded-2xl text-sm transition-all shadow-[0_8px_20px_rgba(24,119,242,0.35)] disabled:shadow-none active:scale-[0.98]'

// Standard premium white edit/secondary buttons
export const btnEdit = 'text-xs font-bold px-3.5 py-2 rounded-xl bg-white border border-gray-200 text-gray-700 shadow-[0_2px_6px_rgba(0,0,0,0.04)] hover:bg-gray-50 active:bg-gray-100 active:scale-95 transition-all flex-shrink-0'

// Premium danger/delete buttons
export const btnDelete = 'flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100/70 text-red-600 border border-red-100 shadow-[0_2px_6px_rgba(239,68,68,0.05)] active:bg-red-100 active:scale-95 disabled:opacity-50 transition-all flex-shrink-0'
