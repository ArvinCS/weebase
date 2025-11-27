// src/pages/SearchPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const SearchPage = () => {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]); // Asumsi: [{entityType, titleOrName, uniqueId, score}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    
    try {
      // Fetch data dari backend
      const response = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(keyword)}`);
      const data = await response.json();
      
      if (data.status === 'success') {
        // Transform backend response to match frontend structure
        const transformedResults = data.results.map(item => ({
          entityType: item.type[0], // type is an array, get first label
          titleOrName: item.title,
          uniqueId: item.id,
          score: 1.0 // Backend doesn't return score yet, using default
        }));
        setResults(transformedResults);
      } else {
        setError(data.message || 'Search failed');
        setResults([]);
      }
    } catch (err) {
      setError('Failed to connect to server');
      setResults([]);
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
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

      {/* Error Message */}
      {error && (
        <div className="alert alert-error mb-4">
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && keyword && (
        <div className="text-neutral-content">
          No results found for "{keyword}"
        </div>
      )}

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