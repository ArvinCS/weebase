import os
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
import logging

from rag_service import generate_rag_response

load_dotenv()

# Load embedding model for semantic search
MODEL_NAME = 'Qwen/Qwen3-Embedding-0.6B'
logging.info(f"Loading Sentence Transformer model: {MODEL_NAME}")
embedding_model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
logging.info("Model loaded successfully")

app = FastAPI()

# --- KONFIGURASI CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Ubah sesuai kebutuhan keamanan
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KONFIGURASI KONEKSI NEO4J ---
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = None

# Request model for chat endpoint
class Message(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    query: str
    history: list[Message] = []  # Conversation history

# Initialize Neo4j connection
try:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()
    logging.info("Koneksi Neo4j berhasil!")
except Exception as e:
    logging.error(f"Gagal terhubung ke Neo4j: {e}")

@app.get("/")
def read_root():
    if driver is None:
        return {"status": "error", "message": "Koneksi database Neo4j GAGAL"}

    # Tes query ke database
    try:
        with driver.session() as session:
            result = session.run("RETURN 1 AS number")
            record = result.single()
            number = record["number"] if record else "null"
            return {"status": "ok", "message": "Koneksi FastAPI & Neo4j sukses!", "test_query": number}
    except Exception as e:
        return {"status": "error", "message": f"Query ke Neo4j gagal: {e}"}

@app.get("/search")
def search_entities(q: str = Query(..., min_length=1)):
    """
    Endpoint untuk mencari Anime, Karakter, dan Studio berdasarkan kata kunci.
    """
    
    # Query Cypher yang akan dieksekusi
    # Kita menggunakan parameter $keyword agar aman dari SQL/Cypher injection
    cypher_query = """
        CALL db.index.fulltext.queryNodes('search_index', $keyword) 
        YIELD node AS result, score
        RETURN    
        CASE WHEN 'Anime' IN labels(result) THEN result.title ELSE result.fullName END AS title,
        ID(result) AS id,
        labels(result) AS type,
        score 
        ORDER BY score DESC
        LIMIT 25
    """
    
    # Menghubungkan ke Neo4j dan menjalankan query
    try:
        with driver.session() as session:
            # Menggunakan q sebagai parameter $keyword
            result = session.run(cypher_query, keyword=q) 
            
            # Mengubah hasil menjadi list of dictionaries
            search_results = [record.data() for record in result]
            
            return {"status": "success", "results": search_results}
            
    except Exception as e:
        # Jika terjadi error Neo4j (misal: koneksi terputus)
        return {"status": "error", "message": str(e)}

@app.get("/search/semantic")
def semantic_search(q: str = Query(..., min_length=1), limit: int = Query(default=25, le=100)):
    """
    Endpoint untuk pencarian semantik menggunakan vector similarity.
    Mencari Anime dan Character berdasarkan kemiripan makna.
    """
    
    try:
        # Generate embedding untuk query
        query_embedding = embedding_model.encode(q).tolist()
        
        # Query gabungan untuk Anime dan Character menggunakan UNION dengan subquery
        combined_query = """
        CALL {
            CALL db.index.vector.queryNodes('animeEmbedding', $limit, $embedding)
            YIELD node, score
            RETURN ID(node) AS nodeId,
                   node.malAnimeId AS malId, 
                   node.title AS title, 
                   'Anime' AS type, 
                   node.imageUrl AS image, 
                   score,
                   node.description AS description
            
            UNION
            
            CALL db.index.vector.queryNodes('characterEmbedding', $limit, $embedding)
            YIELD node, score
            RETURN ID(node) AS nodeId,
                   node.malCharacterId AS malId, 
                   node.name AS title, 
                   'Character' AS type, 
                   node.imageUrl AS image,
                   score,
                   node.description AS description
        }
        RETURN nodeId, malId, title, type, image, score, description
        ORDER BY score DESC
        LIMIT $limit
        """
        
        results = []
        
        with driver.session() as session:
            # Execute combined query
            combined_results = session.run(combined_query, embedding=query_embedding, limit=limit)
            for record in combined_results:
                results.append({
                    "title": record["title"],
                    "type": [record["type"]],
                    "id": record["nodeId"],
                    "score": record["score"],
                    "malId": record["malId"],
                    "image": record["image"],
                    "description": record["description"][:200] + "..." if record["description"] and len(record["description"]) > 200 else record["description"]
                })
        
        return {"status": "success", "results": results, "search_type": "semantic"}
        
    except Exception as e:
        logging.error(f"Semantic search error: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/entity/{entity_type}/{entity_id}")
def get_entity_details(entity_type: str, entity_id: int):
    """
    Endpoint untuk mendapatkan detail lengkap dari Anime, Character, atau Studio.
    """
    
    if entity_type not in ['Anime', 'Character', 'Studio']:
        return {"status": "error", "message": "Invalid entity type"}
    
    # Query Cypher untuk mendapatkan semua properti dari node
    cypher_query = f"""
    MATCH (e:{entity_type})
    WHERE ID(e) = $id
    RETURN properties(e) AS entity
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher_query, id=entity_id)
            record = result.single()
            
            if not record:
                return {"status": "error", "message": "Entity not found"}
            
            entity_data = record["entity"]
            
            # TODO: Fetch related entities (genres, studios, characters, etc.)
            # For now, returning empty related array
            entity_data["related"] = []
            
            return {"status": "success", "entity": entity_data}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}
    
@app.get("/console")
def query_console(query:str):
    """
    Endpoint untuk menjalankan query Cypher langsung dari konsol.
    """
    query = query.strip()
    if not query.lower().startswith("match"):
        return {"status": "error", "message": "Only MATCH queries are allowed for security reasons."}
    
    try:
        with driver.session() as session:
            result = session.execute_read(query)
            columns = result.keys()
            records = result.values()
            return {"status": "success", "results": {"columns": columns, "records": records}}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat")
def chat_with_rag(request: ChatRequest):
    """
    Endpoint untuk chatbot menggunakan RAG (Retrieval-Augmented Generation).
    Supports conversation history for context-aware responses.
    """
    
    if driver is None:
        return {"status": "error", "message": "Database connection not available"}
    
    if embedding_model is None:
        return {"status": "error", "message": "Embedding model not loaded. Please install sentence-transformers: pip install sentence-transformers"}
    
    try:
        # Convert Pydantic models to dicts for the RAG service
        history_dicts = [msg.dict() for msg in request.history]
        
        # Generate response using RAG service with conversation history
        response = generate_rag_response(
            request.query, 
            driver, 
            embedding_model,
            conversation_history=history_dicts
        )
        return {"status": "success", "response": response}
    except Exception as e:
        logging.error(f"Chat error: {e}")
        return {"status": "error", "message": f"Failed to generate response: {str(e)}"}