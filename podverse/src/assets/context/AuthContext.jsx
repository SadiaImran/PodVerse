// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../../connection_supabase_client";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
  
        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("❗ Unexpected error fetching session:", err);
      } finally {
        setLoading(false);
      }
    };
  
    getInitialSession();
  }, []);
  

  // ✅ Fetch user profile safely
  const loadProfile = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, profile_url")
        .eq("id", authUser.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // Ignore "No rows found" error
        console.error("Error fetching profile:", error.message);
      }

      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || "",
        profile_url: profile?.profile_url || null,
      });
    } catch (err) {
      console.error("Unexpected error loading profile:", err);
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: "",
        profile_url: null,
      });
    }
  };

  // ✅ Logout function
  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {!loading ? children : <div>Loading...</div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
