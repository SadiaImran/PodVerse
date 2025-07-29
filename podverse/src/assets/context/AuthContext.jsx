// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
<<<<<<< HEAD
import { supabase } from "../supabaseClient";
=======
import { supabase } from "../../connection_supabase_client";
>>>>>>> 0b713f444b116cd4d55e20dfb96d7956c5cef15d

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
<<<<<<< HEAD
    await supabase.auth.signOut();
    setUser(null);
  };
=======
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Logout failed:", error.message);
    }
    setUser(null);
  };
  
>>>>>>> 0b713f444b116cd4d55e20dfb96d7956c5cef15d

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
