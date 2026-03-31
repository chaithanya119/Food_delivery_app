import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function BookingPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    customer_name: '', phone: '', email: '',
    guest_count: '2', booking_date: '', booking_time: '7:00 PM', special_notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    if (user) setForm(p => ({ ...p, customer_name: user.name||'', phone: user.phone||'', email: user.email||'' }));
    const today = new Date().toISOString().split('T')[0];
    setForm(p => ({ ...p, booking_date: today }));
  }, [user]);

  const set = (k, v) => setForm(p => ({...p, [k]: v}));

  const submit = async () => {
    if (!form.customer_name || !form.phone || !form.booking_date)
      return toast.error('Fill all required fields');
    setLoading(true);
    try {
      const res = await axios.post('/api/bookings', form, { withCredentials: true });
      setConfirmed(res.data);
      toast.success('Booking confirmed! 🎉');
    } catch (e) { toast.error(e.response?.data?.error || 'Booking failed'); }
    finally { setLoading(false); }
  };

  if (confirmed) return (
    <div style={{padding:'24px 16px'}}>
      <div className="auth-wrap" style={{textAlign:'center'}}>
        <div style={{fontSize:'56px',marginBottom:'14px'}}>📅</div>
        <h2>Booking Confirmed!</h2>
        <p style={{margin:'12px 0 8px',fontSize:'15px',color:'var(--dark)'}}>{confirmed.message}</p>
        <p style={{color:'var(--muted)',fontSize:'13px',marginBottom:'24px'}}>Booking ID: {confirmed.booking_num}</p>
        <button className="submit-btn" onClick={() => setConfirmed(null)}>Make Another Booking</button>
      </div>
    </div>
  );

  return (
    <div style={{padding:'24px 16px'}}>
      <div className="page-wrap" style={{margin:'0 auto'}}>
        <div className="page-title">Book a Table</div>
        <div className="page-subtitle">Reserve your spot for a warm South Indian experience.</div>

        <div className="form-group">
          <label>Full Name *</label>
          <input className="form-input" placeholder="e.g. Ravi Kumar"
            value={form.customer_name} onChange={e => set('customer_name', e.target.value)}/>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Phone Number *</label>
            <input className="form-input" placeholder="9876543210"
              value={form.phone} onChange={e => set('phone', e.target.value)}/>
          </div>
          <div className="form-group">
            <label>Email (optional)</label>
            <input className="form-input" type="email" placeholder="you@email.com"
              value={form.email} onChange={e => set('email', e.target.value)}/>
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Number of Guests *</label>
            <select className="form-input" value={form.guest_count} onChange={e => set('guest_count', e.target.value)}>
              {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} Guest{n>1?'s':''}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date *</label>
            <input className="form-input" type="date" value={form.booking_date}
              min={new Date().toISOString().split('T')[0]}
              onChange={e => set('booking_date', e.target.value)}/>
          </div>
        </div>
        <div className="form-group">
          <label>Time Slot *</label>
          <select className="form-input" value={form.booking_time} onChange={e => set('booking_time', e.target.value)}>
            {['12:00 PM','12:30 PM','1:00 PM','1:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label>Special Requests (optional)</label>
          <textarea className="form-input" rows={3} style={{resize:'none'}}
            placeholder="Dietary requirements, occasion, seating preference..."
            value={form.special_notes} onChange={e => set('special_notes', e.target.value)}/>
        </div>
        <button className="submit-btn" onClick={submit} disabled={loading}>
          {loading ? 'Confirming...' : 'Confirm Reservation →'}
        </button>
      </div>
    </div>
  );
}
