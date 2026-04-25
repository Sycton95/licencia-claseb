# Final Project Progress Report: Local AI Foundry & Cloud Edge LMS

**Date:** April 24, 2026
**Status:** Completed (AOT Generation Batch & Benchmarking Validated)

## 1. Project Scope & Objective
The goal was to build a highly optimized, cost-effective pipeline to generate, evaluate, and deploy a Question/Answer bank based on a yearly-updated reference manual (2026 edition). The system required extracting both text and visual context, generating Moodle-compatible JSON quizzes, and providing semantic grounding for an Admin validation panel. 

**Hard Constraint:** Production runtime must incur $0 LLM inference costs. All heavy AI processing must be done locally (Ahead-Of-Time), with production relying on fast vector searches and static asset delivery.

## 2. Core Architecture: "Local Foundry to Cloud Edge"
The pipeline is a decoupled, multi-phase architecture:

1. **The Local Foundry (Python + Ollama):** Runs locally once a year. Handles PDF parsing, Vision-Language processing, vectorization, and QA generation. Output is strictly static files (`JSON`, `.npy`, `.png`).
2. **Local Admin UI (Vite + React):** Runs on `localhost`. Consumes the generated JSON for human-in-the-loop review, utilizes local vector search for grounding, and approves final questions.
3. **Cloud Sync (Supabase):** Approved JSON questions and extracted image directories are pushed to Supabase PostgreSQL (with `pgvector`) and Storage buckets.
4. **Production Edge (Cloudflare Pages):** Users access the Vite React app served from the edge, retrieving instant static data from Supabase. No active LLMs are triggered by end-users.

## 3. The Structural Pivot: ColPali-Inspired Vision Ingestion
During initial testing, standard text extraction (Method A) failed catastrophically when encountering complex layouts, tables, and diagrams. The generative LLM fell into repetitive token loops when fed broken text strings mixed with raw image bytes.

We executed a structural pivot to a **ColPali-inspired methodology (Method B):**

1. **Full-Page Rendering:** The script renders the entire PDF page into a high-resolution PNG using PyMuPDF.
2. **Vision-Language Transcription:** The PNG is sent to `qwen3-VL:4B-Instruct`, which acts as an advanced, layout-aware OCR system. It transcribes all text, tables, and visual elements (like dashboards or road signs) into a cohesive, structured markdown document.
3. **Page-Level Chunking:** The sliding window character chunking was discarded. The context is now preserved at the page level, ensuring no semantic boundaries are broken.

## 4. Resolving the Context Limit: Parent-Child Architecture
The shift to page-level chunks introduced a new problem: the resulting text strings exceeded the 512-token limit of the `mxbai-embed-large` embedding model.

To resolve this while maintaining the integrity of the generation phase, we implemented a **Parent-Child Retrieval Strategy:**

1. **Child Embeddings:** The full page (Parent) is sliced into ~1000-character blocks (Children). Only these smaller blocks are sent to the embedding model.
2. **Vector Mapping:** An array (`vector_mapping_vision.json`) maps the index of each Child vector back to its Parent page index in the main cache.
3. **Retrieval & Reassembly:** During vector search, the system matches the user query to the Child vector, looks up the Parent index, and passes the *entire, unbroken* Parent page to the generative LLM.

## 5. Benchmark Validation (Case C)
We tested the new architecture using a small batch (first 20 pages) of the manual. 

* **Generator Model:** `qwen3:4B-Instruct`
* **Embedding Model:** `mxbai-embed-large`
* **VLM Engine:** `qwen3-VL:4B-Instruct`

**Key Findings from `benchmark_case_c_results.json`:**
* **Zero Token Loops:** The generative LLM processed the page-level markdown seamlessly.
* **Multimodal Generation:** The text-to-text LLM successfully generated questions about visual elements (e.g., a dashboard layout) because the VLM accurately described them in the text layer.
* **Contextual Stability:** The retrieval mapping accurately fetched the full page for 11 out of 12 questions.
* **Anti-Hallucination:** When asked a flawed question (e.g., asking for a mechanical relationship not present in the text), `qwen3:4B-Instruct` explicitly refused to answer based on the retrieved context, proving strict adherence to the system prompt constraint.

## 6. Final Pipeline Execution Flow
The architecture is mathematically and logically sound. The final multi-hour execution sequence is:

1.  `python build_cache_vision.py` (Full document rendering & VLM transcription)
2.  `python pdf_qg.py` (Full document question generation)
3.  `python build_vectors_vision.py` (Full document Parent-Child vectorization)

*This document serves as the formal closure of the architectural design phase.*
