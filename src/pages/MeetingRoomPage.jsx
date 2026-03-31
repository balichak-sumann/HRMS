import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import {
    Mic,
    MicOff,
    Camera,
    VideoOff,
    Monitor,
    Disc,
    PhoneOff,
    Users,
    MessageSquare,
    MoreHorizontal,
    Maximize,
    Loader2,
    Shield,
    X,
    Send
} from 'lucide-react';

const SOCKET_URL = window.location.origin;

const getSignalUserId = (entity) => entity?.employee_uuid || entity?.id;
const getRoleBasePath = (role) => {
    if (role === 'admin') return '/admin';
    if (role === 'hr') return '/hr';
    return '/employee';
};

const MeetingRoomPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user, profile } = useAuth();
    const roleBasePath = getRoleBasePath(profile?.role);
    const [meeting, setMeeting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isMuted, setIsMuted] = useState(false);
    const [isCamOff, setIsCamOff] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [sidebarTab, setSidebarTab] = useState('participants'); // 'participants' or 'chat'
    const [chatMessages, setChatMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [showAddMembersModal, setShowAddMembersModal] = useState(false);
    const [availableEmployees, setAvailableEmployees] = useState([]);
    const [loadingEmployees, setLoadingEmployees] = useState(false);
    const [addingMemberId, setAddingMemberId] = useState(null);
    const socket = useRef(null);
    const chatEndRef = useRef(null);
    const [localStream, setLocalStream] = useState(null);
    const localStreamRef = useRef(null);
    const [peers, setPeers] = useState({}); // userId -> { pc, stream, name }
    const localVideoRef = useRef(null);
    const peerConnections = useRef({}); // userId -> pc
    const pendingCandidates = useRef({}); // userId -> [candidates]
    const remoteStreams = useRef({}); // userId -> MediaStream
    const disconnectTimers = useRef({}); // userId -> timeoutId
    const incomingOfferInProgress = useRef({}); // userId -> boolean
    const lastRemoteOfferSdp = useRef({}); // userId -> sdp

    const iceConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            {
                urls: 'turn:a.relay.metered.ca:80',
                username: 'e8dd65b92f6dde70d3ce84e4',
                credential: '3RoB/YKGOaVMnqdv'
            },
            {
                urls: 'turn:a.relay.metered.ca:80?transport=tcp',
                username: 'e8dd65b92f6dde70d3ce84e4',
                credential: '3RoB/YKGOaVMnqdv'
            },
            {
                urls: 'turn:a.relay.metered.ca:443',
                username: 'e8dd65b92f6dde70d3ce84e4',
                credential: '3RoB/YKGOaVMnqdv'
            },
            {
                urls: 'turns:a.relay.metered.ca:443',
                username: 'e8dd65b92f6dde70d3ce84e4',
                credential: '3RoB/YKGOaVMnqdv'
            }
        ],
        iceCandidatePoolSize: 10
    };

    const myId = getSignalUserId(user);

    useEffect(() => {
        if (!user) {
            console.error('[Meeting] No user found in AuthContext');
            const timer = setTimeout(() => navigate('/login'), 500);
            return () => clearTimeout(timer);
        }

        const initialize = async () => {
            await fetchMeetingDetails();
            const stream = await startLocalStream();

            if (!stream) {
                console.error('[Meeting] Could not get local stream');
                return;
            }

            socket.current = io(SOCKET_URL);

            socket.current.emit('identify', myId);

            socket.current.emit('join_room', {
                roomId: `meeting_${id}`,
                userId: myId,
                name: user.full_name
            });

            socket.current.on('receive_meeting_chat', (msg) => {
                setChatMessages(prev => [...prev, msg]);
            });

            // --- WebRTC Signaling ---
            socket.current.on('user_joined', async (data) => {
                console.log('[Meeting] User joined:', data.userId, data.name);
                if (data.userId && data.userId !== myId) {
                    setPeers(prev => ({
                        ...prev,
                        [data.userId]: { ...prev[data.userId], name: data.name || 'Participant' }
                    }));
                    initiateCall(data.userId, stream);
                }
            });

            socket.current.on('incoming_call', async (data) => {
                if (data.type === 'meeting') {
                    handleIncomingJoin(data, stream);
                }
            });

            socket.current.on('call_answered', async (data) => {
                handleCallAnswered(data);
            });

            socket.current.on('ice_candidate', async (data) => {
                handleIceCandidate(data);
            });

            socket.current.on('user_left', (payload) => {
                const userId = typeof payload === 'string' ? payload : payload?.userId;
                if (userId) {
                    removePeer(userId);
                }
            });

            setChatMessages([
                { sender: 'System', content: 'You joined the meeting room.', time: new Date() },
            ]);
        };

        initialize();

        return () => {
            teardownMeetingSession();
        };
    }, [id, user]);

    const teardownMeetingSession = () => {
        if (socket.current) {
            socket.current.disconnect();
            socket.current = null;
        }

        Object.values(disconnectTimers.current).forEach((timerId) => clearTimeout(timerId));
        disconnectTimers.current = {};

        Object.values(peerConnections.current).forEach((pc) => pc.close());
        peerConnections.current = {};
        pendingCandidates.current = {};
        incomingOfferInProgress.current = {};
        lastRemoteOfferSdp.current = {};

        Object.values(remoteStreams.current).forEach((stream) => {
            stream.getTracks().forEach((track) => track.stop());
        });
        remoteStreams.current = {};

        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }

        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach((track) => track.stop());
            localStreamRef.current = null;
        }

        setLocalStream(null);
        setPeers({});
    };

    const startLocalStream = async () => {
        try {
            if (localStreamRef.current) {
                return localStreamRef.current;
            }
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }
            return stream;
        } catch (err) {
            console.error('Failed to get local stream', err);
        }
    };

    const createPeerConnection = (userId, peerName) => {
        const pc = new RTCPeerConnection(iceConfiguration);

        pc.onicecandidate = (event) => {
            if (event.candidate && socket.current) {
                socket.current.emit('ice_candidate', {
                    to: userId,
                    from: myId,
                    candidate: event.candidate
                });
            }
        };

        pc.ontrack = (event) => {
            console.log(`[Meeting] Remote track (${event.track.kind}) received from:`, userId);

            // Use the stream provided by the browser directly
            // This is the recommended WebRTC pattern - event.streams[0] contains all tracks for this peer
            let remoteStream;
            
            if (event.streams && event.streams[0]) {
                remoteStream = event.streams[0];
                console.log(`[Meeting] Using event.streams[0] directly for ${userId}, contains ${remoteStream.getTracks().length} tracks (${remoteStream.getAudioTracks().length} audio, ${remoteStream.getVideoTracks().length} video)`);
            } else if (event.track) {
                // Fallback: create a new stream if event.streams is not available
                remoteStream = new MediaStream([event.track]);
                console.log(`[Meeting] Created new stream for ${userId} with single track (${event.track.kind})`);
            } else {
                console.warn(`[Meeting] No stream or track available from ontrack event for ${userId}`);
                return;
            }

            remoteStreams.current[userId] = remoteStream;

            setPeers(prev => {
                const existingPeer = prev[userId] || {};
                const trackCount = remoteStream.getTracks().length;
                console.log(`[Meeting] Setting peers for ${userId} with stream containing ${trackCount} tracks`);

                return {
                    ...prev,
                    [userId]: {
                        ...existingPeer,
                        stream: remoteStream,
                        name: existingPeer.name || peerName || 'Participant'
                    }
                };
            });
        };

        pc.oniceconnectionstatechange = () => {
            console.log(`[Meeting] ICE state for ${userId}:`, pc.iceConnectionState);
            if (pc.iceConnectionState === 'disconnected') {
                if (disconnectTimers.current[userId]) {
                    clearTimeout(disconnectTimers.current[userId]);
                }
                disconnectTimers.current[userId] = setTimeout(() => {
                    const latestPc = peerConnections.current[userId];
                    if (latestPc && latestPc.iceConnectionState === 'disconnected') {
                        removePeer(userId);
                    }
                }, 8000);
            }
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                if (disconnectTimers.current[userId]) {
                    clearTimeout(disconnectTimers.current[userId]);
                    delete disconnectTimers.current[userId];
                }
            }
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'closed') {
                removePeer(userId);
            }
        };

        peerConnections.current[userId] = pc;
        return pc;
    };

    const ensureLocalTracks = (pc, stream, targetUserId) => {
        if (!pc || !stream) return;
        const senderKinds = new Set(
            pc.getSenders()
                .map((sender) => sender.track?.kind)
                .filter(Boolean)
        );

        stream.getTracks().forEach((track) => {
            if (!senderKinds.has(track.kind)) {
                console.log(`[Meeting] Adding track (${track.kind}) to PC for:`, targetUserId);
                pc.addTrack(track, stream);
            }
        });
    };

    const initiateCall = async (targetUserId, stream) => {
        try {
            console.log('[Meeting] Initiating call to:', targetUserId);
            const targetParticipant = meeting?.participants?.find(p => getSignalUserId(p) === targetUserId);

            let pc = peerConnections.current[targetUserId];
            if (!pc || pc.connectionState === 'closed') {
                pc = createPeerConnection(targetUserId, targetParticipant?.full_name);
            }
            const currentStream = stream || localStream || await startLocalStream();

            if (currentStream) {
                ensureLocalTracks(pc, currentStream, targetUserId);
            }

            if (pc.signalingState !== 'stable') {
                console.log('[Meeting] Skipping offer, signaling not stable for:', targetUserId, pc.signalingState);
                return;
            }

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            socket.current.emit('call_user', {
                to: targetUserId,
                from: myId,
                offer: offer,
                type: 'meeting',
                caller_name: user?.full_name || 'Someone'
            });

            setPeers(prev => ({
                ...prev,
                [targetUserId]: { ...prev[targetUserId], name: targetParticipant?.full_name || 'Participant' }
            }));
        } catch (err) {
            console.error('Failed to initiate call', err);
        }
    };

    const handleIncomingJoin = async (data, stream) => {
        try {
            console.log('[Meeting] Handling incoming join from:', data.from);

            const incomingSdp = data?.offer?.sdp;
            if (!incomingSdp) {
                console.warn('[Meeting] Incoming offer missing SDP from:', data.from);
                return;
            }

            if (incomingOfferInProgress.current[data.from]) {
                if (lastRemoteOfferSdp.current[data.from] === incomingSdp) {
                    console.log('[Meeting] Duplicate in-flight offer ignored from:', data.from);
                    return;
                }
            }

            // Ignore exact duplicate offers that were already handled.
            if (lastRemoteOfferSdp.current[data.from] === incomingSdp) {
                console.log('[Meeting] Duplicate offer ignored from:', data.from);
                return;
            }

            incomingOfferInProgress.current[data.from] = true;

            // Reuse existing PC if we already initiated a call to them
            const existingPc = peerConnections.current[data.from];
            let pc;

            if (existingPc) {
                console.log('[Meeting] Reusing existing PC for:', data.from);
                pc = existingPc;
            } else {
                console.log('[Meeting] Creating new PC for incoming join from:', data.from);
                pc = createPeerConnection(data.from);
            }

            const currentStream = stream || localStream || await startLocalStream();
            if (currentStream) {
                ensureLocalTracks(pc, currentStream, data.from);
            }

            const remoteOffer = new RTCSessionDescription(data.offer);

            // Glare handling: if we already made an offer, roll it back before accepting remote offer.
            if (pc.signalingState === 'have-local-offer') {
                try {
                    await pc.setLocalDescription({ type: 'rollback' });
                } catch (rollbackError) {
                    console.warn('[Meeting] Rollback failed for', data.from, rollbackError);
                }
            }

            if (pc.signalingState === 'stable') {
                await pc.setRemoteDescription(remoteOffer);
            } else if (pc.signalingState === 'have-remote-offer') {
                const sameOffer = pc.currentRemoteDescription?.sdp === remoteOffer.sdp;
                if (sameOffer) {
                    console.log('[Meeting] Duplicate offer ignored from:', data.from);
                    return;
                }
                await pc.setRemoteDescription(remoteOffer);
            } else {
                console.log('[Meeting] Ignoring incoming offer in signaling state:', pc.signalingState);
                return;
            }

            lastRemoteOfferSdp.current[data.from] = incomingSdp;

            // Process buffered candidates
            if (pendingCandidates.current[data.from]) {
                for (const candidate of pendingCandidates.current[data.from]) {
                    await pc.addIceCandidate(new RTCIceCandidate(candidate));
                }
                delete pendingCandidates.current[data.from];
            }

            if (pc.signalingState !== 'have-remote-offer') {
                console.log('[Meeting] Skipping answer, expected have-remote-offer but got:', pc.signalingState);
                return;
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.current.emit('answer_call', {
                to: data.from,
                from: myId,
                answer: answer
            });

            setPeers(prev => ({
                ...prev,
                [data.from]: {
                    ...(prev[data.from] || {}),
                    name: prev[data.from]?.name || data.caller_name || 'Participant'
                }
            }));
        } catch (err) {
            console.error('Failed to handle incoming join', err);
        } finally {
            incomingOfferInProgress.current[data.from] = false;
        }
    };

    const handleCallAnswered = async (data) => {
        try {
            const pc = peerConnections.current[data.from];
            if (pc) {
                if (pc.signalingState !== 'have-local-offer') {
                    console.log('[Meeting] Ignoring answer in signaling state:', pc.signalingState);
                    return;
                }
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

                if (pendingCandidates.current[data.from]) {
                    for (const candidate of pendingCandidates.current[data.from]) {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                    delete pendingCandidates.current[data.from];
                }
            }
        } catch (err) {
            console.error('Failed to set remote answer', err);
        }
    };

    const handleIceCandidate = async (data) => {
        try {
            const pc = peerConnections.current[data.from];
            if (pc && pc.remoteDescription) {
                await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                if (!pendingCandidates.current[data.from]) {
                    pendingCandidates.current[data.from] = [];
                }
                pendingCandidates.current[data.from].push(data.candidate);
            }
        } catch (err) {
            console.error('Failed to add candidate', err);
        }
    };

    const removePeer = (userId) => {
        if (disconnectTimers.current[userId]) {
            clearTimeout(disconnectTimers.current[userId]);
            delete disconnectTimers.current[userId];
        }
        if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
        }
        if (remoteStreams.current[userId]) {
            remoteStreams.current[userId].getTracks().forEach((track) => track.stop());
            delete remoteStreams.current[userId];
        }
        setPeers(prev => {
            const newPeers = { ...prev };
            delete newPeers[userId];
            return newPeers;
        });
    };

    const fetchAvailableEmployees = async () => {
        try {
            setLoadingEmployees(true);
            const employees = await api.get('/employees');
            setAvailableEmployees(employees || []);
        } catch (error) {
            console.error('Error fetching available employees:', error);
            alert('Failed to load available employees');
        } finally {
            setLoadingEmployees(false);
        }
    };

    const handleAddMember = async (employeeId, employeeName) => {
        try {
            setAddingMemberId(employeeId);
            console.log('[Meeting] Adding member:', employeeId, employeeName);
            const response = await api.post(`/meetings/${id}/add-participant`, {
                employee_id: employeeId 
            });

            setChatMessages(prev => ([
                ...prev,
                {
                    sender: 'System',
                    content: response?.message || `${employeeName} has been invited to this meeting.`,
                    time: new Date()
                }
            ]));
            
            // Refresh meeting details to update participants
            await fetchMeetingDetails();
            
            // Refresh available employees list
            await fetchAvailableEmployees();
            
            // Notify via socket
            socket.current?.emit('member_added', {
                meetingId: id,
                newMemberId: employeeId,
                newMemberName: employeeName
            });
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Failed to add member to meeting');
        } finally {
            setAddingMemberId(null);
        }
    };

    const handleLeaveMeeting = async () => {
        try {
            socket.current?.emit('leave_room', {
                roomId: `meeting_${id}`,
                userId: myId
            });
            teardownMeetingSession();

            // Only allow creator to end, others just navigate
            if (meeting?.created_by === myId) {
                if (window.confirm('You are the organizer. End this meeting for everyone?')) {
                    await api.put(`/meetings/${id}/end`);
                }
            }
            navigate(`${roleBasePath}/chat`);
        } catch (error) {
            console.error('Error leaving meeting:', error);
            navigate(`${roleBasePath}/chat`);
        }
    };

    const fetchMeetingDetails = async () => {
        setLoading(true);
        setMeeting(null);
        try {
            const data = await api.get(`/meetings/${id}`);
            if (data.status === 'completed') {
                alert('This call has already ended.');
                navigate(`${roleBasePath}/meetings`);
                return;
            }
            setMeeting(data);
        } catch (error) {
            console.error('Error fetching meeting:', error);
            navigate(`${roleBasePath}/meetings`);
        } finally {
            setLoading(false);
        }
    };

    const handleSendChat = (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const msg = {
            sender: user?.full_name || 'Me',
            content: newMessage,
            time: new Date()
        };
        socket.current.emit('send_meeting_chat', { roomId: `meeting_${id}`, ...msg });
        setChatMessages(prev => [...prev, msg]);
        setNewMessage('');
    };

    if (loading) return <>
        <div style={{ height: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Loader2 size={40} className="animate-spin" color="var(--primary)" />
        </div>
    </>;

    return (
        <>
            <div style={{ height: 'calc(100vh - 140px)', display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px' }}>
                {/* Main Meeting Stage */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* Video Grid */}
                    <div style={{ flex: 1, background: '#0F172A', borderRadius: '16px', padding: '24px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', position: 'relative' }}>

                        {/* Self Tile */}
                        <div style={{
                            background: '#1E293B',
                            borderRadius: '12px',
                            overflow: 'hidden',
                            position: 'relative',
                            aspectRatio: '16/9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--primary)'
                        }}>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: isCamOff ? 'none' : 'block',
                                    transform: 'scaleX(-1)'
                                }}
                            />
                            {isCamOff && (
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: '700', margin: '0 auto 12px' }}>
                                        {user?.full_name?.charAt(0) || 'U'}
                                    </div>
                                    <p style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>Camera is Off</p>
                                </div>
                            )}
                            <p style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                                {isMuted ? <MicOff size={12} color="#EF4444" /> : <Mic size={12} />}
                                You (Presenter)
                            </p>
                        </div>

                        {/* Remote Participant Tiles */}
                        {Object.entries(peers).map(([peerId, peer]) => (
                            <div key={peerId} style={{
                                background: '#1E293B',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                position: 'relative',
                                aspectRatio: '16/9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {peer.stream ? (
                                    <video
                                        autoPlay
                                        playsInline
                                        ref={el => {
                                            if (el && peer.stream) {
                                                const trackCount = peer.stream.getTracks().length;
                                                const audioCount = peer.stream.getAudioTracks().length;
                                                const videoCount = peer.stream.getVideoTracks().length;
                                                console.log(`[Meeting] Setting video srcObject for ${peerId}: stream has ${trackCount} tracks (${audioCount} audio, ${videoCount} video)`);
                                                
                                                if (el.srcObject !== peer.stream) {
                                                    el.srcObject = peer.stream;
                                                }
                                                el.play().catch(e => {
                                                    if (e.name !== 'AbortError') {
                                                        console.error('[Meeting] Remote playback failed:', e);
                                                    }
                                                });
                                            }
                                        }}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#475569', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>
                                            {peer.name?.charAt(0) || 'P'}
                                        </div>
                                        <p style={{ color: '#94A3B8', fontSize: '13px' }}>{peer.name}</p>
                                    </div>
                                )}

                                {/* Hidden Audio Element for reliable audio playback */}
                                {peer.stream && (
                                    <audio
                                        autoPlay
                                        ref={el => {
                                            if (el && peer.stream) {
                                                const audioTracks = peer.stream.getAudioTracks();
                                                console.log(`[Meeting] Setting audio srcObject for ${peerId}: stream has ${audioTracks.length} audio tracks`);
                                                
                                                if (el.srcObject !== peer.stream) {
                                                    el.srcObject = peer.stream;
                                                }
                                                el.play().catch(e => console.error('[Meeting] Audio playback failed:', e));
                                            }
                                        }}
                                    />
                                )}

                                <p style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.5)', color: 'white', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', zIndex: 10 }}>
                                    <Mic size={12} />
                                    {peer.name || 'Participant'}
                                </p>
                            </div>
                        ))}

                        {/* No participants overlay */}
                        {Object.keys(peers).length === 0 && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#64748B' }}>
                                <Users size={48} style={{ opacity: 0.2, marginBottom: '16px' }} />
                                <p>Waiting for participants to join...</p>
                            </div>
                        )}
                    </div>

                    {/* Toolbar */}
                    <div style={{ background: '#1E293B', padding: '16px 32px', borderRadius: '16px', display: 'flex', justifyContent: 'center', gap: '16px', color: 'white' }}>
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', border: 'none', background: isMuted ? '#EF4444' : '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {isMuted ? <MicOff size={22} /> : <Mic size={22} />}
                        </button>
                        <button
                            onClick={() => setIsCamOff(!isCamOff)}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', border: 'none', background: isCamOff ? '#EF4444' : '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            {isCamOff ? <VideoOff size={22} /> : <Camera size={22} />}
                        </button>
                        <button
                            onClick={() => setIsSharing(!isSharing)}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', border: 'none', background: isSharing ? 'var(--primary)' : '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Monitor size={22} />
                        </button>
                        <button
                            onClick={() => setIsRecording(!isRecording)}
                            style={{ width: '48px', height: '48px', borderRadius: '12px', border: 'none', background: isRecording ? '#EF4444' : '#334155', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                            <Disc size={22} className={isRecording ? 'animate-pulse' : ''} />
                        </button>
                        <div style={{ width: '1px', background: '#475569', margin: '0 8px' }}></div>
                        <button
                            onClick={handleLeaveMeeting}
                            style={{ padding: '0 24px', height: '48px', borderRadius: '12px', border: 'none', background: '#F59E0B', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}
                        >
                            <PhoneOff size={22} />
                            Leave
                        </button>
                        <button
                            onClick={async () => {
                                if (window.confirm('Are you sure you want to end this call?')) {
                                    try {
                                        await api.put(`/meetings/${id}/end`);
                                        navigate(`${roleBasePath}/meetings`);
                                    } catch (err) {
                                        console.error('Failed to end call', err);
                                        navigate(`${roleBasePath}/meetings`);
                                    }
                                }
                            }}
                            style={{ padding: '0 24px', height: '48px', borderRadius: '12px', border: 'none', background: '#EF4444', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700' }}
                        >
                            <PhoneOff size={22} />
                            End Call
                        </button>
                    </div>
                </div>

                {/* Sidebar (List/Chat) */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0' }}>
                    <div style={{ display: 'flex', background: '#F8FAFC', padding: '4px' }}>
                        <button
                            onClick={() => setSidebarTab('participants')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                background: sidebarTab === 'participants' ? 'white' : 'transparent',
                                color: sidebarTab === 'participants' ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: '700',
                                fontSize: '13px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <Users size={16} />
                            People ({Object.keys(peers).length + 1})
                        </button>
                        <button
                            onClick={() => setSidebarTab('chat')}
                            style={{
                                flex: 1,
                                padding: '10px',
                                border: 'none',
                                background: sidebarTab === 'chat' ? 'white' : 'transparent',
                                color: sidebarTab === 'chat' ? 'var(--primary)' : 'var(--text-muted)',
                                fontWeight: '700',
                                fontSize: '13px',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                cursor: 'pointer'
                            }}
                        >
                            <MessageSquare size={16} />
                            Live Chat
                        </button>
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto' }}>
                        {sidebarTab === 'participants' ? (
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <button
                                    onClick={() => {
                                        fetchAvailableEmployees();
                                        setShowAddMembersModal(true);
                                    }}
                                    style={{ padding: '10px 16px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    <Users size={14} />
                                    Add Members
                                </button>
                                
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '8px', background: '#EEF2FF' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                                        {user?.full_name?.charAt(0)}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '13px', fontWeight: '800' }}>{user?.full_name} (You)</p>
                                        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Organizer</p>
                                    </div>
                                </div>

                                {Object.entries(peers).map(([peerId, peer]) => (
                                    <div key={peerId} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                                            {peer.name?.charAt(0) || 'P'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '13px', fontWeight: '700' }}>{peer.name || 'Participant'}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Participant</p>
                                        </div>
                                        <Mic size={14} color={peer.stream ? "var(--primary)" : "#94A3B8"} />
                                    </div>
                                ))}

                                {meeting?.participants?.filter(p => {
                                    const participantId = getSignalUserId(p);
                                    return participantId !== myId && !peers[participantId];
                                }).map((p, idx) => (
                                    <div key={`invited-${idx}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', opacity: 0.8 }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                                            {p.full_name?.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: '13px', fontWeight: '700' }}>{p.full_name}</p>
                                            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not Joined</p>
                                        </div>
                                        <button
                                            onClick={() => handleAddMember(getSignalUserId(p), p.full_name)}
                                            style={{
                                                padding: '5px 10px',
                                                borderRadius: '6px',
                                                border: '1px solid var(--border)',
                                                background: 'var(--input-bg)',
                                                color: 'var(--text-main)',
                                                fontSize: '11px',
                                                fontWeight: '700',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            Invite Again
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                                    {chatMessages.map((m, idx) => (
                                        <div key={idx} style={{ background: '#F1F5F9', padding: '10px', borderRadius: '8px', maxWidth: '90%' }}>
                                            <p style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)', marginBottom: '4px' }}>{m.sender}</p>
                                            <p style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.4' }}>{m.content}</p>
                                            <p style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'right', marginTop: '4px' }}>
                                                {new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div style={{ padding: '16px', borderTop: '1px solid var(--border)' }}>
                                    <form onSubmit={handleSendChat} style={{ display: 'flex', gap: '8px' }}>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="Say something..."
                                            style={{ fontSize: '13px', borderRadius: '8px' }}
                                            value={newMessage}
                                            onChange={(e) => setNewMessage(e.target.value)}
                                        />
                                        <button type="submit" style={{ width: '40px', height: '40px', borderRadius: '8px', border: 'none', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                                            <Send size={18} />
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Members Modal */}
            {showAddMembersModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div className="card" style={{ width: '90%', maxWidth: '500px', maxHeight: '600px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '800' }}>Add Members</h3>
                            <button
                                onClick={() => setShowAddMembersModal(false)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '0', color: 'var(--text-muted)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {loadingEmployees ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>Loading...</p>
                            ) : availableEmployees.length === 0 ? (
                                <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>All employees are already in this meeting</p>
                            ) : (
                                availableEmployees.map(emp => (
                                    <div 
                                        key={getSignalUserId(emp)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid var(--border)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '14px' }}>
                                                {emp.full_name?.charAt(0)}
                                            </div>
                                            <div>
                                                <p style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-main)' }}>{emp.full_name}</p>
                                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{emp.email}</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => !meeting?.participants?.find(p => p.id === emp.id || p.employee_uuid === emp.id) && handleAddMember(emp.id, emp.full_name)}
                                            disabled={addingMemberId === emp.id || !!meeting?.participants?.find(p => p.id === emp.id || p.employee_uuid === emp.id) || meeting?.created_by === emp.id}
                                            style={{ 
                                                padding: '6px 12px', 
                                                borderRadius: '6px', 
                                                border: 'none', 
                                                background: (meeting?.participants?.find(p => p.id === emp.id || p.employee_uuid === emp.id) || meeting?.created_by === emp.id) ? '#94A3B8' : 'var(--primary)', 
                                                color: 'white', 
                                                fontSize: '12px', 
                                                fontWeight: '700', 
                                                cursor: (addingMemberId === emp.id || !!meeting?.participants?.find(p => p.id === emp.id || p.employee_uuid === emp.id) || meeting?.created_by === emp.id) ? 'not-allowed' : 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '4px'
                                            }}
                                        >
                                            {addingMemberId === emp.id ? (
                                                <>
                                                    <Loader2 size={14} className="animate-spin" />
                                                    Adding...
                                                </>
                                            ) : (meeting?.participants?.find(p => p.id === emp.id || p.employee_uuid === emp.id) || meeting?.created_by === emp.id) ? (
                                                'Added'
                                            ) : (
                                                'Add'
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .animate-pulse {
                    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                }
            `}</style>
        </>
    );
};

export default MeetingRoomPage;
