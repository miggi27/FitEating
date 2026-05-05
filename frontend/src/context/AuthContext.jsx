import React, { createContext, useState, useContext, useEffect } from "react";
import axios from "axios";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // 앱이 켜질 때 로컬스토리지에 토큰이 있으면 로그인 유지
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      // 나중에 여기서 서버에 "나 누구게?" 물어보는 프로필 API를 호출하면 완벽합니다.
      setUser({ username: localStorage.getItem("username") });
    }
  }, [token]);

  const login = (newToken, username) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("username", username);
    setToken(newToken);
    setUser({ username });
    axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);