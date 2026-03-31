import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const EMPTY_ITEM = { name:'', category_id:'1', price:'', description:'', is_veg:'1', image_url:'' };

export default function AdminPanel() {
  const { adminLoggedIn, adminUsername, loginAdmin, logoutAdmin } = useAuth();
  const [username,   setUsername]   = useState('admin');
  const [password,   setPassword]   = useState('');
  const [stats,      setStats]      = useState(null);
  const [orders,     setOrders]     = useState([]);
  const [bookings,   setBookings]   = useState([]);
  const [menuItems,  setMenuItems]  = useState([]);
  const [categories, setCategories] = useState([]);
  const [newItem,    setNewItem]    = useState(EMPTY_ITEM);
  const [activeTab,  setActiveTab]  = useState('dashboard');
  const [loading,    setLoading]    = useState(false);

  // Edit modal state
  const [editItem,   setEditItem]   = useState(null); // null = closed
  const [editForm,   setEditForm]   = useState(EMPTY_ITEM);
  const [editLoading,setEditLoading]= useState(false);

  useEffect(() => {
    if (adminLoggedIn) loadAll();
    axios.get('/api/categories').then(r => setCategories(r.data.categories)).catch(()=>{});
  }, [adminLoggedIn]);

  const loadAll    = () => { loadStats(); loadOrders(); loadBookings(); loadMenu(); };
  const loadStats  = () => axios.get('/api/admin/stats',{withCredentials:true}).then(r=>setStats(r.data.stats)).catch(()=>{});
  const loadOrders = () => axios.get('/api/orders',{withCredentials:true}).then(r=>setOrders(r.data.orders)).catch(()=>{});
  const loadBookings=() => axios.get('/api/bookings',{withCredentials:true}).then(r=>setBookings(r.data.bookings)).catch(()=>{});
  const loadMenu   = () => axios.get('/api/admin/menu',{withCredentials:true}).then(r=>setMenuItems(r.data.items)).catch(()=>{});

  const handleLogin = async () => {
    try {
      const res = await axios.post('/api/admin/login',{username,password},{withCredentials:true});
      loginAdmin(username);
      toast.success(res.data.message);
    } catch { toast.error('Invalid credentials'); }
  };

  const handleLogout = async () => { await logoutAdmin(); toast.success('Logged out!'); };

  const updateOrderStatus = async (id, status) => {
    if (!status) return;
    try {
      await axios.patch(`/api/orders/${id}/status`,{status},{withCredentials:true});
      toast.success(`Order status → ${status}`);
      loadOrders(); loadStats();
    } catch { toast.error('Update failed'); }
  };

  // ── ADD ITEM ─────────────────────────────────────────────
  const addMenuItem = async () => {
    if (!newItem.name || !newItem.price) return toast.error('Name and price are required');
    setLoading(true);
    try {
      const res = await axios.post('/api/admin/menu',{
        ...newItem, price:parseFloat(newItem.price),
        is_veg:parseInt(newItem.is_veg), category_id:parseInt(newItem.category_id)
      },{withCredentials:true});
      toast.success(res.data.message || 'Item added!');
      setNewItem(EMPTY_ITEM);
      loadMenu();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to add item'); }
    finally { setLoading(false); }
  };

  // ── DELETE ITEM (permanent) ───────────────────────────────
  const deleteMenuItem = async (id, name) => {
    if (!window.confirm(`Permanently delete "${name}"? This cannot be undone.`)) return;
    try {
      const res = await axios.delete(`/api/admin/menu/${id}`,{withCredentials:true});
      toast.success(res.data.message || 'Item deleted!');
      loadMenu();
    } catch { toast.error('Delete failed'); }
  };

  // ── TOGGLE IN-STOCK ───────────────────────────────────────
  const toggleStock = async (id) => {
    try {
      const res = await axios.patch(`/api/admin/menu/${id}/toggle`,{},{withCredentials:true});
      setMenuItems(prev => prev.map(it =>
        it.id === id ? {...it, is_available: res.data.is_available} : it
      ));
      toast.success(res.data.is_available ? 'Item marked In Stock ✅' : 'Item marked Out of Stock ❌');
    } catch { toast.error('Toggle failed'); }
  };

  // ── OPEN EDIT MODAL ───────────────────────────────────────
  const openEdit = (item) => {
    setEditItem(item);
    setEditForm({
      name:        item.name,
      category_id: String(item.category_id),
      price:       String(parseFloat(item.price).toFixed(0)),
      description: item.description || '',
      is_veg:      String(item.is_veg),
      image_url:   item.image_url || ''
    });
  };

  // ── SAVE EDIT ─────────────────────────────────────────────
  const saveEdit = async () => {
    if (!editForm.name || !editForm.price) return toast.error('Name and price required');
    setEditLoading(true);
    try {
      await axios.put(`/api/admin/menu/${editItem.id}`, {
        ...editForm, price:parseFloat(editForm.price),
        is_veg:parseInt(editForm.is_veg), category_id:parseInt(editForm.category_id)
      },{withCredentials:true});
      toast.success('Item updated!');
      setEditItem(null);
      loadMenu();
    } catch (e) { toast.error(e.response?.data?.error || 'Update failed'); }
    finally { setEditLoading(false); }
  };

  // ── LOGIN SCREEN ──────────────────────────────────────────
  if (!adminLoggedIn) return (
    <div style={{padding:'24px 16px'}}>
      <div className="admin-login-wrap">
        <h2>🔐 Admin Panel</h2>
        <p style={{color:'var(--muted)',fontSize:'13px',marginBottom:'28px'}}>Restaurant staff only.</p>
        <div className="form-group">
          <label>Username</label>
          <input className="form-input" value={username} onChange={e=>setUsername(e.target.value)} placeholder="admin"/>
        </div>
        <div className="form-group">
          <label>Password</label>
          <input className="form-input" type="password" value={password}
            onChange={e=>setPassword(e.target.value)} placeholder="••••••••"
            onKeyDown={e => e.key==='Enter' && handleLogin()}/>
        </div>
        <button className="submit-btn" onClick={handleLogin}>Login to Dashboard →</button>
        <p style={{fontSize:'12px',color:'#bbb',textAlign:'center',marginTop:'12px'}}>Demo: admin / admin1234</p>
      </div>
    </div>
  );

  return (
    <div className="admin-dash">
      {/* Top bar */}
      <div className="dash-topbar">
        <div>
          <div className="dash-title">🍽️ Kitchen Dashboard</div>
          <div className="dash-sub">Welcome, {adminUsername}</div>
        </div>
        <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
          <button className="nav-link" style={{background:'#FFF0E6',color:'var(--saffron)',borderRadius:'8px',fontWeight:'700'}} onClick={loadAll}>🔄 Refresh</button>
          <button className="nav-link logout" style={{background:'#FFEBEE',borderRadius:'8px',fontWeight:'700'}} onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:'8px',marginBottom:'24px',flexWrap:'wrap'}}>
        {['dashboard','menu','orders','bookings'].map(t => (
          <button key={t} className={`cat-tab ${activeTab===t?'active':''}`} onClick={() => setActiveTab(t)}>
            {t==='dashboard'?'📊 Dashboard':t==='menu'?'🍽️ Menu Manager':t==='orders'?'📦 Orders':'📅 Bookings'}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD TAB ── */}
      {activeTab === 'dashboard' && stats && (
        <div className="stats-row">
          <div className="stat-card"><div className="stat-num">{stats.total_orders}</div><div className="stat-label">Total Orders</div></div>
          <div className="stat-card" style={{borderColor:'#1565C0'}}><div className="stat-num" style={{color:'#1565C0'}}>{stats.preparing}</div><div className="stat-label">Preparing</div></div>
          <div className="stat-card" style={{borderColor:'#2E7D32'}}><div className="stat-num" style={{color:'#2E7D32'}}>{stats.ready}</div><div className="stat-label">Ready</div></div>
          <div className="stat-card" style={{borderColor:'#E65100'}}><div className="stat-num" style={{color:'#E65100'}}>{stats.pending}</div><div className="stat-label">Pending</div></div>
          <div className="stat-card" style={{borderColor:'#6A1B9A'}}><div className="stat-num" style={{color:'#6A1B9A'}}>₹{Math.round(stats.revenue)}</div><div className="stat-label">Revenue</div></div>
          <div className="stat-card" style={{borderColor:'#00838F'}}><div className="stat-num" style={{color:'#00838F'}}>{stats.total_bookings}</div><div className="stat-label">Reservations</div></div>
          <div className="stat-card" style={{borderColor:'#AD1457'}}><div className="stat-num" style={{color:'#AD1457'}}>{stats.total_users}</div><div className="stat-label">Users</div></div>
        </div>
      )}

      {/* ── MENU MANAGER TAB ── */}
      {activeTab === 'menu' && (
        <div className="menu-manager">
          <h3>➕ Add New Menu Item</h3>
          <div className="add-item-form">
            <div className="full form-group">
              <label>Item Name *</label>
              <input className="form-input" placeholder="e.g. Ghee Roast Dosa"
                value={newItem.name} onChange={e=>setNewItem(p=>({...p,name:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select className="form-input" value={newItem.category_id} onChange={e=>setNewItem(p=>({...p,category_id:e.target.value}))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input className="form-input" type="number" placeholder="e.g. 120"
                value={newItem.price} onChange={e=>setNewItem(p=>({...p,price:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Veg / Non-Veg</label>
              <select className="form-input" value={newItem.is_veg} onChange={e=>setNewItem(p=>({...p,is_veg:e.target.value}))}>
                <option value="1">🟢 Vegetarian</option>
                <option value="0">🔴 Non-Vegetarian</option>
              </select>
            </div>
            <div className="full form-group">
              <label>Description</label>
              <input className="form-input" placeholder="Short description of the dish"
                value={newItem.description} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))}/>
            </div>
            <div className="full form-group">
              <label>Image URL</label>
              <input className="form-input" placeholder="https://example.com/image.jpg"
                value={newItem.image_url} onChange={e=>setNewItem(p=>({...p,image_url:e.target.value}))}/>
            </div>
            <div className="full">
              <button className="submit-btn" onClick={addMenuItem} disabled={loading}>
                {loading ? 'Adding...' : '➕ Add to Menu'}
              </button>
            </div>
          </div>

          {/* ── MENU ITEMS LIST ── */}
          <div style={{borderTop:'1px solid #F0E6DA',paddingTop:'20px',marginTop:'8px'}}>
            <h3 style={{marginBottom:'14px'}}>📋 All Menu Items ({menuItems.length})</h3>
            {menuItems.map(item => (
              <div className="admin-menu-item" key={item.id} style={{
                opacity: item.is_available ? 1 : 0.6,
                borderLeft: item.is_available ? '4px solid #4CAF50' : '4px solid #EF5350'
              }}>
                <img className="admin-menu-img" src={item.image_url||''} alt={item.name}
                  onError={e=>e.target.style.display='none'} loading="lazy"/>
                <div className="admin-menu-info" style={{flex:1}}>
                  <div className="admin-menu-name" style={{display:'flex',alignItems:'center',gap:'6px'}}>
                    {item.name}
                    <span style={{
                      fontSize:'11px', fontWeight:'700', padding:'2px 7px', borderRadius:'20px',
                      background: item.is_available ? '#E8F5E9' : '#FFEBEE',
                      color: item.is_available ? '#2E7D32' : '#C62828'
                    }}>
                      {item.is_available ? '✅ In Stock' : '❌ Out of Stock'}
                    </span>
                  </div>
                  <div className="admin-menu-price" style={{color:'#FF6B35',fontWeight:'800'}}>₹{parseFloat(item.price).toFixed(0)}</div>
                  <div className="admin-menu-cat">{item.category_name} · {item.is_veg?'🟢 Veg':'🔴 Non-Veg'}</div>
                </div>

                {/* Action buttons */}
                <div style={{display:'flex',flexDirection:'column',gap:'6px',alignItems:'flex-end'}}>

                  {/* In-stock toggle switch */}
                  <div style={{display:'flex',alignItems:'center',gap:'7px',marginBottom:'4px'}}>
                    <span style={{fontSize:'11px',color:'#888',fontWeight:'600'}}>
                      {item.is_available ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <div onClick={() => toggleStock(item.id)} style={{
                      width:'42px', height:'22px', borderRadius:'11px', cursor:'pointer',
                      background: item.is_available ? '#4CAF50' : '#ccc',
                      position:'relative', transition:'background 0.3s'
                    }}>
                      <div style={{
                        width:'18px', height:'18px', borderRadius:'50%', background:'#fff',
                        position:'absolute', top:'2px',
                        left: item.is_available ? '22px' : '2px',
                        transition:'left 0.3s',
                        boxShadow:'0 1px 4px rgba(0,0,0,0.2)'
                      }}/>
                    </div>
                  </div>

                  {/* Edit button */}
                  <button onClick={() => openEdit(item)} style={{
                    padding:'6px 14px', background:'#E3F2FD', color:'#1565C0',
                    border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'12px', cursor:'pointer'
                  }}>✏️ Edit</button>

                  {/* Delete button */}
                  <button onClick={() => deleteMenuItem(item.id, item.name)} style={{
                    padding:'6px 14px', background:'#FFEBEE', color:'#C62828',
                    border:'none', borderRadius:'8px', fontWeight:'700', fontSize:'12px', cursor:'pointer'
                  }}>🗑️ Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ORDERS TAB ── */}
      {activeTab === 'orders' && (
        <>
          <div className="dash-section-title">Live Orders ({orders.length})</div>
          {!orders.length ? <div className="no-data">No orders yet.</div> :
            orders.map(o => (
              <div className="admin-order-card" key={o.id}>
                <div style={{flex:1,minWidth:0}}>
                  <div className="order-id-text">#ORD{String(o.id).padStart(4,'0')} · {new Date(o.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                  <div className="order-items-text">{o.items_summary}</div>
                  <div className="order-amt-text">₹{parseFloat(o.total_amount).toFixed(0)} · {o.customer_name}</div>
                </div>
                <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'7px'}}>
                  <span className={`status-badge status-${o.status}`}>
                    {o.status.charAt(0).toUpperCase()+o.status.slice(1)}
                  </span>
                  <select className="status-select" onChange={e => updateOrderStatus(o.id, e.target.value)}>
                    <option value="">Update →</option>
                    <option value="pending">Pending</option>
                    <option value="preparing">Preparing</option>
                    <option value="ready">Ready</option>
                    <option value="delivered">Delivered</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>
            ))
          }
        </>
      )}

      {/* ── BOOKINGS TAB ── */}
      {activeTab === 'bookings' && (
        <>
          <div className="dash-section-title">Table Reservations ({bookings.length})</div>
          {!bookings.length ? <div className="no-data">No bookings yet.</div> :
            bookings.map(b => (
              <div className="booking-card" key={b.id}>
                <div>
                  <div className="booking-name-text">{b.customer_name} <span style={{color:'#aaa',fontWeight:400,fontSize:'12px'}}>#BKG{String(b.id).padStart(4,'0')}</span></div>
                  <div className="booking-detail-text">{b.guest_count} Guests · {b.booking_date} at {b.booking_time}</div>
                  {b.special_notes && <div className="booking-detail-text" style={{fontStyle:'italic'}}>"{b.special_notes}"</div>}
                </div>
                <span className="confirmed-badge">{b.status.charAt(0).toUpperCase()+b.status.slice(1)}</span>
              </div>
            ))
          }
        </>
      )}

      {/* ── EDIT MODAL ── */}
      {editItem && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.55)',
          zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px'
        }}>
          <div style={{
            background:'#fff', borderRadius:'20px', padding:'28px 24px',
            width:'100%', maxWidth:'480px', maxHeight:'90vh', overflowY:'auto',
            boxShadow:'0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
              <h3 style={{margin:0,fontSize:'18px',fontWeight:'800'}}>✏️ Edit Menu Item</h3>
              <button onClick={() => setEditItem(null)} style={{
                background:'#F5F5F5', border:'none', borderRadius:'50%',
                width:'32px', height:'32px', fontSize:'16px', cursor:'pointer', fontWeight:'700'
              }}>✕</button>
            </div>

            <div className="form-group">
              <label>Item Name *</label>
              <input className="form-input" value={editForm.name}
                onChange={e=>setEditForm(p=>({...p,name:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Category *</label>
              <select className="form-input" value={editForm.category_id}
                onChange={e=>setEditForm(p=>({...p,category_id:e.target.value}))}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Price (₹) *</label>
              <input className="form-input" type="number" value={editForm.price}
                onChange={e=>setEditForm(p=>({...p,price:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Veg / Non-Veg</label>
              <select className="form-input" value={editForm.is_veg}
                onChange={e=>setEditForm(p=>({...p,is_veg:e.target.value}))}>
                <option value="1">🟢 Vegetarian</option>
                <option value="0">🔴 Non-Vegetarian</option>
              </select>
            </div>
            <div className="form-group">
              <label>Description</label>
              <input className="form-input" value={editForm.description}
                onChange={e=>setEditForm(p=>({...p,description:e.target.value}))}/>
            </div>
            <div className="form-group">
              <label>Image URL</label>
              <input className="form-input" value={editForm.image_url}
                onChange={e=>setEditForm(p=>({...p,image_url:e.target.value}))}/>
            </div>
            {editForm.image_url && (
              <img src={editForm.image_url} alt="preview"
                style={{width:'100%',height:'140px',objectFit:'cover',borderRadius:'10px',marginBottom:'16px'}}
                onError={e=>e.target.style.display='none'}/>
            )}

            <div style={{display:'flex',gap:'10px',marginTop:'8px'}}>
              <button onClick={() => setEditItem(null)} style={{
                flex:1, padding:'12px', background:'#F5F5F5', color:'#555',
                border:'none', borderRadius:'12px', fontWeight:'700', cursor:'pointer'
              }}>Cancel</button>
              <button onClick={saveEdit} disabled={editLoading} style={{
                flex:2, padding:'12px',
                background:'linear-gradient(135deg,#FF6B35,#FF8C42)',
                color:'#fff', border:'none', borderRadius:'12px',
                fontWeight:'800', fontSize:'15px', cursor:'pointer'
              }}>
                {editLoading ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
