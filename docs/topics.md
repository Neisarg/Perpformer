# Topic list

Generated from the question bank. Edit the files in `content/` and run `uv run build.py` to change it.

## Concept topics (multiple choice and lessons)

### Linear Algebra (25 questions)

- Rank, null space and invertibility
- Eigenvalues and eigenvectors
- SVD and low-rank approximation
- Positive definiteness
- Norms and projections
- Matrix calculus
- Numerical stability and conditioning

### Probability & Statistics (25 questions)

- Bayes' rule and conditional probability
- Common distributions
- Expectation, variance and covariance
- MLE and MAP estimation
- Hypothesis tests, p-values and confidence intervals
- Central limit theorem and sampling
- Information theory (entropy, KL, cross-entropy)

### Optimization (25 questions)

- Gradient descent and SGD
- Momentum and Nesterov
- Adaptive methods (RMSProp, Adam, AdamW)
- Learning-rate schedules and warmup
- Convexity, saddle points and curvature
- Second-order methods
- Batch size and gradient noise

### Linear & Logistic Regression (25 questions)

- Ordinary least squares and its assumptions
- Ridge, lasso and elastic net
- Logistic regression and the sigmoid
- Softmax regression
- Generalized linear models
- Multicollinearity and feature scaling
- Interpreting coefficients

### Trees, Ensembles & Boosting (25 questions)

- Split criteria (Gini, entropy, variance)
- Pruning and tree depth
- Bagging and random forests
- AdaBoost and gradient boosting
- XGBoost, LightGBM and CatBoost
- Feature importance
- Handling missing values and categoricals

### SVMs, Kernels, kNN & Naive Bayes (25 questions)

- Maximum-margin classifiers and hinge loss
- Kernel trick and RBF kernels
- k-nearest neighbours and the curse of dimensionality
- Naive Bayes and generative vs discriminative models
- Gaussian processes
- LDA and QDA

### Unsupervised Learning (25 questions)

- k-means and its variants
- Gaussian mixtures and EM
- Hierarchical and density-based clustering
- PCA and the explained variance
- t-SNE and UMAP
- Autoencoders
- Anomaly detection
- Cluster evaluation

### Generalization & Regularization (25 questions)

- Bias-variance trade-off
- Overfitting and underfitting
- Cross-validation and data splits
- Data leakage
- L1/L2, dropout and early stopping
- Data augmentation and label smoothing
- Double descent and capacity
- Feature engineering and selection

### Evaluation Metrics & Experimentation (25 questions)

- Precision, recall, F1 and the confusion matrix
- ROC AUC and PR AUC
- Calibration and log loss
- Regression metrics
- Ranking metrics (NDCG, MAP, MRR)
- Class imbalance
- A/B testing, power and significance
- Offline versus online evaluation

### Neural Network Fundamentals (25 questions)

- Backpropagation and the chain rule
- Activation functions
- Weight initialization
- Vanishing and exploding gradients
- Loss functions
- Universal approximation
- Counting parameters

### Training Deep Networks (25 questions)

- Batch, layer, group and RMS normalization
- Dropout
- Residual connections
- Hyper-parameter tuning
- Debugging training (loss curves, sanity checks)
- Class imbalance and focal loss
- Transfer learning and fine-tuning
- Distillation

### CNNs & Computer Vision (25 questions)

- Convolution arithmetic (stride, padding, dilation)
- Receptive field and pooling
- Classic architectures (ResNet, Inception, MobileNet, EfficientNet)
- Object detection (anchors, IoU, NMS, mAP)
- Segmentation
- Vision Transformers
- Contrastive and self-supervised vision

### Sequence Models & Attention (25 questions)

- RNNs and backpropagation through time
- LSTM and GRU gating
- Seq2seq and teacher forcing
- Attention mechanisms
- Scaled dot-product and multi-head attention
- Positional information
- CTC and speech

### Transformer Architecture (25 questions)

- Encoder, decoder and encoder-decoder models
- Self-attention internals
- Positional encodings (sinusoidal, learned, RoPE, ALiBi)
- Normalization placement and residual streams
- Feed-forward blocks
- Efficient attention (flash, sparse, sliding window)
- Parameter and compute counting

### LLM Concepts (25 questions)

- Pretraining objectives and scaling
- Sampling and decoding (temperature, top-k, top-p)
- Prompting, in-context learning and chain of thought
- Retrieval-augmented generation
- Post-training (SFT, RLHF, DPO, GRPO, RLVR)
- Hallucination, calibration and evaluation
- Context windows, structured output and prompt caching
- Multimodal LLMs
- Safety and prompt injection

### PEFT, Quantization & Efficient Inference (25 questions)

- LoRA and its variants (QLoRA, DoRA, rsLoRA, AdaLoRA)
- Adapters, prefix and prompt tuning
- Post-training quantization (GPTQ, AWQ) and QAT
- Number formats and mixed precision
- Pruning and sparsity
- Knowledge distillation
- Speculative decoding and batching
- KV-cache optimizations (MQA, GQA, MLA)
- Serving throughput and latency

### Agentic AI (25 questions)

- The agent loop (reason, act, observe)
- Tool use and function calling
- Planning and task decomposition
- Memory and context engineering
- Multi-agent orchestration
- Protocols (MCP, agent-to-agent)
- Agent evaluation and reliability
- Security, sandboxing and prompt injection
- Computer-use and coding agents

### LLM & Agent Evaluation (25 questions)

- Benchmarks, contamination and saturation
- Reference-based metrics (BLEU, ROUGE, BERTScore, exact match)
- LLM-as-judge and rubric design
- Pairwise comparison and Elo
- RAG evaluation (faithfulness, context precision and recall)
- Agent evaluation (outcome vs trajectory, pass^k, cost)
- Statistical rigor in evals
- Red-teaming and safety evals
- Online monitoring and regression suites

### Architecture Building Blocks (25 questions)

- Normalization layers (Batch, Layer, Instance, Group, RMS, Weight)
- Positional information (sinusoidal, learned, relative, RoPE, 2-D and time embeddings)
- Skip connections (residual, dense, highway, U-Net)
- Gating and squeeze-excitation
- Pooling and readout
- Embedding layers
- Message passing in GNNs
- Conditioning mechanisms (FiLM, cross-attention, AdaNorm)

### NLP Fundamentals (25 questions)

- Tokenization (BPE, WordPiece, SentencePiece)
- Word embeddings (word2vec, GloVe)
- TF-IDF and BM25
- Language modeling and smoothing
- Decoding strategies
- Sentence embeddings and semantic search
- Sequence labeling and classification

### Generative Models (25 questions)

- Autoencoders and VAEs (ELBO, reparameterization)
- GANs and their failure modes
- Diffusion models (DDPM, DDIM, noise schedules)
- Classifier-free guidance
- Latent diffusion
- Flow matching and rectified flow
- Normalizing flows and autoregressive models
- Evaluation (FID, likelihood)

### Reinforcement Learning (25 questions)

- MDPs, returns and discounting
- Value functions and Bellman equations
- Q-learning and DQN
- Policy gradients and REINFORCE
- Actor-critic, GAE and PPO
- Exploration vs exploitation and bandits
- Off-policy vs on-policy learning
- Offline RL and imitation learning

### Recommender Systems & Retrieval (25 questions)

- Collaborative filtering and matrix factorization
- Two-tower retrieval and approximate nearest neighbours
- Ranking models and learning to rank
- Negative sampling and in-batch softmax
- Cold start and exploration
- Position and selection bias
- Multi-stage pipelines
- Embedding tables and feature crosses

### ML System Design & MLOps (25 questions)

- Framing a problem and choosing metrics
- Data pipelines and feature stores
- Training-serving skew
- Batch vs online inference
- Deployment (shadow, canary, A/B)
- Monitoring and drift
- Latency, throughput and cost
- LLM application design (RAG, caching, guardrails, routing)
- Retraining and data flywheels

### PyTorch & Training at Scale (25 questions)

- Tensors, views and broadcasting
- Autograd mechanics
- nn.Module, optimizers and the training loop
- Data loading
- Mixed precision and memory
- Distributed training (DDP, gradient accumulation, sharding)
- Compilation, profiling and debugging
- Checkpointing and reproducibility

### Research Frontiers (25 questions)

- Mechanistic interpretability (superposition, sparse autoencoders, circuits, steering)
- State-space models and attention alternatives
- Model merging and task arithmetic
- Test-time compute and reasoning
- Synthetic data and model collapse
- World models and JEPA
- Privacy, robustness and unlearning
- Training dynamics (grokking, NTK, in-context learning)
- Alignment and safety research

## Coding topics

### Tensor Operations & Autograd (9 problems)

- Numerically Stable Softmax (Easy)
- Log-Sum-Exp (Easy)
- Pairwise Euclidean Distances (Easy)
- One-Hot Encoding (Easy)
- Top-k Accuracy (Easy)
- Masked Mean Pooling (Easy)
- Gradient Check with Finite Differences (Medium)
- Manual Backpropagation for a Two-Layer MLP (Hard)
- Sliding Windows (Easy)

### Losses & Metrics (12 problems)

- Cross-Entropy from Logits (Easy)
- Stable Binary Cross-Entropy with Logits (Medium)
- Huber Loss (Easy)
- Cross-Entropy with Label Smoothing (Medium)
- Binary Focal Loss (Medium)
- KL Divergence Between Categoricals (Easy)
- Symmetric InfoNCE (CLIP) Loss (Medium)
- Triplet Margin Loss (Easy)
- Precision, Recall and F1 (Easy)
- ROC AUC (Medium)
- Confusion Matrix (Easy)
- NDCG@k (Medium)

### Classical ML from Scratch (9 problems)

- Ridge Regression (Closed Form) (Easy)
- Linear Regression by Gradient Descent (Easy)
- Logistic Regression by Gradient Descent (Medium)
- k-Means (Lloyd's Algorithm) (Medium)
- k-Nearest Neighbours Classifier (Easy)
- PCA via SVD (Medium)
- Gaussian Naive Bayes (Medium)
- Best Split by Gini Impurity (Medium)
- k-Fold Cross-Validation Indices (Easy)

### Neural Network Layers from Scratch (14 problems)

- Linear Layer (Easy)
- GELU, SiLU and Leaky ReLU (Easy)
- Inverted Dropout (Easy)
- Batch Normalization (1-D) (Medium)
- Layer Normalization (Easy)
- RMSNorm (Easy)
- Group Normalization (Medium)
- Embedding Layer (Easy)
- 2-D Convolution (Hard)
- 2-D Max Pooling (Medium)
- Pre-Norm Residual MLP Block (Easy)
- LSTM Cell (Medium)
- GRU Cell (Medium)
- Kaiming (He) Initialization (Easy)

### Optimizers & Training Loops (10 problems)

- SGD with Momentum (Medium)
- Adam Optimizer (Medium)
- AdamW Update (Functional) (Medium)
- Cosine Schedule with Linear Warmup (Easy)
- Gradient Clipping by Global Norm (Easy)
- Exponential Moving Average of Weights (Medium)
- Mini-Batch Training Loop (Medium)
- Gradient Accumulation (Medium)
- Early Stopping (Easy)
- Weight-Decay Parameter Groups (Easy)

### Attention & Transformers (12 problems)

- Scaled Dot-Product Attention (Medium)
- Causal and Padding Masks (Easy)
- Multi-Head Self-Attention (Hard)
- Sinusoidal Positional Encoding (Easy)
- Rotary Position Embeddings (RoPE) (Hard)
- Pre-Norm Transformer Block (Medium)
- Attention with a KV Cache (Medium)
- Next-Token Prediction Loss (Easy)
- Grouped-Query Attention (Medium)
- SwiGLU Feed-Forward Layer (Easy)
- ALiBi Attention Bias (Medium)
- A Minimal GPT (Hard)

### NLP & Decoding (9 problems)

- Greedy Decoding (Easy)
- Top-k Filtering (Easy)
- Top-p (Nucleus) Filtering (Medium)
- Temperature Sampling (Medium)
- Beam Search (Hard)
- Byte-Pair Encoding (Hard)
- Perplexity (Easy)
- TF-IDF Matrix (Medium)
- Edit Distance and Word Error Rate (Medium)

### PEFT, Quantization & Compression (9 problems)

- LoRA Linear Layer (Medium)
- Merging LoRA Weights (Easy)
- Uniform Affine Quantization (Medium)
- Symmetric Per-Channel Quantization (Medium)
- Fake Quantization with a Straight-Through Estimator (Hard)
- Magnitude Pruning (Easy)
- Knowledge Distillation Loss (Medium)
- Speculative Decoding Acceptance Rule (Hard)
- Freezing Layers and Counting Parameters (Easy)

### Computer Vision (8 problems)

- Convolution Output Shape (Easy)
- Pairwise Box IoU (Medium)
- Non-Maximum Suppression (Hard)
- Patchify and Unpatchify (Medium)
- ViT Patch Embedding (Medium)
- Depthwise Separable Convolution (Easy)
- Mixup (Easy)
- Dice Loss (Medium)

### Generative Models & Reinforcement Learning (12 problems)

- VAE: Reparameterization and KL (Medium)
- Diffusion Forward Process (Medium)
- DDPM Training Loss (Medium)
- DDIM Sampling Step (Medium)
- Classifier-Free Guidance (Easy)
- GAN Losses (Easy)
- Flow Matching Loss (Medium)
- Discounted Returns (Easy)
- Generalized Advantage Estimation (Hard)
- PPO Clipped Objective (Medium)
- Tabular Q-Learning Update (Easy)
- REINFORCE Loss with Baseline (Medium)

### RAG & Agents (10 problems)

- Cosine Top-k Retrieval (Easy)
- BM25 Scoring (Medium)
- Maximal Marginal Relevance (Medium)
- Chunking with Overlap (Easy)
- Reciprocal Rank Fusion (Easy)
- Recall@k and MRR (Easy)
- Parsing Tool Calls (Medium)
- The Agent Loop (Hard)
- Trimming Conversation History (Medium)
- Agent Reliability: pass@k and pass^k (Medium)
