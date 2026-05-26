import { Trash2, Package, ArrowLeft, Leaf, Droplets, Flame, Share2, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '@/components/ui/index'
import { useState } from 'react'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_LABELS = {
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino' },
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
}

const SOURCE_LABELS = {
  plan:     { it: 'Piano alimentare', en: 'Meal plan',  color: 'bg-brand-50 text-brand-700 border-brand-200' },
  scanner:  { it: 'Scanner',         en: 'Scanner',    color: 'bg-blue-50 text-blue-700 border-blue-200' },
  wishlist: { it: 'Wishlist',        en: 'Wishlist',   color: 'bg-purple-50 text-purple-700 border-purple-200' },
}

// Aggregate duplicate ingredients across meals
function aggregateIngredients(items: CartItem[]): {
  item: string; qty: string; therapeutic?: string; meals: string[]
}[] {
  const map = new Map<string, { qty: string; therapeutic?: string; meals: string[] }>()

  items.forEach(cartItem => {
    const mealLabel = cartItem.name
    if (cartItem.ingredients && cartItem.ingredients.length > 0) {
      cartItem.ingredients.forEach(({ item, qty, therapeutic }) => {
        const key = item.toLowerCase().trim()
        if (map.has(key)) {
          const existing = map.get(key)!
          if (!existing.meals.includes(mealLabel)) existing.meals.push(mealLabel)
          if (therapeutic && !existing.therapeutic) existing.therapeutic = therapeutic
        } else {
          map.set(key, { qty, therapeutic, meals: [mealLabel] })
        }
      })
    } else {
      // No ingredients parsed — show whole item as single entry
      const key = cartItem.name.toLowerCase()
      if (!map.has(key)) {
        map.set(key, { qty: '', therapeutic: undefined, meals: [mealLabel] })
      }
    }
  })

  return Array.from(map.entries()).map(([item, data]) => ({
    item: item.charAt(0).toUpperCase() + item.slice(1),
    ...data
  }))
}

// Therapeutic badge icon
function TherapeuticBadge({ tag }: { tag: string }) {
  const lower = tag.toLowerCase()
  const icon = lower.includes('ferro') || lower.includes('iron') ? <Leaf size={9} />
    : lower.includes('vitam') ? <Droplets size={9} />
    : <Flame size={9} />

  return (
    <span className="inline-flex items-center gap-1 text-[9px] bg-brand-50 text-brand-700 border border-brand-200 px-1.5 py-0.5 rounded-full font-medium">
      {icon} {tag}
    </span>
  )
}

// ─── Ingredient row ───────────────────────────────────────────────────────────
function IngredientRow({ ingredient, checked, onToggle }: {
  ingredient: { item: string; qty: string; therapeutic?: string; meals: string[] }
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-start gap-3 py-2.5 border-b border-gray-50 last:border-none text-left"
    >
      {checked
        ? <span className="text-brand-600 mt-0.5 flex-shrink-0 text-base">☑</span>
        : <span className="text-gray-300 mt-0.5 flex-shrink-0 text-base">☐</span>
      }
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={cn("text-sm font-medium transition-all",
            checked ? "line-through text-gray-400" : "text-gray-800")}>
            {ingredient.item}
          </span>
          {ingredient.qty && (
            <span className={cn("text-xs font-mono", checked ? "text-gray-300" : "text-gray-400")}>
              {ingredient.qty}
            </span>
          )}
          {ingredient.meals.length > 1 && (
            <span className="text-[9px] text-gray-400">×{ingredient.meals.length}</span>
          )}
        </div>
        {!checked && (
          <div className="flex flex-wrap gap-1 mt-1">
            {ingredient.therapeutic && (
              <TherapeuticBadge tag={ingredient.therapeutic} />
            )}
            {ingredient.meals.length > 1 && (
              <span className="text-[9px] text-gray-400 italic">
                {ingredient.meals.slice(0, 2).join(' · ')}
                {ingredient.meals.length > 2 && ` +${ingredient.meals.length - 2}`}
              </span>
            )}
          </div>
        )}
      </div>
    </button>
  )
}

// ─── Cart page ────────────────────────────────────────────────────────────────
export default function CartPage() {
  const { lang, cartItems, removeFromCart, clearCart } = useStore()
  const navigate = useNavigate()
  const isIt = lang === 'it'

  // Checked state for ingredients (by ingredient key = lowercase item name)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const toggleChecked = (key: string) =>
    setChecked(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  // Share list
  const buildShareText = () => {
    const lines: string[] = [isIt ? '🛒 Lista della spesa BeHealth' : '🛒 BeHealth Shopping List', '']
    aggregated.forEach(({ item, qty, therapeutic }) => {
      const tick = checked.has(item.toLowerCase()) ? '✅' : '⬜'
      lines.push(`${tick} ${item}${qty ? ` — ${qty}` : ''}${therapeutic ? ` (${therapeutic})` : ''}`)
    })
    scannerItems.forEach(i => lines.push(`⬜ ${i.name}`))
    wishlistItems.forEach(i => lines.push(`⬜ ${i.name}`))
    return lines.join('\n')
  }

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(buildShareText())
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareViaMail = () => {
    const subject = encodeURIComponent(isIt ? 'Lista della spesa BeHealth' : 'BeHealth Shopping List')
    const body = encodeURIComponent(buildShareText())
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank')
  }

  const shareNative = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: isIt ? 'Lista della spesa' : 'Shopping list', text: buildShareText() }) }
      catch { /* user cancelled */ }
    }
  }

  const [showShareMenu, setShowShareMenu] = useState(false)

  // Aggregated shopping list from plan items
  const planItems     = cartItems.filter(i => i.source === 'plan')
  const scannerItems  = cartItems.filter(i => i.source === 'scanner')
  const wishlistItems = cartItems.filter(i => i.source === 'wishlist')
  const aggregated = aggregateIngredients(planItems)
  const therapeuticCount = aggregated.filter(i => i.therapeutic).length
  const checkedCount = aggregated.filter(i => checked.has(i.item.toLowerCase())).length

  // Total ingredients count
  const totalIngredients = aggregated.length + scannerItems.length + wishlistItems.length

  return (
    <div className="space-y-4 animate-slide-up pb-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)}
          className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '🛒 Lista della spesa' : '🛒 Shopping list'}
          </h1>
          <p className="text-xs text-gray-500">
            {checkedCount}/{totalIngredients} {isIt ? 'acquistati' : 'purchased'}
            {therapeuticCount > 0 && (
              <span className="ml-2 text-brand-600 font-medium">
                · {therapeuticCount} {isIt ? 'terapeutici' : 'therapeutic'}
              </span>
            )}
          </p>
          {totalIngredients > 0 && (
            <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden w-32">
              <div className="h-full bg-brand-500 rounded-full transition-all duration-300"
                style={{ width: `${Math.round((checkedCount/totalIngredients)*100)}%` }} />
            </div>
          )}
        </div>
        {cartItems.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Share button */}
            <div className="relative">
              <button
                onClick={() => setShowShareMenu(x => !x)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-50 text-brand-700 rounded-full text-xs font-medium hover:bg-brand-100 transition-colors"
              >
                <Share2 size={12} />
                {isIt ? 'Condividi' : 'Share'}
              </button>
              {showShareMenu && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowShareMenu(false)} />
                  <div className="absolute right-0 top-8 z-40 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden w-44">
                    {'share' in navigator && (
                      <button onClick={() => { shareNative(); setShowShareMenu(false) }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-surface-muted transition-colors border-b border-gray-50">
                        <Share2 size={14} className="text-brand-600" />
                        {isIt ? 'Condividi…' : 'Share…'}
                      </button>
                    )}
                    <button onClick={() => { shareViaWhatsApp(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-surface-muted transition-colors border-b border-gray-50">
                      <span className="text-base">💬</span>
                      WhatsApp
                    </button>
                    <button onClick={() => { shareViaMail(); setShowShareMenu(false) }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-surface-muted transition-colors">
                      <Mail size={14} className="text-gray-500" />
                      {isIt ? 'Email' : 'Email'}
                    </button>
                  </div>
                </>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={clearCart}
              className="gap-1 text-red-500 hover:text-red-600">
              <Trash2 size={12} />
            </Button>
          </div>
        )}
      </div>

      {/* Empty state */}
      {cartItems.length === 0 && (
        <Card className="p-8 text-center">
          <Package size={32} className="text-gray-200 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-400">
            {isIt ? 'La lista è vuota' : 'Your list is empty'}
          </p>
          <p className="text-xs text-gray-400 mt-1 mb-4">
            {isIt
              ? 'Aggiungi pasti dal Piano alimentare o prodotti dallo Scanner'
              : 'Add meals from the Meal plan or products from the Scanner'}
          </p>
          <div className="flex gap-2 justify-center">
            <Button variant="secondary" size="sm" onClick={() => navigate('/plan')}>
              {isIt ? 'Vai al Piano' : 'Go to Plan'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/scanner')}>
              Scanner
            </Button>
          </div>
        </Card>
      )}

      {/* ── Piano alimentare — aggregated ingredient list ──────────────── */}
      {planItems.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border',
                SOURCE_LABELS.plan.color)}>
                {isIt ? SOURCE_LABELS.plan.it : SOURCE_LABELS.plan.en}
              </span>
              <span className="text-xs text-gray-400">
                {planItems.length} {isIt ? 'pasti' : 'meals'}
              </span>
            </div>
            {therapeuticCount > 0 && (
              <span className="text-[10px] text-brand-600 flex items-center gap-1">
                <Leaf size={10} />
                {therapeuticCount} {isIt ? 'terapeutici' : 'therapeutic'}
              </span>
            )}
          </div>

          {/* Meal breakdown */}
          <div className="space-y-3 mb-4">
            {planItems.map(cartItem => (
              <div key={cartItem.id}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    {cartItem.mealType && (
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">
                        {(isIt ? MEAL_LABELS.it : MEAL_LABELS.en)[cartItem.mealType]}
                      </span>
                    )}
                    <span className="text-xs font-medium text-gray-700">{cartItem.name}</span>
                  </div>
                  <button onClick={() => removeFromCart(cartItem.id)}
                    className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Aggregated ingredients */}
          <div className="border-t border-gray-100 pt-3">
            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-2">
              {isIt ? 'Ingredienti da acquistare' : 'Ingredients to buy'}
            </p>
            {aggregated.map((ingredient, i) => (
              <IngredientRow
                key={i}
                ingredient={ingredient}
                checked={checked.has(ingredient.item.toLowerCase())}
                onToggle={() => toggleChecked(ingredient.item.toLowerCase())}
              />
            ))}
          </div>
        </Card>
      )}

      {/* ── Scanner items ─────────────────────────────────────────────── */}
      {scannerItems.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border',
              SOURCE_LABELS.scanner.color)}>
              Scanner
            </span>
          </div>
          <div className="space-y-2">
            {scannerItems.map(item => (
              <div key={item.id}
                className="flex items-center gap-3 p-2.5 bg-surface-muted rounded-xl">
                <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                <button onClick={() => removeFromCart(item.id)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ── Wishlist items ────────────────────────────────────────────── */}
      {wishlistItems.length > 0 && (
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full border',
              SOURCE_LABELS.wishlist.color)}>
              Wishlist
            </span>
          </div>
          <div className="space-y-2">
            {wishlistItems.map(item => (
              <div key={item.id}
                className="flex items-center gap-3 p-2.5 bg-surface-muted rounded-xl">
                <span className="flex-1 text-xs text-gray-700">{item.name}</span>
                <button onClick={() => removeFromCart(item.id)}
                  className="p-1 text-gray-300 hover:text-red-400 transition-colors">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

    </div>
  )
}
