import os
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase

# --- KONFIGURASI ---
load_dotenv()
logging.basicConfig(level=logging.INFO)

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

# --- INICIALISASI ---
driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
driver.verify_connectivity()
logging.info("Connected to Neo4j")

def drop_vector_index(index_name: str):
    """Drop vector index."""
    logging.info(f"Dropping vector index: {index_name}")
    query = f"DROP INDEX {index_name} IF EXISTS"
    try:
        with driver.session() as session:
            session.run(query) 
        logging.info(f"Index '{index_name}' dropped successfully.")
    except Exception as e:
        logging.warning(f"Failed to drop index '{index_name}': {e}")

def clear_embeddings(label: str):
    """Remove embedding property from all nodes of a given label in batches."""
    logging.info(f"Clearing embeddings from :{label} nodes...")
    
    total_cleared = 0
    while True:
        query = f"""
        MATCH (n:{label})
        WHERE n.embedding IS NOT NULL
        WITH n LIMIT 5000
        REMOVE n.embedding
        RETURN count(n) AS cleared
        """
        with driver.session() as session:
            result = session.run(query)
            record = result.single()
            count = record["cleared"] if record else 0
            
            if count == 0:
                break
                
            total_cleared += count
            logging.info(f"Cleared {total_cleared} embeddings so far from :{label}...")
    
    logging.info(f"Total cleared: {total_cleared} embeddings from :{label} nodes")

if __name__ == '__main__':
    # Step 1: Drop existing vector indexes
    drop_vector_index('anime_description_index')
    drop_vector_index('character_description_index')
    
    # Step 2: Clear embeddings
    clear_embeddings('Anime')
    clear_embeddings('Character')
    
    driver.close()
    logging.info("Cleanup complete. You can now run ingest_vector_embedding.py")
