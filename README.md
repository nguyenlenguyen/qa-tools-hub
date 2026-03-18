# 🧰 QA Tools Hub

A collection of essential browser-based utilities built for **Software Testing & QA** workflows. Everything runs **100% client-side** — no data is sent to any server.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Tools

| Tool | Description |
|------|-------------|
| 🖼️ **Media Generator** | Generate test images (PNG/JPG/WebP), audio files (WAV/MP3/AAC/OGG/FLAC), and videos (MP4/MOV/AVI/MKV/WebM) with custom dimensions, formats, durations, and target file sizes |
| 🎨 **Color Converter** | Convert between HEX and RGB color codes with a live preview |
| ⏱️ **Epoch Converter** | Convert between Unix Epoch timestamps and human-readable date/time (auto-detects seconds vs milliseconds) |
| 📋 **JSON Formatter** | Format, beautify, minify, and validate JSON strings with syntax highlighting |
| 📝 **Dummy Text** | Generate Lorem Ipsum text with configurable paragraph count and character limits |
| 🔐 **Base64 Converter** | Encode and decode Base64 strings (supports Unicode) |
| 📊 **Text Analyzer** | Count characters, words, sentences, and paragraphs in real-time |
| 🔍 **Text Diff Checker** | Compare two texts side-by-side with LCS-based diff highlighting for insertions, deletions, and modifications |

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
- **Media Processing:** FFmpeg WASM (client-side audio/video encoding)

---

## 📁 Project Structure

```
qa-tools-hub/
├── index.html          # Entry HTML with SEO meta tags
├── vite.config.js      # Vite config (COOP/COEP headers for FFmpeg)
├── package.json
├── src/
│   ├── main.jsx        # React entry point
│   ├── index.css       # Tailwind CSS import
│   └── App.jsx         # All tool components & app shell
└── public/
    └── favicon.svg
```

---

## 🔒 Privacy

All tools run **entirely in the browser**. No data is uploaded, stored, or transmitted to any external server. Media files are generated using Canvas API and FFmpeg WASM.

---

## 📄 License

This project is open source under the [MIT License](LICENSE).
