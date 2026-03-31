import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function CartPanel({ open, onClose }) {
  const { cartItems, changeQty, clearCart, subtotal, gst, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [payOpen,   setPayOpen]   = useState(false);
  const [payMethod, setPayMethod] = useState('upi');
  const [payStep,   setPayStep]   = useState(1); // 1=method 2=otp 3=processing 4=confirmed
  const [demoOtp,   setDemoOtp]   = useState('');
  const [otpValues, setOtpValues] = useState(['','','','','','']);
  const [sessionId, setSessionId] = useState('');
  const [txnId,     setTxnId]     = useState('');
  const [orderNum,  setOrderNum]  = useState('');
  const [orderTotal,setOrderTotal]= useState(0);
  const [selUpi,    setSelUpi]    = useState('');
  const [selBank,   setSelBank]   = useState('');
  const [selWal,    setSelWal]    = useState('');
  const [procMsg,   setProcMsg]   = useState('');

  const openPayment = () => {
    if (!cartItems.length) { toast.error('Your cart is empty!'); return; }
    if (!user) {
      onClose();
      toast('Please login to place your order', { icon: '🔐' });
      navigate('/login', { state: { from: '/' } });
      return;
    }
    setPayStep(1); setPayMethod('upi');
    setOtpValues(['','','','','','']);
    setPayOpen(true);
  };

  // ── Step 1: Initiate payment ──────────────────────────────
  const initiatePayment = async (method) => {
    try {
      const res = await axios.post('/api/payments/initiate', { amount: total, method }, { withCredentials: true });
      setSessionId(res.data.session_id);
      setDemoOtp(res.data.demo_otp || '');
      setPayStep(2);
      setTimeout(() => document.getElementById('otp-0')?.focus(), 100);
    } catch { toast.error('Payment initiation failed. Try again.'); }
  };

  // ── Step 2: OTP input ─────────────────────────────────────
  const handleOtpChange = (val, idx) => {
    const updated = [...otpValues];
    updated[idx] = val.replace(/\D/g, '');
    setOtpValues(updated);
    if (val && idx < 5) document.getElementById(`otp-${idx+1}`)?.focus();
    if (updated.every(v => v !== '') && idx === 5) setTimeout(verifyOtp, 300);
  };

  const verifyOtp = async () => {
    const otp = otpValues.join('');
    if (otp.length < 6) { toast.error('Enter all 6 digits'); return; }
    try {
      const res = await axios.post('/api/payments/verify-otp', { otp, session_id: sessionId }, { withCredentials: true });
      if (res.data.verified) {
        setTxnId(res.data.txn_id);
        startProcessing(res.data.txn_id);
      } else {
        toast.error(res.data.message || 'Invalid OTP');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'OTP verification failed');
    }
  };

  // ── Step 3: Processing animation → place order ────────────
  const startProcessing = (resolvedTxnId) => {
    setPayStep(3);
    const msgs = ['Connecting to bank...', 'Authenticating...', 'Verifying payment...', 'Almost done...'];
    let i = 0;
    setProcMsg(msgs[0]);
    const iv = setInterval(() => { i++; if (i < msgs.length) setProcMsg(msgs[i]); }, 800);
    setTimeout(() => { clearInterval(iv); placeOrder(resolvedTxnId); }, 3500);
  };

  // ── Core: Place order ─────────────────────────────────────
  const placeOrder = async (resolvedTxnId) => {
    const items = cartItems.map(it => ({ menu_item_id: it.id, quantity: it.qty }));
    const savedTotal = total; // save before clearCart
    const addr = user ? `${user.address || ''} ${user.pincode ? '- ' + user.pincode : ''}`.trim() : '';

    try {
      const res = await axios.post('/api/orders', {
        user_id:          user?.id   || null,
        customer_name:    user?.name || 'Guest',
        customer_phone:   user?.phone || '',
        delivery_address: addr,
        items,
        payment_method:   payMethod,
        txn_id:           resolvedTxnId || ''
      }, { withCredentials: true });

      // Order saved — update payment status in background (don't await)
      axios.post('/api/payments/confirm', {
        order_id: res.data.order_id,
        txn_id:   resolvedTxnId,
        method:   payMethod,
        amount:   savedTotal
      }, { withCredentials: true }).catch(() => {});

      // Show confirmed screen
      setOrderNum(res.data.order_num || '#ORD0001');
      setOrderTotal(res.data.total   || savedTotal);
      clearCart();
      setPayStep(4); // ✅ ORDER CONFIRMED
    } catch (err) {
      console.error('[ORDER FAIL]', err?.response?.data);
      toast.error(err?.response?.data?.error || 'Order could not be placed. Please try again.');
      setPayStep(1);
    }
  };

  // ── COD flow ──────────────────────────────────────────────
  const confirmCOD = async () => {
    setPayStep(3);
    setProcMsg('Confirming your order...');
    const items = cartItems.map(it => ({ menu_item_id: it.id, quantity: it.qty }));
    const savedTotal = total;
    const addr = user ? `${user.address || ''} ${user.pincode ? '- ' + user.pincode : ''}`.trim() : '';
    setTimeout(async () => {
      try {
        const res = await axios.post('/api/orders', {
          user_id:          user?.id   || null,
          customer_name:    user?.name || 'Guest',
          customer_phone:   user?.phone || '',
          delivery_address: addr,
          items,
          payment_method:   'cash'
        }, { withCredentials: true });
        setOrderNum(res.data.order_num || '#ORD0001');
        setOrderTotal(res.data.total   || savedTotal);
        clearCart();
        setPayStep(4);
      } catch (err) {
        toast.error(err?.response?.data?.error || 'Order failed. Try again.');
        setPayStep(1);
      }
    }, 2000);
  };

  const closeAll = () => { setPayOpen(false); setPayStep(1); onClose(); };

  return (
    <>
      {/* CART OVERLAY */}
      <div className={`overlay ${open ? 'open' : ''}`} onClick={onClose} />

      {/* CART PANEL */}
      <div className={`cart-panel ${open ? 'open' : ''}`}>
        <div className="cart-header">
          <h3>🛒 Your Order</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="cart-items">
          {!cartItems.length ? (
            <div className="cart-empty">
              <div className="cart-empty-icon">🍽️</div>
              Cart is empty.<br/>Add something delicious!
            </div>
          ) : cartItems.map(it => (
            <div className="cart-item" key={it.id}>
              <img className="cart-item-img" src={it.image_url || ''} alt={it.name}
                onError={e => e.target.style.display='none'} loading="lazy"/>
              <div className="cart-item-info">
                <div className="cart-item-name">{it.name}</div>
                <div className="cart-item-price">₹{it.price} × {it.qty} = ₹{(it.price*it.qty).toFixed(0)}</div>
              </div>
              <div className="qty-control">
                <button className="qty-btn" onClick={() => changeQty(it.id,-1)}>−</button>
                <span className="qty-num">{it.qty}</span>
                <button className="qty-btn" onClick={() => changeQty(it.id,1)}>+</button>
              </div>
            </div>
          ))}
        </div>

        {!!cartItems.length && (
          <div className="cart-footer">
            {user?.address && (
              <div style={{ background:'#F0F7FF', border:'1px solid #90CAF9', borderRadius:'10px', padding:'10px 12px', marginBottom:'12px', fontSize:'12px' }}>
                <div style={{ fontWeight:'700', color:'#1565C0', marginBottom:'3px' }}>📍 Delivering to:</div>
                <div style={{ color:'#333' }}>{user.address}{user.pincode && ` - ${user.pincode}`}</div>
              </div>
            )}
            <div className="cart-row"><span>Subtotal</span><span>₹{subtotal.toFixed(0)}</span></div>
            <div className="cart-row"><span>GST (5%)</span><span>₹{gst}</span></div>
            <div className="cart-row cart-total-row"><span>Total</span><span>₹{total}</span></div>
            <button className="order-btn" onClick={openPayment}>
              {user ? 'Proceed to Pay →' : '🔐 Login to Order →'}
            </button>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          PAYMENT MODAL
      ══════════════════════════════════════════════════════ */}
      {payOpen && (
        <div className="pay-overlay open">
          <div className="pay-modal">

            {/* Header — hidden on confirmation screen */}
            {payStep !== 4 && (
              <div className="pay-header">
                <div className="pay-header-left">
                  <div className="pay-logo">rzp</div>
                  <div>
                    <div className="pay-merchant-name">🍱 Spicy Venue</div>
                    <div style={{ color:'rgba(255,255,255,0.55)', fontSize:'11px' }}>Secure Checkout</div>
                  </div>
                </div>
                <div className="pay-amount-badge">₹{total}</div>
              </div>
            )}

            {/* ── STEP 1: Payment method ── */}
            {payStep === 1 && (
              <div className="pay-body">
                <div className="pay-sidebar">
                  {['upi','card','netbanking','wallet','cod'].map(m => (
                    <button key={m} className={`pay-method-btn ${payMethod===m?'active':''}`} onClick={() => setPayMethod(m)}>
                      <span className="pmicon">{m==='upi'?'📱':m==='card'?'💳':m==='netbanking'?'🏦':m==='wallet'?'👛':'💵'}</span>
                      {m==='upi'?'UPI':m==='card'?'Card':m==='netbanking'?'Net Banking':m==='wallet'?'Wallets':'Cash'}
                    </button>
                  ))}
                </div>
                <div className="pay-content">
                  {payMethod==='upi' && (
                    <div className="pay-section active">
                      <div className="pay-label">Pay via App</div>
                      <div className="upi-apps">
                        {['GPay','PhonePe','Paytm','BHIM'].map(app => (
                          <button key={app} className={`upi-app-btn ${selUpi===app?'selected':''}`} onClick={() => setSelUpi(app)}>
                            <span>{app==='GPay'?'🟢':app==='PhonePe'?'🔵':app==='Paytm'?'🟠':'🟣'}</span>{app}
                          </button>
                        ))}
                      </div>
                      <div className="pay-label">Or enter UPI ID</div>
                      <input className="pay-input" placeholder="yourname@upi"/>
                      <button className="pay-now-btn" onClick={() => initiatePayment('upi')}>Verify &amp; Pay →</button>
                    </div>
                  )}
                  {payMethod==='card' && (
                    <div className="pay-section active">
                      <div className="pay-label">Card Number</div>
                      <input className="pay-input" placeholder="1234  5678  9012  3456" maxLength={19}/>
                      <div className="pay-label">Cardholder Name</div>
                      <input className="pay-input" placeholder="As on card"/>
                      <div className="pay-row">
                        <div><div className="pay-label">Expiry</div><input className="pay-input" placeholder="MM / YY"/></div>
                        <div><div className="pay-label">CVV</div><input className="pay-input" placeholder="•••" type="password" maxLength={3}/></div>
                      </div>
                      <button className="pay-now-btn" onClick={() => initiatePayment('card')}>Pay Securely →</button>
                    </div>
                  )}
                  {payMethod==='netbanking' && (
                    <div className="pay-section active">
                      <div className="pay-label">Select Your Bank</div>
                      <div className="bank-list">
                        {['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Kotak Mahindra'].map(b => (
                          <button key={b} className={`bank-btn ${selBank===b?'selected':''}`} onClick={() => setSelBank(b)}>
                            <span>🏦</span>{b}
                          </button>
                        ))}
                      </div>
                      <button className="pay-now-btn" onClick={() => initiatePayment('netbanking')}>Login &amp; Pay →</button>
                    </div>
                  )}
                  {payMethod==='wallet' && (
                    <div className="pay-section active">
                      <div className="pay-label">Choose Wallet</div>
                      <div className="wallet-grid">
                        {['Paytm','PhonePe','Amazon Pay','Mobikwik'].map(w => (
                          <button key={w} className={`wallet-btn ${selWal===w?'selected':''}`} onClick={() => setSelWal(w)}>
                            <span>👛</span>{w}
                          </button>
                        ))}
                      </div>
                      <input className="pay-input" placeholder="Registered mobile number" style={{marginTop:'8px'}}/>
                      <button className="pay-now-btn" onClick={() => initiatePayment('wallet')}>Pay via Wallet →</button>
                    </div>
                  )}
                  {payMethod==='cod' && (
                    <div className="pay-section active">
                      <div className="cod-box">
                        <div style={{fontSize:'48px',marginBottom:'10px'}}>💵</div>
                        <h4>Cash on Delivery</h4>
                        <p>Pay with cash when your order arrives.</p>
                        <button className="pay-now-btn" onClick={confirmCOD}>Confirm Order →</button>
                      </div>
                    </div>
                  )}
                  <div className="pay-secure">🔒 256-bit SSL encrypted · Powered by Razorpay</div>
                  <button style={{width:'100%',padding:'9px',background:'#FFEBEE',color:'#C62828',border:'none',borderRadius:'9px',fontWeight:'700',fontSize:'13px',marginTop:'8px'}}
                    onClick={() => setPayOpen(false)}>✕ Cancel Payment</button>
                </div>
              </div>
            )}

            {/* ── STEP 2: OTP ── */}
            {payStep === 2 && (
              <div className="otp-screen">
                <div style={{fontSize:'42px',marginBottom:'10px'}}>📲</div>
                <h3>Enter OTP</h3>
                <p>A 6-digit OTP has been sent to your registered mobile.</p>
                {demoOtp && <div className="demo-otp">Demo OTP: <strong>{demoOtp}</strong></div>}
                <div className="otp-boxes">
                  {otpValues.map((v,i) => (
                    <input key={i} id={`otp-${i}`} className="otp-box" maxLength={1} value={v}
                      onChange={e => handleOtpChange(e.target.value, i)}
                      onKeyDown={e => { if(e.key==='Backspace' && !v && i>0) document.getElementById(`otp-${i-1}`)?.focus(); }}/>
                  ))}
                </div>
                <span className="otp-resend" onClick={() => initiatePayment(payMethod)}>Resend OTP</span>
                <button className="pay-now-btn" onClick={verifyOtp}>Verify &amp; Pay →</button>
                <button style={{width:'100%',padding:'9px',background:'#FFEBEE',color:'#C62828',border:'none',borderRadius:'9px',fontWeight:'700',fontSize:'13px',marginTop:'8px'}}
                  onClick={() => setPayStep(1)}>← Back</button>
              </div>
            )}

            {/* ── STEP 3: Processing ── */}
            {payStep === 3 && (
              <div className="processing-screen">
                <div className="spinner"/>
                <h3>Processing Payment...</h3>
                <p>{procMsg}</p>
              </div>
            )}

            {/* ── STEP 4: ORDER CONFIRMED ── */}
            {payStep === 4 && (
              <div style={{
                display:'flex', flexDirection:'column', alignItems:'center',
                justifyContent:'center', padding:'48px 32px', textAlign:'center',
                minHeight:'420px'
              }}>
                {/* Big animated checkmark */}
                <div style={{
                  width:'100px', height:'100px', borderRadius:'50%',
                  background:'linear-gradient(135deg,#FF6B35,#FF8C42)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  boxShadow:'0 8px 32px rgba(255,107,53,0.4)',
                  marginBottom:'28px',
                  animation:'popIn 0.5s cubic-bezier(0.175,0.885,0.32,1.275)'
                }}>
                  <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
                    <path d="M14 27L22 35L38 18" stroke="white" strokeWidth="4.5"
                      strokeLinecap="round" strokeLinejoin="round"
                      style={{
                        strokeDasharray:40,
                        strokeDashoffset:0,
                        animation:'drawCheck 0.4s ease 0.3s both'
                      }}/>
                  </svg>
                </div>

                <h2 style={{
                  fontSize:'26px', fontWeight:'800', color:'#1a1a1a',
                  margin:'0 0 10px', letterSpacing:'-0.5px'
                }}>Order Confirmed! 🎉</h2>

                <p style={{ color:'#666', fontSize:'14px', margin:'0 0 24px', lineHeight:'1.6' }}>
                  Your order has been placed successfully.<br/>
                  We're preparing your food right now!
                </p>

                <div style={{
                  background:'#FFF8F5', border:'1px solid #FFD5C2',
                  borderRadius:'16px', padding:'18px 24px',
                  width:'100%', marginBottom:'28px'
                }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                    <span style={{ color:'#888', fontSize:'13px' }}>Order ID</span>
                    <span style={{ fontWeight:'700', color:'#FF6B35', fontSize:'14px' }}>{orderNum}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                    <span style={{ color:'#888', fontSize:'13px' }}>Amount Paid</span>
                    <span style={{ fontWeight:'700', color:'#1a1a1a', fontSize:'14px' }}>₹{orderTotal}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'10px' }}>
                    <span style={{ color:'#888', fontSize:'13px' }}>Payment</span>
                    <span style={{ fontWeight:'700', color:'#1a1a1a', fontSize:'14px', textTransform:'uppercase' }}>{payMethod}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'#888', fontSize:'13px' }}>Est. Time</span>
                    <span style={{ fontWeight:'700', color:'#2E7D32', fontSize:'14px' }}>⏱ 20–25 mins</span>
                  </div>
                </div>

                <button
                  onClick={closeAll}
                  style={{
                    width:'100%', padding:'16px',
                    background:'linear-gradient(135deg,#FF6B35,#FF8C42)',
                    color:'#fff', border:'none', borderRadius:'14px',
                    fontSize:'16px', fontWeight:'800', cursor:'pointer',
                    boxShadow:'0 4px 16px rgba(255,107,53,0.4)',
                    letterSpacing:'0.3px'
                  }}
                >
                  Go Back Home →
                </button>
              </div>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes drawCheck {
          from { stroke-dashoffset: 40; }
          to   { stroke-dashoffset: 0;  }
        }
      `}</style>
    </>
  );
}
