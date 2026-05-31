import { useState } from 'react'
import { Trash2, ShoppingCart, X } from 'lucide-react'
import { Card, Button } from '@/components/ui/index'
import { useStore } from '@/store/useStore'
import { cn } from '@/lib/utils'

export default function WishlistPage() {
  const { lang, wishlist, removeFromWishlist, clearWishlist, addToCart } = useStore()
  const isIt = lang === 'it'
  const [confirmClear, setConfirmClear] = useState(false)

  function handleAddToCart(id: string) {
    const item = wishlist.find(w => w.id === id)
    if (!item) return
    addToCart({ name: item.name, source: 'wishlist' })
    removeFromWishlist(id)
  }

  return (
    <div className="space-y-4 animate-slide-up pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-base font-semibold text-gray-900">
            {isIt ? '⭐ Wishlist' : '⭐ Wishlist'}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {wishlist.length === 0
              ? (isIt ? 'Nessun prodotto salvato' : 'No saved products')
              : `${wishlist.length} ${isIt ? 'prodotti salvati' : 'saved products'}`}
          </p>
        </div>
        {wishlist.length > 0 && !confirmClear && (
          <button onClick={() => setConfirmClear(true)}
            className="text-[11px] text-red-500 hover:text-red-700 font-medium flex items-center gap-1">
            <Trash2 size={12} /> {isIt ? 'Svuota' : 'Clear all'}
          </button>
        )}
        {confirmClear && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-600">{isIt ? 'Sicuro?' : 'Sure?'}</span>
            <button onClick={() => { clearWishlist(); setConfirmClear(false) }}
              className="text-[11px] text-red-600 font-semibold px-2 py-1 bg-red-50 rounded-lg">
              {isIt ? 'Sì' : 'Yes'}
            </button>
            <button onClick={() => setConfirmClear(false)}
              className="text-[11px] text-gray-500 px-2 py-1 bg-gray-100 rounded-lg">
              {isIt ? 'No' : 'No'}
            </button>
          </div>
        )}
      </div>

      {wishlist.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-3xl mb-3">⭐</p>
          <p className="text-sm font-medium text-gray-500">
            {isIt ? 'Nessun prodotto ancora' : 'No products yet'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isIt ? 'Scansiona un prodotto dallo Scanner per aggiungerlo qui' : 'Scan a product from the Scanner to add it here'}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {wishlist.map(item => (
            <Card key={item.id} className="p-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl flex-shrink-0">{item.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                  {item.score != null && (
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                        item.score >= 70 ? 'bg-brand-100 text-brand-700'
                          : item.score >= 45 ? 'bg-amber-100 text-amber-700'
                          : 'bg-red-100 text-red-700')}>
                        {item.score}/100
                      </div>
                      {item.tags?.slice(0, 2).map((t, i) => (
                        <span key={i} className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{t}</span>
                      ))}
                    </div>
                  )}
                  {item.reason && (
                    <p className="text-[10px] text-gray-500 mt-1 line-clamp-2">{item.reason}</p>
                  )}
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleAddToCart(item.id)}
                    className="p-2 rounded-xl bg-brand-50 text-brand-600 hover:bg-brand-100 transition-colors"
                    title={isIt ? 'Aggiungi a lista spesa' : 'Add to shopping list'}>
                    <ShoppingCart size={14} />
                  </button>
                  <button onClick={() => removeFromWishlist(item.id)}
                    className="p-2 rounded-xl bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {wishlist.length > 0 && (
        <Button variant="primary" className="w-full gap-2"
          onClick={() => wishlist.forEach(item => handleAddToCart(item.id))}>
          <ShoppingCart size={14} />
          {isIt ? 'Aggiungi tutti alla lista spesa' : 'Add all to shopping list'}
        </Button>
      )}
    </div>
  )
}
