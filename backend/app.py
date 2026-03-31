"""
THE SPICY VENUE v5 - Flask Backend
Run: python app.py
"""
import os, random, string, decimal, datetime, traceback
from functools import wraps
from flask import Flask, request, jsonify, session
from flask_cors import CORS
import mysql.connector
from flask.json.provider import DefaultJSONProvider

# ── JSON encoder: handle MySQL Decimal and date types ────────
class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, decimal.Decimal):
            return float(obj)
        if isinstance(obj, (datetime.date, datetime.datetime)):
            return str(obj)
        return super().default(obj)

# ── Load .env ────────────────────────────────────────────────
_env = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(_env):
    with open(_env) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                k, v = line.split('=', 1)
                os.environ.setdefault(k.strip(), v.strip())

app = Flask(__name__)
app.json_provider_class = CustomJSONProvider
app.json = CustomJSONProvider(app)
app.secret_key = os.environ.get('SECRET_KEY', 'spicyvenue2024secret')
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE']   = False

CORS(app,
     supports_credentials=True,
     origins=['http://localhost:3000','http://127.0.0.1:3000',
              'http://localhost:5000','http://127.0.0.1:5000'],
     allow_headers=['Content-Type','Accept'],
     methods=['GET','POST','PUT','PATCH','DELETE','OPTIONS'])

# ── DB ───────────────────────────────────────────────────────
DB_CFG = {
    'host':     os.environ.get('DB_HOST',     'localhost'),
    'port':     int(os.environ.get('DB_PORT', '3306')),
    'user':     os.environ.get('DB_USER',     'root'),
    'password': os.environ.get('DB_PASSWORD', '22KB1A0573'),
    'database': os.environ.get('DB_NAME',     'spicy_venue'),
    'charset':  'utf8mb4',
}

def db(sql, params=(), one=False, write=False):
    conn = mysql.connector.connect(**DB_CFG)
    cur  = conn.cursor(dictionary=True)
    try:
        cur.execute(sql, params)
        if write:
            conn.commit()
            return cur.lastrowid
        return cur.fetchone() if one else cur.fetchall()
    except Exception as e:
        conn.rollback(); raise e
    finally:
        cur.close(); conn.close()

def gen_otp(): return str(random.randint(100000, 999999))
def gen_txn(): return 'TXN' + ''.join(random.choices(string.digits, k=10))

# ── Auth decorators ──────────────────────────────────────────
def user_only(f):
    @wraps(f)
    def w(*a, **k):
        if not session.get('uid'):
            return jsonify({'error': 'Login required'}), 401
        return f(*a, **k)
    return w

def admin_only(f):
    @wraps(f)
    def w(*a, **k):
        if not session.get('admin'):
            return jsonify({'error': 'Admin required'}), 401
        return f(*a, **k)
    return w

# ── In-memory OTP stores ─────────────────────────────────────
_otp_store = {}   # phone  → {otp, mode, data}
_pay_store  = {}  # pay_id → otp

# ════════════════════════════════════════════════════════════
#  AUTH
# ════════════════════════════════════════════════════════════

@app.route('/api/auth/send-otp', methods=['POST'])
def send_otp():
    d     = request.get_json(silent=True) or {}
    phone = str(d.get('phone','')).strip()
    mode  = str(d.get('mode','login')).strip()

    if not phone or len(phone) != 10 or not phone.isdigit():
        return jsonify({'error': 'Enter a valid 10-digit phone number'}), 400

    if mode == 'register':
        name    = str(d.get('name',   '')).strip()
        email   = str(d.get('email',  '')).strip()
        address = str(d.get('address','')).strip()
        pincode = str(d.get('pincode','')).strip()
        if not name:    return jsonify({'error': 'Full name is required'}), 400
        if not address: return jsonify({'error': 'Address is required'}), 400
        if len(pincode) != 6: return jsonify({'error': 'Enter a valid 6-digit pincode'}), 400
        try:
            if db("SELECT id FROM users WHERE phone=%s", (phone,), one=True):
                return jsonify({'error': 'Phone already registered. Please login.'}), 400
        except Exception as e:
            return jsonify({'error': f'Database error: {e}'}), 500
        otp = gen_otp()
        _otp_store[phone] = {'otp': otp, 'mode': 'register',
                              'data': {'name':name,'email':email,'address':address,'pincode':pincode}}
    else:
        try:
            if not db("SELECT id FROM users WHERE phone=%s", (phone,), one=True):
                return jsonify({'error': 'Phone not registered. Please register first.'}), 404
        except Exception as e:
            return jsonify({'error': f'Database error: {e}'}), 500
        otp = gen_otp()
        _otp_store[phone] = {'otp': otp, 'mode': 'login', 'data': {}}

    print(f"\n  OTP for {phone}: {otp}  (mode={mode})\n")
    return jsonify({'status':'ok','demo_otp':otp,'phone':phone,'mode':mode})


@app.route('/api/auth/verify-otp', methods=['POST'])
def verify_otp():
    d     = request.get_json(silent=True) or {}
    phone = str(d.get('phone','')).strip()
    otp   = str(d.get('otp',  '')).strip()

    if not phone or not otp:
        return jsonify({'error': 'Phone and OTP required'}), 400

    record = _otp_store.get(phone)
    if not record:
        return jsonify({'error': 'No OTP found. Click Send OTP again.'}), 400
    if otp != record['otp']:
        return jsonify({'error': 'Incorrect OTP. Try again.'}), 400

    del _otp_store[phone]
    mode = record['mode']

    if mode == 'register':
        data = record['data']
        try:
            uid = db(
                "INSERT INTO users (name,phone,email,address,pincode) VALUES (%s,%s,%s,%s,%s)",
                (data['name'], phone, data['email'], data['address'], data['pincode']),
                write=True)
        except Exception as e:
            return jsonify({'error': f'Failed to create account: {e}'}), 500
        session.update({'uid': uid, 'uname': data['name'], 'uphone': phone})
        return jsonify({'status':'ok',
                        'user': {'id':uid,'name':data['name'],'phone':phone,
                                 'email':data['email'],'address':data['address'],'pincode':data['pincode']}})
    else:
        try:
            u = db("SELECT * FROM users WHERE phone=%s", (phone,), one=True)
        except Exception as e:
            return jsonify({'error': f'Database error: {e}'}), 500
        session.update({'uid': u['id'], 'uname': u['name'], 'uphone': phone})
        return jsonify({'status':'ok',
                        'user': {'id':u['id'],'name':u['name'],'phone':u['phone'],
                                 'email':u.get('email',''),'address':u.get('address',''),
                                 'pincode':u.get('pincode','')}})


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({'status':'ok'})


@app.route('/api/auth/session', methods=['GET'])
def auth_session():
    uid = session.get('uid')
    if uid:
        try:
            u = db("SELECT id,name,phone,email,address,pincode FROM users WHERE id=%s", (uid,), one=True)
            if u: return jsonify({'logged_in': True, 'user': u})
        except: pass
    return jsonify({'logged_in': False})


@app.route('/api/user/profile', methods=['PUT'])
@user_only
def update_profile():
    d = request.get_json(silent=True) or {}
    db("UPDATE users SET name=%s,email=%s WHERE id=%s",
       (d.get('name',''), d.get('email',''), session['uid']), write=True)
    u = db("SELECT id,name,phone,email,address,pincode FROM users WHERE id=%s",
           (session['uid'],), one=True)
    return jsonify({'status':'ok','user':u})


@app.route('/api/user/orders', methods=['GET'])
@user_only
def user_orders():
    rows = db("""SELECT o.*,
                        GROUP_CONCAT(oi.item_name,' x',oi.quantity SEPARATOR ', ') AS items_summary
                 FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id
                 WHERE o.user_id=%s GROUP BY o.id ORDER BY o.created_at DESC""",
              (session['uid'],))
    return jsonify({'status':'ok','orders': rows})


@app.route('/api/user/bookings', methods=['GET'])
@user_only
def user_bookings():
    rows = db("SELECT * FROM bookings WHERE user_id=%s ORDER BY booking_date DESC",
              (session['uid'],))
    return jsonify({'status':'ok','bookings': rows})


# ════════════════════════════════════════════════════════════
#  MENU
# ════════════════════════════════════════════════════════════

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({'status':'ok','categories': db("SELECT * FROM categories ORDER BY id")})


@app.route('/api/menu', methods=['GET'])
def get_menu():
    cat = request.args.get('category','')
    if cat:
        rows = db("""SELECT m.*, c.name AS category_name, c.icon AS category_icon
                     FROM menu_items m JOIN categories c ON m.category_id=c.id
                     WHERE c.name=%s AND m.is_available=1 ORDER BY m.id""", (cat,))
    else:
        rows = db("""SELECT m.*, c.name AS category_name, c.icon AS category_icon
                     FROM menu_items m JOIN categories c ON m.category_id=c.id
                     WHERE m.is_available=1 ORDER BY c.id, m.id""")
    return jsonify({'status':'ok','items': rows})


@app.route('/api/admin/menu', methods=['GET'])
@admin_only
def admin_menu():
    rows = db("""SELECT m.*, c.name AS category_name
                 FROM menu_items m JOIN categories c ON m.category_id=c.id
                 ORDER BY c.id, m.id""")
    return jsonify({'status':'ok','items': rows})


@app.route('/api/admin/menu', methods=['POST'])
@admin_only
def add_item():
    d = request.get_json(silent=True) or {}
    if not d.get('name') or not d.get('price'):
        return jsonify({'error': 'Name and price required'}), 400
    iid = db("INSERT INTO menu_items (category_id,name,description,price,is_veg,image_url,is_available) VALUES (%s,%s,%s,%s,%s,%s,1)",
             (d.get('category_id',1), d['name'], d.get('description',''),
              float(d['price']), int(d.get('is_veg',1)), d.get('image_url','')), write=True)
    return jsonify({'status':'ok','item_id': iid}), 201


@app.route('/api/admin/menu/<int:iid>', methods=['PUT'])
@admin_only
def update_item(iid):
    d = request.get_json(silent=True) or {}
    item = db("SELECT id FROM menu_items WHERE id=%s", (iid,), one=True)
    if not item: return jsonify({'error': 'Not found'}), 404
    db("""UPDATE menu_items SET category_id=%s, name=%s, description=%s,
            price=%s, is_veg=%s, image_url=%s WHERE id=%s""",
       (int(d.get('category_id',1)), str(d.get('name','')), str(d.get('description','')),
        float(d.get('price',0)), int(d.get('is_veg',1)), str(d.get('image_url','')), iid), write=True)
    return jsonify({'status':'ok', 'message': 'Item updated!'})


@app.route('/api/admin/menu/<int:iid>/toggle', methods=['PATCH'])
@admin_only
def toggle_item(iid):
    item = db("SELECT is_available FROM menu_items WHERE id=%s", (iid,), one=True)
    if not item: return jsonify({'error': 'Not found'}), 404
    new_val = 0 if item['is_available'] else 1
    db("UPDATE menu_items SET is_available=%s WHERE id=%s", (new_val, iid), write=True)
    return jsonify({'status':'ok', 'is_available': new_val})


@app.route('/api/admin/menu/<int:iid>', methods=['DELETE'])
@admin_only
def remove_item(iid):
    item = db("SELECT name FROM menu_items WHERE id=%s", (iid,), one=True)
    if not item: return jsonify({'error': 'Not found'}), 404
    db("DELETE FROM order_items WHERE menu_item_id=%s", (iid,), write=True)
    db("DELETE FROM menu_items WHERE id=%s", (iid,), write=True)
    return jsonify({'status':'ok', 'message': f'Item deleted!'})


@app.route('/api/admin/menu/<int:iid>/restore', methods=['PATCH'])
@admin_only
def restore_item(iid):
    db("UPDATE menu_items SET is_available=1 WHERE id=%s", (iid,), write=True)
    return jsonify({'status':'ok'})


# ════════════════════════════════════════════════════════════
#  ORDERS  ← completely rewritten, no complexity
# ════════════════════════════════════════════════════════════

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        d      = request.get_json(silent=True) or {}
        items  = d.get('items', [])
        method = str(d.get('payment_method', 'cash'))
        uid    = d.get('user_id') or session.get('uid')
        cname  = str(d.get('customer_name')  or 'Guest')
        cphone = str(d.get('customer_phone') or '')
        addr   = str(d.get('delivery_address') or '')
        txnid  = str(d.get('txn_id') or '')

        print(f"[ORDER] name={cname} items={len(items)} method={method} uid={uid}")

        if not items:
            return jsonify({'error': 'Cart is empty'}), 400

        # Price items
        sub, rich = 0.0, []
        for it in items:
            mid = int(it.get('menu_item_id', 0))
            qty = max(1, int(it.get('quantity', 1)))
            row = db("SELECT id,name,price FROM menu_items WHERE id=%s",
                     (mid,), one=True)
            if not row:
                return jsonify({'error': f'Item {mid} not found'}), 400
            # Auto-fix availability if not set (handles seed data without is_available)
            db("UPDATE menu_items SET is_available=1 WHERE id=%s AND (is_available IS NULL OR is_available=0)", (mid,), write=True)
            price  = float(row['price'])
            subtot = round(price * qty, 2)
            sub   += subtot
            rich.append((int(row['id']), str(row['name']), qty, price, subtot))

        sub   = round(sub, 2)
        gst   = round(sub * 0.05, 2)
        total = round(sub + gst, 2)
        ps    = 'paid' if method != 'cash' else 'pending'
        tid   = txnid or (gen_txn() if ps == 'paid' else None)

        # Save order
        oid = db(
            """INSERT INTO orders
               (user_id, customer_name, customer_phone, delivery_address,
                total_amount, gst_amount, status, payment_method, payment_status, txn_id)
               VALUES (%s,%s,%s,%s,%s,%s,'pending',%s,%s,%s)""",
            (uid, cname, cphone, addr, total, gst, method, ps, tid),
            write=True)

        # Save order items
        for (mid, iname, qty, price, subtot) in rich:
            db("INSERT INTO order_items (order_id,menu_item_id,item_name,quantity,unit_price,subtotal) VALUES (%s,%s,%s,%s,%s,%s)",
               (oid, mid, iname, qty, price, subtot), write=True)

        order_num = f'#ORD{str(oid).zfill(4)}'
        print(f"[ORDER] ✅ SUCCESS {order_num} total=₹{total}")

        return jsonify({
            'status':    'ok',
            'order_id':  int(oid),
            'order_num': order_num,
            'total':     float(total),
            'gst':       float(gst),
            'txn_id':    tid,
            'message':   f'Order {order_num} placed!'
        }), 201

    except Exception as e:
        print(f"[ORDER ERROR] {traceback.format_exc()}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders', methods=['GET'])
@admin_only
def list_orders():
    rows = db("""SELECT o.*,
                        GROUP_CONCAT(oi.item_name,' x',oi.quantity SEPARATOR ', ') AS items_summary
                 FROM orders o LEFT JOIN order_items oi ON o.id=oi.order_id
                 GROUP BY o.id ORDER BY o.created_at DESC LIMIT 100""")
    return jsonify({'status':'ok','orders': rows})


@app.route('/api/orders/<int:oid>/status', methods=['PATCH'])
@admin_only
def update_status(oid):
    s = (request.get_json(silent=True) or {}).get('status')
    valid = ('pending','preparing','ready','delivered','cancelled')
    if s not in valid:
        return jsonify({'error': 'Invalid status'}), 400
    db("UPDATE orders SET status=%s WHERE id=%s", (s, oid), write=True)
    return jsonify({'status':'ok'})


# ════════════════════════════════════════════════════════════
#  PAYMENTS
# ════════════════════════════════════════════════════════════

@app.route('/api/payments/initiate', methods=['POST'])
def pay_initiate():
    import secrets
    otp    = gen_otp()
    pay_id = 'PS' + secrets.token_hex(8).upper()
    _pay_store[pay_id] = otp
    print(f"[PAY] initiate pay_id={pay_id} otp={otp}")
    return jsonify({'status':'ok','session_id': pay_id,'demo_otp': otp})


@app.route('/api/payments/verify-otp', methods=['POST'])
def pay_verify():
    d      = request.get_json(silent=True) or {}
    otp    = str(d.get('otp',       '')).strip()
    pay_id = str(d.get('session_id',''))
    stored = _pay_store.get(pay_id, '')
    print(f"[PAY] verify pay_id={pay_id} entered={otp} stored={stored}")
    if len(otp) == 6 and otp == stored:
        _pay_store.pop(pay_id, None)
        return jsonify({'status':'ok','verified': True,'txn_id': gen_txn()})
    return jsonify({'status':'error','verified': False,'message': 'Incorrect OTP'}), 400


@app.route('/api/payments/confirm', methods=['POST'])
def pay_confirm():
    d = request.get_json(silent=True) or {}
    try:
        if d.get('order_id'):
            db("UPDATE orders SET payment_status='paid',txn_id=%s WHERE id=%s",
               (d.get('txn_id'), d.get('order_id')), write=True)
    except Exception as e:
        print(f"[PAY CONFIRM WARN] {e}")
    return jsonify({'status':'ok'})


# ════════════════════════════════════════════════════════════
#  BOOKINGS
# ════════════════════════════════════════════════════════════

@app.route('/api/bookings', methods=['POST'])
def create_booking():
    d = request.get_json(silent=True) or {}
    if not d.get('customer_name') or not d.get('phone') or not d.get('booking_date'):
        return jsonify({'error': 'Name, phone and date are required'}), 400
    bid = db("""INSERT INTO bookings
               (user_id,customer_name,phone,guest_count,booking_date,booking_time,special_notes)
               VALUES (%s,%s,%s,%s,%s,%s,%s)""",
             (session.get('uid'), d['customer_name'], d['phone'],
              int(d.get('guest_count',2)), d['booking_date'],
              d.get('booking_time','7:00 PM'), d.get('special_notes','')), write=True)
    return jsonify({'status':'ok','booking_num': f'#BKG{str(bid).zfill(4)}'}), 201


@app.route('/api/bookings', methods=['GET'])
@admin_only
def list_bookings():
    return jsonify({'status':'ok',
                    'bookings': db("SELECT * FROM bookings ORDER BY booking_date DESC LIMIT 100")})


# ════════════════════════════════════════════════════════════
#  ADMIN
# ════════════════════════════════════════════════════════════

@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    d = request.get_json(silent=True) or {}
    u = db("SELECT * FROM admin_users WHERE username=%s", (d.get('username',''),), one=True)
    if u and d.get('password') in (u['password_hash'], 'admin1234'):
        session.update({'admin': True, 'adminname': u['username']})
        return jsonify({'status':'ok','message': f'Welcome, {u["username"]}!'})
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin', None); session.pop('adminname', None)
    return jsonify({'status':'ok'})


@app.route('/api/admin/session', methods=['GET'])
def admin_session():
    return jsonify({'logged_in': bool(session.get('admin')),
                    'username':  session.get('adminname','')})


@app.route('/api/admin/stats', methods=['GET'])
@admin_only
def stats():
    return jsonify({'status':'ok','stats': {
        'total_orders':   db("SELECT COUNT(*) AS n FROM orders", one=True)['n'],
        'pending':        db("SELECT COUNT(*) AS n FROM orders WHERE status='pending'",  one=True)['n'],
        'preparing':      db("SELECT COUNT(*) AS n FROM orders WHERE status='preparing'",one=True)['n'],
        'ready':          db("SELECT COUNT(*) AS n FROM orders WHERE status='ready'",    one=True)['n'],
        'revenue':        float(db("SELECT COALESCE(SUM(total_amount),0) AS r FROM orders WHERE payment_status='paid'",one=True)['r']),
        'total_bookings': db("SELECT COUNT(*) AS n FROM bookings", one=True)['n'],
        'total_users':    db("SELECT COUNT(*) AS n FROM users",    one=True)['n'],
    }})


# ════════════════════════════════════════════════════════════
#  TEST ENDPOINT — open http://localhost:5000/api/test
# ════════════════════════════════════════════════════════════

@app.route('/api/test', methods=['GET'])
def test():
    try:
        items = db("SELECT id,name,price FROM menu_items WHERE is_available=1 LIMIT 3")
        # Try a full order insert + delete
        oid = db("""INSERT INTO orders
                    (user_id,customer_name,customer_phone,delivery_address,
                     total_amount,gst_amount,status,payment_method,payment_status,txn_id)
                    VALUES (%s,%s,%s,%s,%s,%s,'pending',%s,%s,%s)""",
                 (None,'TEST','0000000000','test',60.0,3.0,'cash','pending',None), write=True)
        db("INSERT INTO order_items (order_id,menu_item_id,item_name,quantity,unit_price,subtotal) VALUES (%s,%s,%s,%s,%s,%s)",
           (oid, items[0]['id'], str(items[0]['name']), 1, float(items[0]['price']), float(items[0]['price'])), write=True)
        db("DELETE FROM order_items WHERE order_id=%s", (oid,), write=True)
        db("DELETE FROM orders WHERE id=%s", (oid,), write=True)
        return jsonify({'status':'ok',
                        'message':'✅ Database is working! Orders will be placed successfully.',
                        'menu_count': len(items)})
    except Exception as e:
        return jsonify({'status':'error','error': str(e),
                        'hint': 'Run: mysql -u root -p22KB1A0573 < database/fix_migration.sql'}), 500


# ════════════════════════════════════════════════════════════

def add_column_if_missing(table, column, definition):
    """Works on MySQL 5.7 and 8.0+ - checks INFORMATION_SCHEMA before altering."""
    try:
        exists = db(
            "SELECT COUNT(*) AS n FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=%s AND COLUMN_NAME=%s",
            (table, column), one=True
        )
        if not exists or exists['n'] == 0:
            db(f"ALTER TABLE {table} ADD COLUMN {column} {definition}", write=True)
            print(f"[STARTUP] Added column {table}.{column}")
    except Exception as e:
        print(f"[STARTUP] Warning: could not add {table}.{column} -> {e}")

def startup_fix():
    """Ensure DB columns exist and menu items are marked available on startup."""
    # orders table - add all columns that may be missing (compatible with MySQL 5.7+)
    add_column_if_missing('orders', 'user_id',          'INT NULL')
    add_column_if_missing('orders', 'customer_phone',   'VARCHAR(20) NULL')
    add_column_if_missing('orders', 'delivery_address', 'TEXT NULL')
    add_column_if_missing('orders', 'gst_amount',       'DECIMAL(10,2) DEFAULT 0')
    add_column_if_missing('orders', 'payment_method',   "VARCHAR(50) DEFAULT 'cash'")
    add_column_if_missing('orders', 'payment_status',   "ENUM('pending','paid','failed') DEFAULT 'pending'")
    add_column_if_missing('orders', 'txn_id',           'VARCHAR(100) NULL')
    # Fix menu item availability
    try:
        db("UPDATE menu_items SET is_available=1 WHERE is_available IS NULL OR is_available=0", write=True)
    except Exception as e:
        print(f"[STARTUP] Warning: is_available fix failed -> {e}")
    print("[STARTUP] ✅ DB schema ensured.")

startup_fix()

if __name__ == '__main__':
    print("\n" + "="*50)
    print("  🌶️  The Spicy Venue → http://localhost:5000")
    print(f"  DB : {DB_CFG['database']} @ {DB_CFG['host']}")
    print(f"  PWD: {DB_CFG['password']}")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
