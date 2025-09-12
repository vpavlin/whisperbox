import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import WalletConnect from './WalletConnect';
import { ChevronRight, Moon, Sun, Circle } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import WakuStatusIcon from './WakuStatusIcon';

const Navbar: React.FC = () => {
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Create Form', path: '/create' },
    { name: 'My Forms', path: '/forms' },
  ];

  return (
    <motion.header
      className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-6 py-4 transition-all duration-300 ${
        scrolled ? 'glassmorphism shadow-sm' : 'bg-transparent'
      }`}
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="relative w-8 h-8">
            <motion.div
              className="absolute inset-0 bg-primary rounded-lg"
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <div className="absolute inset-1 bg-white rounded-md flex items-center justify-center">
              <span className="text-primary font-bold text-lg">W</span>
            </div>
          </div>
          <span className="text-xl font-semibold tracking-tight">WhisperBox</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                location.pathname === link.path
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-secondary text-foreground/80 hover:text-foreground'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-secondary transition-colors duration-200 text-foreground/70 hover:text-foreground"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <WakuStatusIcon />
          <WalletConnect />
        </div>
      </div>

      {/* Mobile navigation */}
      <div className="md:hidden mt-4 flex justify-center">
        <div className="flex items-center space-x-1 bg-secondary/80 backdrop-blur-sm p-1 rounded-lg">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-200 flex items-center ${
                location.pathname === link.path
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-sm'
                  : 'text-foreground/70 hover:text-foreground hover:bg-white/50 dark:hover:bg-gray-700/50'
              }`}
            >
              {link.name}
              {location.pathname === link.path && (
                <ChevronRight className="w-3 h-3 ml-1" />
              )}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-md text-xs font-medium transition-colors duration-200 text-foreground/70 hover:text-foreground hover:bg-white/50 dark:hover:bg-gray-700/50"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Navbar;
