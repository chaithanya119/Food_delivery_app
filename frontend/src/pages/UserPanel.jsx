import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function UserPanel() {
  const { user, logoutUser } = useAuth();
  const [orders,   setOrders]   = useState([]);
  const [bookings, setBookings] = useState([]);
  const [profile,  setProfile]  = useState({ name:'', email:'' });
  const [editing,  setEditing]  = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setProfile({ name: user.name||'', email: user.email||'' });
    axios.get('/api/user/orders',   { withCredentials:true }).then(r => setOrders(r.data.orders)).catch(()=>{});
    axios.get('/api/user/bookings', { withCredentials:true }).then(r => setBookings(r.data.bookings)).catch(()=>{});
  }, [user]);

  const saveProfile = async () => {
    try {
      await axios.put('/api/user/profile', profile, { withCredentials:true });
      toast.success('Profile updated!');
      setEditing(false);
    } catch { toast.error('Update failed'); }
  };

  const handleLogout = async () => {
    await logoutUser();
    toast.success('Logged out!');
    navigate('/');
  };

  const handleExit = () => navigate('/');

  if (!user) return null;

  return (
    <div className="user-panel">
      {/* Profile Header */}
      <div className="user-header">
        <div className="user-avatar">{user.name?.[0]?.toUpperCase() || '👤'}</div>
        <div style={{flex:1}}>
          {editing ? (
            <>
              <input className="form-input" value={profile.name}
                onChange={e => setProfile(p=>({...p,name:e.target.value}))}
                style={{marginBottom:'8px'}} placeholder="Your name"/>
              <input className="form-input" value={profile.email}
                onChange={e => setProfile(p=>({...p,email:e.target.value}))}
                placeholder="Your email"/>
              <div style={{display:'flex',gap:'8px',marginTop:'10px'}}>
                <button className="submit-btn" style={{padding:'8px 18px',width:'auto'}} onClick={saveProfile}>Save</button>
                <button className="exit-btn" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </>
          ) : (
            <>
              <div className="user-name">{user.name}</div>
              <div className="user-phone">📱 {user.phone}</div>
              {user.email && <div className="user-phone">✉️ {user.email}</div>}
              <button style={{marginTop:'8px',background:'#FFF3E0',color:'var(--saffron)',border:'none',padding:'6px 14px',borderRadius:'8px',fontSize:'12px',fontWeight:'700'}}
                onClick={() => setEditing(true)}>✏️ Edit Profile</button>
            </>
          )}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:'8px',alignSelf:'flex-start'}}>
          <button className="exit-btn" onClick={handleLogout}>🚪 Logout</button>
          <button className="exit-btn" style={{background:'#E8F5E9',color:'#2E7D32'}} onClick={handleExit}>← Exit</button>
        </div>
      </div>

      {/* My Orders */}
      <div className="panel-section">
        <div className="panel-section-title">🛒 My Orders ({orders.length})</div>
        {!orders.length ? (
          <div className="no-data">No orders yet. Start ordering! 🍽️</div>
        ) : orders.map(o => (
          <div className="order-card" key={o.id}>
            <div style={{flex:1,minWidth:0}}>
              <div className="order-id-text">#ORD{String(o.id).padStart(4,'0')} · {new Date(o.created_at).toLocaleDateString()}</div>
              <div className="order-items-text">{o.items_summary}</div>
              <div className="order-amt-text">₹{parseFloat(o.total_amount).toFixed(0)}</div>
            </div>
            <span className={`status-badge status-${o.status}`}>
              {o.status.charAt(0).toUpperCase()+o.status.slice(1)}
            </span>
          </div>
        ))}
      </div>

      {/* My Bookings */}
      <div className="panel-section">
        <div className="panel-section-title">📅 My Bookings ({bookings.length})</div>
        {!bookings.length ? (
          <div className="no-data">No bookings yet. <span style={{color:'var(--saffron)',cursor:'pointer'}} onClick={()=>navigate('/booking')}>Book a table →</span></div>
        ) : bookings.map(b => (
          <div className="booking-card" key={b.id}>
            <div>
              <div className="booking-name-text">{b.customer_name} <span style={{color:'#aaa',fontWeight:400,fontSize:'12px'}}>#BKG{String(b.id).padStart(4,'0')}</span></div>
              <div className="booking-detail-text">{b.guest_count} Guests · {b.booking_date} at {b.booking_time}</div>
            </div>
            <span className="confirmed-badge">{b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',marginTop:'12px'}}>
        <button className="submit-btn" style={{width:'auto',padding:'12px 28px'}}
          onClick={() => navigate('/')}>🍽️ Order More Food</button>
        <button className="submit-btn" style={{width:'auto',padding:'12px 28px',background:'#0F4C91'}}
          onClick={() => navigate('/booking')}>📅 Book a Table</button>
        <button className="exit-btn" onClick={handleLogout}>🚪 Logout</button>
      </div>
    </div>
  );
}
