// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient.js";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getInitialSession = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();
  
        if (error) {
          console.error("❌ Session error:", error);
          setUser(null);
          return;
        }

        if (session?.user) {
          await loadProfile(session.user);
        } else {
          setUser(null);
        }
      } catch (err) {
        console.error("❗ Unexpected error fetching session:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
  
    getInitialSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔄 Auth state changed:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("✅ User signed in:", session.user.id);
        await loadProfile(session.user);
      } else if (event === 'SIGNED_OUT') {
        console.log("🚪 User signed out");
        setUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // ✅ Fetch user profile safely
  const loadProfile = async (authUser) => {
    try {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, profile_url, onboarding_complete")
        .eq("id", authUser.id)
        .maybeSingle(); // Use maybeSingle instead of single

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching profile:", error.message);
      }

      const userData = {
        id: authUser.id,
        email: authUser.email,
        full_name: profile?.full_name || "",
        profile_url: profile?.profile_url || null,
        onboarding_complete: profile?.onboarding_complete || false,
      };

      setUser(userData);
    } catch (err) {
      console.error("Unexpected error loading profile:", err);
      setUser({
        id: authUser.id,
        email: authUser.email,
        full_name: "",
        profile_url: null,
        onboarding_complete: false,
      });
    }
  };

  // ✅ Logout function
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Logout failed:", error.message);
      }
      setUser(null);
    } catch (err) {
      console.error("❌ Logout error:", err);
      setUser(null); 
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, loadProfile }}>
      {!loading ? children : (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-200 border-t-purple-600"></div>
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};