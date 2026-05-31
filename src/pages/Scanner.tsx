import { useState, useRef } from 'react'
import { Upload, Type, ScanLine, Plus, Sparkles, ImageIcon, Trash2, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import { Card, Button, SectionTitle, TypingDots } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { callAI } from '@/lib/api'
import { getSystemPrompt } from '@/lib/skills'
import { cn, genId } from '@/lib/utils'
import type { ProductAnalysis, ScanHistoryItem } from '@/types'

type ScanMode = 'upload' | 'text'

function resizeImageToBase64(dataUrl: string, maxPx = 1024, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

function parseProductJSON(raw: string): Record<string, unknown> {
  let clean = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim()
  const start = clean.indexOf('{')
  if (start === -1) throw new Error('No JSON found')
  clean = clean.slice(start)
  let depth = 0, end = -1
  for (let i = 0; i < clean.length; i++) {
    if (clean[i] === '{') depth++
    else if (clean[i] === '}') { depth--; if (depth === 0) { end = i; break } }
  }
  if (end !== -1) { try { return JSON.parse(clean.slice(0, end + 1)) } catch {} }
  const quoteCount = (clean.match(/(?<!\\)"/g) ?? []).length
  if (quoteCount % 2 !== 0) clean += '"'
  const opens = [...clean].reduce((acc, c) => {
    if (c === '[') return [...acc, ']']
    if (c === '{') return [...acc, '}']
    if ((c === ']' || c === '}') && acc.length) return acc.slice(0, -1)
    return acc
  }, [] as string[])
  return JSON.parse(clean + opens.reverse().join(''))
}

// ─── Product result card ──────────────────────────────────────────────────────
function ProductResult({ product, onSaveWishlist, onSaveCart, isIt }: {
  product: ProductAnalysis
  onSaveWishlist: () => void
  onSaveCart: () => void
  isIt: boolean
}) {
  const isHealthy = product.verdict === 'healthy'
  const isMod     = product.verdict === 'moderate'

  return (
    <Card className="p-0 overflow-hidden mt-3">
      <div className={cn('flex items-center gap-3 p-3',
        isHealthy ? 'bg-brand-50' : isMod ? 'bg-amber-50' : 'bg-red-50')}>
        <span className="text-3xl">{product.emoji}</span>
        <div className="flex-1">
          <p className={cn('text-sm font-semibold',
            isHealthy ? 'text-brand-800' : isMod ? 'text-amber-800' : 'text-red-800')}>
            {product.name}
          </p>
          <p className={cn('text-xs',
            isHealthy ? 'text-brand-600' : isMod ? 'text-amber-600' : 'text-red-600')}>
            {isHealthy ? (isIt ? '✓ Prodotto sano' : '✓ Healthy product')
              : isMod ? (isIt ? '⚡ Consumo moderato' : '⚡ Moderate consumption')
              : (isIt ? '⚠ Da limitare' : '⚠ Limit consumption')}
          </p>
        </div>
        <div className={cn('text-lg font-bold font-display',
          product.score >= 70 ? 'text-brand-700' : product.score >= 45 ? 'text-amber-600' : 'text-red-600')}>
          {product.score}<span className="text-xs font-normal text-gray-400">/100</span>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {product.positives.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-brand-700 mb-1">{isIt ? '✓ Positivi' : '✓ Positives'}</p>
            {product.positives.map((p, i) => <p key={i} className="text-xs text-gray-600">• {p}</p>)}
          </div>
        )}
        {product.negatives.length > 0 && (
          <div>
            <p className="text-[10px] font-medium text-red-600 mb-1">{isIt ? '✗ Da sapere' : '✗ Watch out'}</p>
            {product.negatives.map((n, i) => <p key={i} className="text-xs text-gray-600">• {n}</p>)}
          </div>
        )}
        {product.suggestion && (
          <p className="text-xs text-gray-600 bg-surface-muted rounded-lg p-2.5 italic">💡 {product.suggestion}</p>
        )}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onSaveWishlist} className="flex-1">
            <Plus size={13} /> {isIt ? 'Wishlist' : 'Wishlist'}
          </Button>
          <Button variant="primary" size="sm" onClick={onSaveCart} className="flex-1">
            <ShoppingCart size={13} /> {isIt ? 'Lista spesa' : 'Shopping list'}
          </Button>
        </div>
      </div>
    </Card>
  )
}

// ─── Scan history card (collapsible) ─────────────────────────────────────────
function ScanHistoryCard({ history, isIt, onDelete, onAddToCart, onAddToWishlist }: {
  history: ScanHistoryItem[]; isIt: boolean
  onDelete: (id: string) => void
  onAddToCart: (item: ScanHistoryItem) => void
  onAddToWishlist: (item: ScanHistoryItem) => void
}) {
  const [open, setOpen] = useState(false)
  if (history.length === 0) return null
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(x => !x)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <ScanLine size={14} className="text-gray-400" />
          <span className="text-sm font-medium text-gray-800">{isIt ? 'Ultime scansioni' : 'Recent scans'}</span>
          <span className="text-[10px] bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full font-medium">{history.length}</span>
        </div>
        {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-100 px-3 pb-3 space-y-2">
          {history.map(item => {
            const d = new Date(item.scannedAt)
            const dateLabel = d.toLocaleDateString(isIt ? 'it-IT' : 'en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            return (
              <div key={item.id} className="flex items-center gap-3 p-2.5 bg-surface-muted rounded-xl">
                <span className="text-xl flex-shrink-0">{item.tags?.[0] ?? '🍽'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] text-gray-500">{dateLabel} {item.score != null ? `· ${item.score}/100` : ''}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => onAddToWishlist(item)}
                    className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-brand-600 transition-colors" title={isIt ? 'Wishlist' : 'Wishlist'}>
                    <Plus size={11} />
                  </button>
                  <button onClick={() => onAddToCart(item)}
                    className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-brand-600 transition-colors" title={isIt ? 'Lista spesa' : 'Cart'}>
                    <ShoppingCart size={11} />
                  </button>
                  <button onClick={() => onDelete(item.id)}
                    className="p-1.5 rounded-lg bg-white text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

// ─── Scanner page ─────────────────────────────────────────────────────────────
export function ScannerPage() {
  const { lang, profile, addToWishlist, addToCart, scanHistory, addScanHistory, deleteScanHistory } = useStore()
  const [mode,      setMode]      = useState<ScanMode>('upload')
  const [textInput, setTextInput] = useState('')
  const [product,   setProduct]   = useState<ProductAnalysis | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const isIt    = lang === 'it'

  const t = {
    title:     isIt ? 'Scanner alimenti' : 'Food scanner',
    upload:    isIt ? 'Carica foto' : 'Upload photo',
    placeholder: isIt ? 'Es: Nutella, Salmone, Avena' : 'E.g. Nutella, Salmon, Oats',
    analyze:   isIt ? 'Analizza' : 'Analyze',
    analyzing: isIt ? 'Analisi in corso...' : 'Analyzing...',
  }

  function saveScanToHistory(p: ProductAnalysis) {
    addScanHistory({
      id:        genId(),
      name:      p.name,
      scannedAt: new Date().toISOString(),
      score:     p.score,
      tags:      [p.emoji, ...p.positives.slice(0, 2)],
    })
  }

  async function analyzeText(name: string) {
    if (!name.trim() || loading) return
    setLoading(true); setError(''); setProduct(null)
    try {
      const sys = getSystemPrompt('nutrizionista', profile, lang)
      const instruction = isIt
        ? `Analizza il prodotto alimentare "${name}" per questo paziente. Valuta qualità nutrizionale, impatto sulla salute considerando i suoi valori ematici, e dai un punteggio 0-100. Rispondi SOLO con JSON valido: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["..."],"negatives":["..."],"suggestion":"..."}`
        : `Analyze the food product "${name}" for this patient. Evaluate nutritional quality, health impact considering their blood values, and give a score 0-100. Reply ONLY with valid JSON: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["..."],"negatives":["..."],"suggestion":"..."}`
      const raw = await callAI({ system: sys, messages: [{ role: 'user', content: instruction }], max_tokens: 800 })
      const parsed = parseProductJSON(raw)
      const p = { ...parsed, id: genId(), scannedAt: new Date().toISOString(), nutrients: [] } as unknown as ProductAnalysis
      setProduct(p)
      saveScanToHistory(p)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  async function analyzeImage(dataUrl: string) {
    setLoading(true); setError(''); setProduct(null)
    try {
      const resized = await resizeImageToBase64(dataUrl)
      const base64  = resized.split(',')[1]
      const sys     = getSystemPrompt('nutrizionista', profile, lang)
      const prompt  = isIt
        ? 'Analizza l\'etichetta del prodotto nell\'immagine. Rispondi SOLO con JSON: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["..."],"negatives":["..."],"suggestion":"..."}'
        : 'Analyze the product label in the image. Reply ONLY with JSON: {"name":"...","emoji":"...","verdict":"healthy|moderate|unhealthy","score":50,"positives":["..."],"negatives":["..."],"suggestion":"..."}'
      const raw = await callAI({
        system: sys,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: prompt },
        ] as unknown as string }],
        max_tokens: 800,
      })
      const parsed = parseProductJSON(raw)
      const p = { ...parsed, id: genId(), scannedAt: new Date().toISOString(), nutrients: [] } as unknown as ProductAnalysis
      setProduct(p)
      saveScanToHistory(p)
    } catch (e) { setError((e as Error).message) }
    finally { setLoading(false) }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => analyzeImage(ev.target!.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleSaveWishlist() {
    if (!product) return
    addToWishlist({ name: product.name, emoji: product.emoji, score: product.score, reason: product.suggestion, tags: [...product.positives.slice(0, 2), ...product.negatives.slice(0, 1)] })
  }

  function handleSaveCart() {
    if (!product) return
    addToCart({ name: product.name, source: 'scanner' })
  }

  const MODES = [
    { key: 'upload' as ScanMode, icon: ImageIcon, labelEn: 'Upload photo', labelIt: 'Carica foto' },
    { key: 'text'   as ScanMode, icon: Type,      labelEn: 'Type name',    labelIt: 'Digita nome' },
  ]

  return (
    <div className="space-y-4 animate-slide-up">
      <Card className="p-4">
        <SectionTitle icon={<ScanLine size={15} />}>{t.title}</SectionTitle>
        <div className="flex gap-2 mb-4">
          {MODES.map(({ key, icon: Icon, labelEn, labelIt }) => (
            <button key={key} onClick={() => { setMode(key); setError('') }}
              className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition-all',
                mode === key ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium' : 'border-gray-200 text-gray-500 hover:border-gray-300')}>
              <Icon size={13} />{isIt ? labelIt : labelEn}
            </button>
          ))}
        </div>

        {mode === 'upload' && (
          <div>
            <div onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl h-40 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-brand-300 hover:bg-brand-50/30 transition-all">
              <Upload size={28} className="text-gray-300" />
              <p className="text-sm text-gray-500">{t.upload}</p>
              <p className="text-xs text-gray-400">JPG, PNG, WEBP</p>
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
          </div>
        )}

        {mode === 'text' && (
          <div className="flex gap-2">
            <input type="text" value={textInput} onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && analyzeText(textInput)}
              placeholder={t.placeholder} className="input flex-1" />
            <Button variant="primary" onClick={() => analyzeText(textInput)} disabled={loading || !textInput.trim()}>
              <Sparkles size={14} />{t.analyze}
            </Button>
          </div>
        )}
      </Card>

      {loading && (
        <Card className="p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Sparkles size={14} className="text-brand-600 animate-pulse" />
            <span>{t.analyzing}</span><TypingDots />
          </div>
        </Card>
      )}

      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600">{error}</div>}

      {product && !loading && (
        <ProductResult product={product} onSaveWishlist={handleSaveWishlist} onSaveCart={handleSaveCart} isIt={isIt} />
      )}

      <ScanHistoryCard
        history={scanHistory}
        isIt={isIt}
        onDelete={deleteScanHistory}
        onAddToCart={item => addToCart({ name: item.name, source: 'scanner' })}
        onAddToWishlist={item => addToWishlist({ name: item.name, emoji: item.tags?.[0] ?? '🍽', score: item.score ?? 50, reason: '', tags: item.tags?.slice(1) ?? [] })}
      />
    </div>
  )
}
