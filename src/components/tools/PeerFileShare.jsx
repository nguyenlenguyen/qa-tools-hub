import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, Smartphone, Laptop, FileUp, Download,
  CheckCircle, XCircle, Loader2, Info, Users, ArrowRightLeft
} from 'lucide-react';

const ROOM_PREFIX = 'qafs';

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

/**
 * Architecture:
 *
 * Every device gets a RANDOM PeerJS ID (no collision risk).
 * Separately, one device "owns" a well-known ANCHOR ID = qafs-<ipHash>
 * The anchor peer only accepts signaling connections — it never changes.
 *
 * Flow:
 * 1. All devices register with a random ID first (always succeeds).
 * 2. Then try to ALSO register an anchor peer with the well-known ID.
 *    - Success  → you are HOST. Accept guest hello messages, broadcast member list.
 *    - "unavailable-id" error → you are GUEST. Connect to anchor ID, send hello.
 * 3. Host keeps member list and broadcasts to all guests on join/leave.
 * 4. If host page closes, anchor peer is destroyed.
 *    Guests detect host conn close → race to become new host (try anchor ID again).
 * 5. File transfers are always direct between random peer IDs (not through anchor).
 */
export default function PeerFileShare() {
  const [publicIp, setPublicIp] = useState('');
  const [myPeerId, setMyPeerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [peers, setPeers] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  const [deviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    const isAnimal = DEVICE_NAMES.some(n => saved && saved.startsWith(n));
    if (saved && isAnimal) return saved;
    const name = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)]
      + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', name);
    return name;
  });

  // ── Stable refs ────────────────────────────────────────────────────────────
  const mainPeerRef = useRef(null); // our random-ID peer (always exists)
  const anchorPeerRef = useRef(null); // well-known anchor peer (host only)
  const myPeerIdRef = useRef('');
  const deviceNameRef = useRef(deviceName);
  const anchorIdRef = useRef('');
  const isHostRef = useRef(false);
  const guestsRef = useRef({});   // host: { peerId → { id,name,type,conn } }
  const hostConnRef = useRef(null); // guest: signaling conn to host anchor
  const fileConnsRef = useRef({});   // all: direct file-transfer connections
  const destroyedRef = useRef(false);

  useEffect(() => {
    init();
    return () => {
      destroyedRef.current = true;
      if (mainPeerRef.current) mainPeerRef.current.destroy();
      if (anchorPeerRef.current) anchorPeerRef.current.destroy();
    };
  }, []); // eslint-disable-line

  // ── Helpers ────────────────────────────────────────────────────────────────

  const myMeta = () => ({
    id: myPeerIdRef.current,
    name: deviceNameRef.current,
    type: /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  });

  const broadcastMembers = () => {
    if (!isHostRef.current) return;
    const members = [
      myMeta(),
      ...Object.values(guestsRef.current).map(({ id, name, type }) => ({ id, name, type })),
    ];
    Object.values(guestsRef.current).forEach(({ conn }) => {
      try { if (conn?.open) conn.send({ type: 'member-list', members }); } catch (_) { }
    });
    setPeers(members.filter(m => m.id !== myPeerIdRef.current));
  };

  // ── Step 1: register random peer ID ───────────────────────────────────────

  const init = async () => {
    try {
      setStatus('initializing');
      destroyedRef.current = false;

      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      setPublicIp(ip);

      const ipHash = btoa(ip).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
      const anchorId = `${ROOM_PREFIX}-${ipHash}`;
      anchorIdRef.current = anchorId;

      if (!window.Peer) throw new Error('PeerJS not loaded.');

      // Always register with a random ID first — guaranteed no collision
      const randomId = `${ROOM_PREFIX}-m-${Math.random().toString(36).slice(2, 10)}`;
      const mainPeer = new window.Peer(randomId, { secure: true });
      mainPeerRef.current = mainPeer;

      mainPeer.on('open', (id) => {
        if (destroyedRef.current) return;
        myPeerIdRef.current = id;
        setMyPeerId(id);

        // Step 2: try to claim the anchor ID
        tryClaimAnchor(anchorId);
      });

      // Accept incoming file-transfer connections on our random ID
      mainPeer.on('connection', (conn) => {
        setupFileConn(conn);
      });

      mainPeer.on('error', (err) => {
        if (destroyedRef.current) return;
        console.error('Main peer error:', err);
        setError('Connection error: ' + err.type);
        setStatus('error');
      });

    } catch (err) {
      if (destroyedRef.current) return;
      setError(err.message);
      setStatus('error');
    }
  };

  // ── Step 2a: try to become host by claiming anchor ID ─────────────────────

  const tryClaimAnchor = (anchorId) => {
    if (destroyedRef.current) return;

    const anchorPeer = new window.Peer(anchorId, { secure: true });
    anchorPeerRef.current = anchorPeer;

    anchorPeer.on('open', () => {
      if (destroyedRef.current) { anchorPeer.destroy(); return; }
      // We own the anchor → HOST
      isHostRef.current = true;
      setIsHost(true);
      setStatus('ready');

      // Accept guest signaling connections on the anchor peer
      anchorPeer.on('connection', (conn) => {
        handleGuestSignaling(conn);
      });
    });

    anchorPeer.on('error', (err) => {
      if (destroyedRef.current) return;
      if (err.type === 'unavailable-id') {
        // Anchor taken → become guest
        anchorPeerRef.current = null;
        becomeGuest(anchorId);
      } else {
        console.error('Anchor peer error:', err);
        // Non-fatal: still usable, just can't be host
        becomeGuest(anchorId);
      }
    });
  };

  // ── Step 2b: become guest, connect to anchor ───────────────────────────────

  const becomeGuest = (anchorId) => {
    if (destroyedRef.current) return;
    isHostRef.current = false;
    setIsHost(false);
    setStatus('ready');

    const conn = mainPeerRef.current.connect(anchorId, { reliable: true });
    hostConnRef.current = conn;

    conn.on('open', () => {
      if (destroyedRef.current) return;
      // Send our hello immediately
      conn.send({ type: 'hello', ...myMeta() });
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;
      if (data.type === 'member-list') {
        setPeers((data.members || []).filter(m => m.id !== myPeerIdRef.current));
      }
    });

    conn.on('close', () => {
      if (destroyedRef.current) return;
      // Host left — wait a beat then try to claim anchor ourselves
      hostConnRef.current = null;
      setPeers([]);
      setStatus('initializing');
      setTimeout(() => {
        if (!destroyedRef.current) tryClaimAnchor(anchorIdRef.current);
      }, 500 + Math.random() * 1000); // random backoff to avoid race
    });

    conn.on('error', (err) => {
      if (destroyedRef.current) return;
      console.warn('Host conn error:', err);
      // Try reconnecting after a moment
      setTimeout(() => {
        if (!destroyedRef.current && !hostConnRef.current?.open) {
          becomeGuest(anchorId);
        }
      }, 2000);
    });
  };

  // ── Host: handle an incoming guest signaling connection ────────────────────

  const handleGuestSignaling = (conn) => {
    conn.on('open', () => {
      // Nothing yet — wait for hello
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'hello') {
        guestsRef.current[data.id] = {
          id: data.id,
          name: data.name,
          type: data.type,
          conn,
        };
        broadcastMembers();
      }
    });

    conn.on('close', () => {
      // Find and remove this guest by connection reference
      const entry = Object.values(guestsRef.current).find(g => g.conn === conn);
      if (entry) {
        delete guestsRef.current[entry.id];
        broadcastMembers();
      }
    });

    conn.on('error', (err) => console.warn('Guest signaling error:', err));
  };

  // ── File transfer ──────────────────────────────────────────────────────────

  const getOrOpenFileConn = (targetId) => {
    const existing = fileConnsRef.current[targetId];
    if (existing?.open) return existing;
    const conn = mainPeerRef.current.connect(targetId, { reliable: true });
    setupFileConn(conn);
    return conn;
  };

  const setupFileConn = (conn) => {
    fileConnsRef.current[conn.peer] = conn;
    conn.on('data', (data) => handleFileData(conn.peer, data));
    conn.on('close', () => { delete fileConnsRef.current[conn.peer]; });
    conn.on('error', (err) => console.warn('File conn error:', err));
  };

  const handleFileData = (fromId, data) => {
    if (data && typeof data === 'object' && !(data instanceof ArrayBuffer) && !(data instanceof Blob) && data.type === 'file-meta') {
      setTransfers(prev => [{
        id: data.transferId, role: 'receive', name: data.name,
        size: data.size, mimeType: data.mimeType || '',
        progress: 0, status: 'receiving', from: fromId,
      }, ...prev]);
    } else if (data instanceof ArrayBuffer || data instanceof Blob) {
      const blob = data instanceof ArrayBuffer ? new Blob([data]) : data;
      setTransfers(prev => {
        const updated = [...prev];
        const idx = updated.findIndex(t => t.from === fromId && t.status === 'receiving');
        if (idx !== -1) {
          const typed = updated[idx].mimeType
            ? new Blob([blob], { type: updated[idx].mimeType }) : blob;
          updated[idx] = { ...updated[idx], status: 'complete', progress: 100, file: typed };
        }
        return updated;
      });
    }
  };

  const sendFile = (targetId, file) => {
    if (!file) return;
    const transferId = Math.random().toString(36).slice(2, 9);
    setTransfers(prev => [{
      id: transferId, role: 'send', name: file.name,
      size: file.size, progress: 0, status: 'sending', to: targetId,
    }, ...prev]);

    const conn = getOrOpenFileConn(targetId);
    const doSend = () => {
      conn.send({ type: 'file-meta', transferId, name: file.name, size: file.size, mimeType: file.type });
      const reader = new FileReader();
      reader.onload = (e) => {
        conn.send(e.target.result);
        setTransfers(prev => prev.map(t =>
          t.id === transferId ? { ...t, status: 'complete', progress: 100 } : t
        ));
      };
      reader.onerror = () => setTransfers(prev => prev.map(t =>
        t.id === transferId ? { ...t, status: 'error' } : t
      ));
      reader.readAsArrayBuffer(file);
    };
    if (conn.open) doSend(); else conn.on('open', doSend);
  };

  const downloadFile = (transfer) => {
    const url = URL.createObjectURL(transfer.file);
    const a = document.createElement('a');
    a.href = url; a.download = transfer.name; a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type) =>
    type === 'mobile' ? <Smartphone size={32} /> : <Laptop size={32} />;

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

  // ── Main UI ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Share2 size={24} /></div>
            <div>
              <h3 className="font-bold text-gray-900">Your Device</h3>
              <p className="text-sm text-gray-500">{deviceName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Network Group:</span>
              <span className="font-mono text-gray-600 font-medium">{publicIp || 'Detecting...'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Role:</span>
              <span className="font-medium text-gray-600">{isHost ? '⭐ Host' : 'Guest'}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Status:</span>
              <span className={`font-medium ${status === 'ready' ? 'text-emerald-500' : 'text-amber-500'}`}>
                {status === 'ready' ? 'Online & Discoverable' : 'Connecting...'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-6 rounded-2xl shadow-xl text-white relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-bold mb-2 flex items-center gap-2">
              <Info size={18} className="text-blue-400" /> How it works
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              The first device on your network becomes the <strong>Host</strong>.
              Others join automatically. Files transfer <strong>directly</strong> P2P — never through a server.
            </p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] opacity-10">
            <ArrowRightLeft size={160} />
          </div>
        </div>
      </div>

      {/* Peers */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            Nearby Devices
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              {peers.length}
            </span>
          </h3>
          {status === 'initializing' && <Loader2 size={18} className="animate-spin text-blue-500" />}
        </div>
        <div className="p-6">
          {peers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Share2 className="text-gray-200" size={32} />
              </div>
              <p className="text-gray-900 font-medium">Looking for devices...</p>
              <p className="text-gray-400 text-sm mt-1">Open this page on another device on the same Wi-Fi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {peers.map(peer => (
                <div key={peer.id} className="group p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-200 hover:bg-blue-50/50 transition-all duration-300">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-white rounded-xl shadow-sm text-gray-400 group-hover:text-blue-500 transition-colors">
                      {getDeviceIcon(peer.type)}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{peer.name}</h4>
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{peer.id.slice(-8)}</p>
                    </div>
                  </div>
                  <label className="block">
                    <input type="file" className="hidden"
                      onChange={(e) => sendFile(peer.id, e.target.files[0])} />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shadow-sm">
                      <FileUp size={16} /> Send File
                    </div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transfers */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-50">
            <h3 className="font-bold text-gray-900">Recent Transfers</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {transfers.map(t => (
              <div key={t.id} className="p-4 flex items-center gap-4">
                <div className={`p-2 rounded-lg ${t.role === 'send' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                  {t.role === 'send' ? <FileUp size={20} /> : <Download size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.name}</p>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                      {t.role === 'send' ? 'Outgoing' : 'Incoming'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-300 ${t.status === 'complete' ? 'bg-emerald-500' : t.status === 'error' ? 'bg-red-400' : 'bg-blue-500'}`}
                        style={{ width: `${t.progress}%` }} />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8">{t.progress}%</span>
                  </div>
                </div>
                <div>
                  {t.status === 'complete'
                    ? t.role === 'receive'
                      ? <button onClick={() => downloadFile(t)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"><CheckCircle size={20} /></button>
                      : <CheckCircle className="text-emerald-500" size={20} />
                    : t.status === 'error'
                      ? <XCircle className="text-red-400" size={20} />
                      : <Loader2 className="text-blue-500 animate-spin" size={20} />
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}