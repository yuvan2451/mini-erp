import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import Layout from "./components/Layout";
import Products from "./pages/Products";
import StockManagement from "./pages/StockManagement";
import SalesChallans from "./pages/SalesChallans";
function ProtectedRoutes() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/customers"
          element={<Customers />}
        />
        <Route path="/products" element={<Products />} />
        <Route path="/stock" element={<StockManagement />} />
        <Route
  path="/challans"
  element={<SalesChallans />}
/>
      </Route>
    </Routes>
  );
}