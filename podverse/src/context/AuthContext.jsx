// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { authenticate, logout as logoutAPI, getUserProfile } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
    authenticate()
    fetchUser()
      .then(() => setUser(true))
      .catch(() => setUser(false))
      .finally(() => setLoading(false));
=======
    (async () => {
      try {
        const authRes = await authenticate();
        if (authRes?.data?.userId) {
          await fetchUser();
          setUser(true);
        } else {
          setUser(false);
        }
      } catch {
        setUser(false);
      } finally {
        setLoading(false);
      }
    })();
>>>>>>> reconfigure-1-SI
  }, []);
  

<<<<<<< HEAD
  const login = async () => {
    setUser(true);
    const profile = await getUserProfile();
    console.log("User profile fetched:", profile);
    setUserData(profile);
  }
=======
  const login = (profile) => {
    setUser(true);
    setUserData(profile);
    localStorage.setItem("user", JSON.stringify(profile)); // optional for persistence
  };
  
>>>>>>> reconfigure-1-SI

  const logout = async () => {
    await logoutAPI();        // 🔁 call server to clear session/cookie
    setUser(false);
    setUserData(null);          
  };

  const fetchUser = async () => {
    const profile = await getUserProfile();
    console.log("User profile fetched:", profile);
    setUserData(profile);
};

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout , userData, setUserData}}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
