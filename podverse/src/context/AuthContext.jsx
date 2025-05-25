// src/context/AuthContext.js
import { createContext, useContext, useEffect, useState } from 'react';
import { authenticate, logout as logoutAPI } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authenticate()
      .then(() => setUser(true))
      .catch(() => setUser(false))
      .finally(() => setLoading(false));
  }, []);

  const login = () => setUser(true);

  const logout = async () => {
    await logoutAPI();        // 🔁 call server to clear session/cookie
    setUser(false);          
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
