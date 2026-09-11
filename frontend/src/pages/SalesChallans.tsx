import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

type Customer = {
  id: number;
  customer_name: string;
  mobile: string;
  business_name?: string;
};

type Product = {
  id: number;
  product_name: string;
  sku: string;
  unit_price: string | number;
  current_stock: number;
};

type ChallanItem = {
  productId: number;
  quantity: number;
};

type Challan = {
  id: number;
  challan_number: string;
  customer_id: number;
  customer_name?: string;
  total_quantity: number;
  status: "DRAFT" | "CONFIRMED" | "CANCELLED";
  created_by: number;
  created_at: string;
};

const emptyItem: ChallanItem = {
  productId: 0,
  quantity: 1,
};

export default function SalesChallans() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);

  const [selectedCustomer, setSelectedCustomer] =
    useState("");

  const [items, setItems] = useState<ChallanItem[]>([
    { ...emptyItem },
  ]);

  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const canCreate =
    user?.role === "ADMIN" || user?.role === "SALES";

  async function loadData() {
    try {
      setLoading(true);
      setError("");

      const [customerData, productData, challanData] =
        await Promise.all([
          apiRequest("/customers?page=1&limit=100"),
          apiRequest("/products?page=1&limit=100"),
          apiRequest("/challans?page=1&limit=100"),
        ]);

      setCustomers(customerData.customers || []);
      setProducts(productData.products || []);
      setChallans(challanData.challans || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load challans"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function addItem() {
    setItems((previous) => [
      ...previous,
      { ...emptyItem },
    ]);
  }

  function removeItem(index: number) {
    setItems((previous) =>
      previous.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function updateItem(
    index: number,
    field: keyof ChallanItem,
    value: number
  ) {
    setItems((previous) =>
      previous.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  }

  function getProduct(productId: number) {
    return products.find(
      (product) => product.id === productId
    );
  }

  function getTotalQuantity() {
    return items.reduce(
      (total, item) => total + Number(item.quantity || 0),
      0
    );
  }

  function getTotalValue() {
    return items.reduce((total, item) => {
      const product = getProduct(item.productId);

      if (!product) {
        return total;
      }

      return (
        total +
        Number(product.unit_price) *
          Number(item.quantity || 0)
      );
    }, 0);
  }

  async function handleCreateChallan(event: FormEvent) {
    event.preventDefault();

    if (saving) {
      return;
    }

    if (!selectedCustomer) {
      setError("Please select a customer");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.productId > 0 &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setError("Please add at least one product");
      return;
    }

    const productIds = validItems.map(
      (item) => item.productId
    );

    if (new Set(productIds).size !== productIds.length) {
      setError("The same product cannot be added twice");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await apiRequest("/challans", {
        method: "POST",
        body: JSON.stringify({
          customerId: Number(selectedCustomer),
          items: validItems.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
          })),
        }),
      });

      setSelectedCustomer("");
      setItems([{ ...emptyItem }]);
      setShowModal(false);

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create challan"
      );
    } finally {
      setSaving(false);
    }
  }

  async function confirmChallan(id: number) {
    if (!window.confirm("Confirm this challan? Stock will be reduced.")) {
      return;
    }

    try {
      setError("");

      await apiRequest(`/challans/${id}/confirm`, {
        method: "POST",
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to confirm challan"
      );
    }
  }

  async function cancelChallan(id: number) {
    if (!window.confirm("Cancel this challan?")) {
      return;
    }

    try {
      setError("");

      await apiRequest(`/challans/${id}/cancel`, {
        method: "POST",
      });

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to cancel challan"
      );
    }
  }

  function getStatusClass(status: string) {
    return `challan-status ${status.toLowerCase()}`;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Sales Challans</h1>
          <p>Create and manage sales challans.</p>
        </div>

        {canCreate && (
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setSelectedCustomer("");
              setItems([{ ...emptyItem }]);
              setShowModal(true);
            }}
          >
            + Create Challan
          </button>
        )}
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      <div className="table-container">
        {loading ? (
          <p className="loading-text">
            Loading challans...
          </p>
        ) : challans.length === 0 ? (
          <p className="empty-text">
            No challans found.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Challan Number</th>
                <th>Customer</th>
                <th>Total Quantity</th>
                <th>Status</th>
                <th>Created Date</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {challans.map((challan) => (
                <tr key={challan.id}>
                  <td>
                    <strong>
                      {challan.challan_number}
                    </strong>
                  </td>

                  <td>
                    {challan.customer_name ||
                      `Customer #${challan.customer_id}`}
                  </td>

                  <td>
                    {challan.total_quantity}
                  </td>

                  <td>
                    <span
                      className={getStatusClass(
                        challan.status
                      )}
                    >
                      {challan.status}
                    </span>
                  </td>

                  <td>
                    {new Date(
                      challan.created_at
                    ).toLocaleString()}
                  </td>

                  <td>
                    {challan.status === "DRAFT" &&
                      (user?.role === "ADMIN" ||
                        user?.role === "SALES" ||
                        user?.role === "WAREHOUSE") && (
                        <>
                          <button
                            className="primary-button small-button"
                            onClick={() =>
                              confirmChallan(challan.id)
                            }
                          >
                            Confirm
                          </button>

                          <button
                            className="secondary-button small-button"
                            style={{ marginLeft: "8px" }}
                            onClick={() =>
                              cancelChallan(challan.id)
                            }
                          >
                            Cancel
                          </button>
                        </>
                      )}

                    {challan.status === "CONFIRMED" &&
                      (user?.role === "ADMIN" ||
                        user?.role === "SALES" ||
                        user?.role === "WAREHOUSE") && (
                        <button
                          className="secondary-button small-button"
                          onClick={() =>
                            cancelChallan(challan.id)
                          }
                        >
                          Cancel
                        </button>
                      )}
                  </td>
                </tr>
              ))}
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
            className="modal challan-modal"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="modal-header">
              <div>
                <h2>Create Sales Challan</h2>
                <p>
                  Create a draft challan before confirming
                  stock movement.
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

            <form onSubmit={handleCreateChallan}>
              <div className="form-group">
                <label>Customer</label>

                <select
                  value={selectedCustomer}
                  onChange={(event) =>
                    setSelectedCustomer(
                      event.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Select customer
                  </option>

                  {customers.map((customer) => (
                    <option
                      key={customer.id}
                      value={customer.id}
                    >
                      {customer.customer_name}
                      {customer.business_name
                        ? ` - ${customer.business_name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="challan-items-header">
                <h3>Products</h3>

                <button
                  type="button"
                  className="secondary-button"
                  onClick={addItem}
                >
                  + Add Product
                </button>
              </div>

              <div className="challan-items">
                {items.map((item, index) => {
                  const product = getProduct(
                    item.productId
                  );

                  return (
                    <div
                      className="challan-item"
                      key={index}
                    >
                      <div className="form-group">
                        <label>Product</label>

                        <select
                          value={item.productId}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "productId",
                              Number(event.target.value)
                            )
                          }
                          required
                        >
                          <option value={0}>
                            Select product
                          </option>

                          {products.map((productOption) => (
                            <option
                              key={productOption.id}
                              value={productOption.id}
                            >
                              {productOption.product_name} (
                              {productOption.sku}) — Stock:{" "}
                              {productOption.current_stock}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Quantity</label>

                        <input
                          type="number"
                          min="1"
                          max={
                            product
                              ? product.current_stock
                              : undefined
                          }
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(
                              index,
                              "quantity",
                              Number(event.target.value)
                            )
                          }
                          required
                        />
                      </div>

                      {items.length > 1 && (
                        <button
                          type="button"
                          className="remove-button"
                          onClick={() =>
                            removeItem(index)
                          }
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="challan-summary">
                <div>
                  <span>Total Quantity</span>
                  <strong>
                    {getTotalQuantity()}
                  </strong>
                </div>

                <div>
                  <span>Total Value</span>
                  <strong>
                    ₹{getTotalValue().toFixed(2)}
                  </strong>
                </div>
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
                    ? "Creating..."
                    : "Create Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}