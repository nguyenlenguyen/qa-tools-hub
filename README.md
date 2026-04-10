# 🧰 QA Tools Hub

A collection of essential browser-based utilities built for **Software Testing & QA** workflows. Everything runs **100% client-side** — no data is ever sent to any server.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Available Tools

| Tool | Icon | Description |
|------|------|-------------|
| 🖼️ **Media Generator** | `Film` | Generate test images, audio files, and videos with custom dimensions, formats, and target file sizes. |
| 🔄 **Media Converter** | `RefreshCw` | Convert images, audio, and videos between different formats (100% local browser-based processing). |
| 🎨 **Color Converter** | `Palette` | Convert between HEX and RGB color codes with live preview. |
| ⏱️ **Epoch Converter** | `Clock` | Convert between Unix Epoch timestamps and human-readable date/time. |
| 📋 **JSON Formatter** | `FileJson` | Format, beautify, and validate JSON strings with syntax highlighting. |
| 📝 **Dummy Text** | `Type` | Quickly generate Lorem Ipsum text with configurable paragraph/character limits. |
| 🔐 **Encrypt / Decrypt** | `Lock` | Base64 encode/decode and AES-256 encrypt/decrypt with a custom secret key. |
| 📊 **Text Analyzer** | `AlignLeft` | Real-time counts for characters, words, sentences, and paragraphs. |
| 🔍 **Text Diff Checker**| `GitCompare`| Compare two texts side-by-side with line-by-line diff highlighting. |
| 📡 **Peer File Share** | `Share2` | Send files directly between devices on the same network using P2P (WebRTC). |
| 📖 **Markdown Preview**| `BookOpen` | Write and live-preview Markdown with support for code highlighting and export. |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)

### Installation

```bash
# Clone the repository
git clone https://github.com/nguyenlenguyen/qa-tools-hub.git
cd qa-tools-hub

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:5173`.

### Build for Production

```bash
npm run build
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework:** React 19
- **Bundler:** Vite 8
- **Styling:** Tailwind CSS 4
- **Icons:** Lucide React
- **Media Processing:** FFmpeg WASM (Client-side audio/video processing)
- **Encryption:** Web Crypto API & CryptoJS
- **P2P Sharing:** WebRTC (PeerJS)
- **Markdown:** Marked.js

---

## 📁 Project Structure

```
qa-tools-hub/
├── public/             # Static assets
├── src/
│   ├── components/
│   │   ├── tools/      # Individual tool implementations
│   │   └── ui/         # Reusable UI components
│   ├── config/         # App configuration (tools list)
│   ├── utils/          # Shared helper functions
│   ├── App.jsx         # App shell & tool router
│   ├── main.jsx        # Entry point
│   └── index.css       # Global styles
├── index.html          # HTML template
├── package.json
└── vite.config.js      # Vite & COOP/COEP headers for FFmpeg
```

---

## 🔒 Privacy & Security

All tools run **entirely in your browser**. Data is processed locally and never leaves your machine. 
- Media files are generated/converted using FFmpeg WASM in a Secure Context.
- Encryption happens using the browser's native Web Crypto API.
- P2P sharing connects browsers directly without intermediary storage.

---

## 📄 License

This project is open source under the [MIT License](LICENSE).

