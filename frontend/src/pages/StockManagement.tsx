import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../services/api";

type Product = {
  id: number;
  product_name: string;
  sku: string;
  current_stock: number;
  minimum_stock_quantity: number;
  warehouse_location: string;
};

type StockMovement = {
  id: number;
  product_id: number;
  quantity: number;
  movement_type: "IN" | "OUT";
  reason: string;
  created_by: number;
  created_at: string;
  created_by_name?: string;
};

type StockForm = {
  movementType: "IN" | "OUT";
  quantity: string;
  reason: string;
};

const emptyForm: StockForm = {
  movementType: "IN",
  quantity: "",
  reason: "",
};

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null);
  const [movements, setMovements] = useState<StockMovement[]>([]);

  const [form, setForm] = useState<StockForm>(emptyForm);

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMovements, setLoadingMovements] = useState(false);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  async function loadProducts() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/products?page=1&limit=100&search=${encodeURIComponent(search)}`
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

  async function loadMovements(product: Product) {
    try {
      setSelectedProduct(product);
      setLoadingMovements(true);
      setError("");

      const data = await apiRequest(
        `/products/${product.id}/stock`
      );

      setMovements(data.movements || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load stock movements"
      );
    } finally {
      setLoadingMovements(false);
    }
  }

  function openStockModal(product: Product) {
    setSelectedProduct(product);
    setForm(emptyForm);
    setError("");
    setShowModal(true);
  }

  async function handleStockMovement(event: FormEvent) {
    event.preventDefault();

    if (!selectedProduct || saving) {
      return;
    }

    const quantity = Number(form.quantity);

    if (!quantity || quantity <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiRequest(
        `/products/${selectedProduct.id}/stock`,
        {
          method: "POST",
          body: JSON.stringify({
            quantity,
            movementType: form.movementType,
            reason: form.reason,
          }),
        }
      );

      setForm(emptyForm);
      setShowModal(false);

      await loadProducts();

      const updatedProduct = products.find(
        (product) => product.id === selectedProduct.id
      );

      if (updatedProduct) {
        await loadMovements(updatedProduct);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update stock"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Stock Management</h1>
          <p>Manage inventory movements and stock levels.</p>
        </div>
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
          onChange={(event) => setSearch(event.target.value)}
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
                <th>Current Stock</th>
                <th>Minimum Stock</th>
                <th>Warehouse</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>{product.product_name}</td>
                  <td>{product.sku}</td>
                  <td>
                    <strong>{product.current_stock}</strong>
                  </td>
                  <td>
                    {product.minimum_stock_quantity}
                  </td>
                  <td>
                    {product.warehouse_location}
                  </td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() =>
                        openStockModal(product)
                      }
                    >
                      Stock IN / OUT
                    </button>

                    <button
                      className="secondary-button"
                      style={{ marginLeft: "8px" }}
                      onClick={() =>
                        loadMovements(product)
                      }
                    >
                      History
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {selectedProduct && !showModal && (
        <div className="table-container" style={{ marginTop: "24px" }}>
          <div className="page-header">
            <div>
              <h2>
                Stock History —{" "}
                {selectedProduct.product_name}
              </h2>
              <p>
                Current stock:{" "}
                <strong>
                  {selectedProduct.current_stock}
                </strong>
              </p>
            </div>
          </div>

          {loadingMovements ? (
            <p className="loading-text">
              Loading stock history...
            </p>
          ) : movements.length === 0 ? (
            <p className="empty-text">
              No stock movements found.
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Reason</th>
                  <th>Created By</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <span
                        className={`stock-status ${
                          movement.movement_type === "IN"
                            ? "in-stock"
                            : "out-stock"
                        }`}
                      >
                        {movement.movement_type}
                      </span>
                    </td>

                    <td>{movement.quantity}</td>

                    <td>{movement.reason}</td>

                    <td>
                      {movement.created_by_name ||
                        movement.created_by}
                    </td>

                    <td>
                      {new Date(
                        movement.created_at
                      ).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showModal && selectedProduct && (
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
              <div>
                <h2>Update Stock</h2>
                <p>
                  {selectedProduct.product_name} (
                  {selectedProduct.sku})
                </p>
              </div>

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

            <div
              style={{
                marginBottom: "20px",
                padding: "12px",
                background: "#f5f5f5",
                borderRadius: "6px",
              }}
            >
              Current stock:{" "}
              <strong>
                {selectedProduct.current_stock}
              </strong>
            </div>

            <form onSubmit={handleStockMovement}>
              <div className="form-group">
                <label>Movement Type</label>

                <select
                  value={form.movementType}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      movementType:
                        event.target.value as "IN" | "OUT",
                    })
                  }
                >
                  <option value="IN">
                    Stock IN
                  </option>
                  <option value="OUT">
                    Stock OUT
                  </option>
                </select>
              </div>

              <div className="form-group">
                <label>Quantity</label>

                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      quantity: event.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Reason</label>

                <input
                  type="text"
                  placeholder="e.g. New purchase"
                  value={form.reason}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      reason: event.target.value,
                    })
                  }
                  required
                />
              </div>

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
                    ? "Updating..."
                    : "Update Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}