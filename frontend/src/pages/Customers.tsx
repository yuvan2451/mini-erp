import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

type Customer = {
  id: number;
  customer_name: string;
  mobile: string;
  email?: string;
  business_name?: string;
  gst_number?: string;
  customer_type: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  address: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  follow_up_date?: string;
  created_at: string;
};

type CustomerForm = {
  customerName: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: "RETAIL" | "WHOLESALE" | "DISTRIBUTOR";
  address: string;
  status: "LEAD" | "ACTIVE" | "INACTIVE";
  followUpDate: string;
};

const emptyForm: CustomerForm = {
  customerName: "",
  mobile: "",
  email: "",
  businessName: "",
  gstNumber: "",
  customerType: "RETAIL",
  address: "",
  status: "LEAD",
  followUpDate: "",
};

export default function Customers() {
  const { user } = useAuth();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [form, setForm] = useState<CustomerForm>(emptyForm);

  const [showModal, setShowModal] = useState(false);

  const [followUpCustomer, setFollowUpCustomer] =
    useState<Customer | null>(null);

  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const [error, setError] = useState("");

  const canCreate =
    user?.role === "ADMIN" || user?.role === "SALES";

  async function loadCustomers() {
    try {
      setLoading(true);
      setError("");

      const data = await apiRequest(
        `/customers?page=${page}&limit=10&search=${encodeURIComponent(
          search
        )}`
      );

      setCustomers(data.customers || []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load customers"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCustomers();
  }, [page, search]);

  function updateField(
    field: keyof CustomerForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function handleCreateCustomer(
    event: FormEvent
  ) {
    event.preventDefault();

    if (creating) {
      return;
    }

    try {
      setCreating(true);
      setError("");

      await apiRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
          customerName: form.customerName.trim(),
          mobile: form.mobile.trim(),
          email: form.email.trim() || undefined,
          businessName:
            form.businessName.trim() || undefined,
          gstNumber:
            form.gstNumber.trim() || undefined,
          customerType: form.customerType,
          address: form.address.trim(),
          status: form.status,
          followUpDate:
            form.followUpDate || undefined,
        }),
      });

      setForm(emptyForm);
      setShowModal(false);

      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create customer"
      );
    } finally {
      setCreating(false);
    }
  }

  function openFollowUp(customer: Customer) {
    setError("");
    setFollowUpCustomer(customer);
    setFollowUpDate(
      customer.follow_up_date
        ? customer.follow_up_date.substring(0, 10)
        : ""
    );
    setFollowUpNote("");
  }

  async function handleAddFollowUp() {
    if (!followUpCustomer) {
      return;
    }

    if (!followUpDate) {
      setError("Please select a follow-up date");
      return;
    }

    if (!followUpNote.trim()) {
      setError("Please enter a follow-up note");
      return;
    }

    if (savingFollowUp) {
      return;
    }

    try {
      setSavingFollowUp(true);
      setError("");

      await apiRequest(
        `/customers/${followUpCustomer.id}/follow-ups`,
        {
          method: "POST",
          body: JSON.stringify({
            followUpDate,
            note: followUpNote.trim(),
          }),
        }
      );

      setFollowUpCustomer(null);
      setFollowUpDate("");
      setFollowUpNote("");

      await loadCustomers();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add follow-up"
      );
    } finally {
      setSavingFollowUp(false);
    }
  }

  function getStatusClass(status: string) {
    return `customer-status ${status.toLowerCase()}`;
  }

  return (
    <div className="page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1>Customers</h1>
          <p>
            Manage customers and CRM follow-ups.
          </p>
        </div>

        {canCreate && (
          <button
            className="primary-button"
            onClick={() => {
              setError("");
              setForm(emptyForm);
              setShowModal(true);
            }}
          >
            + Add Customer
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="toolbar">
        <input
          type="text"
          placeholder="Search by name, mobile or business..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {/* Customer Table */}
      <div className="table-container">
        {loading ? (
          <p className="loading-text">
            Loading customers...
          </p>
        ) : customers.length === 0 ? (
          <p className="empty-text">
            No customers found.
          </p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Mobile</th>
                <th>Business</th>
                <th>Type</th>
                <th>Status</th>
                <th>Follow-up</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id}>
                  <td>
                    <strong>
                      {customer.customer_name}
                    </strong>
                  </td>

                  <td>{customer.mobile}</td>

                  <td>
                    {customer.business_name || "-"}
                  </td>

                  <td>
                    {customer.customer_type}
                  </td>

                  <td>
                    <span
                      className={getStatusClass(
                        customer.status
                      )}
                    >
                      {customer.status}
                    </span>
                  </td>

                  <td>
                    {customer.follow_up_date
                      ? new Date(
                          customer.follow_up_date
                        ).toLocaleDateString()
                      : "-"}
                  </td>

                  <td>
                    {(user?.role === "ADMIN" ||
                      user?.role === "SALES") && (
                      <button
                        className="secondary-button small-button"
                        onClick={() =>
                          openFollowUp(customer)
                        }
                      >
                        Add Follow-up
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "12px",
          marginTop: "20px",
        }}
      >
        <button
          className="secondary-button"
          disabled={page === 1 || loading}
          onClick={() =>
            setPage((previous) =>
              Math.max(1, previous - 1)
            )
          }
        >
          Previous
        </button>

        <span>
          Page {page}
        </span>

        <button
          className="secondary-button"
          disabled={
            customers.length < 10 || loading
          }
          onClick={() =>
            setPage((previous) => previous + 1)
          }
        >
          Next
        </button>
      </div>

      {/* Add Customer Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!creating) {
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
              <h2>Add Customer</h2>

              <button
                className="close-button"
                onClick={() => {
                  if (!creating) {
                    setShowModal(false);
                  }
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateCustomer}>
              <div className="form-group">
                <label>Customer Name</label>
                <input
                  type="text"
                  value={form.customerName}
                  onChange={(event) =>
                    updateField(
                      "customerName",
                      event.target.value
                    )
                  }
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Mobile</label>
                  <input
                    type="text"
                    value={form.mobile}
                    onChange={(event) =>
                      updateField(
                        "mobile",
                        event.target.value
                      )
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      updateField(
                        "email",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Business Name</label>
                  <input
                    type="text"
                    value={form.businessName}
                    onChange={(event) =>
                      updateField(
                        "businessName",
                        event.target.value
                      )
                    }
                  />
                </div>

                <div className="form-group">
                  <label>GST Number</label>
                  <input
                    type="text"
                    value={form.gstNumber}
                    onChange={(event) =>
                      updateField(
                        "gstNumber",
                        event.target.value
                      )
                    }
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Customer Type</label>

                  <select
                    value={form.customerType}
                    onChange={(event) =>
                      updateField(
                        "customerType",
                        event.target.value
                      )
                    }
                  >
                    <option value="RETAIL">
                      Retail
                    </option>
                    <option value="WHOLESALE">
                      Wholesale
                    </option>
                    <option value="DISTRIBUTOR">
                      Distributor
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Status</label>

                  <select
                    value={form.status}
                    onChange={(event) =>
                      updateField(
                        "status",
                        event.target.value
                      )
                    }
                  >
                    <option value="LEAD">
                      Lead
                    </option>
                    <option value="ACTIVE">
                      Active
                    </option>
                    <option value="INACTIVE">
                      Inactive
                    </option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Address</label>

                <textarea
                  value={form.address}
                  onChange={(event) =>
                    updateField(
                      "address",
                      event.target.value
                    )
                  }
                  rows={3}
                  required
                />
              </div>

              <div className="form-group">
                <label>Follow-up Date</label>

                <input
                  type="date"
                  value={form.followUpDate}
                  onChange={(event) =>
                    updateField(
                      "followUpDate",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={creating}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={creating}
                >
                  {creating
                    ? "Adding..."
                    : "Add Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Follow-up Modal */}
      {followUpCustomer && (
        <div
          className="modal-overlay"
          onClick={() => {
            if (!savingFollowUp) {
              setFollowUpCustomer(null);
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
                <h2>Add Follow-up Note</h2>

                <p>
                  {followUpCustomer.customer_name}
                  {followUpCustomer.business_name
                    ? ` - ${followUpCustomer.business_name}`
                    : ""}
                </p>
              </div>

              <button
                className="close-button"
                onClick={() => {
                  if (!savingFollowUp) {
                    setFollowUpCustomer(null);
                  }
                }}
              >
                ×
              </button>
            </div>

            <div className="form-group">
              <label>Follow-up Date</label>

              <input
                type="date"
                value={followUpDate}
                onChange={(event) =>
                  setFollowUpDate(
                    event.target.value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>Note</label>

              <textarea
                value={followUpNote}
                onChange={(event) =>
                  setFollowUpNote(
                    event.target.value
                  )
                }
                placeholder="Enter follow-up details..."
                rows={5}
              />
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() =>
                  setFollowUpCustomer(null)
                }
                disabled={savingFollowUp}
              >
                Cancel
              </button>

              <button
                type="button"
                className="primary-button"
                onClick={handleAddFollowUp}
                disabled={savingFollowUp}
              >
                {savingFollowUp
                  ? "Saving..."
                  : "Save Follow-up"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}