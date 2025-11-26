import { Routes, Route } from 'react-router-dom';
import Header from './components/Header'; // <-- Path disesuaikan
import SearchPage from './pages/SearchPage'; // <-- Path disesuaikan
import ConsolePage from './pages/ConsolePage'; // <-- Path disesuaikan
import InfoPage from './pages/InfoPage'; // <-- Path disesuaikan

import './App.css';

function App() {
  return (
    <>
      <Header />
      <div className="container mx-auto p-4">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/console" element={<ConsolePage />} />
          {/* Info Box menerima entityType dan ID dari hasil Search */}
          <Route path="/info/:entityType/:id" element={<InfoPage />} /> 
        </Routes>
      </div>
    </>
  );
}
export default App;