import os
import logging
from dotenv import load_dotenv
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import json # Tambahkan import untuk parsing JSON

# --- KONFIGURASI ---
load_dotenv()
logging.basicConfig(level=logging.INFO)

# Kredensial Neo4j diambil dari .env
NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USER")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

MODEL_NAME = 'Qwen/Qwen3-Embedding-0.6B' 
BATCH_SIZE = 500

# --- INICIALISASI ---
try:
    # 1. Inisialisasi Driver Neo4j
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    driver.verify_connectivity()
    logging.info("Koneksi Neo4j berhasil terjalin.")

    # 2. Muat Model Embedding
    logging.info(f"Memuat model Sentence Transformer: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    VECTOR_DIMENSION = model.get_sentence_embedding_dimension()
    logging.info(f"Dimensi vektor model: {VECTOR_DIMENSION}")

except Exception as e:
    logging.error(f"FATAL ERROR: Gagal inisialisasi. Pastikan .env dan koneksi Neo4j benar. Error: {e}")
    driver = None
    model = None


# --- FUNGSI UTAMA ---

def get_id_property_name(label: str) -> str:
    """Mendapatkan nama properti ID yang benar berdasarkan label node."""
    if label == 'Anime':
        return 'malAnimeId'
    elif label == 'Character':
        return 'malCharacterId'
    return ''

def format_attributes_to_text(attributes_json: str | None) -> str:
    """Mengubah string JSON attributes menjadi narasi teks."""
    if not attributes_json:
        return ""
    
    try:
        # Menghapus karakter newline/tab dan parse JSON
        attributes_list = json.loads(attributes_json)
        
        if not attributes_list:
            return ""
            
        parts = []
        for attr in attributes_list:
            if 'name' in attr and 'value' in attr:
                # Format: "Height is 157 cm, Weight is 45 kg, ..."
                parts.append(f"{attr['name']} is {attr['value']}")
        
        if parts:
            return " (Attributes: " + ", ".join(parts) + ".)"
        return ""
        
    except json.JSONDecodeError as e:
        logging.warning(f"Gagal mem-parse JSON attributes: {e}")
        return ""


def get_nodes_without_embedding(label: str, property_name: str, batch_size: int = BATCH_SIZE):
    """Mengambil node dari Neo4j yang tidak memiliki properti embedding."""
    
    id_property = get_id_property_name(label)
    
    # KONDISIONAL: Hanya ambil attributes jika label adalah Character
    attributes_return = ", n.attributes AS attributesText" if label == 'Character' else ""
    
    query = f"""
    MATCH (n:{label})
    WHERE n.{property_name} IS NOT NULL AND n.embedding IS NULL AND n.{id_property} IS NOT NULL
    RETURN n.{id_property} AS externalId, n.{property_name} AS descriptionText {attributes_return}
    LIMIT {batch_size}
    """
    with driver.session() as session:
        result = session.run(query)
        # Mengubah struktur output untuk memasukkan deskripsi yang digabungkan
        data = []
        for record in result:
            description = record['descriptionText']
            
            # GABUNGKAN TEKS HANYA JIKA ITU NODE CHARACTER
            if label == 'Character':
                # Ambil dari record, yang hanya ada jika di-query
                attributes = record['attributesText'] 
                attribute_text = format_attributes_to_text(attributes)
                combined_text = f"{description} {attribute_text}"
            else:
                combined_text = description # Anime hanya menggunakan deskripsi
                
            data.append({
                'externalId': record['externalId'],
                'text': combined_text # Kunci 'text' sekarang berisi gabungan
            })
        return data


# FUNGSI LAMA DIGANTI DENGAN BATCH UPDATE UNTUK EFISIENSI
def update_nodes_batch(data_batch: list, label: str):
    """Menyimpan vektor embedding ke batch node di Neo4j menggunakan UNWIND."""
    
    id_property = get_id_property_name(label)
    
    query = f"""
    UNWIND $data AS item
    MATCH (n:{label} {{{id_property}: item.externalId}})
    SET n.embedding = item.embedding
    """
    # data_batch adalah list of dictionaries: [{'externalId': id, 'embedding': [v1, v2, ...]}]
    with driver.session() as session:
        session.run(query, data=data_batch)

def process_nodes(label: str, property_name: str):
    """Mengelola proses batching, embedding, dan penyimpanan."""
    if not driver or not model:
        return

    # NOTE: Property name sekarang hanya digunakan untuk query WHERE (n.description IS NOT NULL)
    logging.info(f"Memproses node: :{label} (properti: description & attributes)")
    
    total_processed = 0
    while True:
        # Ambil batch node. Sekarang mengambil deskripsi GABUNGAN.
        nodes_batch = get_nodes_without_embedding(label, property_name, BATCH_SIZE)
        
        if not nodes_batch:
            logging.info(f"Semua node :{label} telah diproses.")
            break

        # Ekstrak teks (sudah digabungkan di fungsi get_nodes)
        texts = [node['text'] for node in nodes_batch]
        external_ids = [node['externalId'] for node in nodes_batch] 
        
        # Buat Embedding
        embeddings = model.encode(texts).tolist()
        
        # Format data untuk Cypher UNWIND
        update_data = [
            {'externalId': external_id, 'embedding': embedding}
            for external_id, embedding in zip(external_ids, embeddings)
        ]

        # Simpan batch menggunakan UNWIND
        with tqdm(total=len(update_data), desc=f"Saving {label}") as pbar:
            update_nodes_batch(update_data, label) 
            pbar.update(len(update_data)) # Update progress bar
            total_processed += len(update_data)
            
        logging.info(f"Progress: {total_processed} node :{label} telah di-embed.")

# --- FUNGSI CLEANUP ---

def drop_vector_index(index_name: str):
    """Menghapus vector index Neo4j GDS."""
    if not driver:
        return

    logging.info(f"Menghapus vector index: {index_name}")
    query = f"DROP INDEX {index_name} IF EXISTS"
    try:
        with driver.session() as session:
            # Perlu diperiksa apakah index ada sebelum drop, tapi Cypher drop sudah cukup aman
            session.run(query) 
        logging.info(f"Vector Index '{index_name}' berhasil dihapus.")
    except Exception as e:
        # Peringatan, index mungkin tidak ada
        logging.warning(f"Gagal menghapus index '{index_name}'. Mungkin index tidak ada. Error: {e}")

def create_vector_index(label: str, index_name: str, vector_property: str = 'embedding'):
    """Membuat vector index di Neo4j GDS."""
    if not driver or not model:
        return

    logging.info(f"Membuat vector index: {index_name}")
    query = f"""
    CALL db.index.vector.createNodeIndex('{index_name}', 
        '{label}', 
        '{vector_property}', 
        {VECTOR_DIMENSION}, 
        'COSINE'
    )
    """
    try:
        with driver.session() as session:
            session.run(query)
        logging.info(f"Vector Index '{index_name}' berhasil dibuat.")
    except Exception as e:
        logging.warning(f"Gagal membuat index '{index_name}'. Mungkin index sudah ada. Error: {e}")


if __name__ == '__main__':
    if driver and model:
        
        # --- PROSES CLEANUP (OPSIONAL) ---
        # 1. Hapus Index Lama (Wajib jika dimensi vektor berubah atau index rusak)
        drop_vector_index(index_name='anime_description_index')
        drop_vector_index(index_name='character_description_index')
        
        # NOTE: Menghapus properti 'embedding' secara massal dilakukan secara MANUAL di Neo4j Browser (Langkah 1 di atas)
        
        # --- PROSES EMBEDDING ---
        # 2. Embed Deskripsi Anime (properti: description)
        process_nodes(label='Anime', property_name='description')
        
        # 3. Embed Deskripsi Karakter (properti: description)
        process_nodes(label='Character', property_name='description')
        
        # --- PROSES INDEXING ---
        # 4. Buat Index untuk Anime (Dilakukan setelah semua data dimasukkan)
        create_vector_index(label='Anime', index_name='anime_description_index')
        
        # 5. Buat Index untuk Karakter
        create_vector_index(label='Character', index_name='character_description_index')
        
        driver.close()
        logging.info("Proses embedding selesai. Driver Neo4j ditutup.")