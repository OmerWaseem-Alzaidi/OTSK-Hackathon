import type { Product, ProductsResponse, User, UsersResponse } from './types'

const API_BASE = '/api'

export async function fetchProducts(): Promise<{
  products: Product[]
  categories: string[]
}> {
  const res = await fetch(`${API_BASE}/products`)
  if (!res.ok) throw new Error(`GET /products failed: ${res.status}`)
  const json: ProductsResponse = await res.json()
  return { products: json.data, categories: json.categories }
}

export async function fetchUsers(): Promise<User[]> {
  const res = await fetch(`${API_BASE}/users`)
  if (!res.ok) throw new Error(`GET /users failed: ${res.status}`)
  const json: UsersResponse = await res.json()
  return json.data
}
