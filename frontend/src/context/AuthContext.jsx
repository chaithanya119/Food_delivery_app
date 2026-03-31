import React,{createContext,useContext,useState,useEffect} from 'react';
import axios from 'axios';
const Ctx = createContext();
export const useAuth = () => useContext(Ctx);
export function AuthProvider({children}){
  const [user,setUser]=useState(null);
  const [adminLoggedIn,setAdminLoggedIn]=useState(false);
  const [adminUsername,setAdminUsername]=useState('');
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    Promise.all([
      axios.get('/api/auth/session',{withCredentials:true}).then(r=>{ if(r.data.logged_in) setUser(r.data.user); }).catch(()=>{}),
      axios.get('/api/admin/session',{withCredentials:true}).then(r=>{ if(r.data.logged_in){setAdminLoggedIn(true);setAdminUsername(r.data.username);} }).catch(()=>{})
    ]).finally(()=>setLoading(false));
  },[]);
  const loginUser=u=>setUser(u);
  const logoutUser=async()=>{ await axios.post('/api/auth/logout',{},{withCredentials:true}); setUser(null); };
  const loginAdmin=(n)=>{setAdminLoggedIn(true);setAdminUsername(n);};
  const logoutAdmin=async()=>{ await axios.post('/api/admin/logout',{},{withCredentials:true}); setAdminLoggedIn(false);setAdminUsername(''); };
  return <Ctx.Provider value={{user,adminLoggedIn,adminUsername,loading,loginUser,logoutUser,loginAdmin,logoutAdmin}}>{children}</Ctx.Provider>;
}
