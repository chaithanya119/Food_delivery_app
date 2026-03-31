import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

/* ── 6-box OTP input ────────────────────────────────────── */
function OtpBoxes({ value, onChange }) {
  const refs   = useRef([]);
  const digits = (value + '      ').slice(0, 6).split('');

  const handleChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const arr  = (value + '      ').slice(0, 6).split('');
    arr[idx]   = val.slice(-1);
    const next = arr.join('').trimEnd();
    onChange(next);
    if (val && idx < 5) refs.current[idx + 1]?.focus();
  };

  const handleKey = (idx, e) => {
    if (e.key === 'Backspace') {
      const arr = (value + '      ').slice(0, 6).split('');
      if (!arr[idx].trim() && idx > 0) {
        refs.current[idx - 1]?.focus();
      } else {
        arr[idx] = '';
        onChange(arr.join('').trimEnd());
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    onChange(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  };

  return (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '18px 0' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => refs.current[i] = el}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d.trim()}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          onPaste={handlePaste}
          style={{
            width: '46px', height: '54px', textAlign: 'center',
            fontSize: '24px', fontWeight: '900',
            border: `2px solid ${d.trim() ? 'var(--saffron)' : '#DDD'}`,
            borderRadius: '10px', outline: 'none',
            color: 'var(--dark)',
            background: d.trim() ? '#FFF8F0' : '#fff',
            transition: 'border-color 0.15s',
            fontFamily: 'monospace'
          }}
        />
      ))}
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */
const STEP = { FORM: 'form', OTP: 'otp', DONE: 'done' };

export default function AuthPage() {
  const [tab,      setTab]      = useState('register');
  const [step,     setStep]     = useState(STEP.FORM);
  const [loading,  setLoading]  = useState(false);
  const [otp,      setOtp]      = useState('');
  const [demoOtp,  setDemoOtp]  = useState('');
  const [sentPhone,setSentPhone]= useState('');
  const [errMsg,   setErrMsg]   = useState('');

  const [form, setForm] = useState({
    name:'', phone:'', email:'', address:'', pincode:''
  });
  const set = (k, v) => { setErrMsg(''); setForm(p => ({ ...p, [k]: v })); };

  const { loginUser } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from || '/';

  const switchTab = t => {
    setTab(t); setStep(STEP.FORM); setOtp('');
    setDemoOtp(''); setErrMsg('');
    setForm({ name:'', phone:'', email:'', address:'', pincode:'' });
  };

  /* ── STEP 1 : Send OTP ─────────────────────────────────── */
  const sendOtp = async () => {
    setErrMsg('');

    // Client-side validation
    if (!form.phone || form.phone.length !== 10)
      return setErrMsg('Enter a valid 10-digit phone number');

    if (tab === 'register') {
      if (!form.name.trim())         return setErrMsg('Full name is required');
      if (!form.address.trim())      return setErrMsg('Area / locality is required');
      if (form.pincode.length !== 6) return setErrMsg('Enter a valid 6-digit pincode');
    }

    setLoading(true);
    try {
      const payload = tab === 'register'
        ? { ...form, mode: 'register' }
        : { phone: form.phone, mode: 'login' };

      const r = await axios.post('/api/auth/send-otp', payload, { withCredentials: true });

      setDemoOtp(r.data.demo_otp);
      setSentPhone(form.phone);
      setOtp('');
      setStep(STEP.OTP);
      toast.success('OTP generated! See it below 👇');
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Failed to send OTP. Check backend is running.';
      setErrMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── STEP 2 : Verify OTP ───────────────────────────────── */
  const verifyOtp = async () => {
    setErrMsg('');
    const enteredOtp = otp.replace(/\s/g, '');
    if (enteredOtp.length !== 6) return setErrMsg('Enter all 6 digits of the OTP');

    setLoading(true);
    try {
      const r = await axios.post('/api/auth/verify-otp',
        { phone: sentPhone, otp: enteredOtp },
        { withCredentials: true }
      );
      loginUser(r.data.user);
      toast.success(r.data.message);
      setStep(STEP.DONE);
      setTimeout(() => navigate(from), 800);
    } catch (e) {
      const msg = e.response?.data?.error || 'Incorrect OTP. Please try again.';
      setErrMsg(msg);
      toast.error(msg);
      setOtp('');
    } finally {
      setLoading(false);
    }
  };

  /* ── Resend OTP ────────────────────────────────────────── */
  const resendOtp = async () => {
    setErrMsg(''); setOtp(''); setLoading(true);
    try {
      const payload = tab === 'register'
        ? { ...form, phone: sentPhone, mode: 'register' }
        : { phone: sentPhone, mode: 'login' };
      const r = await axios.post('/api/auth/send-otp', payload, { withCredentials: true });
      setDemoOtp(r.data.demo_otp);
      toast.success('New OTP generated!');
    } catch (e) {
      const msg = e.response?.data?.error || 'Failed to resend OTP';
      setErrMsg(msg);
      toast.error(msg);
    } finally { setLoading(false); }
  };

  /* ── Error box ─────────────────────────────────────────── */
  const ErrorBox = () => errMsg ? (
    <div style={{
      background: '#FFF0F0', border: '2px solid #FFAAAA',
      borderRadius: '10px', padding: '10px 14px',
      marginBottom: '14px', fontSize: '13px',
      color: '#C62828', display: 'flex', gap: '8px', alignItems: 'flex-start'
    }}>
      ⚠️ {errMsg}
    </div>
  ) : null;

  return (
    <div style={{ padding: '24px 16px', minHeight: '100vh', background: 'var(--cream)' }}>

      {/* Header */}
      <div style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'center', padding: '20px 0 0' }}>
        <div style={{ fontSize: '52px' }}>🌶️</div>
        <h2 style={{ fontFamily: 'Playfair Display,serif', fontSize: '26px', marginTop: '8px' }}>
          The Spicy Venue
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '13px', marginBottom: '6px' }}>
          Customer Login &amp; Registration
        </p>
        <div
          onClick={() => navigate('/admin')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'rgba(232,99,10,0.1)', border: '1px solid rgba(232,99,10,0.3)',
            borderRadius: '8px', padding: '5px 12px', fontSize: '12px',
            color: 'var(--saffron)', marginBottom: '20px', cursor: 'pointer'
          }}>
          🛠 Admin? Click here to access Admin Panel →
        </div>
      </div>

      <div className="auth-wrap">

        {/* ── SUCCESS ── */}
        {step === STEP.DONE && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <div style={{ fontSize: '64px', marginBottom: '14px' }}>✅</div>
            <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: '22px', marginBottom: '8px' }}>
              {tab === 'register' ? 'Account Created!' : 'Logged In!'}
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Redirecting to menu…</p>
          </div>
        )}

        {/* ── OTP SCREEN ── */}
        {step === STEP.OTP && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <div style={{ fontSize: '44px' }}>📱</div>
              <h3 style={{ fontFamily: 'Playfair Display,serif', fontSize: '20px', margin: '8px 0 4px' }}>
                Verify OTP
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)' }}>
                Phone: <strong>{sentPhone}</strong>
              </p>
            </div>

            {/* Demo OTP — large and clear */}
            <div style={{
              background: '#FFFBF0', border: '2px dashed #F5A623',
              borderRadius: '14px', padding: '16px', textAlign: 'center', margin: '14px 0'
            }}>
              <div style={{ fontSize: '12px', color: '#7d5a00', fontWeight: '700', marginBottom: '8px' }}>
                📲 Your Demo OTP — enter this below:
              </div>
              <div style={{
                fontSize: '38px', fontWeight: '900', letterSpacing: '10px',
                color: 'var(--saffron)', fontFamily: 'monospace', userSelect: 'all'
              }}>
                {demoOtp}
              </div>
              <div style={{ fontSize: '11px', color: '#aaa', marginTop: '6px' }}>
                (In production this would be sent via SMS to your phone)
              </div>
            </div>

            <ErrorBox />

            <OtpBoxes value={otp} onChange={v => { setOtp(v); setErrMsg(''); }} />

            <button
              className="submit-btn"
              onClick={verifyOtp}
              disabled={loading || otp.replace(/\s/g,'').length !== 6}
            >
              {loading ? '⏳ Verifying...' : '✅ Verify & Continue →'}
            </button>

            <div style={{ display:'flex', justifyContent:'space-between', marginTop:'16px', fontSize:'13px' }}>
              <button
                onClick={() => { setStep(STEP.FORM); setOtp(''); setErrMsg(''); }}
                style={{ background:'none', border:'none', color:'var(--muted)', cursor:'pointer' }}>
                ← Edit details
              </button>
              <button
                onClick={resendOtp} disabled={loading}
                style={{ background:'none', border:'none', color:'var(--saffron)', fontWeight:'700', cursor:'pointer' }}>
                🔁 Resend OTP
              </button>
            </div>
          </div>
        )}

        {/* ── FORM SCREEN ── */}
        {step === STEP.FORM && (
          <>
            <div className="auth-tabs">
              <button className={`auth-tab ${tab==='register'?'active':''}`} onClick={() => switchTab('register')}>
                📝 New User? Register
              </button>
              <button className={`auth-tab ${tab==='login'?'active':''}`} onClick={() => switchTab('login')}>
                🔐 Existing User? Login
              </button>
            </div>

            <ErrorBox />

            {/* REGISTER */}
            {tab === 'register' && (
              <div>
                <div style={{
                  background:'#fff8f0', border:'1px solid var(--turmeric)',
                  borderRadius:'10px', padding:'10px 12px',
                  marginBottom:'16px', fontSize:'13px', color:'#7d5a00'
                }}>
                  ✨ Fill in your details — we'll send an OTP to verify your number
                </div>

                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="form-input" placeholder="e.g. Ravi Kumar"
                    value={form.name} onChange={e => set('name', e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input className="form-input" placeholder="10-digit mobile number"
                    maxLength={10} value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g,''))} />
                </div>

                <div className="form-group">
                  <label>Email (optional)</label>
                  <input className="form-input" type="email" placeholder="you@email.com"
                    value={form.email} onChange={e => set('email', e.target.value)} />
                </div>

                <div style={{
                  background:'#FFF8F0', border:'2px solid var(--turmeric)',
                  borderRadius:'12px', padding:'14px', marginBottom:'14px'
                }}>
                  <div style={{ fontWeight:'800', fontSize:'13px', color:'var(--saffron)', marginBottom:'10px' }}>
                    📍 Delivery Address
                  </div>
                  <div className="form-group">
                    <label>Full Delivery Address *</label>
                    <input className="form-input" placeholder="House no, Street, Area, City"
                      value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom:0 }}>
                    <label>Pincode *</label>
                    <input className="form-input" placeholder="6-digit pincode"
                      maxLength={6} value={form.pincode}
                      onChange={e => set('pincode', e.target.value.replace(/\D/g,''))} />
                  </div>
                </div>

                <button className="submit-btn" onClick={sendOtp} disabled={loading}>
                  {loading ? '⏳ Please wait...' : '📱 Send OTP →'}
                </button>
                <p style={{ textAlign:'center', fontSize:'12px', color:'var(--muted)', marginTop:'12px' }}>
                  Already registered?{' '}
                  <span style={{ color:'var(--saffron)', cursor:'pointer', fontWeight:'700' }}
                    onClick={() => switchTab('login')}>Login here</span>
                </p>
              </div>
            )}

            {/* LOGIN */}
            {tab === 'login' && (
              <div>
                <div style={{
                  background:'#fff8f0', border:'1px solid var(--turmeric)',
                  borderRadius:'10px', padding:'10px 12px',
                  marginBottom:'16px', fontSize:'13px', color:'#7d5a00'
                }}>
                  👋 Enter your registered phone — we'll verify with an OTP
                </div>

                <div className="form-group">
                  <label>Phone Number *</label>
                  <input className="form-input" placeholder="Your registered 10-digit phone"
                    maxLength={10} value={form.phone}
                    onChange={e => set('phone', e.target.value.replace(/\D/g,''))} />
                </div>

                <button className="submit-btn" onClick={sendOtp} disabled={loading}>
                  {loading ? '⏳ Please wait...' : '📱 Send OTP →'}
                </button>
                <p style={{ textAlign:'center', fontSize:'12px', color:'var(--muted)', marginTop:'12px' }}>
                  New user?{' '}
                  <span style={{ color:'var(--saffron)', cursor:'pointer', fontWeight:'700' }}
                    onClick={() => switchTab('register')}>Register here</span>
                </p>
              </div>
            )}

            <div style={{ textAlign:'center', marginTop:'20px', paddingTop:'16px', borderTop:'1px solid #F0E6DA' }}>
              <button className="exit-btn" onClick={() => navigate('/')}>✕ Exit — Back to Menu</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
