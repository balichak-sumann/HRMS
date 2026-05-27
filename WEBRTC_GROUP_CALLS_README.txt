GROUP VIDEO CALLS - WEBRTC IMPLEMENTATION GUIDE
==============================================

OVERVIEW
--------
This project implements group video calling using a Full-Mesh WebRTC architecture 
with Socket.IO for signaling. Each participant establishes a direct peer-to-peer 
connection with every other participant in the meeting.


ARCHITECTURE
------------

     User A          User B          User C
    (Host)          (Joiner)        (Joiner)
       |               |               |
       |<-- WebRTC -->|<-- WebRTC -->|
       |               |               |
       |------+--------+---------------|
              |
              v
       +--------------+
       |  Socket.IO   |  Signaling Server
       |   (Node.js)  |  (No media relay)
       +--------------+

Full-Mesh Topology:
- Each user creates N-1 peer connections (where N = total participants)
- Media flows directly between browsers (no server relay)
- Server only handles signaling (offer/answer/ICE candidates)


TECH STACK
----------

Component          Technology         Purpose
---------          ----------         -------
Signaling          Socket.IO 4.8+     Exchange SDP offers/answers and ICE candidates
Media Transport    WebRTC (Native)    Peer-to-peer audio/video streaming
NAT Traversal      STUN/TURN servers  Handle users behind firewalls/routers
Frontend           React 19           UI and WebRTC client logic
Backend            Node.js + Express  Socket.IO signaling server


HOW IT WORKS
------------

1. JOINING A MEETING

   1. User opens meeting room page
   2. Get local media: navigator.mediaDevices.getUserMedia()
   3. Connect to Socket.IO server
   4. Emit 'join_room' with roomId and user info
   5. Server adds user to Socket.IO room


2. ESTABLISHING PEER CONNECTIONS

   When a new user joins, the existing participant initiates the call:

   Existing User (A)                    New User (B)
        |
        |-- create RTCPeerConnection --->|
        |-- add local tracks ------------>|
        |-- createOffer() -------------->|
        |-- setLocalDescription(offer)->|
        |-- emit 'call_user' {offer} ---->| (via Socket.IO)
        |                                |
        |<-------------------------------|-- emit 'answer_call' {answer}
        |<-- setRemoteDescription(answer)|
        |                                |
        <-- Exchange ICE candidates --->|
        <-- Media flows directly -------->|


3. HANDLING LATE JOINERS

   User A (already in room)            User C (joins late)
        |                                  |
        |<----- 'user_joined' event ------|
        |                                  |
        |-- Create new peer connection --->| to User C
        |-- Initiate call ---------------->|


KEY FILES
---------

server/
  index.js                    - Socket.IO signaling events

src/
  context/
    SocketContext.jsx           - Global socket connection & call state
  components/
    Chat/
      CallModal.jsx             - 1-1 call modal with WebRTC
  pages/
    ChatPage.jsx                - Group chat (initiates meetings)
    MeetingRoomPage.jsx         - Full group video call implementation


CORE WEBRTC FUNCTIONS
---------------------

CREATE PEER CONNECTION

const createPeerConnection = (userId) => {
    const pc = new RTCPeerConnection({
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'turn:your-server.com:443', username: 'x', credential: 'y' }
        ]
    });

    // Send ICE candidates to peer
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            socket.emit('ice_candidate', { to: userId, candidate: event.candidate });
        }
    };

    // Receive remote media
    pc.ontrack = (event) => {
        const remoteStream = event.streams[0];
        // Display remote video
    };

    // Add local tracks
    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    return pc;
};


SIGNALING EVENTS (Socket.IO)

Event          Direction          Payload                    Purpose
-----          ---------          -------                    -------
call_user      A -> Server -> B   {to, from, offer, type}    Send connection offer
answer_call    B -> Server -> A   {to, from, answer}         Accept offer
ice_candidate  Both directions    {to, from, candidate}      Exchange network info
user_joined    Server -> Room     {userId, name}             Notify new participant
user_left      Server -> Room     {userId}                   Participant left


IMPORTANT IMPLEMENTATION DETAILS
------------------------------

1. ICE CANDIDATE BUFFERING

   // Buffer candidates if remote description not ready yet
   if (!pc.remoteDescription) {
       pendingCandidates[userId].push(candidate);
   } else {
       await pc.addIceCandidate(new RTCIceCandidate(candidate));
   }

   // Apply buffered candidates after setRemoteDescription
   for (const candidate of pendingCandidates[userId]) {
       await pc.addIceCandidate(new RTCIceCandidate(candidate));
   }


2. SIGNALING STATE MANAGEMENT

   // Check state before creating offers
   if (pc.signalingState !== 'stable') {
       console.log('Skipping offer, signaling not stable');
       return;
   }

   // Handle glare (both sending offers simultaneously)
   if (pc.signalingState === 'have-local-offer') {
       await pc.setLocalDescription({ type: 'rollback' });
   }


3. DUPLICATE OFFER PREVENTION

   // Track last SDP to ignore duplicate offers
   if (lastRemoteOfferSdp[userId] === incomingSdp) {
       return; // Already processed this offer
   }
   lastRemoteOfferSdp[userId] = incomingSdp;


4. CONNECTION LOSS DETECTION

   pc.oniceconnectionstatechange = () => {
       if (pc.iceConnectionState === 'disconnected') {
           // Wait 8 seconds before removing (allows reconnection)
           setTimeout(() => removePeer(userId), 8000);
       }
   };


LIMITATIONS & SCALING
--------------------

FULL-MESH (Current Implementation)

Good for: 2-6 participants

Limitations:
- Upload bandwidth: Each user uploads to (N-1) peers
- CPU usage increases with each connection
- Browser limits: ~8-10 concurrent peer connections


WHEN TO UPGRADE TO SFU

For 10+ participants, use an SFU (Selective Forwarding Unit):
- mediasoup (Node.js/C++)
- Janus (C)
- Twilio Video (managed service)

SFU Benefits:
- Each user sends 1 stream only (to server)
- Server forwards to others
- Massive bandwidth savings
- Supports 100+ participants


QUICK START
-----------

1. INSTALL DEPENDENCIES

   Frontend:  npm install socket.io-client
   Backend:   npm install socket.io


2. SETUP BACKEND (Node.js)

   Add Socket.IO events to your Express server (see server/index.js)


3. SETUP FRONTEND (React)

   Implement Socket Context and Meeting Room Component
   (see src/context/SocketContext.jsx and src/pages/MeetingRoomPage.jsx)


4. CONFIGURE ICE SERVERS

   Get free TURN server credentials from:
   - Metered.ca (used in this project)
   - Twilio STUN/TURN
   - Coturn (self-hosted)


TESTING CHECKLIST
-----------------

[ ] 2 users can connect (basic P2P)
[ ] 3+ users in same room (full mesh)
[ ] User can join after call started (late joiner)
[ ] User can leave and others continue
[ ] Audio/Video mute/unmute works
[ ] Works across different networks (NAT traversal)
[ ] Mobile browsers supported


REFERENCES
----------

- WebRTC MDN Docs: https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API
- Socket.IO Documentation: https://socket.io/docs/
- WebRTC Signaling: https://webrtc.org/getting-started/signaling


NOTE: This is a simplified explanation. For production use, consider adding:
- Connection quality monitoring
- Automatic bitrate adaptation
- Screen sharing
- Recording capabilities
- End-to-end encryption (insertable streams)
