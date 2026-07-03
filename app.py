import os
import shutil
import tempfile
import traceback
import time
from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from dotenv import load_dotenv

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_mistralai import MistralAIEmbeddings, ChatMistralAI
from langchain_chroma import Chroma
from langchain_core.prompts import ChatPromptTemplate

load_dotenv()

print("MISTRAL KEY FOUND:", bool(os.getenv("MISTRAL_API_KEY")))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PERSIST_DIR = os.path.join(BASE_DIR, "chroma-db", "current")

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

CORS(app)

state = {
    "vectorstore": None,
    "retriever": None,
    "llm": None,
    "doc_name": None,
    "chunks": 0
}

PROMPT = ChatPromptTemplate.from_messages([
    (
        "system",
        """
You are a precise and helpful AI assistant.

Use ONLY the provided context to answer the question.

If the answer is not present in the context, respond:
"I could not find the answer in the document."

Keep answers concise and well structured.
"""
    ),
    (
        "human",
        """
Context:
{context}

Question:
{question}
"""
    )
])


def build_index(pdf_path):

    print("\n===== BUILD INDEX STARTED =====")

    print("1. Loading PDF...")
    docs = PyPDFLoader(pdf_path).load()
    print(f"Loaded {len(docs)} pages")

    print("2. Splitting chunks...")
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    ).split_documents(docs)

    print(f"Created {len(chunks)} chunks")

    print("3. Creating embeddings model...")
    embeddings = MistralAIEmbeddings()

    # Create a new folder for every upload
    persist_dir = os.path.join(
        BASE_DIR,
        "chroma-db",
        str(int(time.time()))
    )

    os.makedirs(persist_dir, exist_ok=True)

    print("4. Creating Chroma vector store...")
    vectorstore = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings,
        persist_directory=persist_dir
    )

    print("5. Creating retriever...")
    retriever = vectorstore.as_retriever(
        search_type="mmr",
        search_kwargs={
            "k": 4,
            "fetch_k": 10,
            "lambda_mult": 0.5
        }
    )

    print("6. Creating LLM...")
    llm = ChatMistralAI(
        model="mistral-small-2506"
    )

    print("===== BUILD INDEX COMPLETE =====\n")

    return vectorstore, retriever, llm, len(chunks)



@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/upload", methods=["POST"])
def upload():

    print("\n===== UPLOAD REQUEST RECEIVED =====")

    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    temp_dir = tempfile.mkdtemp()
    pdf_path = os.path.join(temp_dir, file.filename)

    try:
        print("Saving PDF...")
        file.save(pdf_path)

        vectorstore, retriever, llm, chunk_count = build_index(pdf_path)

        state["vectorstore"] = vectorstore
        state["retriever"] = retriever
        state["llm"] = llm
        state["doc_name"] = file.filename
        state["chunks"] = chunk_count

        print("Indexing successful!")

        return jsonify({
            "filename": file.filename,
            "chunks": chunk_count
        })

    except Exception as e:

        print("\n===== UPLOAD ERROR =====")
        traceback.print_exc()
        print("========================\n")

        return jsonify({
            "error": str(e)
        }), 500

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)


@app.route("/api/chat", methods=["POST"])
def chat():

    if state["retriever"] is None:
        return jsonify({
            "error": "No document indexed yet"
        }), 400

    body = request.get_json(silent=True) or {}
    question = body.get("question", "").strip()

    if not question:
        return jsonify({
            "error": "Question cannot be empty"
        }), 400

    try:
        docs = state["retriever"].invoke(question)

        context = "\n\n".join(
            doc.page_content for doc in docs
        )

        prompt = PROMPT.invoke({
            "context": context,
            "question": question
        })

        response = state["llm"].invoke(prompt)

        return jsonify({
            "answer": response.content
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "error": str(e)
        }), 500


@app.route("/api/reset", methods=["POST"])
def reset():

    state["retriever"] = None
    state["llm"] = None
    state["doc_name"] = None
    state["chunks"] = 0

    if os.path.exists(PERSIST_DIR):
        shutil.rmtree(PERSIST_DIR)

    return jsonify({
        "success": True
    })


if __name__ == "__main__":

    os.makedirs(
        os.path.dirname(PERSIST_DIR),
        exist_ok=True
    )

    print("Server Started...")
    print("Open: http://127.0.0.1:5000")

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )