import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const { token, login } = useAuth();
  const navigate = useNavigate();

  // Acceptance Criteria: After login, visiting /login redirects to /
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'white', marginTop: '10vh' }}>
      <h1>Login Page</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>(Temporary stub for testing React Router and AuthContext)</p>
      
      <button 
        style={{ padding: '12px 24px', cursor: 'pointer', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: 600 }}
        onClick={() => {
          // Temporarily simulate a successful API login
          login('fake-jwt-12345', { id: 'user_1', name: 'Dev User', email: 'dev@test.com', role: 'admin' });
        }}
      >
        Simulate Login
      </button>
    </div>
  );
};

export default Login;
