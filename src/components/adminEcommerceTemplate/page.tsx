"use client"

import { useState, useEffect, useCallback } from "react"
import { useSiteId } from "@/hooks/use-site-id"
import { useSiteLink } from "@/hooks/use-site-link"
import { Package, Layers, ShoppingCart, Settings } from "lucide-react"
import ProductsAdmin from "./ProductsAdmin"
import CategoriesAdmin from "./CategoriesAdmin"
import OrdersAdmin from "./OrdersAdmin"
import ConfigAdmin from "./ConfigAdmin"

interface AdminEcommerceTemplateProps {
  siteId?: string
  editableElements?: {
    [key: string]: string
  }
}

interface Category {
  id: string
  name: string
}

export default function AdminEcommerceTemplate({ editableElements = {} }: Omit<AdminEcommerceTemplateProps, "siteId">) {
  const siteId = useSiteId()
  const { transformLink } = useSiteLink()
  console.log("this's the siteid", siteId)
  const [activeTab, setActiveTab] = useState<"products" | "categories" | "orders" | "config">("products")
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalCategories: 0,
    lowStock: 0,
  })
  const [categories, setCategories] = useState<Category[]>([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const fetchStats = useCallback(async () => {
    try {
      const productsRes = await fetch(`/api/services/ecommerce/products/admin?siteId=${siteId}`)
      const categoriesRes = await fetch(`/api/services/ecommerce/categories/admin?siteId=${siteId}`)

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        const products = productsData.data?.products || []
        setStats((prev) => ({
          ...prev,
          totalProducts: products.length,
          lowStock: products.filter((p: any) =>p.stock_quantity < (p.low_stock_threshold || 10)).length,
        }))
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        const cats = categoriesData.data?.categories || []
        setCategories(cats)
        setStats((prev) => ({
          ...prev,
          totalCategories: cats.length,
        }))
      }
    } catch (error) {
      console.error("Error fetching stats:", error)
    }
  }, [siteId])

  useEffect(() => {
    fetchStats()
  }, [siteId, fetchStats])

  const handleDataChange = useCallback(() => {
    setRefreshTrigger((prev) => prev + 1)
    fetchStats()
  }, [fetchStats])

  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Gestion E-commerce</h2>
          <p className="text-gray-600">Gérez vos produits, catégories et commandes</p>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Produits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalProducts}</p>
              </div>
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Catégories</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalCategories}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Layers className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Stock Faible</p>
                <p className="text-2xl font-bold text-gray-900">{stats.lowStock}</p>
              </div>
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("products")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "products"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Produits
            </div>
          </button>
          <button
            onClick={() => setActiveTab("categories")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "categories"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4" />
              Catégories
            </div>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "orders"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Commandes
            </div>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              activeTab === "config"
                ? "border-black text-black"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuration
            </div>
          </button>
        </div>

        {/* Content */}
        {activeTab === "products" && (
          <ProductsAdmin
            siteId={siteId}
            categories={categories}
            onDataChange={handleDataChange}
            refreshTrigger={refreshTrigger}
          />
        )}
        {activeTab === "categories" && (
          <CategoriesAdmin siteId={siteId} onDataChange={handleDataChange} refreshTrigger={refreshTrigger} />
        )}
        {activeTab === "orders" && <OrdersAdmin siteId={siteId} />}
        {activeTab === "config" && <ConfigAdmin />}
      </div>
    </div>
  )
}
