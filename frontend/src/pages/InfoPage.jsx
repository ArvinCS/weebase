import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { API_BASE_URL } from '../config';

const InfoPage = () => {
    const { entityType, id } = useParams();
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEntityData = async () => {
            setLoading(true);
            setError(null);
            
            try {
                // Fetch data dari backend
                const response = await fetch(`${API_BASE_URL}/entity/${entityType}/${id}`);
                const data = await response.json();
                
                if (data.status === 'success') {
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
            <div className="max-w-7xl mx-auto p-4 md:p-8">
                {/* Hero Section */}
                <div className="card bg-base-100 shadow-2xl mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
                        {/* Poster Image */}
                        <div className="md:col-span-1">
                            <figure className="relative">
                                <img 
                                    src={entity.imageUrl} 
                                    alt={entity.title}
                                    className="w-full rounded-lg shadow-xl object-cover"
                                />
                                <div className="absolute top-4 right-4">
                                    <div className="badge badge-lg badge-primary font-bold text-white p-4">
                                        ⭐ {entity.score}
                                    </div>
                                </div>
                            </figure>
                            
                            {/* Quick Stats */}
                            <div className="mt-4 space-y-2">
                                <a 
                                    href={entity.malUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-block"
                                >
                                    View on MyAnimeList
                                </a>
                                <div className="stats stats-vertical shadow w-full">
                                    <div className="stat py-3">
                                        <div className="stat-title text-xs">Ranked</div>
                                        <div className="stat-value text-2xl text-primary">#{entity.ranked}</div>
                                    </div>
                                    <div className="stat py-3">
                                        <div className="stat-title text-xs">Popularity</div>
                                        <div className="stat-value text-2xl text-secondary">#{entity.popularity}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Main Info */}
                        <div className="md:col-span-2 space-y-4">
                            <div>
                                <h1 className="text-4xl font-bold text-primary mb-2">{entity.title}</h1>
                                <div className="flex flex-wrap gap-2 mb-4">
                                    <span className="badge badge-accent">{entity.type}</span>
                                    <span className="badge badge-outline">{entity.status}</span>
                                    <span className="badge badge-ghost">{entity.episodes} Episodes</span>
                                </div>
                            </div>

                            {/* Info Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

                            {/* Synopsis */}
                            <div className="pt-4">
                                <h2 className="text-2xl font-bold mb-3 text-gray-900">Synopsis</h2>
                                <p className="text-gray-700 leading-relaxed whitespace-pre-line">
                                    {entity.description}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Related Entities Section */}
                {entity.related && entity.related.length > 0 && (
                    <div className="card bg-base-100 shadow-xl p-6">
                        <h2 className="text-2xl font-bold mb-4 text-base-content">Related Entities</h2>
                        <div className="flex overflow-x-auto gap-4 pb-4">
                            {entity.related.map((rel, index) => (
                                <Link 
                                    key={index} 
                                    to={`/info/${rel.type}/${rel.id || index}`} 
                                    className="card w-64 bg-accent shadow-md hover:shadow-xl transition duration-150 flex-shrink-0"
                                >
                                    <div className="card-body p-4">
                                        <p className="font-semibold">{rel.name}</p>
                                        <div className="badge badge-outline badge-sm">{rel.rel}</div>
                                        <div className="badge badge-ghost badge-sm">{rel.type}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Render untuk Character
    if (entityType === 'Character') {
        return (
            <div className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Character Card */}
                <div className="card bg-base-100 shadow-2xl">
                    <div className="card-body p-6 md:p-8">
                        {/* Header with Name and Badge */}
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
                            <div>
                                <h1 className="text-4xl font-bold text-primary mb-2">{entity.fullName || entity.name}</h1>
                                {entity.alternateName && (
                                    <p className="text-xl text-gray-600 mb-2">{entity.alternateName}</p>
                                )}
                                <div className="flex flex-wrap gap-2">
                                    <span className="badge badge-secondary badge-lg">Character</span>
                                    {entity.malCharacterId && (
                                        <span className="badge badge-outline">MAL ID: {entity.malCharacterId}</span>
                                    )}
                                </div>
                            </div>
                            
                            {/* MAL Link Button */}
                            {entity.malUrl && (
                                <a 
                                    href={entity.malUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-primary btn-sm md:btn-md"
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
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        {entity.age && (
                                            <div className="stat bg-base-200 rounded-lg p-4">
                                                <div className="stat-title text-xs">Age</div>
                                                <div className="stat-value text-2xl text-primary">{entity.age}</div>
                                            </div>
                                        )}
                                        {entity.height && (
                                            <div className="stat bg-base-200 rounded-lg p-4">
                                                <div className="stat-title text-xs">Height</div>
                                                <div className="stat-value text-2xl text-primary">{entity.height}</div>
                                            </div>
                                        )}
                                        {entity.birthday && (
                                            <div className="stat bg-base-200 rounded-lg p-4">
                                                <div className="stat-title text-xs">Birthday</div>
                                                <div className="stat-value text-2xl text-primary">{entity.birthday}</div>
                                            </div>
                                        )}
                                        {entity.gender && (
                                            <div className="stat bg-base-200 rounded-lg p-4">
                                                <div className="stat-title text-xs">Gender</div>
                                                <div className="stat-value text-2xl text-primary">{entity.gender}</div>
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
                                                className="card w-64 bg-accent shadow-md hover:shadow-xl transition duration-150 flex-shrink-0"
                                            >
                                                <div className="card-body p-4">
                                                    <p className="font-semibold text-gray-900">{rel.name}</p>
                                                    <div className="badge badge-outline badge-sm">{rel.rel}</div>
                                                    <div className="badge badge-ghost badge-sm">{rel.type}</div>
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
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