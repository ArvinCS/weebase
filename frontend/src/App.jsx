import { Routes, Route } from 'react-router-dom';
import Header from './components/Header'; // <-- Path disesuaikan
import SearchPage from './pages/SearchPage'; // <-- Path disesuaikan
import ConsolePage from './pages/ConsolePage'; // <-- Path disesuaikan
import InfoPage from './pages/InfoPage'; // <-- Path disesuaikan
import ChatbotPage from './pages/ChatbotPage'; // <-- Chatbot page

import './App.css';

function App() {
  return (
    <div className="min-h-screen anime-bg">
      <Header />
      <div className="container mx-auto">
        <Routes>
          <Route path="/" element={<SearchPage />} />
          <Route path="/console" element={<ConsolePage />} />
          <Route path="/chatbot" element={<ChatbotPage />} />
          {/* Info Box menerima entityType dan ID dari hasil Search */}
          <Route path="/info/:entityType/:id" element={<InfoPage />} /> 
        </Routes>
      </div>
    </div>
  );
}
export default App;