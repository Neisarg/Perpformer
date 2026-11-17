# Prepformer: what was built (2026-11-17)

Local web app for ML research/engineering interview prep. Start with `uv sync` and then `uv run server.py` from this folder, then open http://127.0.0.1:8765. Setup and file formats are in `../README.md`.

## Parts
- **Learn**: goal-based plan over a prerequisite map; per topic: measure (5 questions with confidence), lessons (predict, read, check), spaced mixed review; optional Claude tutor session.
- **Multiple choice**: 650 questions, 26 topics. Practice (hint after first miss, lesson link after second) and Exam (25 questions, 15 minutes, missed topics become a to-do list).
- **Coding**: 114 Python/PyTorch problems, LeetCode-style workspace, Run (2 sample cases) and Submit (full hidden suite). Practice has Strategy and Solution tabs; Exam is 3 problems in 60 minutes.
- **Add material**: Claude drafts questions from a paper, chapter, post or notes; coding problems are kept only if their reference solution passes its own tests.
- **Profiles** with all progress in SQLite (`user_data/prepformer.db`).

## Concept topics (25 questions each)
Linear Algebra; Probability & Statistics; Optimization; Linear & Logistic Regression; Trees, Ensembles & Boosting; SVMs, Kernels, kNN & Naive Bayes; Unsupervised Learning; Generalization & Regularization; Evaluation Metrics & Experimentation; Neural Network Fundamentals; Training Deep Networks; CNNs & Computer Vision; Sequence Models & Attention; Transformer Architecture; LLM Concepts; PEFT, Quantization & Efficient Inference; Agentic AI; LLM & Agent Evaluation; Architecture Building Blocks; NLP Fundamentals; Generative Models; Reinforcement Learning; Recommender Systems & Retrieval; ML System Design & MLOps; PyTorch & Training at Scale; Research Frontiers.

## Coding topics
Tensor Operations & Autograd (9); Losses & Metrics (12); Classical ML from Scratch (9); Neural Network Layers from Scratch (14); Optimizers & Training Loops (10); Attention & Transformers (12); NLP & Decoding (9); PEFT, Quantization & Compression (9); Computer Vision (8); Generative Models & RL (12); RAG & Agents (10).

## Known gaps at hand-off
- The 103 PyTorch-dependent reference solutions were not executed (no PyTorch in the build environment). Run `uv run verify.py` and fix any failures in `content/problems/`.
- Claude features were tested only against a local mock of the API, not the live service.
- In most multiple-choice questions the correct option is also the longest one.
- Lessons are short written summaries (95 ideas), not full course material.
