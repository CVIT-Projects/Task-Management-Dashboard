import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { User as UserIcon, Eye, EyeOff } from 'lucide-react';
import Navbar from '../components/Navbar';
import './Profile.css';

const API_URL = import.meta.env.VITE_API_URL || '';

const Profile = () => {
  const { user, token } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isUpdating, setIsUpdating] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (message.text && message.type === 'success') {
      const timer = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/auth/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProfileData(response.data.user);
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setMessage({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return setMessage({ type: 'error', text: 'New passwords do not match.' });
    }

    if (passwordData.newPassword.length < 8) {
      return setMessage({ type: 'error', text: 'New password must be at least 8 characters.' });
    }

    setIsUpdating(true);
    try {
      await axios.patch(
        `${API_URL}/api/auth/password`,
        {
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setMessage({ type: 'success', text: 'Password updated successfully!' });
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.message || 'Failed to update password.'
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading your profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <Navbar />
      <main className="profile-content">
        <div className="profile-card">
          <div className="profile-header">
            <div className="profile-avatar-large">
              <UserIcon size={40} />
            </div>
            <div className="profile-title">
              <h1>User Profile</h1>
              <p>Manage your account settings and security</p>
            </div>
          </div>

          <div className="profile-grid">
            <section className="profile-info-section">
              <h2>Account Details</h2>
              <div className="info-group">
                <label>Full Name</label>
                <div className="info-value">{profileData?.name}</div>
              </div>
              <div className="info-group">
                <label>Email Address</label>
                <div className="info-value">{profileData?.email}</div>
              </div>
              <div className="info-group">
                <label>Role</label>
                <div className="info-value role-badge">{profileData?.role}</div>
              </div>
              <div className="info-group">
                <label>Hourly Rate</label>
                <div className="info-value">${profileData?.hourlyRate?.toFixed(2)}/hr</div>
              </div>
            </section>

            <section className="profile-password-section">
              <h2>Security</h2>
              <p className="section-desc">Change your password to keep your account secure.</p>
              
              <form onSubmit={handlePasswordChange} className="password-form">
                {message.text && (
                  <div className={`message-banner ${message.type}`}>
                    {message.type === 'success' ? '✅' : '❌'} {message.text}
                  </div>
                )}

                <div className="form-field">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      id="currentPassword"
                      name="currentPassword"
                      value={passwordData.currentPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                      title={showPasswords.current ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      id="newPassword"
                      name="newPassword"
                      value={passwordData.newPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="At least 8 characters"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                      title={showPasswords.new ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      value={passwordData.confirmPassword}
                      onChange={handleInputChange}
                      required
                      placeholder="Repeat new password"
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                      title={showPasswords.confirm ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="save-btn" 
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Password'}
                </button>
              </form>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Profile;
