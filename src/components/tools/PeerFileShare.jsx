import React, { useState, useEffect, useRef } from 'react';
import { Share2, Smartphone, Laptop, FileUp, Download, CheckCircle, XCircle, Loader2, Info, Users, ArrowRightLeft } from 'lucide-react';

// PeerJS default public server — used for both WebRTC signaling AND peer discovery
// GET https://0.peerjs.com/peerjs/peers  →  returns array of all connected peer IDs
const PEERJS_HOST = '0.peerjs.com';
const PEERJS_PORT = 443;
const PEERJS_PATH = '/';

// Room prefix encoded in the PeerJS ID so we can filter peers in the same "room"
// Format:  qafs-<ipHash>-<randomSuffix>
const ROOM_PREFIX = 'qafs';

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

export default function PeerFileShare() {
  const [myPeerId, setMyPeerId] = useState('');
  const [roomId, setRoomId] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [deviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    const isAnimal = DEVICE_NAMES.some(n => saved && saved.startsWith(n));
    if (saved && isAnimal) return saved;
    const name = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)] + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', name);
    return name;
  });

  const [peers, setPeers] = useState([]);
  const [connections, setConnections] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const myPeerIdRef = useRef('');
  const roomIdRef = useRef('');
  const deviceNameRef = useRef(deviceName);
  const knownPeers = useRef({}); // { peerId: { id, name, type } }
  const connectedRef = useRef({}); // { peerId: DataConnection | 'pending' }
  const pollRef = useRef(null);

  useEffect(() => {
    init();
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []); // eslint-disable-line

  // ─── Init ─────────────────────────────────────────────────────────────────
  const init = async () => {
    try {
      setStatus('initializing');

      // 1. Get public IP → derive shared room ID for devices on same network
      const res = await fetch('https://api.ipify.org?format=json');
      const { ip } = await res.json();
      setPublicIp(ip);

      const ipHash = btoa(ip).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toLowerCase();
      const room = `${ROOM_PREFIX}-${ipHash}`;
      roomIdRef.current = room;
      setRoomId(room);

      // 2. Register on PeerJS with ID = room-<randomSuffix>
      //    This lets us call /peerjs/peers and filter by room prefix for discovery
      if (!window.Peer) throw new Error('PeerJS not loaded.');

      const randomSuffix = Math.random().toString(36).slice(2, 8);
      const desiredId = `${room}-${randomSuffix}`;

      const peer = new window.Peer(desiredId, {
        host: PEERJS_HOST,
        port: PEERJS_PORT,
        path: PEERJS_PATH,
        secure: true,
      });
      peerRef.current = peer;

      peer.on('open', (id) => {
        myPeerIdRef.current = id;
        setMyPeerId(id);
        setStatus('ready');

        // Poll immediately, then every 5s
        pollPeers();
        pollRef.current = setInterval(pollPeers, 5000);
      });

      // Incoming connection from a peer that connected to us
      peer.on('connection', (conn) => {
        setupConnection(conn);
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        if (err.type === 'unavailable-id') {
          // ID collision — retry with a new suffix
          peer.destroy();
          init();
        } else {
          setError('Connection error: ' + err.type);
        }
      });

    } catch (err) {
      console.error('Init error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  // ─── Discovery: poll PeerJS server, connect to room peers ─────────────────
  const pollPeers = async () => {
    const myId = myPeerIdRef.current;
    const room = roomIdRef.current;
    if (!myId || !room) return;

    try {
      const res = await fetch(`https://${PEERJS_HOST}/peerjs/peers`);
      const allIds = await res.json(); // string[]

      // Keep only peers in our room
      const roomIds = allIds.filter(id => id !== myId && id.startsWith(room + '-'));

      // Connect to peers we haven't connected to yet
      roomIds.forEach(peerId => {
        if (!connectedRef.current[peerId]) {
          connectToPeer(peerId);
        }
      });

      // Remove peers that are no longer on the server
      const activeSet = new Set(roomIds);
      Object.keys(knownPeers.current).forEach(id => {
        if (!activeSet.has(id)) {
          delete knownPeers.current[id];
          delete connectedRef.current[id];
        }
      });
      syncPeers();

    } catch (err) {
      console.warn('Poll failed:', err);
    }
  };

  // ─── Connect to a specific peer ───────────────────────────────────────────
  const connectToPeer = (targetId) => {
    if (connectedRef.current[targetId]) return;
    connectedRef.current[targetId] = 'pending';
    const conn = peerRef.current.connect(targetId, { reliable: true });
    setupConnection(conn);
  };

  // ─── Wire up a data connection ────────────────────────────────────────────
  const setupConnection = (conn) => {
    conn.on('open', () => {
      connectedRef.current[conn.peer] = conn;
      setConnections(prev => ({ ...prev, [conn.peer]: conn }));

      // Exchange our name/device type
      conn.send({
        type: 'handshake',
        name: deviceNameRef.current,
        deviceType: /Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      });
    });

    conn.on('data', (data) => {
      if (!data || typeof data !== 'object') return;

      if (data.type === 'handshake') {
        knownPeers.current[conn.peer] = {
          id: conn.peer,
          name: data.name,
          type: data.deviceType,
        };
        syncPeers();

      } else if (data.type === 'file-meta') {
        setTransfers(prev => [{
          id: data.transferId,
          role: 'receive',
          name: data.name,
          size: data.size,
          mimeType: data.mimeType || '',
          progress: 0,
          status: 'receiving',
          from: conn.peer,
        }, ...prev]);

      } else if (data instanceof ArrayBuffer || data instanceof Blob) {
        const blob = data instanceof ArrayBuffer ? new Blob([data]) : data;
        setTransfers(prev => {
          const updated = [...prev];
          const idx = updated.findIndex(t => t.from === conn.peer && t.status === 'receiving');
          if (idx !== -1) {
            const typed = updated[idx].mimeType
              ? new Blob([blob], { type: updated[idx].mimeType })
              : blob;
            updated[idx] = { ...updated[idx], status: 'complete', progress: 100, file: typed };
          }
          return updated;
        });
      }
    });

    conn.on('close', () => {
      delete connectedRef.current[conn.peer];
      delete knownPeers.current[conn.peer];
      setConnections(prev => { const n = { ...prev }; delete n[conn.peer]; return n; });
      syncPeers();
    });

    conn.on('error', (err) => console.warn('Conn error:', err));
  };

  const syncPeers = () => setPeers(Object.values(knownPeers.current));

  // ─── Send file ────────────────────────────────────────────────────────────
  const sendFile = (targetPeerId, file) => {
    if (!file) return;

    let conn = connectedRef.current[targetPeerId];
    if (!conn || conn === 'pending') {
      conn = peerRef.current.connect(targetPeerId, { reliable: true });
      setupConnection(conn);
    }

    const transferId = Math.random().toString(36).slice(2, 9);
    setTransfers(prev => [{
      id: transferId, role: 'send', name: file.name,
      size: file.size, progress: 0, status: 'sending', to: targetPeerId,
    }, ...prev]);

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

    if (conn.open) doSend();
    else conn.on('open', doSend);
  };

  // ─── Download ─────────────────────────────────────────────────────────────
  const downloadFile = (transfer) => {
    const url = URL.createObjectURL(transfer.file);
    const a = document.createElement('a');
    a.href = url; a.download = transfer.name; a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type) =>
    type === 'mobile' ? <Smartphone size={32} /> : <Laptop size={32} />;

  const filteredPeers = peers.filter(p => p.id !== myPeerId);

  // ─── Error screen ─────────────────────────────────────────────────────────
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

  // ─── Main UI ──────────────────────────────────────────────────────────────
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
              Devices on the same network share the same public IP and are grouped automatically.
              Files are sent <strong>directly</strong> between devices via WebRTC (P2P).
            </p>
          </div>
          <div className="absolute top-[-20%] right-[-10%] opacity-10">
            <ArrowRightLeft size={160} />
          </div>
        </div>
      </div>

      {/* Peer Discovery */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <Users size={18} className="text-gray-400" />
            Nearby Devices
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
              {filteredPeers.length}
            </span>
          </h3>
          {status === 'initializing' && <Loader2 size={18} className="animate-spin text-blue-500" />}
        </div>

        <div className="p-6">
          {filteredPeers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 animate-pulse">
                <Share2 className="text-gray-200" size={32} />
              </div>
              <p className="text-gray-900 font-medium">Looking for devices...</p>
              <p className="text-gray-400 text-sm mt-1">Open this page on another device on the same Wi-Fi.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPeers.map(peer => (
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