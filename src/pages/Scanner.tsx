import { useState, useRef } from 'react'
import { Camera, Upload, Type, ScanLine, Plus, Sparkles } from 'lucide-react'
import { Card, Button, SectionTitle, TypingDots } from '@/components/ui'
import { useStore } from '@/store/useStore'
import { callAI, buildHealthContext } from '@/lib/api'
import { cn, genId } from '@/lib/utils'
import type { ProductAnalysis } from '@/types'

type ScanMode = 'camera' | 'upload' | 'text'

// ─── Resize image client-side before sending (fix: Network error on large images)
// Downscales to max 1024px and re-encodes as JPEG at 0.80 quality.
// A typical mobile photo is 3-8MB; after resize it drops to ~150-300KB.
function resizeImageToBase64(dataUrl: string, maxPx = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// ─── Robust JSON parser (fix: Unterminated string when model response is cut off)
// Extracts the first {...} block, handles markdown fences and trailing garbage.
function parseProductJSON(raw: string): Record<string, unknown> {
  // Strip markdown code fences
  let clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()

  // Extract first JSON object
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON object found in response')
  clean = clean.slice(start)

  // Find matching closing brace
  let depth = 0
  let end = -1
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end !== -1) {
    try {
      return JSON.parse(clean.slice(0, end + 1))
    } catch {
      // Fall through to repair attempt
    }
  }

  // Last resort: try to repair truncated JSON by closing open strings/arrays/objects
  let repaired = clean
  // Close any unclosed string
  const quoteCount = (repaired.match(/(?<!\\)"/g) ?? []).length
  if (quoteCount % 2 !== 0) repaired += '"'
  // Close open arrays and objects
  const opens = [...repaired].reduce((acc, c) => {
    if (c === '[') return [...acc, ']']
    if (c === '{') return [...acc, '}']
    if ((c === ']' || c === '}') && acc.length) return acc.slice(0, -1)
    return acc
  }, [] as string[])
  repaired += opens.reverse().join('')

  return JSON.parse(repaired)
}

// ─── Product result card ──────────────────────────────────────────────────────
function ProductResult({ product, onSave }: { product: ProductAnalysis; onSave: () => void }) {
  const { lang } = useStore()
  const isHealthy = product.verdict === 'healthy'
  const isMod = product.verdict === 'moderate'

  return (
    <Card className="p-0 overflow-hidden mt-3">
      <div className={cn(
        'flex items-center gap-3 p-3',
        isHealthy ? 'bg-brand-50' : isMod ? 'bg-amber-50' : 'bg-red-50'
      )}>
        <span className="text-3xl">{product.emoji}</span>
        <div className="flex-1">
          <p className={cn(
            'text-sm font-semibold',
            isHealthy ? 'text-brand-800' : isMod ? 'text-amber-800' : 'text-red-800'
          )}>
            {product.name}
          </p>
          <p className={cn(
            'text-xs',
            isHealthy ? 'text-brand-600' : isMod ? 'text-amber-600' : 'text-red-600'
          )}>
            {isHealthy
              ? (lang === 'it' ? '✓ Prodotto sano' : '✓ Healthy product')
              : isMod
              ? (lang === 'it' ? '⚡ Consumo moderato' : '⚡ Moderate consumption')
              : (lang === 'it' ? '⚠ Da limitare' : '⚠ Limit consumption')
            }
          </p>
        </div>
        <div className={cn(
          'text-lg font-bold font-display',
          product.score >= 70 ? 'text-brand-700' : product.score >= 45 ? 'text-amber-600' : 'text-red-600'
        )}>
          {product.score}
          <span className="text-xs font-normal text-gray-400">/100</span>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {product.positives.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-brand-700 mb-1">
              {lang === 'it' ? '✓ Positivi' : '✓ Positives'}
            </p>
            {product.positives.map((p, i) => (
              <p key={i} className="text-xs text-gray-600">• {p}</p>
            ))}
          </div>
        )}
        {product.negatives.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-red-600 mb-1">
              {lang === 'it' ? '✗ Da sapere' : '✗ Watch out'}
            </p>
            {product.negatives.map((n, i) => (
              <p key={i} className="text-xs text-gray-600">• {n}</p>
            ))}
          </div>
        )}
        {product.suggestion && (
          <p className="text-xs text-gray-600 bg-surface-muted rounded-lg p-2.5 italic">
            💡 {product.suggestion}
          </p>
        )}
        <Button variant="primary" size="sm" onClick={onSave} className="w-full">
          <Plus size={13} />
          {lang === 'it' ? 'Aggiungi alla wishlist' : 'Add to wishlist'}
        </Button>
      </div>
    </Card>
  )
}

// ─── Scanner page ─────────────────────────────────────────────────────────────
export function ScannerPage() {
  const { lang, profile, addToWishlist } = useStore()
  const [mode, setMode] = useState<ScanMode>('camera')
  const [textInput, setTextInput] = useState('')
  const [product, setProduct] = useState<ProductAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [camActive, setCamActive] = useState(false)

  const t = {
    title:       lang === 'it' ? 'Scanner alimenti' : 'Food scanner',
    camStart:    lang === 'it' ? 'Avvia fotocamera' : 'Start camera',
    snap:        lang === 'it' ? 'Scatta foto' : 'Take photo',
    upload:      lang === 'it' ? 'Carica foto' : 'Upload photo',
    placeholder: lang === 'it' ? 'Es: Nutella, Salmone, Avena' : 'E.g. Nutella, Salmon, Oats',
    analyze:     lang === 'it' ? 'Analizza' : 'Analyze',
    analyzing:   lang === 'it' ? 'Analisi in corso...' : 'Analyzing...',
    resizing:    lang === 'it' ? 'Ottimizzazione immagine...' : 'Optimizing image...',
  }

  // ── Text analysis ───────────────────────────────────────────────────────────
  async function analyzeText(name: string) {
    if (!name.trim() || loading) return
    setLoading(true)
    setError('')
    setProduct(null)
    try {
      const ctx = buildHealthContext(profile)
      const sys = lang === 'it'
        ? `Sei BeHealth AI. Analizza il prodotto alimentare per l'utente: ${ctx}. Rispondi SOLO con JSON valido, niente altro: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["...","..."],"negatives":["..."],"suggestion":"..."}`
        : `You are BeHealth AI. Analyze the food product for: ${ctx}. Reply ONLY with valid JSON, nothing else: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["...","..."],"negatives":["..."],"suggestion":"..."}`

      // Fix: 800 tokens — enough for full JSON without truncation
      const raw = await callAI({
        system: sys,
        messages: [{ role: 'user', content: `Product: ${name}` }],
        max_tokens: 800,
      })

      const parsed = parseProductJSON(raw)
      setProduct({ ...parsed, id: genId(), scannedAt: new Date().toISOString(), nutrients: [] } as unknown as ProductAnalysis)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Image analysis ──────────────────────────────────────────────────────────
  async function analyzeImage(dataUrl: string) {
    setLoading(true)
    setError('')
    setProduct(null)
    try {
      // Fix: resize before sending — mobile photos can be 3-8MB, resize to ~200KB
      const resized = await resizeImageToBase64(dataUrl)
      const base64 = resized.split(',')[1]

      const ctx = buildHealthContext(profile)
      const sys = lang === 'it'
        ? `Sei BeHealth AI. Analizza l'etichetta del prodotto nell'immagine per l'utente: ${ctx}. Rispondi SOLO con JSON valido, niente altro: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["...","..."],"negatives":["..."],"suggestion":"..."}`
        : `You are BeHealth AI. Analyze the product label in the image for: ${ctx}. Reply ONLY with valid JSON, nothing else: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["...","..."],"negatives":["..."],"suggestion":"..."}`

      // Fix: 800 tokens — enough for full JSON without truncation
      const raw = await callAI({
        system: sys,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
            { type: 'text', text: lang === 'it' ? 'Analizza questo prodotto.' : 'Analyze this product.' },
          ] as unknown as string,
        }],
        max_tokens: 800,
      })

      const parsed = parseProductJSON(raw)
      setProduct({ ...parsed, id: genId(), scannedAt: new Date().toISOString(), nutrients: [] } as unknown as ProductAnalysis)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // ── Camera ──────────────────────────────────────────────────────────────────
  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCamActive(true)
      }
    } catch {
      setError(lang === 'it'
        ? 'Fotocamera non disponibile. Usa "Carica" per scattare con il dispositivo.'
        : 'Camera unavailable. Use "Upload" to take a photo with your device.')
      setMode('upload')
    }
  }

  function snapPhoto() {
    if (!videoRef.current) return
    const canvas = document.createElement('canvas')
    canvas.width = videoRef.current.videoWidth
    canvas.height = videoRef.current.videoHeight
    canvas.getContext('2d')!.drawImage(videoRef.current, 0, 0)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    const stream = videoRef.current.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop())
    setCamActive(false)
    analyzeImage(dataUrl)
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => analyzeImage(ev.target!.result as string)
    reader.readAsDataURL(file)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }

  function handleSaveToWishlist() {
    if (!product) return
    addToWishlist({
      name: product.name,
      emoji: product.emoji,
      score: product.score,
      reason: product.suggestion,
      tags: [...product.positives.slice(0, 2), ...product.negatives.slice(0, 1)],
    })
  }

  const MODES: { key: ScanMode; icon: typeof Camera; labelEn: string; labelIt: string }[] = [
    { key: 'camera', icon: Camera, labelEn: 'Camera',  labelIt: 'Fotocamera' },
    { key: 'upload', icon: Upload, labelEn: 'Upload',  labelIt: 'Carica' },
    { key: 'text',   icon: Type,   labelEn: 'Type',    labelIt: 'Digita' },
  ]

  return (
    <div className="space-y-4 animate-slide-up">
      <Card className="p-4">
        <SectionTitle icon={<ScanLine size={15} />}>{t.title}</SectionTitle>

        {/* Mode tabs */}
        <div className="flex gap-2 mb-4">
          {MODES.map(({ key, icon: Icon, labelEn, labelIt }) => (
            <button
              key={key}
              onClick={() => { setMode(key); setError('') }}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition-all',
                mode === key
                  ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              )}
            >
              <Icon size={13} />
              {lang === 'it' ? labelIt : labelEn}
            </button>
          ))}
        </div>

        {/* Camera mode */}
        {mode === 'camera' && (
          <div>
            {!camActive ? (
              <div
                onClick={startCamera}
                className="border-2 border-dashed border-gray-200 rounded-xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
              >
                <Camera size={28} className="text-gray-300" />
                <p className="text-sm text-gray-500">{t.camStart}</p>
              </div>
            ) : (
              <div className="relative rounded-xl overflow-hidden bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full max-h-52 object-cover" />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-24 border-2 border-white/80 rounded-lg" />
                </div>
              </div>
            )}
            {camActive && (
              <Button variant="primary" onClick={snapPhoto} className="w-full mt-3">
                <Camera size={14} />
                {t.snap}
              </Button>
            )}
          </div>
        )}

        {/* Upload mode */}
        {mode === 'upload' && (
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all"
            >
              <Upload size={28} className="text-gray-300" />
              <p className="text-sm text-gray-500">{t.upload}</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP</p>
            </div>
            {/* capture="environment" opens rear camera directly on mobile */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="hidden"
            />
          </div>
        )}

        {/* Text mode */}
        {mode === 'text' && (
          <div className="flex gap-2">
            <input
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && analyzeText(textInput)}
              placeholder={t.placeholder}
              className="input flex-1"
            />
            <Button variant="primary" onClick={() => analyzeText(textInput)} disabled={loading || !textInput.trim()}>
              <Sparkles size={14} />
              {t.analyze}
            </Button>
          </div>
        )}
      </Card>

      {loading && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles size={14} className="text-brand-600 animate-pulse" />
            <span>{t.analyzing}</span>
            <TypingDots />
          </div>
        </Card>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">
          {error}
        </div>
      )}

      {product && !loading && (
        <ProductResult product={product} onSave={handleSaveToWishlist} />
      )}
    </div>
  )
}
