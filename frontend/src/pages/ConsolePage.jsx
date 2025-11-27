// src/pages/ConsolePage.jsx
import React, { useState } from 'react';
// import { API_BASE_URL } from '../config'; // Diperlukan untuk logika fetch

const ConsolePage = () => {
    const [query, setQuery] = useState('MATCH (a:Anime)-[:HAS_GENRE]->(g:Genre) RETURN a.title, g.name LIMIT 5');
    const [results, setResults] = useState(null); // Asumsi: {columns: [], records: []}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const executeQuery = async () => {
        // --- LOGIKA FETCH API DISINI ---
        // Gunakan endpoint /api/query-console (method POST)
        setLoading(true);
        setError(null);
        setResults(null);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Data simulasi
        setResults({
            columns: ["animeTitle", "genreName"],
            records: [
                ["Cowboy Bebop", "Action"],
                ["Cowboy Bebop", "Sci-Fi"],
                ["Samurai Champloo", "Adventure"]
            ]
        });
        // --- AKHIR LOGIKA SIMULASI ---
        setLoading(false);
    };

    return (
        <div className="p-4">
            <h1 className="text-2xl font-bold mb-4">Cypher Query Console</h1>
            
            {/* Editor Area - Dark Theme (Manual Styling) */}
            <div className="bg-neutral-800 p-4 rounded-box shadow-2xl mb-4">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows="8"
                    placeholder="Tulis Cypher query Anda di sini..."
                    className="textarea w-full text-white bg-transparent border-gray-600 focus:border-accent-blue font-mono"
                />
            </div>
            
            <button onClick={executeQuery} disabled={loading} className="btn btn-secondary shadow-lg">
                {loading ? <span className="loading loading-spinner"></span> : 'Execute Query'}
            </button>
            <p className="text-xs text-neutral mt-1">Gunakan Accent Orange (secondary) untuk aksi penting.</p>

            {/* Hasil Output */}
            <div className="mt-6">
                {error && <div className="alert alert-error shadow-lg">{error}</div>}
                
                {results && results.records && results.records.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-zebra w-full shadow-lg bg-base-100">
                            <thead>
                                <tr>
                                    {results.columns.map(col => (
                                        <th key={col}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.records.map((record, index) => (
                                    <tr key={index}>
                                        {record.map((cellValue, colIndex) => (
                                            <td key={colIndex}>
                                                {JSON.stringify(cellValue)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
export default ConsolePage;