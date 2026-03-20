import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import './Login.css'; // Re-use the flawless styling

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [error, setError] = useState('');
  
  const { token, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/auth/register`, {
        name,
        email,
        password,
        // If they enter a secret, send it. Otherwise leave it completely off the payload
        adminSecret: adminSecret.trim() ? adminSecret : undefined 
      });
      
      // Auto-login immediately after a successful signup
      login(response.data.token, response.data.user);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create an account</h1>
          <p>Join Taskboard to start managing tasks seamlessly.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {error && <div className="auth-error">{error}</div>}
          
          <div className="auth-field">
            <label htmlFor="name">Full Name</label>
            <input 
              type="text" 
              id="name" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
              placeholder="John Doe"
            />
          </div>

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
              placeholder="Min. 6 characters"
              minLength={6}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="adminSecret">Admin Secret Password (Optional)</label>
            <input 
              type="password" 
              id="adminSecret" 
              value={adminSecret}
              onChange={(e) => setAdminSecret(e.target.value)}
              placeholder="Provide key to get admin role"
            />
          </div>

          <button type="submit" className="auth-submit-btn">Sign up</button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
