import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Farms from './pages/Farms';
import FarmDetails from './pages/FarmDetails';
import FieldDetails from './pages/FieldDetails';
import Crops from './pages/Crops';
import CropDetails from './pages/CropDetails';
import Activities from './pages/Activities';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
import LivestockList from './pages/LivestockList';
import LivestockDetails from './pages/LivestockDetails';
import AIInsights from './pages/AIInsights';
import Reports from './pages/Reports';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      
      {/* Protected Routes */}
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/farms" element={<Farms />} />
          <Route path="/farms/:id" element={<FarmDetails />} />
          <Route path="/fields/:id" element={<FieldDetails />} />
          <Route path="/crops" element={<Crops />} />
          <Route path="/crops/:id" element={<CropDetails />} />
          <Route path="/activities" element={<Activities />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/income" element={<Income />} />
          <Route path="/livestock" element={<LivestockList />} />
          <Route path="/livestock/:id" element={<LivestockDetails />} />
          <Route path="/ai" element={<AIInsights />} />
          <Route path="/reports" element={<Reports />} />
          {/* Redirect authenticated users from root to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>

      {/* Catch-all redirect to login for unauthenticated, or dashboard if authenticated (handled by ProtectedRoute logic usually, but here we just redirect to root which handles it) */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
