import React, { useMemo, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Edit3,
  Loader2,
  Minus,
  Package,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  AppUser,
  DeliveryOrder,
  Product,
  StoreSettings,
} from '../types';
import {
  createDeliveryOrder,
  createProductRecord,
  deleteProductRecord,
  markOrderDelivered,
  updateProductRecord,
} from '../services/firestoreService';
import {
  formatCurrencyRs,
  formatDateTimeDisplay,
  getEffectivePrice,
} from '../utils/formatters';
import { ConfirmModal } from './ConfirmModal';

interface ProductsViewProps {
  currentUser: AppUser;
  products: Product[];
  orders: DeliveryOrder[];
  settings: StoreSettings;
  onToast: (message: string, type?: 'success' | 'error') => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  currentUser,
  products,
  orders,
  settings,
  onToast,
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const [section, setSection] = useState<'inventory' | 'orders'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'approved' | 'pending' | 'low'
  >('all');

  // Add Product Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newSelling, setNewSelling] = useState('');
  const [newStock, setNewStock] = useState('');
  const [savingProduct, setSavingProduct] = useState(false);

  // Edit Product Modal (Admin Only)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editSelling, setEditSelling] = useState('');
  const [editStock, setEditStock] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit Stock Modal (Admin Only)
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null);
  const [stockInputVal, setStockInputVal] = useState<number>(0);
  const [savingStock, setSavingStock] = useState(false);

  // Delete Confirmation (Admin Only)
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Mark Delivery / Order Modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [orderCustomer, setOrderCustomer] = useState('');
  const [orderProductId, setOrderProductId] = useState('');
  const [orderQty, setOrderQty] = useState('1');
  const [orderStatus, setOrderStatus] = useState<'Pending' | 'Delivered'>('Pending');
  const [savingOrder, setSavingOrder] = useState(false);

  const approvedProducts = useMemo(
    () => products.filter((p) => p.approvalStatus === 'Approved'),
    [products]
  );

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          if (
            !p.name.toLowerCase().includes(q) &&
            !p.category.toLowerCase().includes(q)
          ) {
            return false;
          }
        }
        if (statusFilter === 'approved') return p.approvalStatus === 'Approved';
        if (statusFilter === 'pending')
          return p.approvalStatus === 'Pending Approval';
        if (statusFilter === 'low') {
          return (
            p.approvalStatus === 'Approved' &&
            (p.stockQuantity === 0 || p.stockQuantity < settings.lowStockLimit)
          );
        }
        return true;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [products, searchQuery, statusFilter, settings.lowStockLimit]);

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !newName.trim() ||
      !newCategory.trim() ||
      newCost === '' ||
      newSelling === '' ||
      newStock === ''
    ) {
      onToast('All product fields are required', 'error');
      return;
    }

    const costNum = Number(newCost);
    const sellNum = Number(newSelling);
    const stockNum = Number(newStock);
    if (
      Number.isNaN(costNum) ||
      costNum < 0 ||
      Number.isNaN(sellNum) ||
      sellNum < 0 ||
      Number.isNaN(stockNum) ||
      stockNum < 0
    ) {
      onToast('Prices and stock quantity must be valid non-negative numbers', 'error');
      return;
    }

    setSavingProduct(true);
    try {
      await createProductRecord(
        {
          name: newName,
          category: newCategory,
          costPrice: costNum,
          sellingPrice: sellNum,
          stockQuantity: stockNum,
        },
        currentUser,
        settings.lowStockLimit
      );
      setNewName('');
      setNewCategory('');
      setNewCost('');
      setNewSelling('');
      setNewStock('');
      setShowAddModal(false);
      onToast(
        isAdmin
          ? 'Product added and published live'
          : 'Product submitted for Admin approval',
        'success'
      );
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : 'Failed to add product',
        'error'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setEditName(product.name);
    setEditCategory(product.category);
    setEditCost(String(product.costPrice));
    setEditSelling(String(product.sellingPrice));
    setEditStock(String(product.stockQuantity));
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct || !isAdmin) return;

    const costNum = Number(editCost);
    const sellNum = Number(editSelling);
    const stockNum = Number(editStock);
    if (
      !editName.trim() ||
      !editCategory.trim() ||
      Number.isNaN(costNum) ||
      costNum < 0 ||
      Number.isNaN(sellNum) ||
      sellNum < 0 ||
      Number.isNaN(stockNum) ||
      stockNum < 0
    ) {
      onToast('Please enter valid product details', 'error');
      return;
    }

    setSavingEdit(true);
    try {
      await updateProductRecord(
        editingProduct,
        {
          name: editName.trim(),
          category: editCategory.trim(),
          costPrice: costNum,
          sellingPrice: sellNum,
          stockQuantity: stockNum,
        },
        currentUser,
        settings.lowStockLimit
      );
      setEditingProduct(null);
      onToast('Product updated successfully', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update product', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const openStockModal = (product: Product) => {
    setStockModalProduct(product);
    setStockInputVal(product.stockQuantity);
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockModalProduct || !isAdmin) return;

    const qty = Math.max(0, Math.floor(Number(stockInputVal)));
    if (Number.isNaN(qty)) return;

    setSavingStock(true);
    try {
      await updateProductRecord(
        stockModalProduct,
        {
          stockQuantity: qty,
        },
        currentUser,
        settings.lowStockLimit
      );
      setStockModalProduct(null);
      onToast(`Stock updated to ${qty} units`, 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to update stock', 'error');
    } finally {
      setSavingStock(false);
    }
  };

  const handleToggleOutOfStock = async (product: Product) => {
    if (!isAdmin) return;
    try {
      if (product.stockQuantity > 0) {
        await updateProductRecord(
          product,
          {
            previousStockQuantity: product.stockQuantity,
            stockQuantity: 0,
          },
          currentUser,
          settings.lowStockLimit
        );
        onToast(`${product.name} marked Out of Stock`, 'success');
      } else {
        const restored =
          product.previousStockQuantity && product.previousStockQuantity > 0
            ? product.previousStockQuantity
            : Math.max(settings.lowStockLimit, 10);
        await updateProductRecord(
          product,
          {
            stockQuantity: restored,
          },
          currentUser,
          settings.lowStockLimit
        );
        onToast(`${product.name} marked In Stock (${restored} units)`, 'success');
      }
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to toggle stock', 'error');
    }
  };

  const handleApproval = async (
    product: Product,
    nextStatus: 'Approved' | 'Rejected'
  ) => {
    if (!isAdmin) return;
    try {
      await updateProductRecord(
        product,
        { approvalStatus: nextStatus },
        currentUser,
        settings.lowStockLimit
      );
      onToast(
        nextStatus === 'Approved'
          ? `${product.name} approved and live`
          : `${product.name} marked as rejected`,
        'success'
      );
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Action failed', 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget || !isAdmin) return;
    setDeleting(true);
    try {
      await deleteProductRecord(deleteTarget.id);
      setDeleteTarget(null);
      onToast('Product deleted permanently', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Delete failed', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = approvedProducts.find((p) => p.id === orderProductId);
    const qty = Math.floor(Number(orderQty));

    if (!orderCustomer.trim() || !product || Number.isNaN(qty) || qty < 1) {
      onToast('Please enter customer name, product, and valid quantity', 'error');
      return;
    }

    const effectiveUnit = getEffectivePrice(
      product.sellingPrice,
      settings.discountActive,
      settings.discountPercent
    );

    setSavingOrder(true);
    try {
      await createDeliveryOrder({
        customerName: orderCustomer,
        product,
        quantity: qty,
        unitSellingPrice: effectiveUnit,
        status: orderStatus,
        user: currentUser,
      });
      setOrderCustomer('');
      setOrderProductId('');
      setOrderQty('1');
      setOrderStatus('Pending');
      setShowOrderModal(false);
      onToast('Delivery / Order saved', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Failed to save order', 'error');
    } finally {
      setSavingOrder(false);
    }
  };

  const handleMarkOrderDelivered = async (orderId: string) => {
    try {
      await markOrderDelivered(orderId);
      onToast('Order marked as Delivered', 'success');
    } catch (err) {
      onToast(err instanceof Error ? err.message : 'Update failed', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Products &amp; Wholesale Stock
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Live synchronized catalog for {settings.businessName}
            {!isAdmin && ' · Selling prices shown (Cost & Profit hidden for Staff)'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => setShowOrderModal(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-800 text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Truck className="w-4 h-4" />
            Mark Delivery / Order
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="min-h-[44px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Section Switcher: Inventory vs Deliveries */}
      <div className="inline-flex items-center gap-1 p-1 bg-white border border-emerald-100 rounded-xl">
        <button
          type="button"
          onClick={() => setSection('inventory')}
          className={`min-h-[40px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            section === 'inventory'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Products ({products.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('orders')}
          className={`min-h-[40px] px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
            section === 'orders'
              ? 'bg-emerald-700 text-white'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Deliveries &amp; Orders ({orders.length})
        </button>
      </div>

      {section === 'inventory' ? (
        <>
          {/* Search + Filters */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by name or category..."
                className="w-full min-h-[44px] pl-10 pr-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-xl overflow-x-auto">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'approved', label: 'Approved' },
                  { id: 'pending', label: 'Pending Approval' },
                  { id: 'low', label: 'Low / Out' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    statusFilter === tab.id
                      ? 'bg-emerald-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product List */}
          {filteredProducts.length === 0 ? (
            <div className="bg-white border border-emerald-100 rounded-2xl p-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                <Package className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">
                {products.length === 0
                  ? 'Product inventory is empty'
                  : 'No matching products found'}
              </h2>
              <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
                {products.length === 0
                  ? 'No demo items exist. Click "Add Product" to add your first Prime Mobiles wholesale item.'
                  : 'Try clearing your search or changing the filter tab.'}
              </p>
              {products.length === 0 && (
                <button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="mt-5 min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Product
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProducts.map((product) => {
                const isOut = product.stockQuantity === 0;
                const isLow =
                  product.stockQuantity > 0 &&
                  product.stockQuantity < settings.lowStockLimit;
                const profit = product.sellingPrice - product.costPrice;
                const discountedSelling = getEffectivePrice(
                  product.sellingPrice,
                  settings.discountActive,
                  settings.discountPercent
                );

                return (
                  <div
                    key={product.id}
                    className="bg-white border border-emerald-100 rounded-2xl p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-900 truncate">
                            {product.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.category} · Added by {product.createdBy}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end shrink-0">
                          {product.approvalStatus === 'Pending Approval' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900">
                              Pending Approval
                            </span>
                          )}
                          {product.approvalStatus === 'Rejected' && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-200 text-slate-700">
                              Rejected
                            </span>
                          )}
                          {product.approvalStatus === 'Approved' && isOut && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-red-600 text-white">
                              OUT OF STOCK
                            </span>
                          )}
                          {product.approvalStatus === 'Approved' && isLow && (
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-400 text-amber-950">
                              LOW STOCK
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Pricing & Stock Metrics */}
                      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div>
                          <div className="text-[11px] font-medium text-slate-500">
                            Stock Qty
                          </div>
                          <div
                            className={`mt-0.5 text-base font-bold font-mono-num ${
                              isOut
                                ? 'text-red-600'
                                : isLow
                                  ? 'text-amber-700'
                                  : 'text-slate-900'
                            }`}
                          >
                            {product.stockQuantity}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] font-medium text-slate-500">
                            Selling Price
                          </div>
                          {settings.discountActive && settings.discountPercent > 0 ? (
                            <div className="mt-0.5">
                              <div className="text-sm font-bold font-mono-num text-emerald-700">
                                {formatCurrencyRs(discountedSelling)}
                              </div>
                              <div className="text-[11px] text-slate-400 line-through font-mono-num">
                                {formatCurrencyRs(product.sellingPrice)}
                              </div>
                            </div>
                          ) : (
                            <div className="mt-0.5 text-base font-bold font-mono-num text-slate-900">
                              {formatCurrencyRs(product.sellingPrice)}
                            </div>
                          )}
                        </div>

                        {/* Cost & Profit ONLY visible to Admin */}
                        {isAdmin && (
                          <>
                            <div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Cost Price
                              </div>
                              <div className="mt-0.5 text-sm font-semibold font-mono-num text-slate-700">
                                {formatCurrencyRs(product.costPrice)}
                              </div>
                            </div>

                            <div>
                              <div className="text-[11px] font-medium text-slate-500">
                                Profit / Unit
                              </div>
                              <div
                                className={`mt-0.5 text-sm font-bold font-mono-num ${
                                  profit >= 0 ? 'text-emerald-700' : 'text-red-600'
                                }`}
                              >
                                {formatCurrencyRs(profit)}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      {product.lastUpdatedBy && product.lastUpdatedAt && (
                        <p className="mt-3 text-[11px] text-slate-400 font-mono-num">
                          Last updated by {product.lastUpdatedBy} -{' '}
                          {formatDateTimeDisplay(product.lastUpdatedAt)}
                        </p>
                      )}
                    </div>

                    {/* Admin Controls */}
                    {isAdmin && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        {product.approvalStatus === 'Pending Approval' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleApproval(product, 'Approved')}
                              className="flex-1 min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(product)}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproval(product, 'Rejected')}
                              className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => openStockModal(product)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            Edit Stock Qty
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(product)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Price
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleOutOfStock(product)}
                            className={`min-h-[40px] px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                              product.stockQuantity > 0
                                ? 'border-amber-200 bg-amber-50/70 hover:bg-amber-100 text-amber-900'
                                : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {product.stockQuantity > 0 ? (
                              <>
                                <PackageX className="w-3.5 h-3.5" />
                                Mark Out of Stock
                              </>
                            ) : (
                              <>
                                <PackageCheck className="w-3.5 h-3.5" />
                                Mark In Stock
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ml-auto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Deliveries & Orders Section */
        <div className="bg-white border border-emerald-100 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Wholesale Deliveries &amp; Orders
              </h2>
              <p className="text-xs text-slate-500">
                Both Staff and Admin can log wholesale orders and update delivery status.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowOrderModal(true)}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              New Delivery / Order
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-center">
              <Truck className="w-8 h-8 text-emerald-700 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-900">
                No deliveries or orders logged yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Click &quot;Mark Delivery / Order&quot; to record a wholesale dispatch.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                    <th className="py-3 pr-4">Customer / Shop</th>
                    <th className="py-3 pr-4">Product</th>
                    <th className="py-3 pr-4 text-right">Qty</th>
                    <th className="py-3 pr-4 text-right">Total</th>
                    <th className="py-3 pr-4">Logged By</th>
                    <th className="py-3 pr-4">Status</th>
                    <th className="py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50/70">
                      <td className="py-3 pr-4 font-semibold text-slate-900">
                        {ord.customerName}
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{ord.productName}</td>
                      <td className="py-3 pr-4 text-right font-mono-num">
                        {ord.quantity}
                      </td>
                      <td className="py-3 pr-4 text-right font-mono-num font-semibold text-slate-900">
                        {formatCurrencyRs(ord.totalAmount)}
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{ord.markedBy}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md ${
                            ord.status === 'Delivered'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {ord.status === 'Pending' ? (
                          <button
                            type="button"
                            onClick={() => handleMarkOrderDelivered(ord.id)}
                            className="min-h-[36px] px-3 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Delivered
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 font-mono-num">
                            {formatDateTimeDisplay(ord.deliveredAt || ord.createdAt)}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add Product Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Add Product</h2>
                <p className="text-xs text-slate-500">
                  {isAdmin
                    ? 'Added as Approved immediately.'
                    : 'Submitted products appear as Pending Approval until Admin approves.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Samsung 25W Original Adapter"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Ex: Chargers & Cables"
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newCost}
                    onChange={(e) => setNewCost(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={newSelling}
                    onChange={(e) => setNewSelling(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={newStock}
                    onChange={(e) => setNewStock(e.target.value)}
                    placeholder="0"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-70"
                >
                  {savingProduct ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Product'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal (Admin Only) */}
      {editingProduct && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-slate-900">Edit Product</h2>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  required
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cost Price (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editCost}
                    onChange={(e) => setEditCost(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Selling Price (Rs)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={editSelling}
                    onChange={(e) => setEditSelling(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    required
                    value={editStock}
                    onChange={(e) => setEditStock(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-70"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Stock Quantity Modal (Admin Only) */}
      {stockModalProduct && isAdmin && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-slate-900">
                Edit Stock Quantity
              </h2>
              <button
                type="button"
                onClick={() => setStockModalProduct(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm font-semibold text-slate-800 mb-4">
              {stockModalProduct.name}
            </p>

            <form onSubmit={handleSaveStock} className="space-y-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStockInputVal((v) => Math.max(0, v - 1))}
                  className="min-h-[46px] min-w-[46px] flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  aria-label="Decrease stock"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={stockInputVal}
                  onChange={(e) => setStockInputVal(Math.max(0, Number(e.target.value)))}
                  className="flex-1 min-h-[46px] text-center rounded-xl border border-slate-200 text-lg font-bold font-mono-num focus:outline-none focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => setStockInputVal((v) => v + 1)}
                  className="min-h-[46px] min-w-[46px] flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800"
                  aria-label="Increase stock"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStockModalProduct(null)}
                  className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingStock}
                  className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-70"
                >
                  {savingStock ? 'Saving...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mark Delivery / Order Modal */}
      {showOrderModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-xs p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                Mark Delivery / Order
              </h2>
              <button
                type="button"
                onClick={() => setShowOrderModal(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {approvedProducts.length === 0 ? (
              <div className="py-6 text-center space-y-3">
                <p className="text-sm text-slate-600">
                  Add and approve at least one product before marking a delivery or order.
                </p>
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-700 text-white text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateOrder} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Customer / Retail Shop Name
                  </label>
                  <input
                    type="text"
                    required
                    value={orderCustomer}
                    onChange={(e) => setOrderCustomer(e.target.value)}
                    placeholder="Ex: City Telecom"
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-emerald-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Product
                  </label>
                  <select
                    required
                    value={orderProductId}
                    onChange={(e) => setOrderProductId(e.target.value)}
                    className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="">Choose an approved product...</option>
                    {approvedProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatCurrencyRs(p.sellingPrice)} · Stock:{' '}
                        {p.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={orderQty}
                      onChange={(e) => setOrderQty(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-mono-num focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Status
                    </label>
                    <select
                      value={orderStatus}
                      onChange={(e) =>
                        setOrderStatus(e.target.value as 'Pending' | 'Delivered')
                      }
                      className="w-full min-h-[44px] px-3.5 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowOrderModal(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingOrder}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold disabled:opacity-70"
                  >
                    {savingOrder ? 'Saving...' : 'Save Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation */}
      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Product"
        message={
          deleteTarget
            ? `Are you sure? "${deleteTarget.name}" will be permanently deleted from Firestore.`
            : ''
        }
        confirmLabel="Yes, Delete"
        loading={deleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};
