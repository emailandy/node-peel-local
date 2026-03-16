# Peel - Multimodal AI Workflow Editor 🍌

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React Flow](https://img.shields.io/badge/React_Flow-12-blue)](https://reactflow.dev/)

Peel (formerly Node Banana) is a high-performance, multimodal visual workflow engine designed for cinematic AI generation. It orchestrates state-of-the-art models from Google (Gemini, Veo, Lyria), OpenAI, and others into seamless, repeatable pipelines.

![Peel Dashboard](file:///Users/emailandy/.gemini/jetski/brain/9add2638-f336-431c-9007-d9d8b0da69d1/node_banana_app_loaded_1773589923057.png)

## 🚀 Key Features

### 🎨 Visual Canvas & Orchestration
- **Node-Based Editor**: Drag-and-drop orchestration powered by `@xyflow/react`.
- **Topological Execution**: Smart dependency sorting ensures nodes execute in the right order.
- **Top-Tier Annotations**: Integrated Konva.js drawing tools for precision mask and guidance creation.

### 🎬 Multimodal Generation
- **Image Generation**: Native support for `gemini-2.5-flash` and `gemini-3-pro-image-preview`.
- **Video Generation**: Cinematic workflows using Google **Veo 3.0/3.1** with fast preview paths.
- **Audio Generation**: Real-time music and soundscape visualization via Google **Lyria**.
- **LLM Intelligence**: Orchestrate complex instructions using Gemini and GPT-4.1.

### 🛠️ Advanced Tools & Guardrails
- **AI Critic**: automated quality control and guardrail nodes that pass/fail generations based on custom criteria.
- **Demographic Variants**: Generate diverse character and style variants with a single input.
- **FFmpeg Stitching**: Professional-grade video/audio merging service built directly into the workflow.

## 🛠️ Technical Stack

- **Framework**: Next.js 16 (App Router)
- **State**: Zustand (Single-store pattern)
- **Style**: Tailwind CSS v4
- **Canvas**: Konva.js
- **Media**: FFmpeg (fluent-ffmpeg)
- **Runtime**: Node.js 20+

## 🏁 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **FFmpeg**: Required for video/audio stitching nodes.

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-repo/peel.git
   cd peel
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables in `.env.local`:
   ```env
   GEMINI_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   ```

4. Launch the development server:
   ```bash
   npm run dev
   ```

## ⌨️ Productivity Shortcuts

- `Cmd/Ctrl + Enter` - Execute workflow
- `Cmd/Ctrl + C / V` - Copy and paste nodes
- `Shift + P` - Instant Prompt node
- `Shift + G` - Instant Generate node
- `H / V` - Stack nodes selection horizontally or vertically
- `G` - Snap selection to grid

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Built with ❤️ for the future of cinematic AI.
