import { Link } from 'react-router-dom';

const Register = () => {
  return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'white', marginTop: '10vh' }}>
      <h1>Register Page</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>(Will be built in the next issue)</p>
      <Link to="/login" style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500 }}>
        &larr; Back to Login
      </Link>
    </div>
  );
};

export default Register;
