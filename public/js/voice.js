class VoiceChat {
    constructor() {
        this.localStream = null;
        this.peerConnections = new Map();
        this.isInVoice = false;
        this.isMuted = false;
        this.usersInVoice = new Set();
        this.makingOffer = new Map();
        this.ignoreOffer = new Map();
        this.pendingCandidates = new Map();

        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.initializeUI();
        this.setupEchoListeners();
    }

    initializeUI() {
        const voiceButton = document.getElementById('joinVoiceBtn');
        const muteButton = document.getElementById('muteBtn');
        const leaveButton = document.getElementById('leaveVoiceBtn');

        if (voiceButton) {
            voiceButton.addEventListener('click', () => this.joinVoice());
        }

        if (muteButton) {
            muteButton.addEventListener('click', () => this.toggleMute());
        }

        if (leaveButton) {
            leaveButton.addEventListener('click', () => this.leaveVoice());
        }
    }

    setupEchoListeners() {
        window.Echo.join('voice-channel')
            .here(users => {})
            .joining(user => {})
            .leaving(user => {
                this.usersInVoice.delete(user.id);
                this.closePeerConnection(user.id);
            })
            .listen('.voice-joined', (data) => {
                this.usersInVoice.add(data.user_id);

                if (this.isInVoice && data.user_id !== current_user_id) {
                    const polite = this.isPolite(data.user_id);
                    if (polite) {
                        this.closePeerConnection(data.user_id);

                        setTimeout(() => {
                            this.initiateConnection(data.user_id);
                        }, 500);
                    }
                }
            })
            .listen('.voice-left', (data) => {
                this.usersInVoice.delete(data.user_id);
                this.closePeerConnection(data.user_id);
            })
            .listen('.voice-signal', (data) => {
                if (data.target_user_id === current_user_id) {
                    this.handleSignal(data);
                }
            });
    }

    isPolite(other_user_id) {
        return current_user_id > other_user_id;
    }

    async joinVoice() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            this.isInVoice = true;
            this.updateUI();

            this.broadcastVoiceJoined();

            this.usersInVoice.forEach(user_id => {
                if (user_id !== current_user_id && this.isPolite(user_id)) {
                    this.closePeerConnection(user_id);
                    this.initiateConnection(user_id);
                }
            });
        } catch (error) {
            alert('Could not access microphone. Please check permissions.');
        }
    }

    broadcastVoiceJoined() {
        fetch('/voice/joined', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({})
        }).catch(error => {});
    }

    broadcastVoiceLeft() {
        fetch('/voice/left', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({})
        }).catch(error => {});
    }

    async initiateConnection(user_id) {
        if (this.peerConnections.has(user_id)) {
            return;
        }

        const pc = this.createPeerConnection(user_id);

        try {
            this.makingOffer.set(user_id, true);

            const offer = await pc.createOffer({
                offerToReceiveAudio: true
            });

            await pc.setLocalDescription(offer);

            this.sendSignal(user_id, 'offer', {
                type: offer.type,
                sdp: btoa(offer.sdp)
            });
        } catch (error) {
            this.closePeerConnection(user_id);
        } finally {
            this.makingOffer.set(user_id, false);
        }
    }

    createPeerConnection(user_id) {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(user_id, pc);
        this.pendingCandidates.set(user_id, []);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        pc.ontrack = (event) => {
            let remoteAudio = document.getElementById(`remote-audio-${user_id}`);
            if (!remoteAudio) {
                remoteAudio = new Audio();
                remoteAudio.id = `remote-audio-${user_id}`;
                remoteAudio.autoplay = true;
                document.body.appendChild(remoteAudio);
            }

            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => {});
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(user_id, 'ice-candidate', {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed') {
                this.closePeerConnection(user_id);

                if (this.isInVoice && this.usersInVoice.has(user_id) && this.isPolite(user_id)) {
                    setTimeout(() => {
                        this.initiateConnection(user_id);
                    }, 3000);
                }
            }
        };

        return pc;
    }

    async handleSignal(data) {
        const { user_id, type, signal } = data;

        if (!this.isInVoice) {
            return;
        }

        try {
            if (type === 'offer') {
                await this.handleOffer(user_id, signal);
            } else if (type === 'answer') {
                await this.handleAnswer(user_id, signal);
            } else if (type === 'ice-candidate') {
                await this.handleIceCandidate(user_id, signal);
            }
        } catch (error) {}
    }

    async handleOffer(user_id, signal) {
        const polite = this.isPolite(user_id);
        let pc = this.peerConnections.get(user_id);

        const offerCollision = pc &&
            (pc.signalingState !== 'stable' || this.makingOffer.get(user_id) === true);

        const ignoreOffer = !polite && offerCollision;

        if (ignoreOffer) {
            return;
        }

        if (offerCollision) {
            this.closePeerConnection(user_id);
            pc = null;
        }

        if (!pc) {
            pc = this.createPeerConnection(user_id);
        }

        const offerDesc = new RTCSessionDescription({
            type: signal.type,
            sdp: atob(signal.sdp)
        });

        await pc.setRemoteDescription(offerDesc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.sendSignal(user_id, 'answer', {
            type: answer.type,
            sdp: btoa(answer.sdp)
        });

        await this.processPendingCandidates(user_id);
    }

    async handleAnswer(user_id, signal) {
        const pc = this.peerConnections.get(user_id);

        if (!pc) {
            return;
        }

        if (pc.signalingState !== 'have-local-offer') {
            return;
        }

        const answerDesc = new RTCSessionDescription({
            type: signal.type,
            sdp: atob(signal.sdp)
        });

        await pc.setRemoteDescription(answerDesc);

        await this.processPendingCandidates(user_id);
    }

    async handleIceCandidate(user_id, signal) {
        const pc = this.peerConnections.get(user_id);

        if (!pc) {
            return;
        }

        if (!pc.remoteDescription || !pc.remoteDescription.type) {
            const pending = this.pendingCandidates.get(user_id) || [];
            pending.push(signal);
            this.pendingCandidates.set(user_id, pending);
            return;
        }

        await pc.addIceCandidate(new RTCIceCandidate({
            candidate: signal.candidate,
            sdpMLineIndex: signal.sdpMLineIndex,
            sdpMid: signal.sdpMid
        }));
    }

    async processPendingCandidates(user_id) {
        const pending = this.pendingCandidates.get(user_id) || [];
        const pc = this.peerConnections.get(user_id);

        if (!pc || pending.length === 0) return;

        for (const signal of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate({
                    candidate: signal.candidate,
                    sdpMLineIndex: signal.sdpMLineIndex,
                    sdpMid: signal.sdpMid
                }));
            } catch (error) {}
        }

        this.pendingCandidates.set(user_id, []);
    }

    sendSignal(target_user_id, type, signal) {
        fetch('/voice/signal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                target_user_id: target_user_id,
                type: type,
                signal: signal
            })
        }).catch(error => {});
    }

    closePeerConnection(user_id) {
        const pc = this.peerConnections.get(user_id);
        if (pc) {
            pc.close();
            this.peerConnections.delete(user_id);
        }

        this.makingOffer.delete(user_id);
        this.ignoreOffer.delete(user_id);
        this.pendingCandidates.delete(user_id);

        const audio = document.getElementById(`remote-audio-${user_id}`);
        if (audio) audio.remove();
    }

    leaveVoice() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.peerConnections.forEach((pc, user_id) => {
            this.closePeerConnection(user_id);
        });

        this.peerConnections.clear();
        this.makingOffer.clear();
        this.ignoreOffer.clear();
        this.pendingCandidates.clear();

        this.isInVoice = false;
        this.isMuted = false;

        this.broadcastVoiceLeft();
        this.updateUI();
    }

    toggleMute() {
        if (!this.localStream) return;

        this.isMuted = !this.isMuted;
        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        this.updateUI();
    }

    updateUI() {
        const joinBtn = document.getElementById('joinVoiceBtn');
        const muteBtn = document.getElementById('muteBtn');
        const leaveBtn = document.getElementById('leaveVoiceBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');

        if (joinBtn) joinBtn.style.display = this.isInVoice ? 'none' : 'flex';

        if (muteBtn) {
            muteBtn.style.display = this.isInVoice ? 'flex' : 'none';
            muteBtn.innerHTML = this.isMuted
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
            muteBtn.classList.toggle('muted', this.isMuted);
        }

        if (leaveBtn) leaveBtn.style.display = this.isInVoice ? 'flex' : 'none';
        if (voiceIndicator) voiceIndicator.style.display = this.isInVoice ? 'block' : 'none';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});
