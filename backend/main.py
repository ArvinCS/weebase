import os  # <-- BARU
from dotenv import load_dotenv  # <-- BARU
from fastapi import FastAPI
from neo4j import GraphDatabase
import logging

load_dotenv()

app = FastAPI()

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