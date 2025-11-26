import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
// import { API_BASE_URL } from '../config'; // Diperlukan untuk logika fetch

const InfoPage = () => {
    const { entityType, id } = useParams();
    const [entity, setEntity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchEntityData = async () => {
            setLoading(true);
            setError(null);
            // --- LOGIKA FETCH API DISINI ---
            // Gunakan endpoint /api/entity/${entityType}/${id}
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Data simulasi: sesuaikan dengan schema camelCase Anda
            const mockData = {
                Anime: {
                    malAnimeId: 1,
                    title: "Cowboy Bebop",
                    description: "Crime is timeless. By the year 2071, humanity has expanded...",
                    image: "https://cdn.myanimelist.net/images/anime/4/19644.jpg",
                    score: 8.75,
                    episodes: 26,
                    releasedYear: 1998,
                    status: "Finished Airing",
                    related: [
                        { name: "Action", rel: "HAS_GENRE", type: "Genre" },
                        { name: "Sunrise", rel: "PRODUCED_BY", type: "Studio" },
                    ]
                },
                Character: {
                    malCharacterId: 10,
                    fullName: "Spike Spiegel",
                    description: "A former member of the Red Dragon Syndicate...",
                    age: 27,
                    height: "185 cm",
                    related: [
                        { name: "Faye Valentine", rel: "CO_STAR", type: "Character" }
                    ]
                }
            };
            
            setEntity(mockData[entityType] || mockData.Anime);
            // --- AKHIR LOGIKA SIMULASI ---
            setLoading(false);
        };

        fetchEntityData();
    }, [entityType, id]);

    if (loading) return <div className="text-center mt-8"><span className="loading loading-dots loading-lg"></span></div>;
    if (error) return <div className="alert alert-error shadow-lg mt-8">{error}</div>;
    if (!entity) return <div className="text-center mt-8">No data found.</div>;

    // Tentukan Judul Utama
    const mainTitle = entity.title || entity.fullName;
    
    // Konversi object properti ke array untuk tampilan
    const attributesList = Object.entries(entity)
        .filter(([key, value]) => !['title', 'fullName', 'description', 'image', 'related'].includes(key) && value !== null);

    return (
        <div className="card w-full bg-base-100 shadow-2xl p-6 mt-6">
            <h1 className="text-3xl font-extrabold mb-2 text-primary">{mainTitle}</h1>
            <p className="text-lg text-neutral-content mb-6 border-b pb-4">Type: {entityType} | ID: {id}</p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Kolom 1: Gambar */}
                <div className="md:col-span-1">
                    {entity.image && (
                        <img src={entity.image} alt={mainTitle} className="w-full h-auto object-cover rounded-default shadow-lg" />
                    )}
                    {entity.score && (
                        <div className="badge badge-lg badge-primary mt-3 p-4 text-white text-md font-bold">
                            Score: {entity.score}
                        </div>
                    )}
                </div>

                {/* Kolom 2: Deskripsi dan Atribut Kunci */}
                <div className="md:col-span-2">
                    <h2 className="text-xl font-bold mb-3">Synopsis / Description</h2>
                    <p className="text-neutral-content mb-6">{entity.description}</p>

                    <h2 className="text-xl font-bold mb-3 mt-6">Key Attributes</h2>
                    <div className="stats stats-vertical shadow">
                        {attributesList.map(([key, value]) => (
                            <div key={key} className="stat">
                                <div className="stat-title text-neutral-content">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                                <div className="stat-value text-primary text-xl">{value}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            {/* Relasi Terkait (Horizontal Carousel) */}
            <div className="mt-8 pt-6 border-t border-base-200">
                <h2 className="text-2xl font-bold mb-4">Related Entities</h2>
                <div className="flex overflow-x-auto gap-4 p-4">
                    {entity.related && entity.related.map((rel, index) => (
                        <Link key={index} to={`/info/${rel.type}/${rel.id || index}`} className="card w-64 bg-accent shadow-md hover:shadow-xl transition duration-150 flex-shrink-0">
                            <div className="card-body p-4">
                                <p className="text-sm font-semibold">{rel.name}</p>
                                <div className="badge badge-outline badge-sm">Relation: {rel.rel}</div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};
export default InfoPage;