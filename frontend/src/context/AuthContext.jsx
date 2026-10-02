import { createContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const googleLoginPromiseRef = useRef(null);
  const googleRegisterPromiseRef = useRef(null);

  useEffect(() => {
    if (token) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          setIsAuthenticated(true);
        } catch (e) {
          console.error("Failed to parse user from local storage", e);
        }
      }
      // Optionally fetch /me to verify token validity on load
      api.get('/auth/me')
        .then(res => {
          setUser(res.data);
          setIsAuthenticated(true);
          localStorage.setItem('user', JSON.stringify(res.data));
        })
        .catch(() => {
          logout();
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    
    const handleUnauthorized = () => {
      logout();
    };
    
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, [token]);

  const login = useCallback(async (email, password) => {
    const formData = new URLSearchParams();
    formData.append('username', email); // OAuth2 expects username
    formData.append('password', password);

    const res = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const data = res.data;
    setToken(data.access_token);
    localStorage.setItem('token', data.access_token);
    
    // Fetch user details immediately
    const userRes = await api.get('/auth/me', {
      headers: { Authorization: `Bearer ${data.access_token}` }
    });
    
    setUser(userRes.data);
    setIsAuthenticated(true);
    localStorage.setItem('user', JSON.stringify(userRes.data));
    return userRes.data;
  }, []);

  const loginWithGoogle = useCallback(async (googleUser) => {
    if (googleLoginPromiseRef.current) {
      return googleLoginPromiseRef.current;
    }

    googleLoginPromiseRef.current = (async () => {
      try {
        const res = await api.post('/auth/google', {
          email: googleUser.email,
          name: googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'Farmer'),
          google_id: googleUser.uid,
          photo_url: googleUser.photoURL || null,
          mode: 'login'
        });

        const data = res.data;
        setToken(data.access_token);
        localStorage.setItem('token', data.access_token);

        const userRes = await api.get('/auth/me', {
          headers: { Authorization: `Bearer ${data.access_token}` }
        });

        setUser(userRes.data);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(userRes.data));
        return userRes.data;
      } finally {
        googleLoginPromiseRef.current = null;
      }
    })();

    return googleLoginPromiseRef.current;
  }, []);

  const registerWithGoogle = useCallback(async (googleUser) => {
    if (googleRegisterPromiseRef.current) {
      return googleRegisterPromiseRef.current;
    }

    googleRegisterPromiseRef.current = (async () => {
      try {
        const res = await api.post('/auth/google', {
          email: googleUser.email,
          name: googleUser.displayName || (googleUser.email ? googleUser.email.split('@')[0] : 'Farmer'),
          google_id: googleUser.uid,
          photo_url: googleUser.photoURL || null,
          mode: 'signup'
        });
        return res.data;
      } finally {
        googleRegisterPromiseRef.current = null;
      }
    })();

    return googleRegisterPromiseRef.current;
  }, []);

  const register = useCallback(async (userData) => {
    const res = await api.post('/auth/register', userData);
    return res.data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Also sign out from Firebase to prevent auto-login loops
    import('../firebase').then(({ auth }) => {
      auth.signOut().catch(console.error);
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated, isLoading, login, register, loginWithGoogle, registerWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
