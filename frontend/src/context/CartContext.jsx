import React,{createContext,useContext,useState} from 'react';
const Ctx=createContext();
export const useCart=()=>useContext(Ctx);
export function CartProvider({children}){
  const [cart,setCart]=useState({});
  const addToCart=item=>setCart(p=>({...p,[item.id]:p[item.id]?{...p[item.id],qty:p[item.id].qty+1}:{...item,qty:1}}));
  const changeQty=(id,d)=>setCart(p=>{const u={...p};if(!u[id])return p;u[id]={...u[id],qty:u[id].qty+d};if(u[id].qty<=0)delete u[id];return u;});
  const clearCart=()=>setCart({});
  const cartItems=Object.values(cart);
  const totalQty=cartItems.reduce((s,i)=>s+i.qty,0);
  const subtotal=cartItems.reduce((s,i)=>s+i.price*i.qty,0);
  const gst=Math.round(subtotal*0.05);
  const total=subtotal+gst;
  return <Ctx.Provider value={{cart,cartItems,addToCart,changeQty,clearCart,totalQty,subtotal,gst,total}}>{children}</Ctx.Provider>;
}
