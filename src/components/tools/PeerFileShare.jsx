import React, { useState, useEffect, useRef } from 'react';
import {
  Share2, Smartphone, Laptop, FileUp, Download,
  CheckCircle, XCircle, Loader2, Info, Users, ArrowRightLeft
} from 'lucide-react';

const ROOM_PREFIX = 'qafs-room';

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

/**
 * Discovery strategy — no third-party signaling server needed:
 *
 * 1. Derive a "room ID" from the public IP:  qafs-room-<ipHash>
 * 2. Try to register PeerJS with that exact room ID ("host" role).
 *    - If we succeed → we ARE the host. Accept connections from guests.
 *    - If we get "unavailable-id" → someone else is host. Connect to them ("guest" role).
 * 3. Host keeps a member list { peerId → meta } and broadcasts it to every guest
 *    whenever someone joins or leaves.
 * 4. Guests receive the member list and render all peers (excluding themselves).
 * 5. File transfers go directly peer-to-peer regardless of host/guest role.
 */
export default function PeerFileShare() {
  const [myPeerId, setMyPeerId] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [deviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    const isAnimal = DEVICE_NAMES.some(n => saved && saved.startsWith(n));
    if (saved && isAnimal) return saved;
    const name = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)]
      + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', name);
    return name;
  });

  const [peers, setPeers] = useState([]); // other devices visible in UI
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  // Refs — stable across renders, safe to use inside PeerJS callbacks
  const peerRef = useRef(null);
  const myPeerIdRef = useRef('');
  const deviceNameRef = useRef(deviceName);
  const roomIdRef = useRef('');
  const isHostRef = useRef(false);
  // Host only: map of peerId → { id, name, type, conn }
  const guestsRef = useRef({});
  // Guest only: connection to host
  const hostConnRef = useRef(null);
  // All open file-transfer connections (both roles): peerId → DataConnection
  const fileConnsRef = useRef({});

  useEffect(() => {
    init();
    return () => { if (peerRef.current) peerRef.current.destroy(); };
  }, []); // eslint-disable-line

  // ── Helpers ────────────────────────────────────────────────────────────────

  const myMeta = () => ({
    id: myPeerIdRef.current,
    name: deviceNameRef.current,
    type: /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
  });

  /** Host → broadcast updated member list to all guests */
  const broadcastMembers = () => {
    if (!isHostRef.current) return;
    const members = [
      myMeta(),
      ...Object.values(guestsRef.current).map(({ id, name, type }) => ({ id, name, type })),
    ];
    Object.values(guestsRef.current).forEach(({ conn }) => {
      if (conn?.open) conn.send({ type: 'member-list', members });
    });
    // Host updates its own peer list (everyone except itself)
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
      const roomId = `${ROOM_PREFIX}-${ipHash}`;
      roomIdRef.current = roomId;

      if (!window.Peer) throw new Error('PeerJS not loaded.');

      // Try to become host first
      tryBecomeHost(roomId);

    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  // ── Host path ──────────────────────────────────────────────────────────────

  const tryBecomeHost = (roomId) => {
    const peer = new window.Peer(roomId, { secure: true });
    peerRef.current = peer;

    peer.on('open', (id) => {
      // We got the room ID → we are the host
      myPeerIdRef.current = id;
      isHostRef.current = true;
      setMyPeerId(id);
      setIsHost(true);
      setStatus('ready');
    });

    peer.on('connection', (conn) => {
      // A guest is connecting for room signaling
      handleGuestConnection(conn);
    });

    peer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        // Host already exists → become a guest
        peer.destroy();
        becomeGuest(roomId);
      } else {
        console.error('Host peer error:', err);
        setError('Connection error: ' + err.type);
      }
    });
  };

  const handleGuestConnection = (conn) => {
    conn.on('open', () => {
      // Guest sends its meta as first message
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'hello') {
        // Register guest
        guestsRef.current[conn.peer] = {
          id: conn.peer,
          name: data.name,
          type: data.deviceType,
          conn,
        };
        broadcastMembers();

      } else if (data.type === 'file-meta' || data instanceof ArrayBuffer || data instanceof Blob) {
        handleFileData(conn.peer, data);
      }
    });

    conn.on('close', () => {
      delete guestsRef.current[conn.peer];
      broadcastMembers();
    });

    conn.on('error', (err) => console.warn('Guest conn error:', err));
  };

  // ── Guest path ─────────────────────────────────────────────────────────────

  const becomeGuest = (roomId) => {
    // Guest registers with a random ID
    const guestId = `${roomId}-${Math.random().toString(36).slice(2, 8)}`;
    const peer = new window.Peer(guestId, { secure: true });
    peerRef.current = peer;

    peer.on('open', (id) => {
      myPeerIdRef.current = id;
      isHostRef.current = false;
      setMyPeerId(id);
      setIsHost(false);
      setStatus('ready');

      // Connect to host for room signaling
      connectToHost(roomId);
    });

    peer.on('connection', (conn) => {
      // Direct file-transfer connections from other peers
      setupFileConn(conn);
    });

    peer.on('error', (err) => {
      console.error('Guest peer error:', err);
      setError('Connection error: ' + err.type);
    });
  };

  const connectToHost = (roomId) => {
    const conn = peerRef.current.connect(roomId, { reliable: true });
    hostConnRef.current = conn;

    conn.on('open', () => {
      // Introduce ourselves to the host
      conn.send({ type: 'hello', name: deviceNameRef.current, deviceType: /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop' });
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'member-list') {
        // Update peer list — everyone except ourselves
        setPeers(data.members.filter(m => m.id !== myPeerIdRef.current));
      } else if (data.type === 'file-meta' || data instanceof ArrayBuffer || data instanceof Blob) {
        handleFileData(conn.peer, data);
      }
    });

    conn.on('close', () => {
      // Host disappeared — try to become the new host
      setStatus('initializing');
      setTimeout(() => {
        if (peerRef.current) peerRef.current.destroy();
        init();
      }, 1000);
    });

    conn.on('error', (err) => console.warn('Host conn error:', err));
  };

  // ── File transfer ──────────────────────────────────────────────────────────

  /** Open (or reuse) a direct DataConnection for file transfer */
  const getFileConn = (targetId) => {
    if (fileConnsRef.current[targetId]?.open) {
      return fileConnsRef.current[targetId];
    }
    const conn = peerRef.current.connect(targetId, { reliable: true });
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
    if (data && typeof data === 'object' && data.type === 'file-meta') {
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

    const conn = getFileConn(targetId);
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

  // ── Render ─────────────────────────────────────────────────────────────────

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

  return (
    <div className="space-y-6">
      {/* Header */}
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
              The first device on your network becomes the <strong>Host</strong> and manages discovery.
              Others join as guests. Files are sent <strong>directly</strong> P2P — never through a server.
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