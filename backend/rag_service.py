import os
import logging
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# --- KONFIGURASI LLM ---
LLM_API_KEY = os.getenv("LLM_API_KEY") 
LLM_PROVIDER = "groq"

# Qwen3-Embedding requires instruction prefix for queries in retrieval tasks
QUERY_INSTRUCTION = "Instruct: Given a user search query, retrieve relevant anime or character descriptions that match the query.\nQuery: "

def get_context_from_neo4j(driver, query_vector, limit=5):
    """
    Mengambil teks relevan dari Neo4j menggunakan Vector Search.
    """
    cypher_query = """
        CALL {
            CALL db.index.vector.queryNodes('animeEmbedding', $limit, $embedding)
            YIELD node, score
            RETURN 'Anime: ' + node.title + '. Description: ' + node.description AS text, score
            
            UNION
            
            CALL db.index.vector.queryNodes('characterEmbedding', $limit, $embedding)
            YIELD node, score
            RETURN 'Character: ' + node.name + '. Description: ' + node.description AS text, score
        }
        RETURN text, score
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

def call_llm_api(messages):
    """Mengirim messages ke LLM API dan mendapatkan jawaban.
    
    Args:
        messages: List of message dicts with 'role' and 'content' keys
    """
    
    if not LLM_API_KEY:
        return "Error: LLM_API_KEY has not been set yet in .env. Please set it to enable the Chatbot feature."

    if LLM_PROVIDER == "groq":
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {LLM_API_KEY}",
            "Content-Type": "application/json"
        }
        data = {
            "messages": messages,  # Now accepts full conversation history
            "model": "llama-3.3-70b-versatile", # Updated to supported model
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
    except requests.exceptions.HTTPError as e:
        # Log detailed error information
        error_detail = ""
        try:
            error_detail = response.json()
            logging.error(f"LLM API Error Details: {error_detail}")
        except:
            error_detail = response.text
            logging.error(f"LLM API Error Response: {error_detail}")
        return f"Sorry, I can't think right now. (API Error: {str(e)})"
    except Exception as e:
        logging.error(f"Error LLM API: {e}")
        return f"Sorry, I can't think right now. (Error: {str(e)})"

def extract_entity_names(conversation_history):
    """Extract anime titles and character names from conversation history."""
    import re
    entities = []
    
    for msg in conversation_history:
        if msg['role'] == 'assistant':
            # Look for patterns like "Anime: Title" or "Character: Name"
            anime_matches = re.findall(r'(?:from|about|in)\s+["\']?([A-Z][^.,!?"\'\\.]+?)(?:["\']|\s+(?:is|was|has|anime))', msg['content'])
            entities.extend(anime_matches)
    
    # Get unique entities from last 3 messages
    return list(set(entities))[-3:]

def generate_rag_response(user_query, driver, embedding_model, conversation_history=None):
    """Fungsi utama RAG: Vector Search -> Context -> LLM Answer
    
    Args:
        user_query: Current user question
        driver: Neo4j driver
        embedding_model: Sentence transformer model
        conversation_history: List of previous messages [{'role': 'user/assistant', 'content': '...'}]
    """
    
    if conversation_history is None:
        conversation_history = []
    
    # Extract entity names from conversation for context
    recent_entities = extract_entity_names(conversation_history)
    
    # 1. Build context-aware search query
    # If user asks vague question ("tell me more", "what about her"), append context
    enhanced_query = user_query
    if recent_entities and len(user_query.split()) < 6:
        # Short query - likely a follow-up question
        enhanced_query = f"{user_query} {' '.join(recent_entities)}"
        logging.info(f"Enhanced query with context: {enhanced_query}")
    
    # 2. Embed Pertanyaan User (with instruction prefix for Qwen3-Embedding)
    try:
        query_with_instruction = QUERY_INSTRUCTION + enhanced_query
        query_vector = embedding_model.encode(query_with_instruction).tolist()
    except Exception as e:
        return f"Gagal memproses pertanyaan: {e}"

    # 3. Ambil Konteks dari Neo4j
    context_text = get_context_from_neo4j(driver, query_vector)
    
    if not context_text:
        return "Sorry, I couldn't find any relevant information in the anime database to answer your question."

    # 4. Rakit Messages dengan History
    # Build context hint for the LLM
    context_hint = ""
    if recent_entities:
        context_hint = f"\n\nIMPORTANT: The user has been discussing: {', '.join(recent_entities)}. When they ask follow-up questions, prioritize information about these entities unless they explicitly ask about something else."
    
    system_message = {
        "role": "system",
        "content": f"""You are an expert Anime assistant (Otaku Knowledge Base). 
Answer the user's question ONLY based on the Facts/Context provided and the conversation history.
If the answer is not in the context, say "Sorry, that information is not available in our database." do not make things up.
Use casual but polite English.
If the user refers to something from previous messages (like "it", "that anime", "the character", "she", "he"), use the conversation history to understand the context.{context_hint}"""
    }
    
    context_message = {
        "role": "system",
        "content": f"""=== CONTEXT FROM DATABASE ===
{context_text}
============================="""
    }
    
    # Build messages array: system + context + history + current query
    messages = [system_message, context_message]
    
    # Add conversation history (only last 8 messages to avoid token limits)
    if conversation_history:
        messages.extend(conversation_history[-8:])
    
    # Add current user query
    messages.append({"role": "user", "content": user_query})

    # 5. Tanya LLM
    return call_llm_api(messages)