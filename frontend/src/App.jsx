import React from 'react';
import {BrowserRouter,Routes,Route,Navigate} from 'react-router-dom';
import {Toaster} from 'react-hot-toast';
import {AuthProvider} from './context/AuthContext';
import {CartProvider} from './context/CartContext';
import Navbar      from './components/Navbar';
import MenuPage    from './pages/MenuPage';
import BookingPage from './pages/BookingPage';
import AuthPage    from './pages/AuthPage';
import UserPanel   from './pages/UserPanel';
import AdminPanel  from './pages/AdminPanel';
import './App.css';

export default function App(){
  return(
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="bottom-center" toastOptions={{style:{background:'#1A0A00',color:'#fff',borderRadius:'12px',fontFamily:'DM Sans,sans-serif'}}}/>
          <Navbar/>
          <div className="app-content">
            <Routes>
              <Route path="/"        element={<MenuPage/>}/>
              <Route path="/booking" element={<BookingPage/>}/>
              <Route path="/login"   element={<AuthPage/>}/>
              <Route path="/profile" element={<UserPanel/>}/>
              <Route path="/admin"   element={<AdminPanel/>}/>
              <Route path="*"        element={<Navigate to="/"/>}/>
            </Routes>
          </div>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}
