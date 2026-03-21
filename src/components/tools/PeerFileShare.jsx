import React, { useState, useEffect, useRef } from 'react';
import { Share2, Smartphone, Laptop, FileUp, Download, CheckCircle, XCircle, Loader2, Info, Users, ArrowRightLeft } from 'lucide-react';

const NTFY_TOPIC_PREFIX = 'qa-tools-hub-share';

const DEVICE_NAMES = [
  'Swift Fox', 'Bold Eagle', 'Cool Penguin', 'Lazy Panda', 'Happy Dolphin',
  'Lunar Wolf', 'Zen Tiger', 'Neon Cat', 'Cosmic Owl', 'Desert Camel'
];

export default function PeerFileShare() {
  const [peerId, setPeerId] = useState('');
  const [roomTopic, setRoomTopic] = useState('');
  const [publicIp, setPublicIp] = useState('');
  const [deviceName] = useState(() => {
    const saved = localStorage.getItem('qa-tools-peer-name');
    const isAnimalName = DEVICE_NAMES.some(name => saved && saved.startsWith(name));
    if (saved && isAnimalName) return saved;
    const randomName = DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)] + ' ' + Math.floor(Math.random() * 100);
    localStorage.setItem('qa-tools-peer-name', randomName);
    return randomName;
  });
  const [peers, setPeers] = useState([]);
  const [connections, setConnections] = useState({});
  const [transfers, setTransfers] = useState([]);
  const [status, setStatus] = useState('initializing');
  const [error, setError] = useState(null);

  const peerRef = useRef(null);
  const ntfySourceRef = useRef(null);
  // FIX: use a ref to always have fresh peerId inside closures (subscribeToTopic, heartbeat)
  const peerIdRef = useRef('');

  useEffect(() => {
    initDiscovery();
    return () => {
      if (peerRef.current) peerRef.current.destroy();
      if (ntfySourceRef.current) ntfySourceRef.current.close();
    };
  }, []);

  const initDiscovery = async () => {
    try {
      setStatus('initializing');

      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();
      setPublicIp(ip);

      const topic = `${NTFY_TOPIC_PREFIX}-${btoa(ip).replace(/=/g, '').slice(0, 10)}`;
      setRoomTopic(topic);

      if (!window.Peer) {
        throw new Error('PeerJS not loaded. Check your internet connection.');
      }

      const myPeer = new window.Peer();
      peerRef.current = myPeer;

      myPeer.on('open', (id) => {
        peerIdRef.current = id;   // FIX: keep ref in sync
        setPeerId(id);
        setStatus('ready');
        broadcastPresence(topic, id, deviceName);
        subscribeToTopic(topic, id);
      });

      myPeer.on('connection', (conn) => {
        setupConnection(conn);
      });

      myPeer.on('error', (err) => {
        console.error('Peer error:', err);
        setError('Connection error: ' + err.type);
      });

    } catch (err) {
      console.error('Init error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const subscribeToTopic = (topic, myId) => {
    const source = new EventSource(`https://ntfy.sh/${topic}/sse`);
    ntfySourceRef.current = source;

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.message) {
          const payload = JSON.parse(data.message);

          const messageTime = payload.timestamp || 0;
          const now = Date.now();
          if (now - messageTime > 30000) return;

          // FIX: always use peerIdRef.current so closure never captures stale ''
          const currentId = peerIdRef.current || myId;
          if (payload.type === 'presence' && payload.peerId !== currentId) {
            addPeer({
              id: payload.peerId,
              name: payload.deviceName,
              type: /Android|iPhone|iPad/i.test(payload.userAgent) ? 'mobile' : 'desktop',
              lastSeen: now
            });
            if (payload.isNew) {
              sendPresence(topic, currentId, deviceName, false);
            }
          }
        }
      } catch (_) {
        // not our message format
      }
    };
  };

  const broadcastPresence = (topic, id, name) => {
    sendPresence(topic, id, name, true);
  };

  useEffect(() => {
    const heartbeat = setInterval(() => {
      // FIX: read fresh values from refs instead of stale closure state
      if (roomTopic && peerIdRef.current && status === 'ready') {
        sendPresence(roomTopic, peerIdRef.current, deviceName, false);
      }
    }, 10000);

    const staleChecker = setInterval(() => {
      setPeers(prev => prev.filter(p => Date.now() - (p.lastSeen || 0) < 25000));
    }, 5000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(staleChecker);
    };
  }, [roomTopic, deviceName, status]);

  const sendPresence = (topic, id, name, isNew) => {
    fetch(`https://ntfy.sh/${topic}`, {
      method: 'POST',
      body: JSON.stringify({
        type: 'presence',
        peerId: id,
        deviceName: name,
        userAgent: navigator.userAgent,
        isNew,
        timestamp: Date.now()
      })
    }).catch(() => { });
  };

  const addPeer = (newPeer) => {
    setPeers(prev => {
      const existsIdx = prev.findIndex(p => p.id === newPeer.id);
      if (existsIdx !== -1) {
        const updated = [...prev];
        updated[existsIdx] = { ...updated[existsIdx], name: newPeer.name, lastSeen: newPeer.lastSeen };
        return updated;
      }
      return [...prev, newPeer];
    });
  };

  const setupConnection = (conn) => {
    conn.on('open', () => {
      console.log('Connected to', conn.peer);
      setConnections(prev => ({ ...prev, [conn.peer]: conn }));
    });

    conn.on('data', (data) => {
      // FIX: PeerJS v1+ transmits Blobs as ArrayBuffer over the wire.
      // We need to handle ArrayBuffer and convert it back to a Blob for download.
      // Plain objects (file-meta) still arrive as objects.
      if (data && typeof data === 'object' && data.type === 'file-meta') {
        const newTransfer = {
          id: data.transferId,
          role: 'receive',
          name: data.name,
          progress: 0,
          status: 'receiving',
          size: data.size,
          mimeType: data.mimeType || '',
          from: conn.peer
        };
        setTransfers(prev => [newTransfer, ...prev]);

      } else if (data instanceof ArrayBuffer || data instanceof Blob) {
        // FIX: convert ArrayBuffer → Blob so URL.createObjectURL works later
        const blob = data instanceof ArrayBuffer ? new Blob([data]) : data;

        setTransfers(prev => {
          const updated = [...prev];
          // Match the most recent pending transfer from this peer
          const index = updated.findIndex(t => t.from === conn.peer && t.status === 'receiving');
          if (index !== -1) {
            // Re-create blob with the correct mime type if we stored it
            const typed = updated[index].mimeType
              ? new Blob([blob], { type: updated[index].mimeType })
              : blob;
            updated[index] = {
              ...updated[index],
              status: 'complete',
              progress: 100,
              file: typed
            };
          }
          return updated;
        });
      }
    });

    conn.on('close', () => {
      setConnections(prev => {
        const next = { ...prev };
        delete next[conn.peer];
        return next;
      });
      setPeers(prev => prev.filter(p => p.id !== conn.peer));
    });

    conn.on('error', (err) => {
      console.error('Connection error:', err);
    });
  };

  const sendFile = (targetPeerId, file) => {
    if (!file) return;

    let conn = connections[targetPeerId];
    if (!conn) {
      conn = peerRef.current.connect(targetPeerId, { reliable: true });
      setupConnection(conn);
    }

    const transferId = Math.random().toString(36).substring(7);
    const newTransfer = {
      id: transferId,
      role: 'send',
      name: file.name,
      progress: 0,
      status: 'sending',
      size: file.size,
      to: targetPeerId
    };
    setTransfers(prev => [newTransfer, ...prev]);

    const doSend = () => {
      // FIX: send meta first, then read file as ArrayBuffer and send that.
      // Sending the raw File/Blob object works in some PeerJS versions but not all;
      // ArrayBuffer is the most reliable cross-browser approach.
      conn.send({
        type: 'file-meta',
        transferId,
        name: file.name,
        size: file.size,
        mimeType: file.type
      });

      const reader = new FileReader();
      reader.onload = (e) => {
        conn.send(e.target.result); // ArrayBuffer — always safe
        setTransfers(prev => prev.map(t =>
          t.id === transferId ? { ...t, status: 'complete', progress: 100 } : t
        ));
      };
      reader.onerror = () => {
        setTransfers(prev => prev.map(t =>
          t.id === transferId ? { ...t, status: 'error' } : t
        ));
      };
      reader.readAsArrayBuffer(file);
    };

    if (conn.open) {
      doSend();
    } else {
      conn.on('open', doSend);
    }
  };

  const downloadFile = (transfer) => {
    const url = URL.createObjectURL(transfer.file);
    const a = document.createElement('a');
    a.href = url;
    a.download = transfer.name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getDeviceIcon = (type) => {
    return type === 'mobile' ? <Smartphone size={32} /> : <Laptop size={32} />;
  };

  // FIX: filter by peerId (unique), NOT by name (can collide)
  const filteredPeers = peers.filter(peer => peer.id !== peerId);

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-red-100 shadow-sm">
        <XCircle className="text-red-500 mb-4" size={48} />
        <h3 className="text-xl font-bold text-gray-900 mb-2">Setup Failed</h3>
        <p className="text-gray-500 text-center max-w-md">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Share2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">Your Device</h3>
              <p className="text-sm text-gray-500">{deviceName}</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-gray-400">Public IP Group:</span>
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
              <Info size={18} className="text-blue-400" />
              How it works
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Devices on the same local network share the same public IP. This tool groups you automatically.
              Files are sent <strong>directly</strong> between devices using WebRTC (Peer-to-Peer).
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
              <p className="text-gray-400 text-sm mt-1">Open this page on another phone or laptop in the same Wi-Fi.</p>
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
                      <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{peer.id.substring(0, 8)}</p>
                    </div>
                  </div>

                  <label className="block">
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => sendFile(peer.id, e.target.files[0])}
                    />
                    <div className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 cursor-pointer hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shadow-sm">
                      <FileUp size={16} />
                      Send File
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
                      <div
                        className={`h-full transition-all duration-300 ${t.status === 'complete' ? 'bg-emerald-500' : t.status === 'error' ? 'bg-red-400' : 'bg-blue-500'}`}
                        style={{ width: `${t.progress}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8">{t.progress}%</span>
                  </div>
                </div>
                <div>
                  {t.status === 'complete' ? (
                    t.role === 'receive' ? (
                      <button
                        onClick={() => downloadFile(t)}
                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Download File"
                      >
                        <CheckCircle size={20} />
                      </button>
                    ) : (
                      <CheckCircle className="text-emerald-500" size={20} />
                    )
                  ) : t.status === 'error' ? (
                    <XCircle className="text-red-400" size={20} />
                  ) : (
                    <Loader2 className="text-blue-500 animate-spin" size={20} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}