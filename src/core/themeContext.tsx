import React, { createContext, useContext, useEffect } from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('dark');
    root.classList.add('light');
    try {
      localStorage.removeItem('filewala-theme');
      sessionStorage.removeItem('filewala-theme-session');
    } catch {
      // ignore
    }
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme: 'light',
        isDark: false,
        setTheme: () => {},
        toggleTheme: () => {},
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    return {
      theme: 'light',
      isDark: false,
      setTheme: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
};
