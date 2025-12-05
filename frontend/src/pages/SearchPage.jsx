// src/pages/SearchPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const SearchPage = () => {
  const location = useLocation();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]); // Asumsi: [{entityType, titleOrName, uniqueId, score}]
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false); // Track if search has been performed
  const [useSemanticSearch, setUseSemanticSearch] = useState(false); // Toggle for semantic search

  // Restore search state when coming back from info page
  useEffect(() => {
    const restoreSearch = location.state?.restoreSearch;
    if (restoreSearch) {
      setKeyword(restoreSearch.keyword);
      setResults(restoreSearch.results);
      setUseSemanticSearch(restoreSearch.useSemanticSearch);
      setHasSearched(true);
    }
  }, [location.state]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setLoading(true);
    setError(null);
    setHasSearched(true); // Mark that a search has been performed
    
    try {
      // Choose endpoint based on search type
      const endpoint = useSemanticSearch 
        ? `${API_BASE_URL}/search/semantic?q=${encodeURIComponent(keyword)}`
        : `${API_BASE_URL}/search?q=${encodeURIComponent(keyword)}`;
      
      // Fetch data dari backend
      const response = await fetch(endpoint);
      const data = await response.json();
      
      if (data.status === 'success') {
        // Transform backend response to match frontend structure
        const transformedResults = data.results.map(item => ({
          entityType: item.type[0], // type is an array, get first label
          titleOrName: item.title,
          uniqueId: item.id,
          score: Math.min(item.score || 1, 1) // Use semantic score if available
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
    <div className="min-h-screen anime-bg py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 space-y-4">
          <h1 className="text-6xl font-extrabold mb-4">
            <span className="gradient-text">Weebase</span>
          </h1>
          <p className="text-2xl text-gray-600 font-light">アニメ知識グラフ</p>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Discover anime and characters through our knowledge graph
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex justify-center mb-8">
          <div className="w-full max-w-2xl space-y-4">
            {/* Search Input */}
            <div className="join w-full shadow-2xl">
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="🔍 Search for anime and characters..."
                className="input input-bordered w-full join-item text-lg border-2 border-purple-300 focus:border-purple-500 focus:outline-none"
              />
              <button 
                type="submit" 
                disabled={loading} 
                className="btn join-item glow-button bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border-0 px-8"
              >
                {loading ? <span className="loading loading-spinner"></span> : <span className="font-bold">Search</span>}
              </button>
            </div>
            
            {/* Search Type Toggle */}
            <div className="flex items-center justify-center gap-4">
              <label className="label cursor-pointer gap-2">
                <span className="label-text font-semibold text-gray-700">🔤 Keyword Search</span>
                <input 
                  type="checkbox" 
                  className="toggle toggle-primary" 
                  checked={useSemanticSearch}
                  onChange={(e) => setUseSemanticSearch(e.target.checked)}
                />
                <span className="label-text font-semibold text-gray-700">🧠 AI Semantic Search</span>
              </label>
            </div>
            
            {/* Search Type Description */}
            <div className="text-center text-sm text-gray-600">
              {useSemanticSearch ? (
                <p>Using AI to understand meaning and context</p>
              ) : (
                <p>Searching for keyword matches</p>
              )}
            </div>
          </div>
        </form>

        {/* Error Message */}
        {error && (
          <div className="alert alert-error shadow-lg mb-8 max-w-2xl mx-auto">
            <span>⚠️ {error}</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && results.length === 0 && !error && hasSearched && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-2xl text-gray-600 font-semibold mb-2">No results found</p>
            <p className="text-gray-500">Try searching with different keywords</p>
          </div>
        )}

      {/* Hasil Pencarian */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((item, index) => (
          <Link 
            key={index} 
            to={`/info/${item.entityType}/${item.uniqueId}`}
            state={{ 
              from: '/',
              searchState: { keyword, results, useSemanticSearch }
            }}
          >
            <div className="anime-card card bg-white shadow-xl hover:shadow-2xl transition-all duration-300 h-full border-2 border-transparent hover:border-purple-300">
              <div className="card-body">
                <div className="flex items-center justify-between mb-2">
                  <span className={`badge badge-lg font-bold ${
                    item.entityType === 'Anime' 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0' 
                      : item.entityType === 'Character'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0'
                      : 'bg-gradient-to-r from-orange-500 to-red-500 text-white border-0'
                  }`}>
                    {item.entityType === 'Anime' ? '📺' : item.entityType === 'Character' ? '👤' : '🏢'} {item.entityType}
                  </span>
                </div>
                <h3 className="card-title text-xl font-bold text-gray-800 hover:text-purple-600 transition-colors">
                  {item.titleOrName}
                </h3>
                <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <span>Relevance:</span>
                  <div className="badge badge-ghost">{(item.score * 100).toFixed(0)}%</div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
};
export default SearchPage;