import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle, Copy, Disc3, RefreshCw } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import {
  panelClass,
  innerPanelClass,
  sectionTitleClass,
} from '@/features/landing/styles'
import { getWidgetToken as regenerateWidgetToken } from '@/api/api-user'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const STORAGE_KEY = 'widgetAppearance'
const TOKEN_STORAGE_KEY = 'widgetToken'

interface WidgetAppearance {
  showIcon: boolean
  textColor: string
  bgColor: string // hex, no alpha — alpha comes from bgOpacity
  bgOpacity: number // 0-100
  fontSize: number // vmin, matches widget.html's existing unit
}

const DEFAULT_APPEARANCE: WidgetAppearance = {
  showIcon: true,
  textColor: '#ffffff',
  bgColor: '#121212',
  bgOpacity: 85,
  fontSize: 20,
}

function loadAppearance(): WidgetAppearance {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_APPEARANCE, ...JSON.parse(raw) }
  } catch {
    // ponytail: corrupt/old localStorage shape — fall back to defaults silently
  }
  return DEFAULT_APPEARANCE
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** Builds the CSS snippet the user pastes into OBS Browser Source → Custom CSS. */
function buildCssPatch(a: WidgetAppearance) {
  const { r, g, b } = hexToRgb(a.bgColor)
  const alpha = (a.bgOpacity / 100).toFixed(2)
  return [
    '/* OpenPlaylist widget — custom appearance */',
    '/* Paste into OBS: Browser Source → Properties → Custom CSS */',
    '#track-title {',
    `  color: ${a.textColor} !important;`,
    `  font-size: ${a.fontSize}vmin !important;`,
    '}',
    '.track-card {',
    `  background: rgba(${r}, ${g}, ${b}, ${alpha}) !important;`,
    '}',
    a.showIcon ? '' : '.vinyl-wrapper {\n  display: none !important;\n}',
  ]
    .filter(Boolean)
    .join('\n')
}

// Trimmed copy of widget.html's base styles, just enough to render an accurate
// preview without a live socket connection. Keep in sync with widget.html if
// you touch .track-card / #track-title / .vinyl-wrapper there.
const PREVIEW_BASE_CSS = `
html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}
#widget-container{width:100%;height:100%;box-sizing:border-box;padding:1vmin;display:flex;justify-content:center;align-items:center}
.track-card{width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;gap:4vmin;background:rgba(18,18,18,.85);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.1);padding:1vmin;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,.5)}
.track-info{display:flex;align-items:center;justify-content:center;overflow:hidden;flex-grow:1;height:100%;white-space:nowrap}
#track-title{color:#fff;font-size:20vmin;font-weight:800;line-height:1.3;text-shadow:0 2px 8px rgba(0,0,0,.6)}
.vinyl-wrapper{position:relative;height:70%;aspect-ratio:1/1;flex-shrink:0;display:flex;align-items:center;justify-content:center}
.vinyl-svg{width:100%;height:100%}
`

function buildPreviewSrcDoc(a: WidgetAppearance, demoTitle: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><style>${PREVIEW_BASE_CSS}${buildCssPatch(a)}</style></head><body>
<div id="widget-container"><div class="track-card">
  <div class="vinyl-wrapper"><svg class="vinyl-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#111" stroke="#444" stroke-width="1"/>
    <circle cx="12" cy="12" r="7" fill="#111" stroke="#333" stroke-width=".5" stroke-dasharray="2 1"/>
    <circle cx="12" cy="12" r="4" fill="#ffb703"/>
    <circle cx="12" cy="12" r="1.5" fill="#111"/>
  </svg></div>
  <div class="track-info"><div id="track-title">${demoTitle}</div></div>
</div></div>
</body></html>`
}

export function WidgetTab() {
  const { t, i18n } = useFeatureTranslation()
  const { t: tc } = useTranslation()
  const [token, setToken] = useState<string | null>(() =>
    window.localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [regenerating, setRegenerating] = useState(false)
  const [appearance, setAppearance] = useState<WidgetAppearance>(loadAppearance)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(appearance))
  }, [appearance])

  const widgetUrl = token
    ? `${window.location.origin}/widget.html?token=${token}&lang=${i18n.language}`
    : ''
  const cssPatch = useMemo(() => buildCssPatch(appearance), [appearance])
  const previewSrcDoc = useMemo(
    () => buildPreviewSrcDoc(appearance, t('settings.widget.demoTrack')),
    [appearance, t],
  )

  function copy(text: string, doneKey: string) {
    navigator.clipboard.writeText(text)
    toast.success(tc(doneKey))
  }

  async function handleRegenerate() {
    // ponytail: native confirm() — a modal isn't worth a new component for one destructive action
    const confirmMsg = token
      ? t('settings.widget.regenerateConfirm')
      : t('settings.widget.generateConfirm')
    if (!window.confirm(confirmMsg)) return
    setRegenerating(true)
    try {
      const res = await regenerateWidgetToken()
      setToken(res)
      // Backend never returns this again — this localStorage write is the
      // only place it survives after this response.
      window.localStorage.setItem(TOKEN_STORAGE_KEY, res)
      toast.success(t('settings.widget.regenerated'))
    } catch {
      toast.error(t('settings.widget.regenerateFailed'))
    } finally {
      setRegenerating(false)
    }
  }

  function setField<K extends keyof WidgetAppearance>(
    key: K,
    value: WidgetAppearance[K],
  ) {
    setAppearance((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Token / link */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <h3
          className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
        >
          {t('settings.widget.linkTitle')}
        </h3>

        {!token && (
          <div className="flex items-start gap-3 px-4 py-3 mb-3 rounded-(--rounded-std) border border-amber-500/30 bg-amber-500/8 text-amber-200">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-400" />
            <p className="text-sm leading-snug">
              {t('settings.widget.noTokenWarning')}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={token ? widgetUrl : t('settings.widget.noTokenPlaceholder')}
            className="flex-1 min-w-0 h-11 px-3 rounded-(--rounded-std) bg-level-1 border border-level-3/30 text-text-secondary text-sm truncate"
          />
          <button
            onClick={() => copy(widgetUrl, 'common.toast.copied')}
            disabled={!token}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-(--rounded-std) border border-level-3/70 bg-level-2/80 text-text-main text-sm font-medium hover:border-level-3 hover:bg-level-2 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <Copy className="h-4 w-4" /> {t('settings.widget.copyLink')}
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center justify-center gap-1.5 h-11 px-4 rounded-(--rounded-std) border border-danger/30 bg-danger/8 text-danger text-sm font-semibold hover:bg-danger/15 hover:border-danger/50 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <RefreshCw
              className={`h-4 w-4 ${regenerating ? 'animate-spin' : ''}`}
            />
            {token
              ? t('settings.widget.regenerate')
              : t('settings.widget.generate')}
          </button>
        </div>
        <p className="text-xs text-text-placeholder mt-2">
          {t('settings.widget.linkHint')}
        </p>
      </div>

      {/* Appearance + preview */}
      <div
        className={`p-4 sm:p-6 ${panelClass} grid grid-cols-1 lg:grid-cols-2 gap-6`}
      >
        <div>
          <h3
            className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
          >
            {t('settings.widget.appearanceTitle')}
          </h3>

          <div
            className={`flex items-center justify-between p-3 mb-3 ${innerPanelClass}`}
          >
            <span className="text-sm text-text-main flex items-center gap-2">
              <Disc3 className="h-4 w-4 text-level-3" />
              {t('settings.widget.showIcon')}
            </span>
            <Switch
              checked={appearance.showIcon}
              onCheckedChange={(v) => setField('showIcon', v)}
            />
          </div>

          <div
            className={`flex items-center justify-between p-3 mb-3 ${innerPanelClass}`}
          >
            <label htmlFor="w-text-color" className="text-sm text-text-main">
              {t('settings.widget.textColor')}
            </label>
            <input
              id="w-text-color"
              type="color"
              value={appearance.textColor}
              onChange={(e) => setField('textColor', e.target.value)}
              className="h-8 w-12 rounded cursor-pointer bg-transparent border border-level-3/30"
            />
          </div>

          <div
            className={`flex items-center justify-between p-3 mb-3 ${innerPanelClass}`}
          >
            <label htmlFor="w-bg-color" className="text-sm text-text-main">
              {t('settings.widget.bgColor')}
            </label>
            <input
              id="w-bg-color"
              type="color"
              value={appearance.bgColor}
              onChange={(e) => setField('bgColor', e.target.value)}
              className="h-8 w-12 rounded cursor-pointer bg-transparent border border-level-3/30"
            />
          </div>

          <div className={`p-3 mb-3 ${innerPanelClass}`}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="w-bg-opacity" className="text-sm text-text-main">
                {t('settings.widget.bgOpacity')}
              </label>
              <span className="text-xs text-text-placeholder tabular-nums">
                {appearance.bgOpacity}%
              </span>
            </div>
            <input
              id="w-bg-opacity"
              type="range"
              min={0}
              max={100}
              value={appearance.bgOpacity}
              onChange={(e) => setField('bgOpacity', Number(e.target.value))}
              className="w-full accent-level-3"
            />
          </div>

          <div className={`p-3 ${innerPanelClass}`}>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="w-font-size" className="text-sm text-text-main">
                {t('settings.widget.fontSize')}
              </label>
              <span className="text-xs text-text-placeholder tabular-nums">
                {appearance.fontSize}vmin
              </span>
            </div>
            <input
              id="w-font-size"
              type="range"
              min={8}
              max={32}
              value={appearance.fontSize}
              onChange={(e) => setField('fontSize', Number(e.target.value))}
              className="w-full accent-level-3"
            />
          </div>
        </div>

        <div>
          <h3
            className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main mb-4`}
          >
            {t('settings.widget.previewTitle')}
          </h3>
          <div className="rounded-(--rounded-std) border border-level-3/30 bg-white aspect-video overflow-hidden">
            <iframe
              title="widget-preview"
              srcDoc={previewSrcDoc}
              className="w-full h-full border-0"
            />
          </div>
        </div>
      </div>

      {/* CSS patch for OBS */}
      <div className={`p-4 sm:p-6 ${panelClass}`}>
        <div className="flex items-center justify-between mb-3">
          <h3
            className={`${sectionTitleClass} text-base normal-case tracking-normal text-text-main`}
          >
            {t('settings.widget.cssTitle')}
          </h3>
          <button
            onClick={() => copy(cssPatch, 'settings.widget.cssCopied')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-(--rounded-std) border border-level-3/70 bg-level-2/80 text-text-main text-xs font-medium hover:border-level-3 hover:bg-level-2 transition-colors"
          >
            <Copy className="h-3.5 w-3.5" /> {t('settings.widget.cssCopy')}
          </button>
        </div>
        <pre className="text-xs text-text-secondary bg-level-1/60 rounded-(--rounded-std) border border-white/5 p-3 overflow-x-auto whitespace-pre-wrap">
          {cssPatch}
        </pre>
        <p className="text-xs text-text-placeholder mt-2">
          {t('settings.widget.cssHint')}
        </p>
      </div>
    </div>
  )
}

export default WidgetTab
