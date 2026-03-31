import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';
import CartPanel from './CartPanel';

export default function Navbar() {
  const { user, adminLoggedIn, logoutUser, logoutAdmin } = useAuth();
  const { totalQty } = useCart();
  const [cartOpen, setCartOpen] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

  const handleUserLogout = async () => {
    await logoutUser();
    toast.success('Logged out successfully!');
    navigate('/');
  };

  const handleAdminLogout = async () => {
    await logoutAdmin();
    toast.success('Admin logged out!');
    navigate('/');
  };

  return (
    <>
      <nav className="navbar">
        {/* Logo */}
        <div className="nav-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          🌶️ Spicy <span>Venue</span>
        </div>

        <div className="nav-links">
          {/* Main nav links */}
          <button className={isActive('/')}       onClick={() => navigate('/')}>Menu</button>
          <button className={isActive('/booking')} onClick={() => navigate('/booking')}>Book Table</button>

          {/* ── ADMIN SECTION ── */}
          <div className="nav-divider" />
          {adminLoggedIn ? (
            <>
              <button className={isActive('/admin')} onClick={() => navigate('/admin')}>
                🛠 Admin Panel
              </button>
              <button className="nav-link logout" onClick={handleAdminLogout}>
                Admin Logout
              </button>
            </>
          ) : (
            <button
              className="nav-link"
              onClick={() => navigate('/admin')}
              style={{ color: '#f5a623', border: '1px solid rgba(245,166,35,0.3)', borderRadius: '8px' }}
            >
              🛠 Admin
            </button>
          )}

          {/* ── USER SECTION ── */}
          <div className="nav-divider" />
          {user ? (
            <>
              <span className="nav-user">👤 {user.name?.split(' ')[0]}</span>
              <button className={isActive('/profile')} onClick={() => navigate('/profile')}>My Orders</button>
              <button className="nav-link logout" onClick={handleUserLogout}>Logout</button>
            </>
          ) : (
            <button
              className="nav-link"
              onClick={() => navigate('/login', { state: { from: location.pathname } })}
              style={{
                background: 'var(--saffron)', color: 'white',
                borderRadius: '8px', padding: '7px 16px', fontWeight: '700'
              }}
            >
              👤 Login / Register
            </button>
          )}

          {/* Cart */}
          <button className="cart-btn" onClick={() => setCartOpen(true)}>
            🛒 Cart <span className="cart-count">{totalQty}</span>
          </button>
        </div>
      </nav>

      <CartPanel open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
