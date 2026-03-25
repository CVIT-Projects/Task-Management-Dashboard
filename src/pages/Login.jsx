import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  const { token, login } = useAuth();
  const navigate = useNavigate();

  // If already logged in, automatically redirect to dashboard
  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault(); // Stop page from refreshing
    setError('');       // Clear old errors

    try {
      // POST the user's credentials to the backend
      const response = await axios.post(`${API_URL}/api/auth/login`, {
        email,
        password
      });
      
      // Save the token/user locally using our handy AuthContext function
      login(response.data.token, response.data.user);
      
      // Teleport to the Dashboard!
      navigate('/');
    } catch (err) {
      // If the backend refuses (401 code), display the backend's error safely visually
      setError(err.response?.data?.message || 'Login failed. Please check your network and try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Sign in to Taskboard</h1>
          <p>Welcome back! Please enter your details.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {/* Visual red banner if the API rejects the login */}
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-field">
            <label htmlFor="email">Email address</label>
            <input 
              type="email" 
              id="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              placeholder="you@example.com"
            />
          </div>
          
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input 
              type="password" 
              id="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className="auth-submit-btn">Sign in</button>
        </form>

        <div className="auth-footer">
          New to Taskboard? <Link to="/register">Create an account</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
