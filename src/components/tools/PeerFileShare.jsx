import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, Smartphone, Laptop, FileUp, Download,
  CheckCircle, XCircle, Loader2, Users, MessageSquare, Pencil
} from 'lucide-react';

const ROOM_PREFIX = 'qafs';
const CHUNK_SIZE = 16 * 1024; // 16 KB — well under WebRTC's ~256 KB SCTP limit

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

/**
 * Binary framing protocol over a single PeerJS `serialization:'binary'` DataConnection.
 *
 * Every message is an ArrayBuffer:
 *   [0..3]   : msgType  (Uint32LE)  1=FILE_START  2=FILE_CHUNK  3=FILE_END
 *   [4..11]  : transferId encoded as 8 ASCII bytes (padded / truncated)
 *
 *   FILE_START  [12..15] numChunks (Uint32)
 *               [16..19] nameLen   (Uint32)
 *               [20..23] mimeLen   (Uint32)
 *               [24..]   name UTF-8 bytes  then  mime UTF-8 bytes
 *
 *   FILE_CHUNK  [12..15] chunkIndex (Uint32)
 *               [16..]   raw bytes
 *
 *   FILE_END    (no extra payload — signals reassembly)
 *
 * Using a single binary connection means:
 *  - chunks and control messages share the same ordered SCTP stream → no race conditions
 *  - no base64 bloat
 *  - no separate signaling connection to synchronise
 */

const MSG_FILE_START = 1;
const MSG_FILE_CHUNK = 2;
const MSG_FILE_END = 3;
const MSG_MESSAGE = 4;

const enc = new TextEncoder();
const dec = new TextDecoder();

function encodeTransferId(id) {
  // Always 8 bytes
  const buf = new Uint8Array(8);
  const src = enc.encode(id.slice(0, 8).padEnd(8, '\0'));
  buf.set(src);
  return buf;
}

function decodeTransferId(view, offset = 4) {
  let s = '';
  for (let i = 0; i < 8; i++) {
    const c = view.getUint8(offset + i);
    if (c === 0) break;
    s += String.fromCharCode(c);
  }
  return s;
}

function buildFileStart(transferId, numChunks, name, mime) {
  const nameBytes = enc.encode(name);
  const mimeBytes = enc.encode(mime);
  const buf = new ArrayBuffer(24 + nameBytes.length + mimeBytes.length);
  const view = new DataView(buf);
  view.setUint32(0, MSG_FILE_START, true);
  encodeTransferId(transferId).forEach((b, i) => view.setUint8(4 + i, b));
  view.setUint32(12, numChunks, true);
  view.setUint32(16, nameBytes.length, true);
  view.setUint32(20, mimeBytes.length, true);
  new Uint8Array(buf, 24).set(nameBytes);
  new Uint8Array(buf, 24 + nameBytes.length).set(mimeBytes);
  return buf;
}

function buildFileChunk(transferId, index, chunkArrayBuffer) {
  const buf = new ArrayBuffer(16 + chunkArrayBuffer.byteLength);
  const view = new DataView(buf);
  view.setUint32(0, MSG_FILE_CHUNK, true);
  encodeTransferId(transferId).forEach((b, i) => view.setUint8(4 + i, b));
  view.setUint32(12, index, true);
  new Uint8Array(buf, 16).set(new Uint8Array(chunkArrayBuffer));
  return buf;
}

function buildFileEnd(transferId) {
  const buf = new ArrayBuffer(12);
  const view = new DataView(buf);
  view.setUint32(0, MSG_FILE_END, true);
  encodeTransferId(transferId).forEach((b, i) => view.setUint8(4 + i, b));
  return buf;
}
function buildMessage(transferId, text) {
  const textBytes = enc.encode(text);
  const buf = new ArrayBuffer(12 + textBytes.length);
  const view = new DataView(buf);
  view.setUint32(0, MSG_MESSAGE, true);
  encodeTransferId(transferId).forEach((b, i) => view.setUint8(4 + i, b));
  new Uint8Array(buf, 12).set(textBytes);
  return buf;
}

function parseMessage(arrayBuffer) {
  const view = new DataView(arrayBuffer);
  const msgType = view.getUint32(0, true);
  const transferId = decodeTransferId(view, 4);

  if (msgType === MSG_FILE_START) {
    const numChunks = view.getUint32(12, true);
    const nameLen = view.getUint32(16, true);
    const mimeLen = view.getUint32(20, true);
    const name = dec.decode(new Uint8Array(arrayBuffer, 24, nameLen));
    const mime = dec.decode(new Uint8Array(arrayBuffer, 24 + nameLen, mimeLen));
    return { msgType, transferId, numChunks, name, mime };
  }
  if (msgType === MSG_FILE_CHUNK) {
    const index = view.getUint32(12, true);
    const data = arrayBuffer.slice(16);
    return { msgType, transferId, index, data };
  }
  if (msgType === MSG_FILE_END) {
    return { msgType, transferId };
  }
  if (msgType === MSG_MESSAGE) {
    const text = dec.decode(new Uint8Array(arrayBuffer, 12));
    return { msgType, transferId, text };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────

export default function PeerFileShare() {
  const [publicIp, setPublicIp] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [myPeerId, setMyPeerId] = useState('');
  const [msgInputs, setMsgInputs] = useState({});
  const [isHost, setIsHost] = useState(null);
  const [peers, setPeers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  const [deviceName, setDeviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    if (saved) return saved;
    const name = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)]
      + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', name);
    return name;
  });

  // ── Refs ───────────────────────────────────────────────────────────────────
  const mainPeerRef = useRef(null);
  const anchorPeerRef = useRef(null);
  const myPeerIdRef = useRef('');
  const deviceNameRef = useRef(deviceName);
  const anchorIdRef = useRef('');
  const isHostRef = useRef(false);
  const guestsRef = useRef({});
  const hostConnRef = useRef(null);
  // peerId → PeerJS DataConnection (binary, for file transfer)
  const fileConnsRef = useRef({});
  // transferId → { name, mime, numChunks, chunks: Map<index, ArrayBuffer> }
  const incomingRef = useRef({});
  const initCalledRef = useRef(false);

  // ── Logging ────────────────────────────────────────────────────────────────

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    init();
    return () => {
      if (mainPeerRef.current) mainPeerRef.current.destroy();
      if (anchorPeerRef.current) anchorPeerRef.current.destroy();
    };
  }, []); // eslint-disable-line

  // ── Helpers ────────────────────────────────────────────────────────────────
  const myMeta = () => ({
    id: myPeerIdRef.current,
    name: deviceNameRef.current,
    deviceType: /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  });

  const broadcastMembers = () => {
    const members = [
      { ...myMeta(), type: myMeta().deviceType },
      ...Object.values(guestsRef.current).map(({ id, name, deviceType }) => ({ id, name, type: deviceType })),
    ];
    Object.values(guestsRef.current).forEach(({ conn }) => {
      try { if (conn?.open) conn.send({ type: 'member-list', members }); } catch (_) { }
    });
    setPeers(members.filter(m => m.id !== myPeerIdRef.current));
  };

  // ── Init ───────────────────────────────────────────────────────────────────
  const init = async () => {
    try {
      setStatus('initializing');

      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      setPublicIp(ip);

      const ipHash = btoa(ip).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
      const anchorId = `${ROOM_PREFIX}-${ipHash}`;
      anchorIdRef.current = anchorId;

      if (!window.Peer) throw new Error('PeerJS not loaded.');

      const randomId = `${ROOM_PREFIX}-m-${Math.random().toString(36).slice(2, 10)}`;
      const mainPeer = new window.Peer(randomId, { secure: true });
      mainPeerRef.current = mainPeer;

      mainPeer.on('open', (id) => {
        myPeerIdRef.current = id;
        setMyPeerId(id);
        tryClaimAnchor(anchorId);
      });

      // Incoming file-transfer connection (binary)
      mainPeer.on('connection', (conn) => {
        if (conn.label === 'ft') setupFileConn(conn);
        // Signaling conns from other guests go through anchorPeer, not here
      });

      mainPeer.on('error', (err) => {
        setError('mainPeer: ' + err.type);
        setStatus('error');
      });

    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  // ── Host / anchor ──────────────────────────────────────────────────────────
  const tryClaimAnchor = (anchorId) => {
    if (anchorPeerRef.current) { anchorPeerRef.current.destroy(); anchorPeerRef.current = null; }

    const ap = new window.Peer(anchorId, { secure: true });
    anchorPeerRef.current = ap;

    ap.on('open', () => {
      isHostRef.current = true;
      setIsHost(true);
      setStatus('ready');
      ap.on('connection', (conn) => {
        handleGuestSignaling(conn);
      });
    });

    ap.on('error', (err) => {
      anchorPeerRef.current = null;
      becomeGuest(anchorId);
    });
  };

  const becomeGuest = (anchorId) => {
    isHostRef.current = false;
    setIsHost(false);
    setStatus('ready');

    const conn = mainPeerRef.current.connect(anchorId, { reliable: true });
    hostConnRef.current = conn;

    conn.on('open', () => {
      const meta = myMeta();
      conn.send({ ...meta, type: 'hello' });
    });

    conn.on('data', (data) => {
      if (data?.type === 'member-list') {
        setPeers((data.members || []).filter(m => m.id !== myPeerIdRef.current));
      }
    });

    conn.on('close', () => {
      hostConnRef.current = null;
      setPeers([]);
      setStatus('initializing');
      setTimeout(() => tryClaimAnchor(anchorIdRef.current), 500 + Math.random() * 1000);
    });

  };

  const handleGuestSignaling = (conn) => {
    const pending = []; let ready = false;
    const process = (data) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'hello') {
        guestsRef.current[data.id] = { id: data.id, name: data.name, deviceType: data.deviceType, conn };
        broadcastMembers();
      }
    };
    conn.on('open', () => { ready = true; pending.forEach(process); pending.length = 0; });
    conn.on('data', (d) => ready ? process(d) : pending.push(d));
    conn.on('close', () => {
      const e = Object.values(guestsRef.current).find(g => g.conn === conn);
      if (e) { delete guestsRef.current[e.id]; broadcastMembers(); }
    });
  };

  // ── File transfer ──────────────────────────────────────────────────────────
  const getFileConn = (targetId) => {
    const ex = fileConnsRef.current[targetId];
    if (ex?.open) return ex;
    // label='ft', serialization='binary' → ArrayBuffer in / ArrayBuffer out
    const conn = mainPeerRef.current.connect(targetId, {
      reliable: true,
      serialization: 'raw',
      label: 'ft',
    });
    setupFileConn(conn);
    return conn;
  };

  const setupFileConn = (conn) => {
    fileConnsRef.current[conn.peer] = conn;
    conn.on('data', (raw) => {
      // Normalize whatever PeerJS delivers into an ArrayBuffer
      let ab;
      if (raw instanceof ArrayBuffer) {
        ab = raw;
      } else if (ArrayBuffer.isView(raw)) {
        ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
      } else if (raw && typeof raw === 'object') {
        // PeerJS sometimes wraps binary as plain {0:byte, 1:byte, ...}
        const len = Object.keys(raw).length;
        const u8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) u8[i] = raw[i];
        ab = u8.buffer;
      } else {
        return;
      }
      const msg = parseMessage(ab);
      if (!msg) return;

      if (msg.msgType === MSG_FILE_START) {
        incomingRef.current[msg.transferId] = {
          name: msg.name, mime: msg.mime,
          numChunks: msg.numChunks,
          chunks: new Map(),
        };
        setTransfers(prev => [{
          id: msg.transferId, role: 'receive', name: msg.name,
          progress: 0, status: 'receiving', from: conn.peer,
        }, ...prev]);

      } else if (msg.msgType === MSG_FILE_CHUNK) {
        const entry = incomingRef.current[msg.transferId];
        if (!entry) return;
        entry.chunks.set(msg.index, msg.data);
        const progress = Math.round((entry.chunks.size / entry.numChunks) * 100);
        setTransfers(prev => prev.map(t =>
          t.id === msg.transferId ? { ...t, progress } : t
        ));

      } else if (msg.msgType === MSG_MESSAGE) {
        setTransfers(prev => [{
          id: msg.transferId, role: 'receive', kind: 'message',
          name: msg.text, progress: 100, status: 'complete', saved: true,
          from: conn.peer,
        }, ...prev]);

      } else if (msg.msgType === MSG_FILE_END) {
        const entry = incomingRef.current[msg.transferId];
        if (!entry) return;

        // Sort chunks by index and concatenate
        const sorted = [...entry.chunks.entries()]
          .sort(([a], [b]) => a - b)
          .map(([, buf]) => new Uint8Array(buf));

        const totalLen = sorted.reduce((n, a) => n + a.length, 0);
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const arr of sorted) { result.set(arr, offset); offset += arr.length; }

        const blob = new Blob([result], { type: entry.mime || 'application/octet-stream' });
        delete incomingRef.current[msg.transferId];

        setTransfers(prev => prev.map(t =>
          t.id === msg.transferId
            ? { ...t, status: 'complete', progress: 100, file: blob }
            : t
        ));
      }
    });
    conn.on('close', () => { delete fileConnsRef.current[conn.peer]; });
  };

  const sendFile = (targetId, file) => {
    if (!file) return;
    const transferId = Math.random().toString(36).slice(2, 9);
    setTransfers(prev => [{
      id: transferId, role: 'send', name: file.name,
      size: file.size, progress: 0, status: 'sending', to: targetId,
    }, ...prev]);

    const conn = getFileConn(targetId);

    const doSend = () => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target.result;
        const numChunks = Math.ceil(buffer.byteLength / CHUNK_SIZE);

        // 1. Send FILE_START
        conn.send(buildFileStart(transferId, numChunks, file.name, file.type));

        // 2. Send chunks one at a time with setTimeout to avoid overwhelming the buffer
        let idx = 0;
        const sendNext = () => {
          if (idx >= numChunks) {
            // 3. Send FILE_END
            conn.send(buildFileEnd(transferId));
            setTransfers(prev => prev.map(t =>
              t.id === transferId ? { ...t, status: 'complete', progress: 100 } : t
            ));
            return;
          }
          const start = idx * CHUNK_SIZE;
          const chunk = buffer.slice(start, start + CHUNK_SIZE);
          conn.send(buildFileChunk(transferId, idx, chunk));
          setTransfers(prev => prev.map(t =>
            t.id === transferId
              ? { ...t, progress: Math.round(((idx + 1) / numChunks) * 100) }
              : t
          ));
          idx++;
          setTimeout(sendNext, 0); // yield to event loop between chunks
        };
        sendNext();
      };
      reader.onerror = () => setTransfers(prev => prev.map(t =>
        t.id === transferId ? { ...t, status: 'error' } : t
      ));
      reader.readAsArrayBuffer(file);
    };

    if (conn.open) doSend();
    else conn.on('open', doSend);
  };

  const sendMessage = (targetId, text) => {
    if (!text.trim()) return;
    const transferId = Math.random().toString(36).slice(2, 9);
    const conn = getFileConn(targetId);
    const doSend = () => {
      conn.send(buildMessage(transferId, text));
      setTransfers(prev => [{
        id: transferId, role: 'send', kind: 'message',
        name: text, progress: 100, status: 'complete', to: targetId,
      }, ...prev]);
    };
    if (conn.open) doSend(); else conn.on('open', doSend);
  };

  const downloadFile = (transfer) => {
    const url = URL.createObjectURL(transfer.file);
    const a = document.createElement('a');
    a.href = url; a.download = transfer.name; a.click();
    URL.revokeObjectURL(url);
    setTransfers(prev => prev.map(t =>
      t.id === transfer.id ? { ...t, file: null, saved: true } : t
    ));
  };

  const getDeviceIcon = (type) =>
    type === 'mobile' ? <Smartphone size={32} /> : <Laptop size={32} />;

  // ── Error screen ───────────────────────────────────────────────────────────
  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-red-100 shadow-sm">
        <XCircle className="text-red-500 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Setup Failed</h3>
        <p className="text-gray-500 text-center max-w-md">{error}</p>
        <button onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors">
          Try Again
        </button>
      </div>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  const sent = transfers.filter(t => t.role === 'send');
  const received = transfers.filter(t => t.role === 'receive');

  const TransferRow = ({ t }) => (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className={`p-1.5 rounded-lg shrink-0 ${t.kind === 'message' ? 'bg-violet-50 text-violet-500' : t.role === 'send' ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'}`}>
        {t.kind === 'message' ? <MessageSquare size={14} /> : t.role === 'send' ? <FileUp size={14} /> : <Download size={14} />}
      </div>
      <div className="flex-1 min-w-0">
        {t.kind === 'message' ? (
          <p className="text-sm text-gray-800 break-words">{t.name}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
            {t.status !== 'complete' && (
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${t.status === 'error' ? 'bg-red-400' : 'bg-blue-500'}`}
                    style={{ width: `${t.progress}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 w-7 text-right">{t.progress}%</span>
              </div>
            )}
          </>
        )}
      </div>
      <div className="shrink-0">
        {t.kind === 'message' || t.saved ? (
          <CheckCircle className="text-emerald-500" size={18} />
        ) : t.status === 'complete' ? (
          t.role === 'receive' ? (
            <button
              onClick={() => downloadFile(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-medium transition-colors"
            >
              <Download size={13} /> Save
            </button>
          ) : (
            <CheckCircle className="text-emerald-500" size={18} />
          )
        ) : t.status === 'error' ? (
          <XCircle className="text-red-400" size={18} />
        ) : (
          <Loader2 className="text-blue-400 animate-spin" size={18} />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">

      {/* Your Device — slim status bar, full width */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
          <Share2 size={15} />
        </div>
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider shrink-0">Your Device</span>
          {editingName ? (
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <input
                autoFocus
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && nameInput.trim()) {
                    const newName = nameInput.trim();
                    localStorage.setItem('qa-tools-peer-name', newName);
                    deviceNameRef.current = newName;
                    setDeviceName(newName);
                    setEditingName(false);
                  }
                  if (e.key === 'Escape') setEditingName(false);
                }}
                onBlur={() => setEditingName(false)}
                className="font-semibold text-gray-900 text-sm bg-transparent border-b border-blue-400 outline-none min-w-0 w-32"
              />
              <button
                onMouseDown={e => {
                  e.preventDefault();
                  if (nameInput.trim()) {
                    const newName = nameInput.trim();
                    localStorage.setItem('qa-tools-peer-name', newName);
                    deviceNameRef.current = newName;
                    setDeviceName(newName);
                    setEditingName(false);
                  }
                }}
                className="sm:hidden text-[11px] font-medium text-white bg-blue-500 px-2 py-0.5 rounded-md shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(deviceName); setEditingName(true); }}
              className="flex items-center gap-1 group min-w-0"
            >
              <span className="font-semibold text-gray-900 text-sm truncate">{deviceName}</span>
              <Pencil size={11} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
            </button>
          )}
        </div>
        <div className="ml-auto flex items-center gap-3 shrink-0">
          <span className="text-[11px] text-gray-400 font-mono hidden sm:inline">{publicIp || 'Detecting...'}</span>
          <span className="hidden sm:inline text-gray-200">·</span>
          <span className={`text-[11px] font-semibold ${status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {status === 'ready' ? '● Online' : '● Connecting...'}
          </span>
          {status === 'initializing' && <Loader2 size={12} className="animate-spin text-blue-400" />}
        </div>
      </div>

      {/* Nearby Devices — full width */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
          <Users size={15} className="text-gray-400" />
          <span className="font-semibold text-gray-900 text-sm">Nearby Devices</span>
          <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{peers.length}</span>
        </div>
        <div className="p-3">
          {peers.length === 0 ? (
            <div className="flex items-center gap-3 py-4 px-2">
              <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center animate-pulse shrink-0">
                <Share2 className="text-gray-200" size={14} />
              </div>
              <div>
                <p className="text-sm text-gray-500">Looking for devices...</p>
                <p className="text-[11px] text-gray-400">Open this page on another device on the same Wi-Fi.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {peers.map(peer => (
                <div key={peer.id} className="group flex flex-col items-center gap-2 p-3 bg-gray-50 rounded-xl border border-transparent hover:border-blue-200 hover:bg-blue-50 transition-all duration-200">
                  <div className="p-2 bg-white rounded-lg shadow-sm text-gray-400 group-hover:text-blue-500 transition-colors">
                    {peer.type === 'mobile' ? <Smartphone size={20} /> : <Laptop size={20} />}
                  </div>
                  <div className="text-center min-w-0 w-full">
                    <p className="text-xs font-semibold text-gray-900 truncate">{peer.name}</p>
                    <p className="text-[9px] font-mono text-gray-400">{peer.id.slice(-6)}</p>
                  </div>
                  <label className="w-full cursor-pointer"
                    onMouseEnter={e => {
                      const btn = e.currentTarget.querySelector('.send-btn');
                      if (btn) { btn.style.background = '#3b82f6'; btn.style.borderColor = '#3b82f6'; btn.style.color = 'white'; }
                    }}
                    onMouseLeave={e => {
                      const btn = e.currentTarget.querySelector('.send-btn');
                      if (btn) { btn.style.background = 'white'; btn.style.borderColor = '#e5e7eb'; btn.style.color = '#374151'; }
                    }}
                  >
                    <input type="file" className="hidden" onChange={(e) => sendFile(peer.id, e.target.files[0])} />
                    <div className="send-btn flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] font-medium text-gray-700 transition-all w-full justify-center">
                      <FileUp size={11} /> Send File
                    </div>
                  </label>
                  <div className="flex gap-1 w-full">
                    <input
                      type="text"
                      placeholder="Message..."
                      value={msgInputs[peer.id] || ''}
                      onChange={e => setMsgInputs(prev => ({ ...prev, [peer.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && msgInputs[peer.id]?.trim()) {
                          sendMessage(peer.id, msgInputs[peer.id]);
                          setMsgInputs(prev => ({ ...prev, [peer.id]: '' }));
                        }
                      }}
                      className="flex-1 min-w-0 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-[11px] text-gray-700 outline-none focus:border-violet-400 transition-colors"
                    />
                    <button
                      onClick={() => {
                        if (msgInputs[peer.id]?.trim()) {
                          sendMessage(peer.id, msgInputs[peer.id]);
                          setMsgInputs(prev => ({ ...prev, [peer.id]: '' }));
                        }
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#8b5cf6'; e.currentTarget.style.borderColor = '#8b5cf6'; e.currentTarget.style.color = 'white'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; e.currentTarget.style.color = '#6b7280'; }}
                      className="px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-gray-500 transition-all"
                    >
                      <MessageSquare size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfers — split into Received / Sent */}
      {transfers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Received */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <Download size={14} className="text-emerald-500" />
              <span className="font-semibold text-gray-900 text-sm">Received</span>
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{received.length}</span>
            </div>
            {received.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No files received yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {received.map(t => <TransferRow key={t.id} t={t} />)}
              </div>
            )}
          </div>

          {/* Sent */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-50 flex items-center gap-2">
              <FileUp size={14} className="text-amber-500" />
              <span className="font-semibold text-gray-900 text-sm">Sent</span>
              <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full">{sent.length}</span>
            </div>
            {sent.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No files sent yet</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {sent.map(t => <TransferRow key={t.id} t={t} />)}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}