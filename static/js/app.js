const fileInput     = document.getElementById("fileInput");
const uploadZone    = document.getElementById("uploadZone");
const uploadTitle   = document.getElementById("uploadTitle");

const btnIndex      = document.getElementById("btnIndex");
const btnReset      = document.getElementById("btnReset");

const progressWrap  = document.getElementById("progressWrap");
const progressFill  = document.getElementById("progressFill");
const progressLabel = document.getElementById("progressLabel");

const chatInput     = document.getElementById("chatInput");
const btnSend       = document.getElementById("btnSend");

const messages      = document.getElementById("messages");

const docInfoName   = document.getElementById("docInfoName");
const docChunks     = document.getElementById("docChunks");

const topbarLabel   = document.getElementById("topbarLabel");
const emptyState    = document.getElementById("emptyState");

const toast         = document.getElementById("toast");

// Stores a fresh in-memory copy of the file so the reference
// never goes stale between selection and the upload click.
let selectedFile = null;

/* -------------------- Toast -------------------- */

function showToast(message) {
    toast.innerText = message;
    toast.style.display = "block";
    setTimeout(() => { toast.style.display = "none"; }, 3000);
}

/* -------------------- Store file in memory -------------------- */
// Reading into an ArrayBuffer immediately prevents "stale file handle"
// bugs where the first upload silently fails on some browsers.

function storeFile(file) {
    if (!file || !file.name.toLowerCase().endsWith(".pdf")) {
        showToast("Only PDF files are supported");
        return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
        // Re-wrap as a proper File so FormData sends it with the right name
        selectedFile = new File(
            [e.target.result],
            file.name,
            { type: "application/pdf" }
        );

        uploadTitle.innerText   = file.name;
        docInfoName.innerText   = file.name;
        btnIndex.disabled       = false;

        showToast("PDF selected successfully");
    };

    reader.onerror = () => showToast("Could not read file, try again");
    reader.readAsArrayBuffer(file);
}

/* -------------------- File Select -------------------- */

fileInput.addEventListener("change", (e) => {
    if (!e.target.files.length) return;
    storeFile(e.target.files[0]);
    // Reset so selecting the same file again still fires "change"
    fileInput.value = "";
});

/* -------------------- Drag Drop -------------------- */

uploadZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("drag");
});

uploadZone.addEventListener("dragleave", () => {
    uploadZone.classList.remove("drag");
});

uploadZone.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("drag");
    if (!e.dataTransfer.files.length) return;
    storeFile(e.dataTransfer.files[0]);
});

/* -------------------- Reset upload UI -------------------- */
// Called on error so the user can retry without refreshing the page.

function resetUploadUI() {
    progressFill.style.width  = "0%";
    progressLabel.innerText   = "";
    progressWrap.style.display = "none";
    btnIndex.disabled         = false;
}

/* -------------------- Upload + Index -------------------- */

btnIndex.addEventListener("click", async () => {

    if (!selectedFile) {
        showToast("Select a PDF first");
        return;
    }

    btnIndex.disabled          = true;
    progressWrap.style.display = "block";
    progressLabel.innerText    = "Uploading PDF...";
    progressFill.style.width   = "20%";

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    // Abort after 90 s so the button never stays locked forever
    const controller = new AbortController();
    const timeout    = setTimeout(() => controller.abort(), 90_000);

    try {

        const response = await fetch("/api/upload", {
            method: "POST",
            body:   formData,
            signal: controller.signal,
        });

        let data;
        try { data = await response.json(); }
        catch { throw new Error("Server returned an unreadable response"); }

        if (!response.ok) {
            throw new Error(data.error || "Upload failed");
        }

        progressFill.style.width = "100%";
        progressLabel.innerText  = "Index completed";

        docChunks.innerText = `${data.chunks || 0} Chunks`;

        chatInput.disabled = false;
        btnSend.disabled   = false;

        topbarLabel.innerHTML = `<strong>${data.filename}</strong>`;

        emptyState.style.display = "none";

        showToast("Document indexed successfully");

    } catch (error) {

        console.error(error);

        const msg = error.name === "AbortError"
            ? "Upload timed out. Try a smaller PDF."
            : error.message;

        showToast(msg);
        resetUploadUI();   // re-enables button so user can retry immediately

    } finally {
        clearTimeout(timeout);  // always clear the abort timer
    }
});

/* -------------------- Auto Resize -------------------- */

chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = chatInput.scrollHeight + "px";
});

/* -------------------- Chat Messages -------------------- */

function addMessage(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = `message ${sender}`;
    bubble.innerHTML = `<div class="message-content">${text}</div>`;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
}

function createLoadingBubble() {
    const bubble = document.createElement("div");
    bubble.className = "message bot";
    bubble.innerHTML = `<div class="message-content">Thinking...</div>`;
    messages.appendChild(bubble);
    messages.scrollTop = messages.scrollHeight;
    return bubble;
}

/* -------------------- Ask Question -------------------- */

async function sendQuestion() {

    const question = chatInput.value.trim();
    if (!question) return;

    addMessage(question, "user");
    chatInput.value       = "";
    chatInput.style.height = "auto";

    const loadingBubble = createLoadingBubble();

    try {

        const response = await fetch("/api/chat", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ question }),
        });

        let data;
        try { data = await response.json(); }
        catch { throw new Error("Server returned an unreadable response"); }

        loadingBubble.remove();

        if (!response.ok) {
            throw new Error(data.error || "Failed");
        }

        addMessage(data.answer || "No answer received.", "bot");

    } catch (error) {
        loadingBubble.remove();
        addMessage("⚠ " + error.message, "bot");
    }
}

/* -------------------- Send -------------------- */

btnSend.addEventListener("click", sendQuestion);

chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendQuestion();
    }
});

/* -------------------- Reset -------------------- */

btnReset.addEventListener("click", async () => {
    try {
        await fetch("/api/reset", { method: "POST" });
    } catch (e) {
        console.error(e);
    }
    location.reload();
});

const btnEnd = document.getElementById("btnEnd");

btnEnd.addEventListener("click", async () => {

    await fetch("/api/reset", {
        method: "POST"
    });

    messages.innerHTML = "";

    emptyState.style.display = "flex";

    chatInput.value = "";
    chatInput.disabled = true;

    btnSend.disabled = true;

    document.getElementById("docInfoName").textContent =
        "No File Selected";

    document.getElementById("docChunks").textContent =
        "0 Chunks";

    alert("Chat ended successfully.");
});