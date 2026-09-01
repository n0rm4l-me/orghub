"use client"

import { createContext, useContext, useReducer, useCallback } from "react"

export type CartModifier = {
  groupId: string
  groupName: string
  optionLabel: string
  priceDelta: number
}

export type CartItem = {
  id: string
  entryId: string
  name: string
  photo: string | null
  basePrice: number
  modifiers: CartModifier[]
  unitPrice: number
  qty: number
}

type CartAction =
  | { type: "ADD"; payload: Omit<CartItem, "id" | "qty"> }
  | { type: "REMOVE"; id: string }
  | { type: "SET_QTY"; id: string; qty: number }
  | { type: "CLEAR" }

function makeId(entryId: string, modifiers: CartModifier[]): string {
  const key = modifiers
    .map((m) => `${m.groupId}:${m.optionLabel}`)
    .sort()
    .join("|")
  return `${entryId}__${key}`
}

function reducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case "ADD": {
      const id = makeId(action.payload.entryId, action.payload.modifiers)
      const idx = state.findIndex((i) => i.id === id)
      if (idx >= 0) return state.map((i, n) => (n === idx ? { ...i, qty: i.qty + 1 } : i))
      return [...state, { ...action.payload, id, qty: 1 }]
    }
    case "REMOVE":
      return state.filter((i) => i.id !== action.id)
    case "SET_QTY":
      if (action.qty <= 0) return state.filter((i) => i.id !== action.id)
      return state.map((i) => (i.id === action.id ? { ...i, qty: action.qty } : i))
    case "CLEAR":
      return []
  }
}

type CartCtx = {
  items: CartItem[]
  add: (item: Omit<CartItem, "id" | "qty">) => void
  remove: (id: string) => void
  setQty: (id: string, qty: number) => void
  clear: () => void
  count: number
  subtotal: number
}

const CartContext = createContext<CartCtx | null>(null)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(reducer, [])

  const add = useCallback((item: Omit<CartItem, "id" | "qty">) => dispatch({ type: "ADD", payload: item }), [])
  const remove = useCallback((id: string) => dispatch({ type: "REMOVE", id }), [])
  const setQty = useCallback((id: string, qty: number) => dispatch({ type: "SET_QTY", id, qty }), [])
  const clear = useCallback(() => dispatch({ type: "CLEAR" }), [])

  const count = items.reduce((s, i) => s + i.qty, 0)
  const subtotal = items.reduce((s, i) => s + i.unitPrice * i.qty, 0)

  return (
    <CartContext.Provider value={{ items, add, remove, setQty, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
