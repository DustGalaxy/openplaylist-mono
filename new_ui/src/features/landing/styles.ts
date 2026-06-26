export const gradientTextClass =
  'text-transparent bg-gradient-to-r from-[var(--color-accent-2)] via-[var(--color-accent-3)] to-[var(--color-accent-1)] bg-clip-text bg-[length:200%_auto] animate-bg-move'

export const panelClass =
  'rounded-(--rounded-std) border border-level-3/35 bg-level-2/95 shadow-[0_8px_20px_rgba(0,0,0,0.15)]'

/** Stronger accent border — landing hero cards, footer */
export const panelAccentClass =
  'rounded-(--rounded-std) border-2 border-level-3 bg-level-2 shadow-[-2px_2px_14px_rgba(0,0,0,0.3)]'

export const pageWrapClass = 'w-full text-text-main px-4 pt-4 pb-8 sm:pb-10'

export const pageInnerClass = 'mx-auto max-w-5xl w-full'

export const innerPanelClass =
  'rounded-(--rounded-std) border border-white/5 bg-level-1/40 backdrop-blur-sm'

export const sectionTitleClass =
  'text-xs font-semibold uppercase tracking-wider text-text-placeholder mb-1'

export const filterTabBaseClass =
  'px-3 py-1.5 text-sm rounded-(--rounded-std) border transition-all min-h-11'

export const filterTabActiveClass =
  'border-level-3/60 bg-level-1 text-text-main shadow-[0_0_12px_rgba(245,106,25,0.15)]'

export const filterTabInactiveClass =
  'border-white/5 bg-level-1/30 text-text-secondary hover:border-level-3/30 hover:text-text-main'

export const statusOpenClass = ' text-emerald-500'

export const statusClosedClass =
  'border-white/10 bg-level-1/60 text-text-secondary'

export const feedbackSuccessClass =
  'border-emerald-400/25 bg-emerald-500/10 text-emerald-200/90'

export const feedbackErrorClass = 'border-danger/40 bg-danger/10 text-danger'

/** Compact metadata chip — mode badges, track count, etc. */
export const infoChipClass =
  'inline-flex items-center gap-2 rounded-full border border-level-3/20 bg-level-1/50 text-text-secondary text-xs font-medium'
