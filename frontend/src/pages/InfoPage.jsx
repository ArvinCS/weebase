import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const InfoPage = () => {
    const { entityType, id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [similarEntities, setSimilarEntities] = useState([]);
    const [loadingSimilar, setLoadingSimilar] = useState(false);
    
    const searchState = location.state?.searchState;

    useEffect(() => {
        const fetchEntityData = async () => {
            setLoading(true);
            setError(null);
            setSimilarEntities([]);
            
            try {
                // Fetch data dari backend
                const response = await fetch(`${API_BASE_URL}/entity/${entityType}/${id}`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    console.log('Query response data:', data);
                    setEntity(data.entity);
                } else {
                    setError(data.message || 'Failed to load data');
                }
            } catch (err) {
                setError('Failed to connect to server');
                console.error('Fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchEntityData();
    }, [entityType, id]);

    // Fetch similar entities
    useEffect(() => {
        const fetchSimilarEntities = async () => {
            if (!entity || (entityType !== 'Anime' && entityType !== 'Character')) return;
            
            setLoadingSimilar(true);
            try {
                const response = await fetch(`${API_BASE_URL}/entity/${entityType}/${id}/similar?limit=6`);
                const data = await response.json();
                
                if (data.status === 'success') {
                    setSimilarEntities(data.similar);
                }
            } catch (err) {
                console.error('Failed to fetch similar entities:', err);
            } finally {
                setLoadingSimilar(false);
            }
        };

        fetchSimilarEntities();
    }, [entity, entityType, id]);

    if (loading) return (
        <div className="flex justify-center items-center min-h-screen">
            <span className="loading loading-spinner loading-lg text-primary"></span>
        </div>
    );
    
    if (error) return (
        <div className="alert alert-error shadow-lg max-w-2xl mx-auto mt-8">
            <span>{error}</span>
        </div>
    );
    
    if (!entity) return (
        <div className="text-center mt-8 text-neutral-content">No data found.</div>
    );

    // Render untuk Anime
    if (entityType === 'Anime') {
        return (
            <div className="min-h-screen anime-bg py-6">
              <div className="max-w-7xl mx-auto p-3 md:p-6">
                {/* Back Button */}
                {searchState && (
                  <button 
                    onClick={() => navigate('/', { state: { restoreSearch: searchState } })}
                    className="btn btn-ghost gap-2 mb-4 hover:bg-purple-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Search Results
                  </button>
                )}
                
                {/* Hero Section */}
                <div className="anime-card card bg-white shadow-2xl mb-6 border-t-4 border-purple-500">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 md:p-6">
                        {/* Poster Image */}
                        <div className="md:col-span-1 flex justify-center">
                            <div className="space-y-3 w-full max-w-[220px]">
                                <figure className="relative group overflow-hidden rounded-lg shadow-2xl">
                                    <img 
                                        src={entity.imageUrl} 
                                        alt={entity.title}
                                        className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    <div className="absolute top-2 right-2">
                                        <div className="badge badge-sm font-semibold text-white px-2 py-1 text-xs bg-gradient-to-r from-yellow-400 to-orange-500 border-0 shadow-md">
                                            ⭐ {entity.score}
                                        </div>
                                    </div>
                                </figure>
                            
                                {/* External Links */}
                                <div className="space-y-2">
                                    <a 
                                        href={entity.malUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn btn-block glow-button bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 font-bold text-sm"
                                    >
                                        <span>📊</span> MyAnimeList
                                    </a>
                                    
                                    {entity.imdbUrl && (
                                        <a 
                                            href={entity.imdbUrl} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-block bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black border-0 font-bold text-sm shadow-lg"
                                        >
                                            <span>🎬</span> IMDb
                                        </a>
                                    )}
                                    
                                    {entity.officialWebsite && (
                                        <a 
                                            href={entity.officialWebsite} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            className="btn btn-block bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white border-0 font-bold text-sm shadow-lg"
                                        >
                                            <span>🌐</span> Official Website
                                        </a>
                                    )}
                                </div>
                                
                                <div className="stats stats-vertical shadow-lg w-full bg-gradient-to-br from-purple-50 to-pink-50">
                                    <div className="stat py-3 bg-white/50">
                                        <div className="stat-title text-xs font-bold text-purple-600">🏆 RANKED</div>
                                        <div className="stat-value text-2xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">#{entity.ranked}</div>
                                    </div>
                                    <div className="stat py-3 bg-white/50">
                                        <div className="stat-title text-xs font-bold text-pink-600">🔥 POPULARITY</div>
                                        <div className="stat-value text-2xl bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">#{entity.popularity}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Info */}
                        <div className="md:col-span-2 space-y-3">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-extrabold mb-2">
                                    <span className="gradient-text">{entity.title}</span>
                                </h1>
                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className="badge badge-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 font-bold">{entity.type}</span>
                                    <span className="badge badge-lg badge-outline border-2 font-semibold">{entity.status}</span>
                                    <span className="badge badge-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0 font-bold">{entity.episodes} Episodes</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Premiered</p>
                                    <p className="font-semibold text-gray-900">{entity.premiered || 'N/A'}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Year</p>
                                    <p className="font-semibold text-gray-900">{entity.releasedYear}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Season</p>
                                    <p className="font-semibold text-gray-900">{entity.releasedSeason}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Duration</p>
                                    <p className="font-semibold text-gray-900">{entity.duration}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">Rating</p>
                                    <p className="font-semibold text-sm text-gray-900">{entity.rating}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-gray-500 uppercase">MAL ID</p>
                                    <p className="font-semibold text-gray-900">{entity.malAnimeId}</p>
                                </div>
                            </div>

                            {/* Genres */}
                            {entity.genres && entity.genres.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Genres</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {entity.genres.map((genre, idx) => (
                                            <span key={idx} className="badge badge-md bg-gradient-to-r from-indigo-500 to-purple-500 text-white border-0 font-semibold">
                                                {genre}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Studios */}
                            {entity.studios && entity.studios.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase mb-2">Studios</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {entity.studios.map((studio, idx) => (
                                            <span key={idx} className="badge badge-md bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0 font-semibold">
                                                {studio}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Synopsis */}
                            <div className="pt-3">
                                <h2 className="text-2xl font-bold mb-2 text-gray-900">Synopsis</h2>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line text-sm">
                                    {entity.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Entities Section */}
                {entity.related && entity.related.length > 0 && (
                    <div className="card bg-white shadow-2xl p-6 border-t-4 border-purple-500">
                        <h2 className="text-2xl font-bold mb-4 text-gray-900">Characters</h2>
                        <div className="flex overflow-x-auto gap-4 pb-4">
                            {entity.related.map((rel, index) => (
                                <Link 
                                    key={index} 
                                    to={`/info/${rel.type}/${rel.id || index}`} 
                                    className="card w-64 bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg hover:shadow-2xl transition-all duration-300 flex-shrink-0 border-2 border-purple-200 hover:border-purple-400"
                                >
                                    <div className="card-body p-4">
                                        <p className="font-bold text-gray-900">{rel.name}</p>
                                        {/* <div className="badge bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 badge-sm font-semibold">{rel.rel}</div> */}
                                        <div className="badge badge-outline border-2 border-purple-400 text-purple-600 badge-sm font-semibold">{rel.type}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                {/* Similar Anime Section */}
                <div className="card bg-white shadow-2xl p-6 border-t-4 border-pink-500 mt-6">
                    <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">✨</span>
                        <h2 className="text-2xl font-bold text-gray-900">Similar Anime</h2>
                        {loadingSimilar && <span className="loading loading-spinner loading-sm text-pink-500"></span>}
                    </div>
                    
                    {loadingSimilar ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="animate-pulse">
                                    <div className="bg-gray-200 rounded-lg h-48 mb-2"></div>
                                    <div className="bg-gray-200 rounded h-4 w-3/4"></div>
                                </div>
                            ))}
                        </div>
                    ) : similarEntities.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                            {similarEntities.map((item, index) => (
                                <Link 
                                    key={index} 
                                    to={`/info/${item.type}/${item.id}`}
                                    className="group"
                                >
                                    <div className="anime-card card bg-gradient-to-br from-purple-50 to-pink-50 shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border-2 border-transparent hover:border-pink-300">
                                        <figure className="relative h-48 overflow-hidden">
                                            {item.image ? (
                                                <img 
                                                    src={item.image} 
                                                    alt={item.title}
                                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-purple-200 to-pink-200 flex items-center justify-center">
                                                    <span className="text-4xl">📺</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <div className="badge badge-sm bg-pink-500 text-white border-0">
                                                    {(item.score * 100).toFixed(0)}% match
                                                </div>
                                            </div>
                                        </figure>
                                        <div className="card-body p-3">
                                            <h3 className="font-bold text-sm text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors">
                                                {item.title}
                                            </h3>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500 text-center py-8">No similar anime found</p>
                    )}
                </div>
              </div>
            </div>
        );
    }

    // Render untuk Character
    if (entityType === 'Character') {
        return (
            <div className="min-h-screen anime-bg py-8">
              <div className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Back Button */}
                {searchState && (
                  <button 
                    onClick={() => navigate('/', { state: { restoreSearch: searchState } })}
                    className="btn btn-ghost gap-2 mb-4 hover:bg-pink-100"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    Back to Search Results
                  </button>
                )}
                
                {/* Character Card */}
                <div className="anime-card card bg-white shadow-2xl border-t-4 border-pink-500">
                    <div className="card-body p-6 md:p-8">
                        {/* Header with Name and Badge */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-5xl font-extrabold mb-3">
                                    <span className="gradient-text">{entity.fullName || entity.name}</span>
                                </h1>
                                {entity.alternateName && (
                                    <p className="text-2xl text-gray-500 mb-3 font-light">{entity.alternateName}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <span className="badge badge-lg bg-gradient-to-r from-pink-500 to-red-500 text-white border-0 font-bold">Character</span>
                                    {entity.malCharacterId && (
                                        <span className="badge badge-lg badge-outline border-2 font-semibold">ID: {entity.malCharacterId}</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* MAL Link Button */}
                            {entity.malUrl && (
                                <a 
                                    href={entity.malUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn glow-button bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 text-white border-0 font-bold btn-sm md:btn-md"
                                >
                                    View on MAL
                                </a>
                            )}
                        </div>

                        <div className="divider"></div>

                        {/* Description Section */}
                        <div>
                            <h2 className="text-2xl font-bold mb-4 text-gray-900">About</h2>
                            <div className="prose max-w-none">
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {entity.description}
                                </p>
                            </div>
                        </div>

                        {/* Additional Info if available */}
                        {(entity.age || entity.height || entity.birthday || entity.gender) && (
                            <>
                                <div className="divider"></div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Character Details</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 text-wrap ">
                                        {entity.age && (
                                            <div className="stat bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg p-4 shadow-lg border-2 border-purple-200">
                                                <div className="stat-title text-xs font-bold text-purple-600">AGE</div>
                                                <div className="text-wrap stat-value text-3xl bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">{entity.age}</div>
                                            </div>
                                        )}
                                        {entity.height && (
                                            <div className="stat bg-gradient-to-br from-blue-100 to-cyan-100 rounded-lg p-4 shadow-lg border-2 border-blue-200">
                                                <div className="stat-title text-xs font-bold text-blue-600">HEIGHT</div>
                                                <div className="text-wrap stat-value text-3xl bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">{entity.height}</div>
                                            </div>
                                        )}
                                        {entity.birthday && (
                                            <div className="stat bg-gradient-to-br from-pink-100 to-red-100 rounded-lg p-4 shadow-lg border-2 border-pink-200">
                                                <div className="stat-title text-xs font-bold text-pink-600">BIRTHDAY</div>
                                                <div className="text-wrap stat-value text-3xl bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">{entity.birthday}</div>
                                            </div>
                                        )}
                                        {entity.gender && (
                                            <div className="stat bg-gradient-to-br from-indigo-100 to-purple-100 rounded-lg p-4 shadow-lg border-2 border-indigo-200">
                                                <div className="stat-title text-xs font-bold text-indigo-600">GENDER</div>
                                                <div className="text-wrap stat-value text-3xl bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{entity.gender}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Related Entities */}
                        {entity.related && entity.related.length > 0 && (
                            <>
                                <div className="divider"></div>
                                <div>
                                    <h2 className="text-2xl font-bold mb-4 text-gray-900">Appears In</h2>
                                    <div className="flex overflow-x-auto gap-4 pb-4">
                                        {entity.related.map((rel, index) => (
                                            <Link 
                                                key={index} 
                                                to={`/info/${rel.type}/${rel.id || index}`} 
                                                className="card w-64 bg-gradient-to-br from-pink-50 to-purple-50 shadow-lg hover:shadow-2xl transition-all duration-300 flex-shrink-0 border-2 border-pink-200 hover:border-pink-400"
                                            >
                                                <div className="card-body p-4">
                                                    <p className="font-bold text-gray-900">{rel.name}</p>
                                                    {/* <div className="badge bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 badge-sm font-semibold">{rel.rel}</div> */}
                                                    <div className="badge badge-outline border-2 border-pink-400 text-pink-600 badge-sm font-semibold">{rel.type}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Similar Characters Section */}
                        <div className="divider"></div>
                        <div>
                            <div className="flex items-center gap-3 mb-4">
                                <span className="text-2xl">👥</span>
                                <h2 className="text-2xl font-bold text-gray-900">Similar Characters</h2>
                                {loadingSimilar && <span className="loading loading-spinner loading-sm text-pink-500"></span>}
                            </div>
                            
                            {loadingSimilar ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {[...Array(6)].map((_, i) => (
                                        <div key={i} className="animate-pulse">
                                            <div className="bg-gray-200 rounded-full h-24 w-24 mx-auto mb-2"></div>
                                            <div className="bg-gray-200 rounded h-4 w-3/4 mx-auto"></div>
                                        </div>
                                    ))}
                                </div>
                            ) : similarEntities.length > 0 ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                    {similarEntities.map((item, index) => (
                                        <Link 
                                            key={index} 
                                            to={`/info/${item.type}/${item.id}`}
                                            className="group text-center"
                                        >
                                            <div className="anime-card p-4 rounded-xl bg-gradient-to-br from-pink-50 to-purple-50 shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-pink-300">
                                                <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden ring-4 ring-pink-200 group-hover:ring-pink-400 transition-all">
                                                    {item.image ? (
                                                        <img 
                                                            src={item.image} 
                                                            alt={item.title}
                                                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center">
                                                            <span className="text-2xl">👤</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <h3 className="font-bold text-sm text-gray-800 line-clamp-2 group-hover:text-pink-600 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <div className="badge badge-sm bg-pink-100 text-pink-600 border-0 mt-2">
                                                    {(item.score * 100).toFixed(0)}% match
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-center py-8">No similar characters found</p>
                            )}
                        </div>
                    </div>
                </div>
              </div>
            </div>
        );
    }

    // Placeholder untuk Studio (nanti)
    return (
        <div className="max-w-7xl mx-auto p-8">
            <div className="alert alert-info">
                <span>{entityType} page is under construction. Coming soon!</span>
            </div>
        </div>
    );
};

export default InfoPage;