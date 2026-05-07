import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, useGetMe, setAuthTokenGetter, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("crm_token"));
  const [user, setUser] = useState<User | null>(null);
  
  // Set the custom fetch auth getter
  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("crm_token"));
  }, []);

  const { data: meData, isLoading: isMeLoading } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (meData) {
      setUser(meData);
    }
  }, [meData]);

  // Handle unauthorized/invalid token
  useEffect(() => {
    if (token && !isMeLoading && !meData && !localStorage.getItem("crm_token")) {
      // In a real app we'd use error interceptors, but this is a simple check
      logout();
    }
  }, [token, isMeLoading, meData]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem("crm_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem("crm_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading: isMeLoading && !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
