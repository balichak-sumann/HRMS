import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, X, Mic, MicOff, Video, VideoOff, PhoneOff, Loader2 } from 'lucide-react';

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        {
            urls: 'turn:a.relay.metered.ca:80',
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

const CallModal = ({
    isOpen,
    onClose,
    type,
    remoteUser,
    isIncoming,
    incomingOffer,
    socket,
    currentUser
}) => {
    const [callStatus, setCallStatus] = useState(isIncoming ? 'ringing' : 'initializing');
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(type === 'voice');
    const [error, setError] = useState(null);

    const localVideoRef = useRef(null);
    const remoteVideoRef = useRef(null);
    const peerConnection = useRef(null);
    const localStream = useRef(null);
    const pendingCandidates = useRef([]);

    const myId = currentUser?.employee_uuid || currentUser?.id;

    console.log('[CallModal] Init:', { isOpen, myId, remoteUserId: remoteUser?.id, isIncoming });

    // ─── Cleanup helper ──────────────────────────────────────────────
    const cleanup = useCallback(() => {
        if (localStream.current) {
            localStream.current.getTracks().forEach(t => t.stop());
            localStream.current = null;
        }
        if (peerConnection.current) {
            peerConnection.current.close();
            peerConnection.current = null;
        }
        pendingCandidates.current = [];
    }, []);

    // ─── Create PeerConnection with all event handlers ──────────────
    const createPeerConnection = useCallback(() => {
        // If one already exists for this instance, return it
        if (peerConnection.current) return peerConnection.current;

        console.log('[Call] Creating new RTCPeerConnection...');
        const pc = new RTCPeerConnection(configuration);

        pc.ontrack = (event) => {
            console.log('[Call] Remote track received:', event.track.kind, '| streams:', event.streams.length);

            // Ensure we have a stream to work with
            const remoteStream = event.streams[0] || new MediaStream([event.track]);

            if (remoteVideoRef.current) {
                // Only set srcObject if it's not already set to this stream
                if (remoteVideoRef.current.srcObject !== remoteStream) {
                    console.log('[Call] Setting remote srcObject');
                    remoteVideoRef.current.srcObject = remoteStream;
                }

                // Explicitly play the video
                remoteVideoRef.current.play().catch(e => {
                    if (e.name !== 'AbortError') {
                        console.error('[Call] Remote video playback failed:', e);
                    }
                });
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate && socket?.current) {
                console.log('[Call] Sending ICE candidate to:', remoteUser.id, 'from:', myId);
                socket.current.emit('ice_candidate', {
                    to: remoteUser.id,
                    from: myId,
                    candidate: event.candidate
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            console.log('[Call] ICE state change:', pc.iceConnectionState);
            if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
                setCallStatus('connected');
            }
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                console.error('[Call] ICE connection failed/disconnected');
                setError('Connection lost. Please try again.');
                setCallStatus('error');
            }
        };

        peerConnection.current = pc;
        return pc;
    }, [remoteUser, myId, socket]);

    // ─── Get local media stream ─────────────────────────────────────
    const getLocalStream = async () => {
        try {
            if (!navigator.mediaDevices?.getUserMedia) {
                throw new Error('Your browser does not support media access. Make sure you are using HTTPS.');
            }
            const constraints = {
                video: type === 'video' ? { width: 1280, height: 720 } : false,
                audio: true
            };
            console.log('[Call] Requesting media with constraints:', constraints);
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            console.log('[Call] Got local stream. Tracks:', stream.getTracks().map(t => `${t.kind}:${t.enabled}`).join(', '));
            localStream.current = stream;
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
                localVideoRef.current.play().catch(e => console.log('[Call] Local video autoplay issue:', e));
            }
            return stream;
        } catch (err) {
            console.error('[Call] getLocalStream failed:', err);
            if (err.name === 'NotAllowedError') throw new Error('Microphone/Camera permission denied.');
            if (err.name === 'NotFoundError') throw new Error('No Microphone/Camera found on this device.');
            throw err;
        }
    };

    // ─── Outgoing call: get media → create offer → send ─────────────
    const startOutgoingCall = async () => {
        try {
            setCallStatus('requesting_media');
            console.log('[Call] startOutgoingCall: requesting media...');
            const stream = await getLocalStream();

            console.log('[Call] startOutgoingCall: creating peer connection...');
            const pc = createPeerConnection();
            stream.getTracks().forEach(track => {
                console.log('[Call] startOutgoingCall: adding local track:', track.kind);
                pc.addTrack(track, stream);
            });

            console.log('[Call] startOutgoingCall: creating offer...');
            const offer = await pc.createOffer();
            console.log('[Call] startOutgoingCall: setting local description...');
            await pc.setLocalDescription(offer);

            console.log('[Call] Sending call_user event to:', remoteUser.id, 'from:', myId);
            socket.current.emit('call_user', {
                to: remoteUser.id,
                from: myId,
                caller_name: currentUser.full_name || 'Someone',
                offer: offer,
                type: type
            });

            setCallStatus('calling');
        } catch (err) {
            console.error('[Call] Failed to start call:', err);
            setError(err.message);
            setCallStatus('error');
        }
    };

    // ─── Incoming call: accept → get media → answer ─────────────────
    const handleAccept = async () => {
        try {
            setCallStatus('accepting');
            console.log('[Call] handleAccept: accepting call from:', remoteUser.id, 'myId:', myId);
            const stream = await getLocalStream();

            console.log('[Call] handleAccept: creating peer connection for answer...');
            const pc = createPeerConnection();
            stream.getTracks().forEach(track => {
                console.log('[Call] handleAccept: adding local track:', track.kind);
                pc.addTrack(track, stream);
            });

            console.log('[Call] handleAccept: setting remote description from offer...');
            if (!incomingOffer) throw new Error('No incoming offer found');

            await pc.setRemoteDescription(new RTCSessionDescription(incomingOffer));

            // Process any ICE candidates that arrived before we were ready
            console.log(`[Call] handleAccept: processing ${pendingCandidates.current.length} buffered ICE candidates`);
            for (const candidate of pendingCandidates.current) {
                console.log('[Call] handleAccept: adding buffered ICE candidate');
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
            pendingCandidates.current = [];

            console.log('[Call] handleAccept: creating answer...');
            const answer = await pc.createAnswer();
            console.log('[Call] handleAccept: setting local description...');
            await pc.setLocalDescription(answer);

            console.log('[Call] Sending answer_call event back to:', remoteUser.id, 'from:', myId);
            socket.current.emit('answer_call', {
                to: remoteUser.id,
                from: myId,
                answer: answer
            });

            setCallStatus('connected');
        } catch (err) {
            console.error('[Call] Failed to accept call:', err);
            setError(err.message);
            setCallStatus('error');
        }
    };

    // ─── Socket event handlers ──────────────────────────────────────
    const handleCallAnswered = useCallback(async (data) => {
        try {
            console.log('[Call] call_answered received');
            const pc = peerConnection.current;
            if (pc) {
                await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

                // Process any ICE candidates that arrived before the answer
                console.log(`[Call] Processing ${pendingCandidates.current.length} buffered ICE candidates`);
                for (const candidate of pendingCandidates.current) {
                    try {
                        await pc.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.warn('[Call] Error adding buffered candidate:', e);
                    }
                }
                pendingCandidates.current = [];

                setCallStatus('connected');
            }
        } catch (err) {
            console.error('[Call] Error setting remote description:', err);
        }
    }, []);

    const handleIceCandidate = useCallback(async (data) => {
        try {
            if (peerConnection.current && peerConnection.current.remoteDescription) {
                console.log('[Call] Adding ICE candidate');
                await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
            } else {
                // Buffer candidates until remote description is set
                console.log('[Call] Buffering ICE candidate (peer not ready)');
                pendingCandidates.current.push(data.candidate);
            }
        } catch (err) {
            console.error('[Call] Error adding ICE candidate:', err);
        }
    }, []);

    const handleCallEnded = useCallback(() => {
        console.log('[Call] Remote hangup received');
        cleanup();
        onClose();
    }, [cleanup, onClose]);

    // ─── Wire up socket listeners ───────────────────────────────────
    useEffect(() => {
        const currentSocket = socket?.current;
        if (!currentSocket || !isOpen) return;

        console.log('[Call] Attaching socket listeners');
        currentSocket.on('call_answered', handleCallAnswered);
        currentSocket.on('ice_candidate', handleIceCandidate);
        currentSocket.on('call_ended', handleCallEnded);

        return () => {
            console.log('[Call] Detaching socket listeners');
            currentSocket.off('call_answered', handleCallAnswered);
            currentSocket.off('ice_candidate', handleIceCandidate);
            currentSocket.off('call_ended', handleCallEnded);
        };
    }, [isOpen, socket, handleCallAnswered, handleIceCandidate, handleCallEnded]);

    // ─── Auto-start outgoing calls ──────────────────────────────────
    useEffect(() => {
        if (isOpen && !isIncoming) {
            startOutgoingCall();
        }

        return () => {
            cleanup();
        };
    }, [isOpen]);

    // ─── End call button handler ────────────────────────────────────
    const handleHangup = () => {
        if (socket?.current) {
            socket.current.emit('hangup', { to: remoteUser.id });
        }
        cleanup();
        onClose();
    };

    // ─── Media controls ─────────────────────────────────────────────
    const toggleMute = () => {
        if (localStream.current) {
            const audioTrack = localStream.current.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = isMuted; // toggle: if muted, enable; if not, disable
                setIsMuted(!isMuted);
            }
        }
    };

    const toggleVideo = () => {
        if (localStream.current && type === 'video') {
            const videoTrack = localStream.current.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = isVideoOff;
                setIsVideoOff(!isVideoOff);
            }
        }
    };

    // ─── Render ─────────────────────────────────────────────────────
    if (!isOpen) return null;

    const getStatusText = () => {
        switch (callStatus) {
            case 'initializing': return 'Initializing...';
            case 'requesting_media': return 'Requesting Camera/Microphone...';
            case 'calling': return `Calling ${remoteUser.name}...`;
            case 'ringing': return `Incoming call from ${remoteUser.name}`;
            case 'accepting': return 'Connecting...';
            case 'connected': return 'Connected';
            case 'error': return 'Call Failed';
            default: return '';
        }
    };

    const isCallActive = callStatus === 'connected';
    const isRinging = callStatus === 'ringing';

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            backdropFilter: 'blur(10px)'
        }}>
            <div style={{
                width: '90%',
                maxWidth: '800px',
                aspectRatio: '16/9',
                background: '#111',
                borderRadius: '24px',
                overflow: 'hidden',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Remote Video (Large) */}
                <div style={{ flex: 1, position: 'relative', background: '#000' }}>
                    <video
                        ref={remoteVideoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {!isCallActive && (
                        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', padding: '20px', textAlign: 'center' }}>
                            {error ? (
                                <>
                                    <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#EF4444', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                                        <X size={40} />
                                    </div>
                                    <h3 style={{ color: '#EF4444', marginBottom: '10px' }}>Call Error</h3>
                                    <p style={{ color: '#9CA3AF', fontSize: '14px', marginBottom: '20px' }}>{error}</p>
                                    <p style={{ maxWidth: '400px', fontSize: '14px', lineHeight: '1.6', opacity: 0.9 }}>{error}</p>
                                    <button
                                        onClick={handleHangup}
                                        style={{ marginTop: '20px', padding: '10px 24px', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', cursor: 'pointer' }}
                                    >
                                        Close
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '32px', fontWeight: 'bold' }}>
                                        {remoteUser.name?.charAt(0) || '?'}
                                    </div>
                                    <h3>{getStatusText()}</h3>
                                    {(callStatus === 'requesting_media' || callStatus === 'accepting') && (
                                        <p style={{ marginTop: '10px', opacity: 0.7, fontSize: '14px' }}>
                                            <Loader2 style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} className="animate-spin" size={16} />
                                            {callStatus === 'requesting_media' ? 'Please allow camera/microphone access...' : 'Setting up connection...'}
                                        </p>
                                    )}
                                    {callStatus === 'calling' && (
                                        <p style={{ marginTop: '10px', opacity: 0.5, fontSize: '13px' }}>Waiting for answer...</p>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Local Video (Small Overlay) */}
                {type === 'video' && (
                    <div style={{
                        position: 'absolute',
                        top: '20px',
                        right: '20px',
                        width: '180px',
                        height: '110px',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        border: '2px solid rgba(255,255,255,0.2)',
                        background: '#222'
                    }}>
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                        />
                    </div>
                )}

                {/* Controls */}
                <div style={{
                    padding: '30px',
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                    position: 'absolute',
                    bottom: 0,
                    width: '100%'
                }}>
                    {isRinging ? (
                        /* Incoming call: Accept / Reject buttons */
                        <>
                            <button
                                onClick={handleAccept}
                                style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: '#10B981', border: 'none', color: 'white',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <Phone size={28} />
                            </button>
                            <button
                                onClick={handleHangup}
                                style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: '#EF4444', border: 'none', color: 'white',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                <PhoneOff size={28} />
                            </button>
                        </>
                    ) : (
                        /* Active/outgoing call controls */
                        <>
                            <button
                                onClick={toggleMute}
                                style={{
                                    width: '50px', height: '50px', borderRadius: '50%',
                                    background: isMuted ? '#EF4444' : 'rgba(255,255,255,0.2)',
                                    border: 'none', color: 'white', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            >
                                {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                            </button>

                            {type === 'video' && (
                                <button
                                    onClick={toggleVideo}
                                    style={{
                                        width: '50px', height: '50px', borderRadius: '50%',
                                        background: isVideoOff ? '#EF4444' : 'rgba(255,255,255,0.2)',
                                        border: 'none', color: 'white', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}
                                >
                                    {isVideoOff ? <VideoOff size={20} /> : <Video size={20} />}
                                </button>
                            )}

                            <button
                                onClick={handleHangup}
                                style={{
                                    width: '50px', height: '50px', borderRadius: '50%',
                                    background: '#EF4444', border: 'none', color: 'white',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    marginLeft: '20px'
                                }}
                            >
                                <PhoneOff size={20} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallModal;
