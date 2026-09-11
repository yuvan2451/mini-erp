import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Welcome, <strong>{user?.name}</strong>
          </p>
          <p>
            Role: <strong>{user?.role}</strong>
          </p>
        </div>
      </div>

      <div className="dashboard-cards">
        <Link to="/customers" className="dashboard-card">
          <h2>Customers</h2>
          <p>CRM management</p>
        </Link>

        <Link to="/products" className="dashboard-card">
          <h2>Products</h2>
          <p>Inventory management</p>
        </Link>

        <Link to="/challans" className="dashboard-card">
          <h2>Sales Challans</h2>
          <p>Sales operations</p>
        </Link>

        <Link to="/stock" className="dashboard-card">
          <h2>Stock Management</h2>
          <p>Stock movements</p>
        </Link>
      </div>
    </div>
  );
}