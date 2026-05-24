import { ShoppingCart, Trash2, Package, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, SectionTitle } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

const SOURCE_LABELS = {
  plan:     { it: 'Piano alimentare', en: 'Meal plan',   color: 'bg-brand-50 text-brand-700' },
  scanner:  { it: 'Scanner',         en: 'Scanner',     color: 'bg-blue-50 text-blue-700' },
  wishlist: { it: 'Wishlist',        en: 'Wishlist',    color: 'bg-purple-50 text-purple-700' },
}

export default function CartPage() {
  const { lang, cartItems, removeFromCart, clearCart } = useStore()
  const navigate = useNavigate()
  const isIt = lang === 'it'

  const grouped = {
    plan:     cartItems.filter(i => i.source === 'plan'),
    scanner:  cartItems.filter(i => i.source === 'scanner'),
    wishlist: cartItems.filter(i => i.source === 'wishlist'),
  }

  return (
    <div className="space-y-4 animate-slide-up pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-surface-muted transition-colors">
          <ArrowLeft size={18} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '🛒 Carrello' : '🛒 Cart'}
          </h1>
          <p className="text-xs text-gray-500">
            {cartItems.length} {isIt ? 'prodotti' : 'items'}
          </p>
        </div>
        {cartItems.length > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCart} className="text-red-500 gap-1">
            <Trash2 size={13} />
            {isIt ? 'Svuota' : 'Clear all'}
          </Button>
        )}
      </div>

      {cartItems.length === 0 ? (
        <Card className="p-8 text-center">
          <Package size={32} className="text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">
            {isIt ? 'Il carrello è vuoto' : 'Your cart is empty'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isIt
              ? 'Aggiungi prodotti dal Piano alimentare, Scanner o Wishlist'
              : 'Add items from Meal plan, Scanner or Wishlist'}
          </p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="secondary" size="sm" onClick={() => navigate('/plan')}>
              {isIt ? 'Vai al Piano' : 'Go to Plan'}
            </Button>
            <Button variant="secondary" size="sm" onClick={() => navigate('/scanner')}>
              Scanner
            </Button>
          </div>
        </Card>
      ) : (
        <>
          {(Object.entries(grouped) as [keyof typeof grouped, typeof cartItems][])
            .filter(([, items]) => items.length > 0)
            .map(([source, items]) => {
              const meta = SOURCE_LABELS[source]
              return (
                <Card key={source} className="p-4">
                  <SectionTitle icon={<ShoppingCart size={14} />}>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', meta.color)}>
                      {isIt ? meta.it : meta.en}
                    </span>
                  </SectionTitle>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id}
                        className="flex items-center gap-3 p-2.5 bg-surface-muted rounded-xl">
                        <span className="text-lg flex-shrink-0">🛒</span>
                        <span className="flex-1 text-xs text-gray-700 leading-snug">{item.name}</span>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </Card>
              )
            })}
        </>
      )}
    </div>
  )
}
