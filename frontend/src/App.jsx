
import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000'

function App() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingProductId, setEditingProductId] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sortOption, setSortOption] = useState('default')

  const [currentPage, setCurrentPage] = useState(1)
  const productsPerPage = 5

  // Stock management states
  const [stockProduct, setStockProduct] = useState(null)
  const [stockMovementType, setStockMovementType] = useState('IN')
  const [stockQuantity, setStockQuantity] = useState('')
  const [stockReason, setStockReason] = useState('')
  const [stockSubmitting, setStockSubmitting] = useState(false)

  // Stock history states
  const [historyProduct, setHistoryProduct] = useState(null)
  const [stockHistory, setStockHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const emptyForm = {
    product_name: '',
    sku: '',
    purchase_price: '',
    selling_price: '',
    quantity: '',
    description: ''
  }

  const [formData, setFormData] = useState(emptyForm)

  // Fetch products
  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/products`)

      if (!response.ok) {
        throw new Error('Failed to fetch products')
      }

      const data = await response.json()
      setProducts(data.products)
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  // Reset page when search, filter or sort changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, stockFilter, sortOption])

  const handleInputChange = (event) => {
    const { name, value } = event.target

    setFormData((previousData) => ({
      ...previousData,
      [name]: value
    }))
  }

  // Open add form
  const openAddForm = () => {
    setEditingProductId(null)
    setFormData(emptyForm)
    setShowForm(true)
  }

  // Open edit form
  const handleEditProduct = (product) => {
    setEditingProductId(product.product_id)

    setFormData({
      product_name: product.product_name,
      sku: product.sku,
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      quantity: product.quantity,
      description: product.description || ''
    })

    setShowForm(true)
  }

  // Add or update product
  const handleSubmit = async (event) => {
    event.preventDefault()

    const productData = {
      ...formData,
      purchase_price: Number(formData.purchase_price),
      selling_price: Number(formData.selling_price),
      quantity: Number(formData.quantity)
    }

    try {
      const isEditing = editingProductId !== null

      const url = isEditing
        ? `${API_URL}/products/${editingProductId}`
        : `${API_URL}/products`

      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(productData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Please check your product details'
        )
      }

      await fetchProducts()

      setFormData(emptyForm)
      setEditingProductId(null)
      setShowForm(false)

      alert(
        isEditing
          ? 'Product updated successfully!'
          : 'Product added successfully!'
      )
    } catch (err) {
      alert(err.message)
    }
  }

  // Delete product
  const handleDeleteProduct = async (productId) => {
    const confirmDelete = window.confirm(
      'Are you sure you want to delete this product?'
    )

    if (!confirmDelete) return

    try {
      const response = await fetch(
        `${API_URL}/products/${productId}`,
        { method: 'DELETE' }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to delete product')
      }

      await fetchProducts()
      alert('Product deleted successfully!')
    } catch (err) {
      alert(err.message)
    }
  }

  // Open Stock IN / OUT form
  const openStockForm = (product, movementType) => {
    setStockProduct(product)
    setStockMovementType(movementType)
    setStockQuantity('')
    setStockReason('')
  }

  // Submit Stock IN / OUT
  const handleStockSubmit = async (event) => {
    event.preventDefault()

    if (!stockProduct) return

    setStockSubmitting(true)

    try {
      const response = await fetch(
        `${API_URL}/products/${stockProduct.product_id}/stock`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            movement_type: stockMovementType,
            quantity: Number(stockQuantity),
            reason: stockReason
          })
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Stock update failed'
        )
      }

      await fetchProducts()

      alert(
        `Stock ${stockMovementType} successful! New quantity: ${data.updated_product.quantity}`
      )

      setStockProduct(null)
      setStockQuantity('')
      setStockReason('')
    } catch (err) {
      alert(err.message)
    } finally {
      setStockSubmitting(false)
    }
  }

  // Fetch stock history
  const handleViewHistory = async (product) => {
    setHistoryProduct(product)
    setStockHistory([])
    setHistoryLoading(true)

    try {
      const response = await fetch(
        `${API_URL}/products/${product.product_id}/stock-history`
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          typeof data.detail === 'string'
            ? data.detail
            : 'Failed to fetch stock history'
        )
      }

      setStockHistory(data.stock_history || [])
    } catch (err) {
      alert(err.message)
      setHistoryProduct(null)
    } finally {
      setHistoryLoading(false)
    }
  }

  // Search, filter and sort
  const filteredProducts = products
    .filter((product) => {
      const search = searchTerm.toLowerCase()

      return (
        product.product_name.toLowerCase().includes(search) ||
        product.sku.toLowerCase().includes(search)
      )
    })
    .filter((product) => {
      if (stockFilter === 'low') {
        return product.quantity <= 5
      }

      if (stockFilter === 'inStock') {
        return product.quantity > 5
      }

      return true
    })
    .sort((a, b) => {
      if (sortOption === 'priceLow') {
        return a.selling_price - b.selling_price
      }

      if (sortOption === 'priceHigh') {
        return b.selling_price - a.selling_price
      }

      if (sortOption === 'quantity') {
        return a.quantity - b.quantity
      }

      return 0
    })

  // Pagination
  const totalProducts = products.length
  const totalPages = Math.ceil(
    filteredProducts.length / productsPerPage
  )

  const startIndex = (currentPage - 1) * productsPerPage
  const endIndex = startIndex + productsPerPage

  const currentProducts = filteredProducts.slice(
    startIndex,
    endIndex
  )

  // Dashboard calculations
  const totalStock = products.reduce(
    (total, product) => total + product.quantity,
    0
  )

  const lowStockProducts = products.filter(
    (product) => product.quantity <= 5
  )

  const lowStock = lowStockProducts.length

  return (
    <div className="app-container">

      <aside className="sidebar">
        <h2>IMS</h2>
        <p className="brand-name">Inventory System</p>

        <nav>
          <a href="#" className="active">Dashboard</a>
          <a href="#products">Products</a>
          <a href="#products">Orders</a>
          <a href="#products">Suppliers</a>
          <a href="#products">Reports</a>
          <a href="#products">Settings</a>
        </nav>
      </aside>

      <main className="main-content">

        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Welcome to Inventory Management System</p>
          </div>

          <div className="profile">Admin</div>
        </header>

        {error && <p className="error-message">{error}</p>}

        {/* Dashboard Cards */}
        <section className="stats-container">

          <div className="stat-card">
            <h3>Total Products</h3>
            <h2>{loading ? '...' : totalProducts}</h2>
            <p>Products available</p>
          </div>

          <div className="stat-card">
            <h3>Total Stock</h3>
            <h2>{loading ? '...' : totalStock}</h2>
            <p>Units in inventory</p>
          </div>

          <div className="stat-card">
            <h3>Low Stock</h3>
            <h2>{loading ? '...' : lowStock}</h2>
            <p>Products need attention</p>
          </div>

          <div className="stat-card">
            <h3>Total Orders</h3>
            <h2>0</h2>
            <p>Orders received</p>
          </div>

        </section>

        {/* Low Stock Alerts */}
        <section
          style={{
            background: '#ffffff',
            padding: '22px',
            marginTop: '25px',
            marginBottom: '25px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          <h2 style={{ marginBottom: '15px' }}>
            Low Stock Alerts
          </h2>

          {loading ? (
            <p>Loading alerts...</p>
          ) : lowStockProducts.length === 0 ? (
            <p style={{ color: 'green' }}>
              All products have sufficient stock!
            </p>
          ) : (
            <div>
              <p style={{ marginBottom: '15px', color: '#dc2626' }}>
                {lowStockProducts.length} product(s) need attention.
              </p>

              {lowStockProducts.map((product) => (
                <div
                  key={product.product_id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '10px',
                    background: '#fff7ed',
                    border: '1px solid #fed7aa',
                    borderRadius: '6px'
                  }}
                >
                  <div>
                    <strong>{product.product_name}</strong>
                    <p style={{ fontSize: '13px', color: '#64748b' }}>
                      SKU: {product.sku}
                    </p>
                  </div>

                  <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                    Only {product.quantity} left
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Products Section */}
        <section className="products-section" id="products">

          <div className="section-header">
            <h2>Recent Products</h2>

            <button className="add-button" onClick={openAddForm}>
              + Add Product
            </button>
          </div>

          {/* Product Form */}
          {showForm && (
            <form className="product-form" onSubmit={handleSubmit}>

              <h3 className="form-title">
                {editingProductId !== null
                  ? 'Edit Product'
                  : 'Add New Product'}
              </h3>

              <div className="form-group">
                <label>Product Name</label>
                <input
                  type="text"
                  name="product_name"
                  value={formData.product_name}
                  onChange={handleInputChange}
                  minLength="2"
                  maxLength="100"
                  required
                />
              </div>

              <div className="form-group">
                <label>SKU</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  minLength="3"
                  maxLength="30"
                  required
                />
              </div>

              <div className="form-group">
                <label>Purchase Price</label>
                <input
                  type="number"
                  name="purchase_price"
                  value={formData.purchase_price}
                  onChange={handleInputChange}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Selling Price</label>
                <input
                  type="number"
                  name="selling_price"
                  value={formData.selling_price}
                  onChange={handleInputChange}
                  min="0.01"
                  step="0.01"
                  required
                />
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleInputChange}
                  min="0"
                  disabled={editingProductId !== null}
                  required
                />

                {editingProductId !== null && (
                  <small>
                    Use Stock IN / OUT to change inventory quantity.
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  maxLength="255"
                />
              </div>

              <button type="submit" className="submit-button">
                {editingProductId !== null
                  ? 'Update Product'
                  : 'Save Product'}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() => {
                  setShowForm(false)
                  setEditingProductId(null)
                  setFormData(emptyForm)
                }}
              >
                Cancel
              </button>

            </form>
          )}

          {/* Stock IN / OUT Form */}
          {stockProduct && (
            <form
              onSubmit={handleStockSubmit}
              style={{
                background: '#f8fafc',
                padding: '20px',
                marginTop: '20px',
                marginBottom: '20px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px'
              }}
            >
              <h3 style={{ marginBottom: '12px' }}>
                Stock {stockMovementType}
              </h3>

              <p style={{ marginBottom: '12px' }}>
                Product: <strong>{stockProduct.product_name}</strong>
              </p>

              <p style={{ marginBottom: '15px' }}>
                Current Stock: <strong>{stockProduct.quantity}</strong>
              </p>

              <div className="form-group">
                <label>Movement Type</label>
                <select
                  value={stockMovementType}
                  onChange={(event) =>
                    setStockMovementType(event.target.value)
                  }
                >
                  <option value="IN">Stock IN</option>
                  <option value="OUT">Stock OUT</option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={stockQuantity}
                  onChange={(event) =>
                    setStockQuantity(event.target.value)
                  }
                  placeholder="Enter quantity"
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason</label>
                <input
                  type="text"
                  minLength="3"
                  maxLength="255"
                  value={stockReason}
                  onChange={(event) =>
                    setStockReason(event.target.value)
                  }
                  placeholder="Enter reason"
                  required
                />
              </div>

              <button
                type="submit"
                className="submit-button"
                disabled={stockSubmitting}
              >
                {stockSubmitting ? 'Processing...' : 'Update Stock'}
              </button>

              <button
                type="button"
                className="cancel-button"
                onClick={() => setStockProduct(null)}
                disabled={stockSubmitting}
              >
                Cancel
              </button>
            </form>
          )}

          {/* Stock History */}
          {historyProduct && (
            <section
              style={{
                background: '#ffffff',
                padding: '20px',
                marginTop: '20px',
                marginBottom: '20px',
                border: '1px solid #cbd5e1',
                borderRadius: '10px',
                overflowX: 'auto'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '15px'
                }}
              >
                <h3>
                  Stock History - {historyProduct.product_name}
                </h3>

                <button
                  className="cancel-button"
                  onClick={() => {
                    setHistoryProduct(null)
                    setStockHistory([])
                  }}
                >
                  Close
                </button>
              </div>

              {historyLoading ? (
                <p>Loading stock history...</p>
              ) : stockHistory.length === 0 ? (
                <p>No stock movements found.</p>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>Movement ID</th>
                      <th>Type</th>
                      <th>Quantity</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {stockHistory.map((movement) => (
                      <tr key={movement.movement_id}>
                        <td>{movement.movement_id}</td>

                        <td>
                          <span
                            style={{
                              color:
                                movement.movement_type === 'IN'
                                  ? 'green'
                                  : '#dc2626',
                              fontWeight: 'bold'
                            }}
                          >
                            {movement.movement_type}
                          </span>
                        </td>

                        <td>{movement.quantity}</td>
                        <td>{movement.reason}</td>

                        <td>
                          {new Date(movement.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          )}

          {/* Search, Filter and Sort */}
          <div className="product-controls">

            <input
              type="text"
              className="search-input"
              placeholder="Search by product name or SKU..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />

            <select
              value={stockFilter}
              onChange={(event) => setStockFilter(event.target.value)}
            >
              <option value="all">All Products</option>
              <option value="inStock">In Stock</option>
              <option value="low">Low Stock</option>
            </select>

            <select
              value={sortOption}
              onChange={(event) => setSortOption(event.target.value)}
            >
              <option value="default">Default Order</option>
              <option value="priceLow">Price: Low to High</option>
              <option value="priceHigh">Price: High to Low</option>
              <option value="quantity">Quantity: Low to High</option>
            </select>

          </div>

          <p className="result-count">
            Showing {filteredProducts.length === 0 ? 0 : startIndex + 1}
            {' - '}
            {Math.min(endIndex, filteredProducts.length)}
            {' of '}
            {filteredProducts.length} matching products
          </p>

          {loading ? (
            <p>Loading products...</p>
          ) : (
            <>
              <table>
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Stock Management</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {currentProducts.map((product) => (
                    <tr key={product.product_id}>
                      <td>{product.product_name}</td>
                      <td>{product.sku}</td>
                      <td>₹{product.selling_price}</td>
                      <td>{product.quantity}</td>

                      <td>
                        <span
                          className={
                            product.quantity <= 5
                              ? 'low-stock'
                              : 'in-stock'
                          }
                        >
                          {product.quantity <= 5
                            ? 'Low Stock'
                            : 'In Stock'}
                        </span>
                      </td>

                      <td>
                        <button
                          style={{
                            background: '#16a34a',
                            color: 'white',
                            padding: '7px 10px',
                            border: 'none',
                            borderRadius: '5px',
                            margin: '3px',
                            cursor: 'pointer'
                          }}
                          onClick={() => openStockForm(product, 'IN')}
                        >
                          Stock IN
                        </button>

                        <button
                          style={{
                            background: '#dc2626',
                            color: 'white',
                            padding: '7px 10px',
                            border: 'none',
                            borderRadius: '5px',
                            margin: '3px',
                            cursor: 'pointer'
                          }}
                          onClick={() => openStockForm(product, 'OUT')}
                        >
                          Stock OUT
                        </button>

                        <button
                          style={{
                            background: '#2563eb',
                            color: 'white',
                            padding: '7px 10px',
                            border: 'none',
                            borderRadius: '5px',
                            margin: '3px',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleViewHistory(product)}
                        >
                          History
                        </button>
                      </td>

                      <td>
                        <button
                          className="edit-button"
                          onClick={() => handleEditProduct(product)}
                        >
                          Edit
                        </button>

                        <button
                          className="delete-button"
                          onClick={() =>
                            handleDeleteProduct(product.product_id)
                          }
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}

                  {currentProducts.length === 0 && (
                    <tr>
                      <td colSpan="7">No matching products found</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Pagination */}
              {filteredProducts.length > 0 && (
                <div className="pagination">

                  <button
                    onClick={() => setCurrentPage((page) => page - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>

                  <span>
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage((page) => page + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </button>

                </div>
              )}
            </>
          )}

        </section>

      </main>
    </div>
  )
}

export default App
