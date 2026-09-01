"use client"

import { useState, useEffect } from "react"
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react"
import { useCart } from "@/lib/cart"
import { formatPrice } from "@/lib/format-price"
import { SafeImg } from "@/components/dining/safe-img"
import { toast } from "@/components/ui/toaster"

export function CartWidget({ currency }: { currency: string }) {
  const [open, setOpen] = useState(false)
  const { items, setQty, clear, count, subtotal } = useCart()

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : ""
    return () => { document.body.style.overflow = "" }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 z-40 flex h-14 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-transform active:scale-95"
        aria-label="Open cart"
      >
        <ShoppingCart className="size-5" />
        {count > 0 && (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold tabular-nums">{count}</span>
        )}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[49] bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      <div
        className={`fixed bottom-0 left-1/2 z-50 flex w-full max-w-xl -translate-x-1/2 flex-col rounded-t-2xl bg-white shadow-2xl transition-transform duration-300 dark:bg-gray-900 ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85dvh" }}
      >
        <div className="flex shrink-0 justify-center pt-3 pb-1">
          <div className="h-1 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
        </div>

        <div className="flex shrink-0 items-center justify-between px-5 py-3">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            Your Order
            {count > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-400">({count} {count === 1 ? "item" : "items"})</span>
            )}
          </h2>
          <div className="flex items-center gap-1">
            {items.length > 0 && (
              <button
                onClick={() => { clear(); toast.success("Cart cleared") }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                aria-label="Clear cart"
                title="Clear all"
              >
                <Trash2 className="size-4" />
              </button>
            )}
            <button
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              aria-label="Close cart"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {items.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <ShoppingCart className="size-10 text-gray-200 dark:text-gray-700" />
              <p className="mt-3 text-sm text-gray-400">Your cart is empty</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {items.map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800">
                    {item.photo ? (
                      <SafeImg src={item.photo} alt={item.name} className="h-full w-full object-cover" />
                    ) : null}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{item.name}</p>
                    {item.modifiers.length > 0 && (
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {item.modifiers.map((m) => m.optionLabel).join(", ")}
                      </p>
                    )}
                    <p className="mt-0.5 text-sm font-semibold text-brand">
                      {formatPrice(item.unitPrice, currency)}
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      onClick={() => setQty(item.id, item.qty - 1)}
                      className="flex size-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-medium tabular-nums">{item.qty}</span>
                    <button
                      onClick={() => setQty(item.id, item.qty + 1)}
                      className="flex size-7 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                      aria-label="Increase quantity"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="shrink-0 border-t border-gray-100 px-5 py-4 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Subtotal</span>
              <span className="text-base font-bold text-gray-900 dark:text-white">
                {formatPrice(subtotal, currency)}
              </span>
            </div>
            <button
              onClick={() => toast.info("Online ordering coming soon")}
              className="mt-3 w-full rounded-xl bg-brand py-3 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition hover:brightness-95 active:scale-[0.98]"
            >
              Place Order
            </button>
          </div>
        )}
      </div>
    </>
  )
}
