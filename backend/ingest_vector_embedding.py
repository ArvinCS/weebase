import os
import logging
import csv
import sys
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import json

# --- KONFIGURASI ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Increase CSV field size limit
csv.field_size_limit(10485760)

MODEL_NAME = 'Qwen/Qwen3-Embedding-0.6B' 
BATCH_SIZE = 10  # Smaller batch to prevent crashes

# Input/Output files
ANIME_CSV = '../data/scripts/mal_anime.csv'
CHARACTER_CSV = '../data/mal_characters_detailed.csv'
OUTPUT_CSV = 'embeddings_output.csv'

# --- INICIALISASI ---
try:
    # Muat Model Embedding
    logging.info(f"Memuat model Sentence Transformer: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True)
    VECTOR_DIMENSION = model.get_sentence_embedding_dimension()
    logging.info(f"Dimensi vektor model: {VECTOR_DIMENSION}")

except Exception as e:
    logging.error(f"FATAL ERROR: Gagal inisialisasi. Error: {e}")
    model = None


# --- FUNGSI UTAMA ---

def format_attributes_to_text(attributes_json: str | None) -> str:
    """Mengubah string JSON attributes menjadi narasi teks."""
    if not attributes_json:
        return ""
    
    try:
        attributes_list = json.loads(attributes_json)
        
        if not attributes_list:
            return ""
            
        parts = []
        for attr in attributes_list:
            if 'name' in attr and 'value' in attr:
                parts.append(f"{attr['name']} is {attr['value']}")
        
        if parts:
            return " (Attributes: " + ", ".join(parts) + ".)"
        return ""
        
    except json.JSONDecodeError as e:
        logging.warning(f"Gagal mem-parse JSON attributes: {e}")
        return ""

def process_csv_to_embeddings():
    """Membaca CSV, generate embeddings, dan simpan ke CSV baru."""
    if not model:
        return
    
    total_processed = 0
    
    with open(OUTPUT_CSV, 'w', newline='', encoding='utf-8') as output_file:
        writer = csv.writer(output_file)
        writer.writerow(['id', 'label', 'embedding'])
        
        # Process Anime
        logging.info(f"Processing anime from {ANIME_CSV}...")
        try:
            logging.info("Opening anime CSV file...")
            with open(ANIME_CSV, 'r', encoding='utf-8') as f:
                logging.info("Creating CSV reader...")
                reader = csv.DictReader(f)
                batch = []
                anime_count = 0
                
                for idx, row in enumerate(reader):
                    try:
                        if row.get('description') and row.get('myanimelist_id'):
                            batch.append({
                                'id': int(row['myanimelist_id']),
                                'text': row['description'][:5000],  # Limit text length
                                'label': 'Anime'
                            })
                            anime_count += 1
                            
                            if len(batch) >= BATCH_SIZE:
                                logging.info(f"Encoding batch of {len(batch)} anime...")
                                sys.stdout.flush()
                                try:
                                    texts = [item['text'] for item in batch]
                                    embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=False, convert_to_numpy=True)
                                    logging.info(f"Encode successful, writing to CSV...")
                                    sys.stdout.flush()
                                    
                                    for item, embedding in zip(batch, embeddings):
                                        embedding_str = json.dumps(embedding.tolist())
                                        writer.writerow([item['id'], item['label'], embedding_str])
                                    
                                    output_file.flush()  # Force write to disk
                                    total_processed += len(batch)
                                    logging.info(f"Processed {total_processed} entries (anime)")
                                except Exception as encode_error:
                                    logging.error(f"Error encoding batch: {encode_error}")
                                    import traceback
                                    traceback.print_exc()
                                batch = []
                                
                    except Exception as e:
                        logging.warning(f"Skipping anime row {idx}: {e}")
                        continue
                
                logging.info(f"Total anime found with description: {anime_count}")
                
                # Process remaining
                if batch:
                    logging.info(f"Processing final anime batch of {len(batch)}...")
                    texts = [item['text'] for item in batch]
                    embeddings = model.encode(texts, batch_size=len(batch), show_progress_bar=False)
                    
                    for item, embedding in zip(batch, embeddings):
                        embedding_str = json.dumps(embedding.tolist())
                        writer.writerow([item['id'], item['label'], embedding_str])
                    
                    output_file.flush()
                    total_processed += len(batch)
                    logging.info(f"Processed {total_processed} entries (final anime)")
        except Exception as e:
            logging.error(f"Error processing anime: {e}")
            import traceback
            traceback.print_exc()
        
        # Process Characters
        logging.info(f"Processing characters from {CHARACTER_CSV}...")
        try:
            logging.info("Opening character CSV file...")
            with open(CHARACTER_CSV, 'r', encoding='utf-8') as f:
                logging.info("Creating CSV reader...")
                reader = csv.DictReader(f)
                batch = []
                char_count = 0
                
                for idx, row in enumerate(reader):
                    try:
                        if row.get('description') and row.get('character_id'):
                            description = row['description'][:5000]  # Limit text length
                            attributes = row.get('attributes', '')
                            attribute_text = format_attributes_to_text(attributes)
                            combined_text = f"{description} {attribute_text}"
                            
                            batch.append({
                                'id': int(row['character_id']),
                                'text': combined_text,
                                'label': 'Character'
                            })
                            char_count += 1
                            
                            if len(batch) >= BATCH_SIZE:
                                logging.info(f"Encoding batch of {len(batch)} characters...")
                                texts = [item['text'] for item in batch]
                                embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=False)
                                
                                for item, embedding in zip(batch, embeddings):
                                    embedding_str = json.dumps(embedding.tolist())
                                    writer.writerow([item['id'], item['label'], embedding_str])
                                
                                output_file.flush()  # Force write to disk
                                total_processed += len(batch)
                                logging.info(f"Processed {total_processed} entries")
                                batch = []
                                
                    except Exception as e:
                        logging.warning(f"Skipping character row {idx}: {e}")
                        continue
                    
                    if (idx + 1) % 10000 == 0:
                        logging.info(f"Read {idx + 1} character rows (found {char_count} with description)...")
                
                logging.info(f"Total characters found with description: {char_count}")
                
                # Process remaining
                if batch:
                    logging.info(f"Processing final character batch of {len(batch)}...")
                    texts = [item['text'] for item in batch]
                    embeddings = model.encode(texts, batch_size=len(batch), show_progress_bar=False)
                    
                    for item, embedding in zip(batch, embeddings):
                        embedding_str = json.dumps(embedding.tolist())
                        writer.writerow([item['id'], item['label'], embedding_str])
                    
                    output_file.flush()
                    total_processed += len(batch)
                    logging.info(f"Processed {total_processed} entries (final character)")
        except Exception as e:
            logging.error(f"Error processing characters: {e}")
            import traceback
            traceback.print_exc()
    
    file_size = os.path.getsize(OUTPUT_CSV) / (1024 * 1024)
    logging.info(f"✅ CSV file created: {OUTPUT_CSV}")
    logging.info(f"📊 File size: {file_size:.2f} MB")
    logging.info(f"📝 Total rows: {total_processed}")

if __name__ == '__main__':
    if model:
        logging.info("=" * 50)
        logging.info("STARTING CSV TO EMBEDDINGS CSV CONVERSION")
        logging.info("=" * 50)
        
        try:
            process_csv_to_embeddings()
            
            logging.info("=" * 50)
            logging.info("PROCESS COMPLETED SUCCESSFULLY!")
            logging.info("=" * 50)
            
        except KeyboardInterrupt:
            logging.warning("\n\nProcess interrupted by user (Ctrl+C).")
        except Exception as e:
            logging.error(f"\n\nFATAL ERROR: {e}")
            import traceback
            traceback.print_exc()