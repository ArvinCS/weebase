import os
import logging
import csv
import sys
import gc
import torch
from sentence_transformers import SentenceTransformer
from tqdm import tqdm
import json

# --- KONFIGURASI ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Increase CSV field size limit
csv.field_size_limit(10485760)

MODEL_NAME = 'Qwen/Qwen3-Embedding-0.6B' 
BATCH_SIZE = 16  # Smaller batch for 4GB VRAM

# Input/Output files
ANIME_CSV = '../data/scripts/mal_anime.csv'
CHARACTER_CSV = '../data/mal_characters_detailed.csv'
OUTPUT_CSV = 'embeddings_output.csv'
PROGRESS_FILE = 'embedding_progress.json'  # Track progress for resume

# --- INICIALISASI ---
try:
    # Muat Model Embedding
    logging.info(f"Memuat model Sentence Transformer: {MODEL_NAME}")
    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    logging.info(f"Using device: {device}")
    model = SentenceTransformer(MODEL_NAME, trust_remote_code=True, device=device)
    VECTOR_DIMENSION = model.get_sentence_embedding_dimension()
    logging.info(f"Dimensi vektor model: {VECTOR_DIMENSION}")

except Exception as e:
    logging.error(f"FATAL ERROR: Gagal inisialisasi. Error: {e}")
    model = None


# --- FUNGSI UTAMA ---

def load_progress():
    """Load progress from file to resume from last position."""
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, 'r') as f:
                progress = json.load(f)
                logging.info(f"📂 Loaded progress: {progress}")
                return progress
        except Exception as e:
            logging.warning(f"Could not load progress file: {e}")
    return {'anime_done': False, 'anime_last_id': None, 'character_last_id': None, 'total_processed': 0}

def save_progress(progress):
    """Save current progress to file."""
    with open(PROGRESS_FILE, 'w') as f:
        json.dump(progress, f)

def load_processed_ids():
    """Load already processed IDs from output CSV to avoid duplicates."""
    processed = {'Anime': set(), 'Character': set()}
    if os.path.exists(OUTPUT_CSV):
        try:
            with open(OUTPUT_CSV, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    label = row.get('label')
                    id_val = row.get('id')
                    if label and id_val:
                        processed[label].add(int(id_val))
            logging.info(f"📂 Found {len(processed['Anime'])} anime and {len(processed['Character'])} characters already processed")
        except Exception as e:
            logging.warning(f"Could not read existing output file: {e}")
    return processed

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
    """Membaca CSV, generate embeddings, dan simpan ke CSV baru dengan resume support."""
    if not model:
        return
    
    # Load existing progress and processed IDs
    progress = load_progress()
    processed_ids = load_processed_ids()
    total_processed = len(processed_ids['Anime']) + len(processed_ids['Character'])
    
    # Open in append mode if file exists, otherwise write mode
    file_exists = os.path.exists(OUTPUT_CSV) and total_processed > 0
    mode = 'a' if file_exists else 'w'
    
    with open(OUTPUT_CSV, mode, newline='', encoding='utf-8') as output_file:
        writer = csv.writer(output_file)
        
        # Write header only if new file
        if not file_exists:
            writer.writerow(['id', 'label', 'embedding'])
        
        # Process Anime (skip if already done)
        if not progress.get('anime_done'):
            logging.info(f"Processing anime from {ANIME_CSV}...")
            try:
                with open(ANIME_CSV, 'r', encoding='utf-8') as f:
                    reader = csv.DictReader(f)
                    batch = []
                    anime_count = 0
                    skipped = 0
                    
                    for idx, row in enumerate(reader):
                        try:
                            if row.get('description') and row.get('myanimelist_id'):
                                anime_id = int(row['myanimelist_id'])
                                
                                # Skip if already processed
                                if anime_id in processed_ids['Anime']:
                                    skipped += 1
                                    continue
                                
                                batch.append({
                                    'id': anime_id,
                                    'text': row['description'][:5000],
                                    'label': 'Anime'
                                })
                                anime_count += 1
                                
                                if len(batch) >= BATCH_SIZE:
                                    try:
                                        texts = [item['text'] for item in batch]
                                        embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=False, convert_to_numpy=True)
                                        
                                        for item, embedding in zip(batch, embeddings):
                                            embedding_str = json.dumps(embedding.tolist())
                                            writer.writerow([item['id'], item['label'], embedding_str])
                                            processed_ids['Anime'].add(item['id'])
                                        
                                        output_file.flush()
                                        total_processed += len(batch)
                                        logging.info(f"Processed {total_processed} entries (anime batch, skipped {skipped})")
                                        
                                        # Save progress
                                        progress['total_processed'] = total_processed
                                        progress['anime_last_id'] = batch[-1]['id']
                                        save_progress(progress)
                                        
                                        # Clear GPU memory
                                        del embeddings, texts
                                        if torch.cuda.is_available():
                                            torch.cuda.empty_cache()
                                        gc.collect()
                                    except Exception as encode_error:
                                        logging.error(f"Error encoding batch: {encode_error}")
                                        import traceback
                                        traceback.print_exc()
                                    batch = []
                                    
                        except Exception as e:
                            logging.warning(f"Skipping anime row {idx}: {e}")
                            continue
                    
                    # Process remaining anime batch
                    if batch:
                        logging.info(f"Processing final anime batch of {len(batch)}...")
                        texts = [item['text'] for item in batch]
                        embeddings = model.encode(texts, batch_size=len(batch), show_progress_bar=False, convert_to_numpy=True)
                        
                        for item, embedding in zip(batch, embeddings):
                            embedding_str = json.dumps(embedding.tolist())
                            writer.writerow([item['id'], item['label'], embedding_str])
                            processed_ids['Anime'].add(item['id'])
                        
                        output_file.flush()
                        total_processed += len(batch)
                        
                        del embeddings, texts
                        if torch.cuda.is_available():
                            torch.cuda.empty_cache()
                        gc.collect()
                    
                    logging.info(f"✅ Anime processing complete: {anime_count} new, {skipped} skipped")
                    progress['anime_done'] = True
                    save_progress(progress)
                    
            except Exception as e:
                logging.error(f"Error processing anime: {e}")
                import traceback
                traceback.print_exc()
        else:
            logging.info("⏭️ Skipping anime (already completed)")
        
        # Process Characters
        logging.info(f"Processing characters from {CHARACTER_CSV}...")
        try:
            with open(CHARACTER_CSV, 'r', encoding='utf-8') as f:
                reader = csv.DictReader(f)
                batch = []
                char_count = 0
                skipped = 0
                
                for idx, row in enumerate(reader):
                    try:
                        if row.get('description') and row.get('character_id'):
                            char_id = int(row['character_id'])
                            
                            # Skip if already processed
                            if char_id in processed_ids['Character']:
                                skipped += 1
                                continue
                            
                            description = row['description'][:5000]
                            attributes = row.get('attributes', '')
                            attribute_text = format_attributes_to_text(attributes)
                            combined_text = f"{description} {attribute_text}"
                            
                            batch.append({
                                'id': char_id,
                                'text': combined_text,
                                'label': 'Character'
                            })
                            char_count += 1
                            
                            if len(batch) >= BATCH_SIZE:
                                try:
                                    texts = [item['text'] for item in batch]
                                    embeddings = model.encode(texts, batch_size=BATCH_SIZE, show_progress_bar=False, convert_to_numpy=True)
                                    
                                    for item, embedding in zip(batch, embeddings):
                                        embedding_str = json.dumps(embedding.tolist())
                                        writer.writerow([item['id'], item['label'], embedding_str])
                                        processed_ids['Character'].add(item['id'])
                                    
                                    output_file.flush()
                                    total_processed += len(batch)
                                    logging.info(f"Processed {total_processed} entries (char batch, skipped {skipped})")
                                    
                                    # Save progress
                                    progress['total_processed'] = total_processed
                                    progress['character_last_id'] = batch[-1]['id']
                                    save_progress(progress)
                                    
                                    # Clear GPU memory
                                    del embeddings, texts
                                    if torch.cuda.is_available():
                                        torch.cuda.empty_cache()
                                    gc.collect()
                                except Exception as encode_error:
                                    logging.error(f"Error encoding batch: {encode_error}")
                                    import traceback
                                    traceback.print_exc()
                                batch = []
                                
                    except Exception as e:
                        logging.warning(f"Skipping character row {idx}: {e}")
                        continue
                    
                    if (idx + 1) % 10000 == 0:
                        logging.info(f"Read {idx + 1} character rows (processed {char_count}, skipped {skipped})...")
                
                # Process remaining character batch
                if batch:
                    logging.info(f"Processing final character batch of {len(batch)}...")
                    texts = [item['text'] for item in batch]
                    embeddings = model.encode(texts, batch_size=len(batch), show_progress_bar=False, convert_to_numpy=True)
                    
                    for item, embedding in zip(batch, embeddings):
                        embedding_str = json.dumps(embedding.tolist())
                        writer.writerow([item['id'], item['label'], embedding_str])
                    
                    output_file.flush()
                    total_processed += len(batch)
                    
                    del embeddings, texts
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    gc.collect()
                
                logging.info(f"✅ Character processing complete: {char_count} new, {skipped} skipped")
                
        except Exception as e:
            logging.error(f"Error processing characters: {e}")
            import traceback
            traceback.print_exc()
    
    file_size = os.path.getsize(OUTPUT_CSV) / (1024 * 1024)
    logging.info(f"✅ CSV file created: {OUTPUT_CSV}")
    logging.info(f"📊 File size: {file_size:.2f} MB")
    logging.info(f"📝 Total rows: {total_processed}")
    
    # Clean up progress file on successful completion
    if os.path.exists(PROGRESS_FILE):
        os.remove(PROGRESS_FILE)
        logging.info("🧹 Cleaned up progress file")

if __name__ == '__main__':
    if model:
        logging.info("=" * 50)
        logging.info("STARTING CSV TO EMBEDDINGS CSV CONVERSION")
        logging.info("(Supports resume from last position)")
        logging.info("=" * 50)
        
        try:
            process_csv_to_embeddings()
            
            logging.info("=" * 50)
            logging.info("PROCESS COMPLETED SUCCESSFULLY!")
            logging.info("=" * 50)
            
        except KeyboardInterrupt:
            logging.warning("\n\n⚠️ Process interrupted by user (Ctrl+C).")
            logging.info("💾 Progress saved. Run the script again to resume.")
        except Exception as e:
            logging.error(f"\n\nFATAL ERROR: {e}")
            import traceback
            traceback.print_exc()
            logging.info("💾 Progress saved. Run the script again to resume.")