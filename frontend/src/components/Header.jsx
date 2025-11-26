import { Link } from 'react-router-dom';

const Header = () => {
  return (
    <div className="navbar bg-base-300 shadow-md"> {/* base-300 memberikan warna pastel/muted */}
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost normal-case text-xl">
            Weebase
        </Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li><Link to="/" className="btn btn-ghost">Search</Link></li>
          <li><Link to="/console" className="btn btn-ghost">Cypher Console</Link></li>
        </ul>
      </div>
    </div>
  );
};
export default Header;