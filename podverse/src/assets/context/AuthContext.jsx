// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // holds user + profile info
  const [loading, setLoading] = useState(true);

  // Load current session and profile on mount
  useEffect(() => {
    const getInitialSession = async () => {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadProfile(session.user);
      }
      setLoading(false);
    };

    getInitialSession();

    // Listen for auth state changes
    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setUser(null);
        }
      }
    );

    return () => subscription.subscription.unsubscribe();
  }, []);

  // Fetch user profile from "profiles" table
  const loadProfile = async (authUser) => {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("full_name, profile_url")
      .eq("id", authUser.id)
      .single();

    setUser({
      id: authUser.id,
      email: authUser.email,
      full_name: profile?.full_name || "",
      profile_url: profile?.profile_url || null,
    });
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
