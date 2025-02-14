import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Settings, LogOut, Home, User, Users, AlertTriangle, TrendingUp, MessageSquare, Menu, X } from 'lucide-react';
import NotificationBell from './NotificationBell';
import { useAuthStore } from '../store/authStore';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Close sidebar by default on mobile
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (user) {
      const isAdminRoute = location.pathname.startsWith('/admin');
      if (user.role === 'admin' && !isAdminRoute && location.pathname === '/dashboard') {
        navigate('/admin');
      } else if (user.role !== 'admin' && isAdminRoute) {
        navigate('/dashboard');
      }
    }
  }, [user, location.pathname, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';

  // Close sidebar and mobile menu on mobile when clicking a link
  const handleLinkClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
      setMobileMenuOpen(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Navbar */}
      <nav className="bg-white shadow-sm fixed top-0 left-0 right-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              {isAdmin && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 md:hidden"
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}
              <Link
                to={isAdmin ? '/admin' : '/dashboard'}
                className="flex items-center px-4 text-gray-700 hover:text-gray-900"
              >
                <img src="/logo-catsxchange.png" alt="CatsXChange" className="h-10 w-10 mr-2" />
                <span className="font-bold text-purple-600">CatsXChange</span>
              </Link>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden">
              <NotificationBell />
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500"
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </button>
            </div>

            {/* Desktop navigation */}
            <div className="hidden md:flex items-center space-x-4">
              <NotificationBell />
              
              {isAdmin && (
                <>
                  <Link
                    to="/admin/users"
                    className={`text-gray-700 hover:text-gray-900 flex items-center ${
                      location.pathname === '/admin/users' ? 'text-purple-600' : ''
                    }`}
                    title="Gestión de Usuarios"
                  >
                    <Users className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/admin/transfers"
                    className={`text-gray-700 hover:text-gray-900 flex items-center ${
                      location.pathname === '/admin/transfers' ? 'text-purple-600' : ''
                    }`}
                    title="Gestión de Transferencias"
                  >
                    <AlertTriangle className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/admin/stats"
                    className={`text-gray-700 hover:text-gray-900 flex items-center ${
                      location.pathname === '/admin/stats' ? 'text-purple-600' : ''
                    }`}
                    title="Estadísticas"
                  >
                    <TrendingUp className="h-5 w-5" />
                  </Link>
                  <Link
                    to="/admin/support"
                    className={`text-gray-700 hover:text-gray-900 flex items-center ${
                      location.pathname === '/admin/support' ? 'text-purple-600' : ''
                    }`}
                    title="Chats de Soporte"
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Link>
                </>
              )}

              <Link
                to="/profile"
                className={`text-gray-700 hover:text-gray-900 ${
                  location.pathname === '/profile' ? 'text-purple-600' : ''
                }`}
                title="Perfil"
              >
                <User className="h-5 w-5" />
              </Link>

              <Link
                to="/settings"
                className={`text-gray-700 hover:text-gray-900 ${
                  location.pathname === '/settings' ? 'text-purple-600' : ''
                }`}
                title="Configuración"
              >
                <Settings className="h-5 w-5" />
              </Link>

              <button
                onClick={handleSignOut}
                className="text-gray-700 hover:text-gray-900"
                title="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} md:hidden border-t border-gray-200`}>
          <div className="pt-2 pb-3 space-y-1">
            {isAdmin && (
              <>
                <Link
                  to="/admin/users"
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 text-base font-medium ${
                    location.pathname === '/admin/users'
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-5 w-5 mr-3" />
                  Usuarios
                </Link>
                <Link
                  to="/admin/transfers"
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 text-base font-medium ${
                    location.pathname === '/admin/transfers'
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 mr-3" />
                  Transferencias
                </Link>
                <Link
                  to="/admin/stats"
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 text-base font-medium ${
                    location.pathname === '/admin/stats'
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="h-5 w-5 mr-3" />
                  Estadísticas
                </Link>
                <Link
                  to="/admin/support"
                  onClick={handleLinkClick}
                  className={`flex items-center px-4 py-2 text-base font-medium ${
                    location.pathname === '/admin/support'
                      ? 'text-purple-600 bg-purple-50'
                      : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="h-5 w-5 mr-3" />
                  Soporte
                </Link>
              </>
            )}
            <Link
              to="/profile"
              onClick={handleLinkClick}
              className={`flex items-center px-4 py-2 text-base font-medium ${
                location.pathname === '/profile'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <User className="h-5 w-5 mr-3" />
              Perfil
            </Link>
            <Link
              to="/settings"
              onClick={handleLinkClick}
              className={`flex items-center px-4 py-2 text-base font-medium ${
                location.pathname === '/settings'
                  ? 'text-purple-600 bg-purple-50'
                  : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              <Settings className="h-5 w-5 mr-3" />
              Configuración
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-4 py-2 text-base font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </nav>

      {/* Sidebar for admin */}
      {isAdmin && (
        <>
          {/* Overlay */}
          {sidebarOpen && (
            <div 
              className="fixed inset-0 bg-gray-600 bg-opacity-75 z-10 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed left-0 top-16 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-10
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0
          `}>
            <div className="p-4">
              <h2 className="text-lg font-semibold text-purple-600 mb-4">
                Administración
              </h2>
              <nav className="space-y-2">
                <Link
                  to="/admin"
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    location.pathname === '/admin'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Home className="h-5 w-5" />
                  <span>Panel Principal</span>
                </Link>
                <Link
                  to="/admin/users"
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    location.pathname === '/admin/users'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Users className="h-5 w-5" />
                  <span>Usuarios</span>
                </Link>
                <Link
                  to="/admin/transfers"
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    location.pathname === '/admin/transfers'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                  <span>Transferencias</span>
                </Link>
                <Link
                  to="/admin/stats"
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    location.pathname === '/admin/stats'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <TrendingUp className="h-5 w-5" />
                  <span>Estadísticas</span>
                </Link>
                <Link
                  to="/admin/support"
                  onClick={handleLinkClick}
                  className={`flex items-center space-x-2 p-2 rounded-lg ${
                    location.pathname === '/admin/support'
                      ? 'bg-purple-50 text-purple-600'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Chats de Soporte</span>
                </Link>
              </nav>
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <main className={`py-6 ${isAdmin ? 'md:ml-64' : ''} mt-16 transition-all duration-300`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;