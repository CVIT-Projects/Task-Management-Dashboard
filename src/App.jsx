import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { TimerProvider } from './contexts/TimerContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Timesheet from './pages/Timesheet';
import Analytics from './pages/Analytics';
import Help from './pages/Help';
import './App.css'; // Keep global CSS logic

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <TimerProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login"    element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/"         element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/timesheet" element={<ProtectedRoute><Timesheet /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/help"      element={<ProtectedRoute><Help /></ProtectedRoute>} />
              
              {/* Catch-all route gracefully redirects 404s back to Dashboard (which triggers auth checks) */}
              <Route path="*"         element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </TimerProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
