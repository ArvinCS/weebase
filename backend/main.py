import os
from dotenv import load_dotenv
from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from neo4j import GraphDatabase
import logging

load_dotenv()

app = FastAPI()

# --- KONFIGURASI CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dalam production, ganti dengan domain spesifik
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KONFIGURASI KONEKSI NEO4J ---
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

driver = None
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
    MATCH (e) 
    WHERE (e:Anime AND toLower(e.title) CONTAINS toLower($keyword))
        OR (e:Character AND toLower(e.name) CONTAINS toLower($keyword)) 
        OR (e:Studio AND toLower(e.name) CONTAINS toLower($keyword)) 
    RETURN 
        CASE 
            WHEN e:Anime THEN e.title 
            ELSE e.name 
        END AS title,
        labels(e) AS type, 
        ID(e) AS id
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
            result = session.run(query)
            columns = result.keys()
            records = result.values()
            return {"status": "success", "results": {"columns": columns, "records": records}}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}