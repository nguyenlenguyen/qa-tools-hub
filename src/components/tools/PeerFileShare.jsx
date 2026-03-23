import {
  CheckCircle, Copy, Download, FileUp, Laptop, Loader2,
  MessageSquare, Pencil, Share2, Smartphone, Users, XCircle, LogOut, Hash, Globe,
  Settings, Info, Plus, Trash2, Shield
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';

const ROOM_PREFIX = 'qafs';
const CHUNK_SIZE = 16 * 1024;

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

const DEFAULT_ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' },
  { urls: 'stun:stun.services.mozilla.com' }
];

const MSG_FILE_START = 1;
const MSG_FILE_CHUNK = 2;
const MSG_FILE_END = 3;
const MSG_MESSAGE = 4;

const enc = new TextEncoder();
const dec = new TextDecoder();

function encodeTransferId(id) {
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

// ── Room Entry Screen ─────────────────────────────────────────────────────────
function RoomEntry({ onJoin }) {
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  const handleJoinPrivate = () => {
    const code = roomInput.trim().toUpperCase();
    if (!code) { setError('Please enter a room code'); return; }
    if (!/^[A-Z0-9]{3,12}$/.test(code)) {
      setError('Room code must be 3–12 alphanumeric characters');
      return;
    }
    onJoin({ code, isPublic: false });
  };

  const handleJoinPublic = () => {
    onJoin({ code: '__PUBLIC__', isPublic: true });
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-50 rounded-2xl mb-4">
            <Share2 className="text-blue-500" size={26} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Peer File Share</h1>
          <p className="text-sm text-gray-500 mt-1">Enter a room code to connect with your devices</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Room Code
            </label>
            <div className="relative">
              <Hash size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                autoFocus
                value={roomInput}
                onChange={e => { setRoomInput(e.target.value.toUpperCase()); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleJoinPrivate()}
                placeholder="e.g. ABC123"
                maxLength={12}
                className="w-full pl-9 pr-4 py-3 border border-gray-200 rounded-xl text-gray-900 font-mono font-semibold text-lg tracking-widest outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all text-center"
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <button
            onClick={handleJoinPrivate}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl transition-colors text-sm"
          >
            Join Private Room
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <button
            onClick={handleJoinPublic}
            className="w-full py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold rounded-xl transition-colors text-sm border border-gray-200 flex items-center justify-center gap-2"
          >
            <Globe size={14} />
            Join Public Room
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Only devices on the same network &amp; same room can see each other
        </p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PeerFileShare() {
  const [roomCode, setRoomCode] = useState(() => sessionStorage.getItem('qa-tools-room-code') || '');
  const [isPublicRoom, setIsPublicRoom] = useState(() => sessionStorage.getItem('qa-tools-room-public') === '1');
  const [publicIp, setPublicIp] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [myPeerId, setMyPeerId] = useState('');
  const [msgInputs, setMsgInputs] = useState({});
  const [copiedId, setCopiedId] = useState(null);
  const [isHost, setIsHost] = useState(null);
  const [peers, setPeers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const [iceServers, setIceServers] = useState(() => {
    const saved = localStorage.getItem('qa-tools-ice-servers');
    return saved ? JSON.parse(saved) : DEFAULT_ICE_SERVERS;
  });

  const [newStunUrl, setNewStunUrl] = useState('');
  const [newTurnUrl, setNewTurnUrl] = useState('');
  const [newTurnUser, setNewTurnUser] = useState('');
  const [newTurnPass, setNewTurnPass] = useState('');

  const [deviceName, setDeviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    if (saved) return saved;
    const name = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)]
      + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', name);
    return name;
  });

  const mainPeerRef = useRef(null);
  const anchorPeerRef = useRef(null);
  const myPeerIdRef = useRef('');
  const deviceNameRef = useRef(deviceName);
  const anchorIdRef = useRef('');
  const isHostRef = useRef(false);
  const guestsRef = useRef({});
  const hostConnRef = useRef(null);
  const fileConnsRef = useRef({});
  const incomingRef = useRef({});
  const initCalledRef = useRef(false);

  const handleJoin = ({ code, isPublic }) => {
    sessionStorage.setItem('qa-tools-room-code', code);
    sessionStorage.setItem('qa-tools-room-public', isPublic ? '1' : '0');
    setIsPublicRoom(isPublic);
    setRoomCode(code);
  };

  const handleLeaveRoom = () => {
    if (mainPeerRef.current) { mainPeerRef.current.destroy(); mainPeerRef.current = null; }
    if (anchorPeerRef.current) { anchorPeerRef.current.destroy(); anchorPeerRef.current = null; }
    initCalledRef.current = false;
    sessionStorage.removeItem('qa-tools-room-code');
    sessionStorage.removeItem('qa-tools-room-public');
    setPeers([]);
    setTransfers([]);
    setStatus('initializing');
    setError(null);
    setRoomCode('');
    setIsPublicRoom(false);
  };

  useEffect(() => {
    if (!roomCode) return;
    if (initCalledRef.current) return;
    initCalledRef.current = true;
    init(roomCode, isPublicRoom, iceServers);
    return () => {
      if (mainPeerRef.current) mainPeerRef.current.destroy();
      if (anchorPeerRef.current) anchorPeerRef.current.destroy();
    };
  }, [roomCode]); // eslint-disable-line

  const saveIceServers = (servers) => {
    setIceServers(servers);
    localStorage.setItem('qa-tools-ice-servers', JSON.stringify(servers));
  };

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

  const init = async (code, isPublic, currentIceServers) => {
    try {
      setStatus('initializing');

      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      setPublicIp(ip);

      const ipHash = btoa(ip).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();

      // Public room: anchor by IP only (everyone on same network joins)
      // Private room: anchor by IP + room code slug (isolated)
      let anchorId;
      if (isPublic) {
        anchorId = `${ROOM_PREFIX}-${ipHash}`;
      } else {
        const roomSlug = code.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8);
        anchorId = `${ROOM_PREFIX}-${ipHash}-${roomSlug}`;
      }
      anchorIdRef.current = anchorId;

      if (!window.Peer) throw new Error('PeerJS not loaded.');

      const randomId = `${ROOM_PREFIX}-m-${Math.random().toString(36).slice(2, 10)}`;
      const peerConfig = {
        secure: true,
        config: { iceServers: currentIceServers || iceServers }
      };

      const mainPeer = new window.Peer(randomId, peerConfig);
      mainPeerRef.current = mainPeer;

      mainPeer.on('open', (id) => {
        myPeerIdRef.current = id;
        setMyPeerId(id);
        tryClaimAnchor(anchorId, peerConfig);
      });

      mainPeer.on('connection', (conn) => {
        if (conn.label === 'ft') setupFileConn(conn);
      });

      mainPeer.on('error', (err) => {
        setError('Connection error: ' + err.type);
        setStatus('error');
      });

    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  const tryClaimAnchor = (anchorId, peerConfig) => {
    if (anchorPeerRef.current) { anchorPeerRef.current.destroy(); anchorPeerRef.current = null; }

    const ap = new window.Peer(anchorId, peerConfig);
    anchorPeerRef.current = ap;

    ap.on('open', () => {
      isHostRef.current = true;
      setIsHost(true);
      setStatus('ready');
      ap.on('connection', (conn) => handleGuestSignaling(conn));
    });

    ap.on('error', () => {
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
      conn.send({ ...myMeta(), type: 'hello' });
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

  const getFileConn = (targetId) => {
    const ex = fileConnsRef.current[targetId];
    if (ex?.open) return ex;
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
      let ab;
      if (raw instanceof ArrayBuffer) {
        ab = raw;
      } else if (ArrayBuffer.isView(raw)) {
        ab = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
      } else if (raw && typeof raw === 'object') {
        const len = Object.keys(raw).length;
        const u8 = new Uint8Array(len);
        for (let i = 0; i < len; i++) u8[i] = raw[i];
        ab = u8.buffer;
      } else return;

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
        conn.send(buildFileStart(transferId, numChunks, file.name, file.type));
        let idx = 0;
        const sendNext = () => {
          if (idx >= numChunks) {
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
          setTimeout(sendNext, 0);
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

  // ── Room entry screen ──────────────────────────────────────────────────────
  if (!roomCode) {
    return <RoomEntry onJoin={handleJoin} />;
  }

  // ── Error screen ──────────────────────────────────────────────────────────
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
      <div className="shrink-0 flex items-center gap-1">
        {t.kind === 'message' && t.role === 'receive' && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(t.name);
              setCopiedId(t.id);
              setTimeout(() => setCopiedId(null), 2000);
            }}
            className="p-1 text-gray-300 hover:text-violet-500 transition-colors"
            title="Copy message"
          >
            {copiedId === t.id ? <CheckCircle size={14} className="text-violet-500" /> : <Copy size={14} />}
          </button>
        )}
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

      {/* Status bar — 2-row layout so it stays comfortable on mobile */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex flex-col gap-2">

        {/* Row 1: icon · device name (editable) · leave */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Share2 size={14} />
          </div>
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
                className="font-semibold text-gray-900 text-sm bg-transparent border-b border-blue-400 outline-none min-w-0 flex-1"
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
                className="text-[11px] font-medium text-white bg-blue-500 px-2 py-0.5 rounded-md shrink-0"
              >
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => { setNameInput(deviceName); setEditingName(true); }}
              className="flex items-center gap-1 group min-w-0 flex-1"
            >
              <span className="font-semibold text-gray-900 text-sm truncate">{deviceName}</span>
              <Pencil size={11} className="text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
            </button>
          )}
        </div>

        {/* Row 2: room badge · leave · connection status */}
        <div className="flex items-center gap-2 pl-1">
          {isPublicRoom ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 rounded-md">
              <Globe size={10} className="text-emerald-500" />
              <span className="text-[11px] font-bold text-emerald-600">Public Room</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-md">
              <Hash size={10} className="text-blue-400" />
              <span className="text-[11px] font-bold text-blue-600 font-mono tracking-wider">{roomCode}</span>
            </div>
          )}
          <button
            onClick={handleLeaveRoom}
            title="Leave room"
            className="p-1 text-gray-300 hover:text-red-400 transition-colors rounded-md hover:bg-red-50 shrink-0"
          >
            <LogOut size={12} />
          </button>
          <span className="text-gray-200 text-xs">·</span>
          <span className={`text-[11px] font-semibold flex items-center gap-1 ${status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>
            {status === 'initializing'
              ? <><Loader2 size={10} className="animate-spin" /> Connecting...</>
              : '● Online'
            }
          </span>
          <div className="flex-1" />
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-md transition-colors border border-gray-100"
          >
            <Settings size={12} />
            <span className="text-[10px] font-bold uppercase tracking-tight">Network Settings</span>
          </button>
        </div>
      </div>

      {/* Connection Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                  <Shield size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Network Strategy</h3>
                  <p className="text-[11px] text-gray-500 font-medium uppercase tracking-wider">Bypass firewall & NAT</p>
                </div>
              </div>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] custom-scrollbar space-y-6">
              {/* Info Box */}
              <div className="flex gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <Info className="text-blue-500 shrink-0 mt-0.5" size={18} />
                <div className="text-sm text-blue-800 leading-relaxed">
                  <p className="font-semibold mb-1">Struggling to connect?</p>
                  Corporate networks often block direct P2P connections. Adding a <b>TURN server</b> (relay) is the best way to bypass these restrictions.
                </div>
              </div>

              {/* Server List */}
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Active ICE Servers</label>
                <div className="space-y-2">
                  {iceServers.map((server, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100 group">
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase font-bold ${server.username ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {server.username ? 'TURN' : 'STUN'}
                          </span>
                          <span className="text-xs font-mono text-gray-600 truncate">{Array.isArray(server.urls) ? server.urls[0] : server.urls}</span>
                        </div>
                        {server.username && <p className="text-[10px] text-gray-400 mt-0.5">User: {server.username}</p>}
                      </div>
                      <button
                        onClick={() => saveIceServers(iceServers.filter((_, i) => i !== idx))}
                        className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add New */}
              <div className="space-y-4 pt-2 border-t border-gray-100">
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Add Custom STUN</label>
                    <div className="flex gap-2">
                      <input
                        placeholder="stun:your-server.com:3478"
                        value={newStunUrl}
                        onChange={e => setNewStunUrl(e.target.value)}
                        className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
                      />
                      <button
                        onClick={() => {
                          if (newStunUrl.trim()) {
                            saveIceServers([...iceServers, { urls: newStunUrl.trim() }]);
                            setNewStunUrl('');
                          }
                        }}
                        className="p-2.5 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors shadow-sm shadow-blue-200"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5 ml-1">Add Custom TURN (Relay)</label>
                    <div className="space-y-2 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <input
                        placeholder="turn:your-server.com:3478"
                        value={newTurnUrl}
                        onChange={e => setNewTurnUrl(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
                      />
                      <div className="flex gap-2">
                        <input
                          placeholder="Username"
                          value={newTurnUser}
                          onChange={e => setNewTurnUser(e.target.value)}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
                        />
                        <input
                          placeholder="Password"
                          type="password"
                          value={newTurnPass}
                          onChange={e => setNewTurnPass(e.target.value)}
                          className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:border-blue-400 transition-colors"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (newTurnUrl.trim() && newTurnUser.trim() && newTurnPass.trim()) {
                            saveIceServers([...iceServers, {
                              urls: newTurnUrl.trim(),
                              username: newTurnUser.trim(),
                              credential: newTurnPass.trim()
                            }]);
                            setNewTurnUrl(''); setNewTurnUser(''); setNewTurnPass('');
                          }
                        }}
                        className="w-full py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-all text-xs"
                      >
                        Add TURN Server
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() => {
                  saveIceServers(DEFAULT_ICE_SERVERS);
                  setIceServers(DEFAULT_ICE_SERVERS);
                }}
                className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => {
                  setShowSettings(false);
                  handleLeaveRoom(); // Trigger re-init
                  window.location.reload(); // Simple way to re-init with new servers
                }}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-200 text-sm"
              >
                Apply & Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nearby Devices */}
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
                <p className="text-sm text-gray-500">
                  {isPublicRoom
                    ? 'Looking for devices on the same network...'
                    : <>Looking for devices in room <span className="font-mono font-bold text-blue-500">#{roomCode}</span>...</>
                  }
                </p>
                <p className="text-[11px] text-gray-400">
                  {isPublicRoom
                    ? 'Open this page on another device on the same Wi-Fi.'
                    : 'Open this page on another device and enter the same room code.'
                  }
                </p>
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

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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