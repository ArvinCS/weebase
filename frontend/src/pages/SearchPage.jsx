// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
// import { API_BASE_URL } from '../config'; // Diperlukan untuk logika fetch

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]); // Asumsi: [{entityType, titleOrName, uniqueId, score}]
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    // --- LOGIKA FETCH API DISINI ---
    // Gunakan endpoint /api/search?keyword=...
    // Menggunakan timeout simulasi agar komponen terlihat
    await new Promise(resolve => setTimeout(resolve, 500)); 
    setResults([
        { entityType: 'Anime', titleOrName: 'Cowboy Bebop', uniqueId: 1, score: 0.95 },
        { entityType: 'Character', titleOrName: 'Spike Spiegel', uniqueId: 10, score: 0.88 }
    ]);
    // --- AKHIR LOGIKA SIMULASI ---
    setLoading(false);
  };

  return (
    <div className="p-8 bg-accent rounded-box shadow-md text-center">
      <h1 className="text-3xl font-bold mb-2">Anime KG Explorer</h1>
      <p className="text-neutral-content mb-6">Search anime, characters, studios...</p>

      {/* Search Bar - Menggunakan join DaisyUI */}
      <form onSubmit={handleSearch} className="flex justify-center mb-8">
        <div className="join w-full max-w-lg">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Cari Anime atau Karakter..."
            className="input input-bordered w-full join-item focus:border-primary"
          />
          <button type="submit" disabled={loading} className="btn btn-primary join-item">
            {loading ? <span className="loading loading-spinner"></span> : 'Search'}
          </button>
        </div>
      </form>

      {/* Hasil Pencarian */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {results.map((item, index) => (
          <div key={index} className="card card-compact bg-base-100 shadow-xl hover:shadow-2xl transition duration-150">
            <div className="card-body">
              <span className={`badge ${item.entityType === 'Anime' ? 'badge-primary' : 'badge-accent'}`}>
                  {item.entityType}
              </span>
              <Link 
                to={`/info/${item.entityType}/${item.uniqueId}`} 
                className="card-title text-primary hover:underline"
              >
                {item.titleOrName}
              </Link>
              <p className="text-sm">Relevance Score: {(item.score * 100).toFixed(1)}%</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default SearchPage;