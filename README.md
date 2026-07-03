# 🚀 RAGify - AI Powered PDF Chat Assistant

RAGify is a Retrieval-Augmented Generation (RAG) application that allows users to upload PDF documents and interact with them using natural language. The system retrieves relevant document chunks using semantic search and generates accurate answers using Mistral AI.

---

## ✨ Features

- 📄 Upload and process PDF documents
- 🔍 Semantic document search using vector embeddings
- 🤖 AI-powered question answering with Mistral AI
- 🧠 Retrieval-Augmented Generation (RAG) pipeline
- 💬 Interactive chat interface
- ⚡ Fast document retrieval using ChromaDB
- 🎨 Modern and responsive UI
- 🔒 Local vector storage

---

## 🛠️ Tech Stack

### Backend
- Python
- Flask
- LangChain
- ChromaDB
- Mistral AI

### Frontend
- HTML
- CSS
- JavaScript

### AI & RAG
- Mistral Embeddings
- LangChain Retrieval Chain
- Chroma Vector Database
- Semantic Search

---

## 📂 Project Structure

```bash
RAG_Project/
│
├── app.py
├── requirements.txt
├── .env
│
├── templates/
│   └── index.html
│
├── static/
│   ├── style.css
│   └── app.js
│
├── uploads/
├── chroma-db/
└── README.md
```

---

## ⚙️ Installation

### Clone Repository

```bash
git clone https://github.com/Devpreetx/RAGify.git
cd RAGify
```

### Create Virtual Environment

```bash
python -m venv venv
```

### Activate Environment

Windows:

```bash
venv\Scripts\activate
```

Linux/Mac:

```bash
source venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🔑 Environment Variables

Create a `.env` file:

```env
MISTRAL_API_KEY=your_api_key_here
```

---

## ▶️ Run Application

```bash
python app.py
```

Open:

```text
http://localhost:5000
```

---

## 📖 How It Works

1. Upload a PDF document.
2. PDF is split into chunks.
3. Chunks are converted into embeddings.
4. Embeddings are stored in ChromaDB.
5. User asks a question.
6. Relevant chunks are retrieved.
7. Mistral AI generates an answer using retrieved context.
8. Response is displayed in the chat interface.

---

## 🎯 Use Cases

- Research Papers
- Study Notes
- Technical Documentation
- Company Policies
- E-books
- Project Reports

---

## 🚀 Future Improvements

- Multiple PDF support
- Chat history
- Authentication system
- Source citation highlighting
- Cloud deployment
- OCR support for scanned PDFs

---

## 👨‍💻 Author

**Devpreet Singh**

- GitHub: https://github.com/Devpreetx
- LinkedIn: https://www.linkedin.com/in/devpreet-singh-33018a318

---

## ⭐ Support

If you found this project useful, consider giving it a star on GitHub.

⭐ Star the repository to support the project.
