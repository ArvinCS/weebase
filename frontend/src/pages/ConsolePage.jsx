// src/pages/ConsolePage.jsx
import React, { useState } from 'react';
import { API_BASE_URL } from '../config'; 

const ConsolePage = () => {
    const [query, setQuery] = useState('MATCH (a:Anime)-[:HAS_GENRE]->(g:Genre) RETURN a.title, g.name LIMIT 5');
    const [results, setResults] = useState(null); // Asumsi: {columns: [], records: []}
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const executeQuery = async () => {
        setLoading(true);
        setError(null);
        setResults(null);

        try {
            const response = await fetch(`${API_BASE_URL}/console?query=${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data.status === 'success') {
                setResults(data.results);
            } else {
                setError(data.message || 'Query failed');
            }
        } catch (err) {
            setError(String(err.message || err));
            console.error('Query error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="text-center mb-6">
                <h1 className="text-3xl font-bold mb-2">Cypher Query Console</h1>
                <p className="text-base-content/70">
                    Use Cypher query language to get data tailored to your needs. Only support read-only queries. {' '}
                    <br></br>
                    <a 
                        href="https://neo4j.com/docs/cypher-manual/current/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-accent-blue hover:underline text-sm"                        
                    >
                        Learn more about Cypher
                    </a>
                </p>
            </div>

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

            {/* Hasil Output */}
            <div className="mt-6">
                {error && <div className="alert alert-error shadow-lg">{error}</div>}
                
                {results?.records?.length > 0 && (
                    <div className="overflow-x-auto mt-4">
                        <table className="table table-zebra w-full shadow-lg bg-base-100">
                            <thead>
                                <tr>
                                    {results.columns.map((col, idx) => (
                                        <th key={`col-${idx}-${col}`}>{col}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.records.map((record, rowIdx) => (
                                    <tr key={`row-${rowIdx}`}>
                                        {record.map((cellValue, colIdx) => (
                                            <td key={`cell-${rowIdx}-${colIdx}`}>
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