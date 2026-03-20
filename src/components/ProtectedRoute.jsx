import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  
  // If no token exists, completely block access and forcefully redirect to login
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  
  // Only render the locked components if they have a token
  return children;
};

export default ProtectedRoute;
