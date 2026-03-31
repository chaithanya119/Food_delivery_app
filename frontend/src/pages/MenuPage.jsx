import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

// ── Image Map (exact URLs as provided) ────────────────────
function getImage(name) {
  const images = {
    'Idli Sambar':          'https://static.toiimg.com/thumb/115501753/115501753.jpg?height=746&width=420&resizemode=76&imgsize=94996',
    'Masala Dosa':          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQijTni4jT4r4o3rdTvrnVKFHA49hd50wQo0w&s',
    'Upma':                 'https://myfoodstory.com/wp-content/uploads/2022/11/Vegetable-Upma-3.jpg',
    'Vada Sambar':          'https://www.sharmispassions.com/wp-content/uploads/2020/12/31788694212_f472703d61_o-475x500.jpg',
    'Pongal':               'https://spiceindiaonline.com/wp-content/uploads/2014/01/Ven-Pongal-3.jpg',
    'Pesarattu':            'https://www.masalakorb.com/wp-content/uploads/2019/06/Pesarattu-Preparation-V4.jpg',
    'Hyderabadi Biryani':   'https://vismaifood.com/storage/app/uploads/public/d86/3b2/d6d/thumb__700_0_0_0_auto.jpg',
    'Veg Biryani':          'https://www.madhuseverydayindian.com/wp-content/uploads/2022/11/easy-vegetable-biryani.jpg',
    'Rasam Rice':           'https://mytastycurry.com/wp-content/uploads/2024/02/Pepper-rasam-recipe-featured.jpg',
    'Curd Rice':            'https://www.indianveggiedelight.com/wp-content/uploads/2022/08/curd-rice-featured.jpg',
    'Fish Curry + Rice':    'https://greedy-panda.com/wp-content/uploads/2017/09/36_Goan-Fish-Curry-with-Basmati-Rice_001-1600x1600.jpg.webp',
    'Paneer Butter Masala': 'https://www.vegrecipesofindia.com/wp-content/uploads/2020/01/paneer-butter-masala-5.jpg',
    'Filter Coffee':        'https://www.sharmispassions.com/wp-content/uploads/2012/01/filter-coffee-recipe8.jpg',
    'Mango Lassi':          'https://annikaeats.com/wp-content/uploads/2024/03/DSC_1071.jpg',
    'Masala Chai':          'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSZ77qN95IL_ZpIb7rnbE6ohLFDkVYEnt1_0g&s',
    'Buttermilk':           'https://www.trulydesi.in/cdn/shop/articles/3_8a1a3548-3fa6-4fe2-9209-8a0e0ca96032.jpg?v=1758521132',
    // extras with fallback images
    'Poha':                 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/06/Poha.jpg/640px-Poha.jpg',
    'Dal Tadka + Rice':     'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e9/Dal_fry.jpg/640px-Dal_fry.jpg',
    'Sambar Rice':          'https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Rasam_rice.jpg/640px-Rasam_rice.jpg',
    'Chicken Curry + Rice': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/50/Chicken_curry.jpg/640px-Chicken_curry.jpg',
    'Egg Curry + Rice':     'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Egg_curry.jpg/640px-Egg_curry.jpg',
    'Pakora':               'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Pakodas.jpg/640px-Pakodas.jpg',
    'Samosa':               'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5b/Samosachutney.jpg/640px-Samosachutney.jpg',
    'Bread Bajji':          'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Medu_Vada.jpg/640px-Medu_Vada.jpg',
    'Mirchi Bajji':         'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a9/Medu_Vada.jpg/640px-Medu_Vada.jpg',
    'Fresh Lime Soda':      'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9f/Lassi_glass.jpg/640px-Lassi_glass.jpg',
  };
  return images[name] ||
    'https://placehold.co/640x480/FFF3E0/E8630A?text=' + encodeURIComponent(name);
}

export default function MenuPage() {
  const [items,      setItems]      = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCat,  setActiveCat]  = useState('');
  const [loading,    setLoading]    = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    axios.get('/api/categories')
      .then(r => setCategories(r.data.categories))
      .catch(() => {});
    loadMenu('');
  }, []);

  const loadMenu = async (cat) => {
    setLoading(true);
    try {
      const url = cat
        ? '/api/menu?category=' + encodeURIComponent(cat)
        : '/api/menu';
      const res = await axios.get(url);
      setItems(res.data.items);
    } catch {
      toast.error('Could not load menu. Make sure server is running.');
    } finally {
      setLoading(false);
    }
  };

  const filterCat = (cat) => { setActiveCat(cat); loadMenu(cat); };
  const handleAdd = (item) => {
    addToCart(item);
    toast.success('✅ ' + item.name + ' added to cart!');
  };

  return (
    <div>

      {/* ── HERO ─────────────────────────────────────────── */}
      <div className="hero">
        <div className="hero-tag">Home Cooked Meals · Nellore, AP</div>
        <h1>Home Cooked Flavors,<br /><em>Digital Simplicity</em></h1>
        <p>
          Browse Mom's handcrafted home-style menu,
          add to cart, and pay in seconds.
        </p>
        <button
          className="hero-cta"
          onClick={() =>
            document.querySelector('.section-header')
              ?.scrollIntoView({ behavior: 'smooth' })
          }
        >
          Explore Menu ↓
        </button>
      </div>

      {/* ── CATEGORY FILTER ──────────────────────────────── */}
      <div className="section-header">
        <div className="section-title">Our Menu</div>
        <div className="cat-tabs">
          <button
            className={'cat-tab ' + (activeCat === '' ? 'active' : '')}
            onClick={() => filterCat('')}
          >
            All
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              className={'cat-tab ' + (activeCat === c.name ? 'active' : '')}
              onClick={() => filterCat(c.name)}
            >
              {c.icon} {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* ── MENU GRID ────────────────────────────────────── */}
      <div className="menu-grid">
        {loading ? (
          <div className="loading-text">🍽️ Loading menu...</div>
        ) : !items.length ? (
          <div className="loading-text">No items found.</div>
        ) : (
          items.map(item => (
            <div className="menu-card" key={item.id}>

              {/* Image */}
              <div className="menu-img">
                <img
                  src={getImage(item.name)}
                  alt={item.name}
                  loading="lazy"
                  onError={e => {
                    e.target.onerror = null;
                    e.target.src =
                      'https://placehold.co/640x480/FFF3E0/E8630A?text=' +
                      encodeURIComponent(item.name);
                  }}
                />
              </div>

              {/* Body */}
              <div className="menu-body">
                <div className="menu-name">{item.name}</div>
                <div className="menu-desc">{item.description}</div>
                <div className="menu-footer">
                  <div className="menu-price">
                    ₹{parseFloat(item.price).toFixed(0)}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      className="veg-badge"
                      style={{
                        border: '1.5px solid ' + (item.is_veg ? '#2E7D32' : '#C62828')
                      }}
                    >
                      <div
                        className="veg-dot"
                        style={{ background: item.is_veg ? '#2E7D32' : '#C62828' }}
                      />
                    </div>
                    <button
                      className="add-btn"
                      onClick={() => handleAdd(item)}
                    >
                      Add +
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))
        )}
      </div>
    </div>
  );
}
