import pandas as pd
import re
import json
import ast
import csv # Diperlukan untuk opsi quoting

# --- Tentukan Nama File ---
CHAR_FILE_IN = 'mal_characters_detailed.csv'
ANIME_FILE_IN = 'mal_anime.csv'

CHAR_FILE_OUT = 'mal_characters_detailed_clean.csv'
ANIME_FILE_OUT = 'mal_anime_clean.csv'

print("Memulai proses pembersihan...")

# --- 1. Bersihkan File ---
try:
    print(f"Membaca {CHAR_FILE_IN}...")
    # Pandas akan membaca CSV yang kotor dengan benar
    df_char = pd.read_csv(CHAR_FILE_IN)
    
    # Hapus kolom 'attributes' jika ada
    if 'attributes' in df_char.columns:
        print("Menghapus kolom 'attributes'...")
        df_char = df_char.drop('attributes', axis=1)

    print(f"Menyimpan ke {CHAR_FILE_OUT}...")
    df_char.to_csv(CHAR_FILE_OUT, index=False, quoting=csv.QUOTE_ALL)
    
    print(f"File {CHAR_FILE_OUT} berhasil disimpan.\n")

except Exception as e:
    print(f"Error saat memproses file karakter: {e}")


# --- 2. Bersihkan File Anime (Menghapus '#' dari Angka) ---
try:
    print(f"Membaca {ANIME_FILE_IN}...")
    df_anime = pd.read_csv(ANIME_FILE_IN, dtype=str) # Baca semua sebagai string agar aman

    # Bersihkan karakter '#' dari kolom 'Ranked' dan 'Popularity'
    print("Membersihkan kolom 'Ranked' dan 'Popularity'...")
    df_anime['Ranked'] = df_anime['Ranked'].str.lstrip('#')
    df_anime['Popularity'] = df_anime['Popularity'].str.lstrip('#')

    # Bersihkan kombinasi kutip dan backslash yang tersisa dalam teks 'characters'.
    # Tujuan: hilangkan rangkaian kutip ganda (""") dan backslash yang tersisa
    # sehingga teks seperti: ""}, {""id"": 197886, ""name"": "Mayor of \\\"Here\\\" Village""
    # menjadi bentuk kutipan yang wajar.
    def _clean_quotes(s):
        if pd.isna(s):
            return s
        s = str(s)
        # 1) Ganti rangkaian backslash diikuti tanda kutip (mis. \" , \\\" dll) menjadi satu tanda kutip (")
        s = re.sub(r'\\+"', '"', s)
        # 2) Ganti kutip ganda berurutan (""") menjadi satu kutip (") -- ulangi sampai stabil
        while '""' in s:
            s = s.replace('""', '"')
        return s

    if 'characters' in df_anime.columns:
        df_anime['characters'] = df_anime['characters'].where(
            df_anime['characters'].isna(),
            df_anime['characters'].astype(str).apply(_clean_quotes)
        )
    
    def _extract_ids_from_char_field(s):
        if pd.isna(s):
            return []
        s = str(s).strip()
        if not s:
            return []
        # Try to parse as JSON
        data = None
        try:
            data = json.loads(s)
        except Exception:
            try:
                data = ast.literal_eval(s)
            except Exception:
                # Fallback: regex search for "id": <number> or 'id': <number>
                matches = re.findall(r'"id"\s*:\s*(\d+)|\'id\'\s*:\s*(\d+)', s)
                ids = [int(a or b) for a, b in matches]
                # dedupe while preserving order
                seen = set()
                out = []
                for i in ids:
                    if i not in seen:
                        seen.add(i)
                        out.append(i)
                return out

        ids = []
        # If parsed to a single dict that contains a list of character dicts, try to find them
        if isinstance(data, dict):
            # direct object with 'id'
            if 'id' in data and isinstance(data['id'], (int, str)):
                try:
                    ids.append(int(data['id']))
                except Exception:
                    pass
            # search nested lists/dicts for id fields
            for v in data.values():
                if isinstance(v, list):
                    for item in v:
                        if isinstance(item, dict) and 'id' in item:
                            try:
                                ids.append(int(item['id']))
                            except Exception:
                                pass
                elif isinstance(v, dict) and 'id' in v:
                    try:
                        ids.append(int(v['id']))
                    except Exception:
                        pass
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict) and 'id' in item:
                    try:
                        ids.append(int(item['id']))
                    except Exception:
                        try:
                            ids.append(int(str(item['id']).strip()))
                        except Exception:
                            pass
                elif isinstance(item, (int, str)) and str(item).isdigit():
                    ids.append(int(item))

        # dedupe while preserving order
        seen = set()
        out = []
        for i in ids:
            if i not in seen:
                seen.add(i)
                out.append(i)
        return out

    # Create new column 'character_ids' containing list of ids (array)
    if 'characters' in df_anime.columns:
        df_anime['character_ids'] = df_anime['characters'].apply(_extract_ids_from_char_field)
    else:
        df_anime['character_ids'] = [[] for _ in range(len(df_anime))]

    # Tulis ulang file CSV yang bersih
    print(f"Menyimpan ke {ANIME_FILE_OUT}...")
    df_anime.to_csv(ANIME_FILE_OUT, index=False, quoting=csv.QUOTE_NONNUMERIC)

    print(f"File {ANIME_FILE_OUT} berhasil disimpan.\n")

except Exception as e:
    print(f"Error saat memproses file anime: {e}")

print("--- Proses Pembersihan Selesai ---")
print(f"File baru Anda adalah: {CHAR_FILE_OUT} dan {ANIME_FILE_OUT}")