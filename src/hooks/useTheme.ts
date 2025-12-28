import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    // Recuperar tema guardado o usar 'system' por defecto
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as Theme) || 'system';
    }
    return 'system';
  });

  const [mounted, setMounted] = useState(false);

  // Marcar como montado después del primer render
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const root = window.document.documentElement;
    
    // Remover clases previas
    root.classList.remove('light', 'dark');
    
    if (theme === 'system') {
      // Usar preferencia del sistema
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      // Usar tema seleccionado
      root.classList.add(theme);
    }
    
    // Guardar en localStorage
    localStorage.setItem('theme', theme);
  }, [theme, mounted]);

  // Escuchar cambios en la preferencia del sistema
  useEffect(() => {
    if (!mounted || theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, mounted]);

  return {
    theme,
    setTheme,
    mounted,
    // Función helper para saber si está en modo oscuro
    isDark: mounted && (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)),
  };
}