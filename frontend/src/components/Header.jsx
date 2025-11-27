import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  
  const isActive = (path) => location.pathname === path;
  
  return (
    <div className="navbar bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 shadow-2xl backdrop-blur-sm sticky top-0 z-50">
      <div className="flex-1">
        <Link to="/" className="normal-case text-2xl font-bold text-white hover:scale-110 transition-transform px-4 py-2 inline-block">
          <span className="flex items-center gap-2">
            <span className="text-3xl">🎌</span>
            <span className="font-extrabold tracking-wide">Weebase</span>
          </span>
        </Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1 gap-2">
          <li>
            <Link 
              to="/" 
              className={`btn ${
                isActive('/') 
                  ? 'bg-white text-purple-600 font-bold hover:bg-white/90' 
                  : 'bg-white/10 text-white hover:bg-white/30 border-white/30'
              } transition-all duration-300`}
            >
              <span className="text-lg">🔍</span>
              Search
            </Link>
          </li>
          <li>
            <Link 
              to="/console" 
              className={`btn ${
                isActive('/console') 
                  ? 'bg-white text-purple-600 font-bold hover:bg-white/90' 
                  : 'bg-white/10 text-white hover:bg-white/30 border-white/30'
              } transition-all duration-300`}
            >
              <span className="text-lg">⚡</span>
              Console
            </Link>
          </li>
        </ul>
      </div>
    </div>
  );
};
export default Header;