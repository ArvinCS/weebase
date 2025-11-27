import pandas as pd
import requests
from bs4 import BeautifulSoup
import time
import os

# --- KONFIGURASI ---
INPUT_CSV = 'mal_characters_detailed.csv' # Ganti dengan nama file CSV karakter Anda
OUTPUT_CSV = 'mal_characters_images.csv'
# Sesuaikan malCharacterId jika nama kolomnya berbeda di CSV Anda
ID_COLUMN = 'character_id' 
URL_COLUMN = 'url' 

# Header untuk menghindari pemblokiran oleh MAL
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

def extract_image_url(mal_url: str) -> str | None:
    """
    Mengambil URL gambar karakter dari halaman MAL yang diberikan.
    
    Args:
        mal_url: URL halaman karakter MAL.

    Returns:
        URL gambar (string) atau None jika gagal.
    """
    if not mal_url or not isinstance(mal_url, str):
        return None
        
    try:
        # Mengirim permintaan
        response = requests.get(mal_url, headers=HEADERS, timeout=10)
        response.raise_for_status() # Cek jika ada HTTP error (4xx/5xx)
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Mencari tag <img> dengan class yang spesifik
        # MENGGUNAKAN FUNGSI LAMBDA UNTUK PENCARIAN SUBSTRING
        # Kita mencari tag img yang memiliki atribut 'class' dan nilai class tersebut mengandung kata 'portrait'
        img_tag = soup.find('img', class_=lambda c: c and 'portrait-' in c)
        
        if img_tag:
            # Ambil dari 'data-src' atau fallback ke 'src'
            image_url = img_tag.get('data-src') or img_tag.get('src')
            if image_url:
                return image_url.strip()
            
        return None
        
    except requests.exceptions.RequestException as e:
        # Batasi output error untuk menghindari spam
        print(f"Error mengakses {mal_url}: {e.__class__.__name__}")
        return None
    except Exception as e:
        print(f"Error parsing {mal_url}: {e.__class__.__name__}")
        return None


def run_scraping():
    """
    Fungsi utama untuk membaca CSV, melakukan scraping, dan menyimpan hasil.
    """
    if not os.path.exists(INPUT_CSV):
        print(f"ERROR: File input '{INPUT_CSV}' tidak ditemukan.")
        print("Pastikan Anda sudah mengekstrak file karakter CSV dari Kaggle.")
        return

    # 1. Baca CSV Input
    print(f"Membaca data dari {INPUT_CSV}...")
    try:
        df = pd.read_csv(INPUT_CSV)
    except Exception as e:
        print(f"Gagal membaca CSV: {e}")
        return

    # Memastikan kolom yang dibutuhkan ada
    if ID_COLUMN not in df.columns or URL_COLUMN not in df.columns:
        print(f"ERROR: CSV harus memiliki kolom '{ID_COLUMN}' dan '{URL_COLUMN}'.")
        return

    # Kolom untuk menyimpan URL gambar yang baru
    image_urls = []
    
    print(f"Memulai scraping {len(df)} karakter. Proses akan memakan waktu...")

    # 2. Iterasi dan Scraping
    for index, row in df.iterrows():
        character_id = row[ID_COLUMN]
        mal_url = row[URL_COLUMN]
        
        # Jalankan fungsi scraping
        image_url = extract_image_url(mal_url)
        image_urls.append(image_url)
        
        # Tampilkan progress
        if index % 50 == 0:
            print(f"Progress: {index}/{len(df)} karakter diproses. Terakhir: {character_id}")
            
        # PENTING: Tunggu sebentar untuk menghindari pemblokiran oleh MAL
        time.sleep(0.5) # Tunggu 500 milidetik

    # 3. Gabungkan dan Simpan Hasil
    print("\nScraping selesai. Menyimpan hasil...")
    
    # Buat DataFrame baru hanya dengan ID dan URL Gambar
    result_df = pd.DataFrame({
        ID_COLUMN: df[ID_COLUMN],
        'imageUrl': image_urls
    })
    
    # Hapus baris yang gagal scraping (imageUrl adalah None)
    result_df = result_df.dropna(subset=['imageUrl'])
    
    result_df.to_csv(OUTPUT_CSV, index=False)
    print(f"Berhasil menyimpan {len(result_df)} URL gambar ke '{OUTPUT_CSV}'.")
    print("File ini siap digunakan untuk mengupdate Neo4j.")

if __name__ == '__main__':
    run_scraping()