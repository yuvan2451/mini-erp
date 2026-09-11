import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

type Product = {
  id: number;
  product_name: string;
  sku: string;
  category: string;
  unit_price: string | number;
  current_stock: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
};

type ProductForm = {
  productName: string;
  sku: string;
  category: string;
  unitPrice: string;
  initialStock: string;
  minimumStockQuantity: string;
  warehouseLocation: string;
};

const emptyForm: ProductForm = {
  productName: "",
  sku: "",
  category: "",
  unitPrice: "",
  initialStock: "0",
  minimumStockQuantity: "0",
  warehouseLocation: "",
};

export default function Products() {
  const { user } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);

  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canManage =
    user?.role === "ADMIN" || user?.role === "WAREHOUSE";

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/products?page=1&limit=100&search=${encodeURIComponent(
          search
        )}`
      );

      setProducts(data.products || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load products"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, [search]);

  function updateField(
    field: keyof ProductForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function openAddModal() {
    setError("");
    setEditingProduct(null);
    setForm(emptyForm);
    setShowModal(true);
  }

  function openEditModal(product: Product) {
    setError("");
    setEditingProduct(product);

    setForm({
      productName: product.product_name,
      sku: product.sku,
      category: product.category,
      unitPrice: String(product.unit_price),
      initialStock: String(product.current_stock),
      minimumStockQuantity: String(
        product.minimum_stock_quantity
      ),
      warehouseLocation: product.warehouse_location,
    });

    setShowModal(true);
  }

  async function handleSaveProduct(
    event: FormEvent
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    try {
      setSaving(true);
      setError("");

      if (editingProduct) {
        await apiRequest(
          `/products/${editingProduct.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              productName: form.productName.trim(),
              category: form.category.trim(),
              unitPrice: Number(form.unitPrice),
              minimumStockQuantity: Number(
                form.minimumStockQuantity
              ),
              warehouseLocation:
                form.warehouseLocation.trim(),
            }),
          }
        );
      } else {
        await apiRequest("/products", {
          method: "POST",
          body: JSON.stringify({
            productName: form.productName.trim(),
            sku: form.sku.trim(),
            category: form.category.trim(),
            unitPrice: Number(form.unitPrice),
            initialStock: Number(form.initialStock),
            minimumStockQuantity: Number(
              form.minimumStockQuantity
            ),
            warehouseLocation:
              form.warehouseLocation.trim(),
          }),
        });
      }

      setForm(emptyForm);
      setEditingProduct(null);
      setShowModal(false);

      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingProduct
          ? "Failed to update product"
          : "Failed to create product"
      );
    } finally {
      setSaving(false);
    }
  }

  function getStockStatus(product: Product) {
    if (product.current_stock === 0) {
      return "Out of Stock";
    }

    if (
      product.current_stock <=
      product.minimum_stock_quantity
    ) {
      return "Low Stock";
    }

    return "In Stock";
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage products and inventory.</p>
        </div>

        {canManage && (
          <button
            className="primary-button"
            onClick={openAddModal}
          >
            + Add Product
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by product name or SKU..."
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
        />
      </div>

      <div className="table-container">
        {loading ? (
          <p className="loading-text">
            Loading products...
          </p>
        ) : products.length === 0 ? (
          <p className="empty-text">
            No products found.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Category</th>
                <th>Unit Price</th>
                <th>Stock</th>
                <th>Minimum</th>
                <th>Warehouse</th>
                <th>Status</th>
                {canManage && <th>Actions</th>}
              </tr>
            </thead>

            <tbody>
              {products.map((product) => {
                const status =
                  getStockStatus(product);

                return (
                  <tr key={product.id}>
                    <td>
                      {product.product_name}
                    </td>

                    <td>{product.sku}</td>

                    <td>{product.category}</td>

                    <td>
                      ₹
                      {Number(
                        product.unit_price
                      ).toFixed(2)}
                    </td>

                    <td>
                      {product.current_stock}
                    </td>

                    <td>
                      {
                        product.minimum_stock_quantity
                      }
                    </td>

                    <td>
                      {
                        product.warehouse_location
                      }
                    </td>

                    <td>
                      <span
                        className={`stock-status ${status
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >
                        {status}
                      </span>
                    </td>

                    {canManage && (
                      <td>
                        <button
                          className="secondary-button small-button"
                          onClick={() =>
                            openEditModal(product)
                          }
                        >
                          Edit
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!saving) {
              setShowModal(false);
            }
          }}
        >
          <div
            className="modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <h2>
                {editingProduct
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              <button
                className="close-button"
                onClick={() => {
                  if (!saving) {
                    setShowModal(false);
                  }
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div className="form-group">
                <label>Product Name</label>

                <input
                  type="text"
                  value={form.productName}
                  onChange={(event) =>
                    updateField(
                      "productName",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>SKU</label>

                  <input
                    type="text"
                    value={form.sku}
                    onChange={(event) =>
                      updateField(
                        "sku",
                        event.target.value
                      )
                    }
                    disabled={!!editingProduct}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Category</label>

                  <input
                    type="text"
                    value={form.category}
                    onChange={(event) =>
                      updateField(
                        "category",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unit Price</label>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitPrice}
                    onChange={(event) =>
                      updateField(
                        "unitPrice",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    {editingProduct
                      ? "Current Stock"
                      : "Initial Stock"}
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={form.initialStock}
                    onChange={(event) =>
                      updateField(
                        "initialStock",
                        event.target.value
                      )
                    }
                    disabled={!!editingProduct}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Minimum Stock</label>

                  <input
                    type="number"
                    min="0"
                    value={
                      form.minimumStockQuantity
                    }
                    onChange={(event) =>
                      updateField(
                        "minimumStockQuantity",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>
                    Warehouse Location
                  </label>

                  <input
                    type="text"
                    value={
                      form.warehouseLocation
                    }
                    onChange={(event) =>
                      updateField(
                        "warehouseLocation",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Rack A-12"
                    required
                  />
                </div>
              </div>

              {editingProduct && (
                <p
                  style={{
                    fontSize: "13px",
                    color: "#666",
                    marginTop: "8px",
                  }}
                >
                  Current stock can only be changed
                  through Stock IN / OUT.
                </p>
              )}

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Save Changes"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}