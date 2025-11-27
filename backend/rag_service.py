import os
import logging
import requests
import json

# --- KONFIGURASI LLM ---
LLM_API_KEY = os.getenv("LLM_API_KEY") 
LLM_PROVIDER = "groq"

def get_context_from_neo4j(driver, query_vector, limit=5):
    """
    Mengambil teks relevan dari Neo4j menggunakan Vector Search.
    """
    cypher_query = """
        CALL db.index.vector.queryNodes('anime_description_index', $limit, $embedding)
        YIELD node, score
        RETURN 'Anime: ' + node.title + '. Description: ' + node.description AS text, score
        
        UNION
        
        CALL db.index.vector.queryNodes('character_description_index', $limit, $embedding)
        YIELD node, score
        RETURN 'Karakter: ' + node.name + '. Description: ' + node.description + ' . Additional Attributes if exists: ' + node.attributes AS text, score
        
        ORDER BY score DESC
        LIMIT $limit
    """
    
    try:
        with driver.session() as session:
            result = session.run(cypher_query, embedding=query_vector, limit=limit)
            # Gabungkan semua teks hasil pencarian menjadi satu string konteks
            contexts = [record["text"] for record in result]
            return "\n\n".join(contexts)
    except Exception as e:
        logging.error(f"Failed to fetch context from Neo4j: {e}")
        return ""

def call_llm_api(prompt):
    """Mengirim prompt ke LLM API dan mendapatkan jawaban."""
    
    if not LLM_API_KEY:
        return "Error: LLM_API_KEY has not been set yet in .env. Please set it to enable the Chatbot feature."

    if LLM_PROVIDER == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "messages": [{"role": "user", "content": prompt}],
            "model": "llama3-8b-8192", # Model cepat dan gratis
            "temperature": 0.5
        }
    
    # --- IMPLEMENTASI OPENAI (Standard) ---
    # elif LLM_PROVIDER == "openai":
    #     url = "https://api.openai.com/v1/chat/completions"
    #     headers = {
    #         "Authorization": f"Bearer {LLM_API_KEY}",
    #         "Content-Type": "application/json"
    #     }
    #     data = {
    #         "messages": [{"role": "user", "content": prompt}],
    #         "model": "gpt-3.5-turbo",
    #         "temperature": 0.5
    #     }
        
    else:
        return "LLM is unknown."

    try:
        response = requests.post(url, headers=headers, json=data)
        response.raise_for_status()
        result = response.json()
        return result['choices'][0]['message']['content']
    except Exception as e:
        logging.error(f"Error LLM API: {e}")
        return f"Sorry, I can't think right now. (Error API: {str(e)})"

def generate_rag_response(user_query, driver, embedding_model):
    """Fungsi utama RAG: Vector Search -> Context -> LLM Answer"""
    
    # 1. Embed Pertanyaan User
    try:
        query_vector = embedding_model.encode(user_query).tolist()
    except Exception as e:
        return f"Gagal memproses pertanyaan: {e}"

    # 2. Ambil Konteks dari Neo4j
    context_text = get_context_from_neo4j(driver, query_vector)
    
    if not context_text:
        return "Sorry, I couldn't find any relevant information in the anime database to answer your question."

    # 3. Rakit Prompt
    system_prompt = """
    You are an expert Anime assistant (Otaku Knowledge Base). 
    Answer the user's question ONLY based on the Facts/Context provided below.
    If the answer is not in the context, say "Sorry, that information is not available in our database." do not make things up.
    Use casual but polite English.
    """
    
    final_prompt = f"""
    {system_prompt}
    
    === CONTEXT FROM DATABASE ===
    {context_text}
    =============================
    
    User Question: {user_query}
    Answer:
    """

    # 4. Tanya LLM
    return call_llm_api(final_prompt)