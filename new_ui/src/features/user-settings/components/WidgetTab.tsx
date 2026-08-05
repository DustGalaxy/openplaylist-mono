import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertTriangle, Copy, Disc3, RefreshCw, Tv } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DialogDescription } from '@/components/ui/dialog'
import Btn from '@/components/ui/my-btn'
import { getWidgetToken as regenerateWidgetToken } from '@/api/api-user'
import { useFeatureTranslation } from '@/lib/i18n/featureTranslation'

const STORAGE_KEY = 'widgetAppearance'
const TOKEN_STORAGE_KEY = 'widgetToken'

interface WidgetAppearance {
  showIcon: boolean
  textColor: string
  bgColor: string
  bgOpacity: number
  fontSize: number
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
    // fallback
  }
  return DEFAULT_APPEARANCE
}

function hexToRgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

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
    () =>
      buildPreviewSrcDoc(
        appearance,
        t('settings.widget.demoTrack', 'Artist — Track Title'),
      ),
    [appearance, t],
  )

  function copy(text: string, doneKey: string) {
    void navigator.clipboard.writeText(text)
    toast.success(tc(doneKey))
  }

  async function handleRegenerate() {
    const confirmMsg = token
      ? t(
          'settings.widget.regenerateConfirm',
          'Are you sure you want to regenerate the widget token? Existing OBS browser sources will stop working.',
        )
      : t(
          'settings.widget.generateConfirm',
          'Generate a new OBS widget URL token?',
        )
    if (!window.confirm(confirmMsg)) return
    setRegenerating(true)
    try {
      const res = await regenerateWidgetToken()
      setToken(res)
      window.localStorage.setItem(TOKEN_STORAGE_KEY, res)
      toast.success(t('settings.widget.regenerated', 'Widget token updated'))
    } catch {
      toast.error(
        t('settings.widget.regenerateFailed', 'Failed to generate token'),
      )
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
    <div className="space-y-4">
      {/* Title Header */}
      <div className="flex items-start gap-2.5">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-level-1 border border-accent/40 text-accent mt-0.5">
          <Tv className="size-5" />
        </div>
        <div>
          <Label className="text-base font-bold text-text-main">
            {t('settings.widget.title', 'OBS Overlay Widget')}
          </Label>
          <DialogDescription className="text-xs text-text-secondary mt-0.5">
            {t(
              'settings.widget.subtitle',
              'Configure live track overlays for OBS Studio and broadcasting software.',
            )}
          </DialogDescription>
        </div>
      </div>

      {/* Card 1: Token & Link */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <Tv className="size-4 text-accent" />
          <span>{t('settings.widget.linkTitle', 'Widget URL & Token')}</span>
        </div>

        {!token && (
          <div className="flex items-start gap-2.5 p-3 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs">
            <AlertTriangle className="size-4 shrink-0 text-amber-400 mt-0.5" />
            <p className="leading-snug">
              {t(
                'settings.widget.noTokenWarning',
                'No active widget token found. Generate one below to get started.',
              )}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Input
            readOnly
            value={
              token
                ? widgetUrl
                : t(
                    'settings.widget.noTokenPlaceholder',
                    'Click Generate Token below',
                  )
            }
            className="bg-level-2 border-0 h-8 px-2.5 text-xs sm:text-sm text-text-secondary truncate flex-1 min-w-0"
          />
          <Btn
            onClick={() => copy(widgetUrl, 'common.toast.copied')}
            disabled={!token}
            className="h-8 px-3 bg-level-2 text-xs font-semibold text-text-main hover:bg-accent transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1"
          >
            <Copy className="size-3.5" />
            <span>{t('settings.widget.copyLink', 'Copy Link')}</span>
          </Btn>
          <Btn
            onClick={handleRegenerate}
            disabled={regenerating}
            className="h-8 px-3 bg-red-500/15 border border-red-500/40 text-red-400 hover:bg-red-500/30 transition-colors text-xs font-semibold shrink-0 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw
              className={`size-3.5 ${regenerating ? 'animate-spin' : ''}`}
            />
            <span>
              {token
                ? t('settings.widget.regenerate', 'Regenerate')
                : t('settings.widget.generate', 'Generate Token')}
            </span>
          </Btn>
        </div>

        <p className="text-[11px] text-text-placeholder">
          {t(
            'settings.widget.linkHint',
            'Paste this URL as a Browser Source in OBS Studio.',
          )}
        </p>
      </div>

      {/* Card 2: Appearance & Live Preview */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 shadow-xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main pb-1 border-b border-accent/40">
          <Disc3 className="size-4 text-accent" />
          <span>
            {t('settings.widget.appearanceTitle', 'Appearance & Live Preview')}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Controls */}
          <div className="space-y-2 text-xs">
            {/* Show Icon */}
            <div className="flex items-center justify-between p-2 rounded-md bg-level-2/60">
              <span className="font-semibold text-text-main flex items-center gap-2">
                <Disc3 className="size-3.5 text-accent" />
                {t('settings.widget.showIcon', 'Show Vinyl Icon')}
              </span>
              <Switch
                checked={appearance.showIcon}
                onCheckedChange={(v) => setField('showIcon', v)}
              />
            </div>

            {/* Text Color */}
            <div className="flex items-center justify-between p-2 rounded-md bg-level-2/60">
              <Label
                htmlFor="w-text-color"
                className="font-semibold text-text-main text-xs cursor-pointer"
              >
                {t('settings.widget.textColor', 'Text Color')}
              </Label>
              <input
                id="w-text-color"
                type="color"
                value={appearance.textColor}
                onChange={(e) => setField('textColor', e.target.value)}
                className="size-7 rounded cursor-pointer bg-transparent border border-accent/40 p-0.5"
              />
            </div>

            {/* Background Color */}
            <div className="flex items-center justify-between p-2 rounded-md bg-level-2/60">
              <Label
                htmlFor="w-bg-color"
                className="font-semibold text-text-main text-xs cursor-pointer"
              >
                {t('settings.widget.bgColor', 'Background Color')}
              </Label>
              <input
                id="w-bg-color"
                type="color"
                value={appearance.bgColor}
                onChange={(e) => setField('bgColor', e.target.value)}
                className="size-7 rounded cursor-pointer bg-transparent border border-accent/40 p-0.5"
              />
            </div>

            {/* Opacity Slider */}
            <div className="p-2 rounded-md bg-level-2/60 space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="w-bg-opacity"
                  className="font-semibold text-text-main text-xs cursor-pointer"
                >
                  {t('settings.widget.bgOpacity', 'Opacity')}
                </Label>
                <span className="text-[10px] text-text-placeholder font-mono">
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
                className="w-full accent-accent cursor-pointer h-1.5"
              />
            </div>

            {/* Font Size Slider */}
            <div className="p-2 rounded-md bg-level-2/60 space-y-1">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="w-font-size"
                  className="font-semibold text-text-main text-xs cursor-pointer"
                >
                  {t('settings.widget.fontSize', 'Font Size')}
                </Label>
                <span className="text-[10px] text-text-placeholder font-mono">
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
                className="w-full accent-accent cursor-pointer h-1.5"
              />
            </div>
          </div>

          {/* Preview Canvas */}
          <div className="space-y-1">
            <Label className="text-[11px] font-semibold text-text-secondary">
              {t('settings.widget.previewTitle', 'Preview')}
            </Label>
            <div className="rounded-md border border-accent/40 bg-black/40 aspect-video overflow-hidden shadow-inner">
              <iframe
                title="widget-preview"
                srcDoc={previewSrcDoc}
                className="w-full h-full border-0"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Card 3: Custom CSS */}
      <div className="p-3 sm:p-4 border border-accent/60 rounded-md bg-level-1 space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-1 border-b border-accent/40">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-text-main">
            <Copy className="size-4 text-accent" />
            <span>{t('settings.widget.cssTitle', 'Custom CSS for OBS')}</span>
          </div>
          <Btn
            onClick={() => copy(cssPatch, 'settings.widget.cssCopied')}
            className="h-7 px-2.5 bg-level-2 text-xs font-semibold text-text-main hover:bg-accent transition-colors flex items-center gap-1"
          >
            <Copy className="size-3" />
            <span>{t('settings.widget.cssCopy', 'Copy CSS')}</span>
          </Btn>
        </div>

        <pre className="text-[11px] text-text-secondary bg-level-2/80 rounded-md border border-accent/40 p-3 overflow-x-auto whitespace-pre-wrap font-mono">
          {cssPatch}
        </pre>
        <p className="text-[11px] text-text-placeholder">
          {t(
            'settings.widget.cssHint',
            'Paste into OBS Browser Source properties under "Custom CSS".',
          )}
        </p>
      </div>
    </div>
  )
}

export default WidgetTab
