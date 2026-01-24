class VoiceChat {
    constructor() {
        this.localStream = null;
        this.peerConnections = new Map();
        this.currentChannelId = null;
        this.isMuted = false;
        this.channelUsers = new Map();
        this.userMuteStatus = new Map();
        this.makingOffer = new Map();
        this.ignoreOffer = new Map();
        this.pendingCandidates = new Map();
        this.heartbeatInterval = null;

        this.iceServers = {
            iceServers: [
                {urls: 'stun:stun.l.google.com:19302'},
                {urls: 'stun:stun1.l.google.com:19302'},
                {urls: 'stun:stun2.l.google.com:19302'}
            ]
        };

        this.initializeUI();
        this.setupChannelListeners();
        this.setupBeforeUnload();
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', () => {
            if (this.currentChannelId) {
                navigator.sendBeacon(
                    '/voice/left',
                    new Blob([JSON.stringify({
                        channel_id: this.currentChannelId,
                        _token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    })], {type: 'application/json'})
                );
            }
        });
    }

    initializeUI() {
        document.querySelectorAll('.voice-channel-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const channelId = e.target.closest('.voice-channel').dataset.channelId;
                this.joinChannel(channelId);
            });
        });

        document.querySelectorAll('.voice-channel-leave').forEach(btn => {
            btn.addEventListener('click', () => {
                this.leaveChannel();
            });
        });

        const globalMuteBtn = document.getElementById('muteBtn');
        const globalLeaveBtn = document.getElementById('leaveVoiceBtn');

        if (globalMuteBtn) {
            globalMuteBtn.addEventListener('click', () => this.toggleMute());
        }

        if (globalLeaveBtn) {
            globalLeaveBtn.addEventListener('click', () => this.leaveChannel());
        }
    }

    setupChannelListeners() {
        voices_count.forEach(channelId => {
            const echoChannel = window.Echo.join(`voice-channel-${channelId}`);

            echoChannel.here(users => {
                const userIds = new Set(users.map(u => u.id));
                this.channelUsers.set(channelId, userIds);
                this.loadActiveUsers(channelId);
            });

            echoChannel.joining(user => {
                const users = this.channelUsers.get(channelId) || new Set();
                users.add(user.id);
                this.channelUsers.set(channelId, users);
            });

            echoChannel.leaving(user => {
                this.handleUserLeft(channelId, user.id, user.name);
            });

            echoChannel.listen('.voice-user-joined', (data) => {
                const users = this.channelUsers.get(channelId) || new Set();
                users.add(data.userId);
                this.channelUsers.set(channelId, users);

                this.addUserToChannel(channelId, data.userId, data.userName, data.userAvatar);

                if (this.currentChannelId === channelId && data.userId !== current_user_id) {
                    const polite = this.isPolite(data.userId);

                    if (polite) {
                        setTimeout(() => {
                            this.initiateConnection(data.userId);
                        }, 1000);
                    }
                }
            })
                .listen('.voice-user-left', (data) => {
                    this.handleUserLeft(channelId, data.userId, data.userName);
                })
                .listen('.voice-mute-status', (data) => {
                    this.userMuteStatus.set(data.userId, data.isMuted);
                    this.updateUserMuteUI(channelId, data.userId, data.isMuted);
                })
                .listen('.voice-signal', (data) => {
                    if (this.currentChannelId === channelId && data.targetUserId === current_user_id) {
                        this.handleSignal(data);
                    }
                });
        });
    }

    handleUserLeft(channelId, userId) {
        const users = this.channelUsers.get(channelId) || new Set();
        users.delete(userId);
        this.channelUsers.set(channelId, users);

        this.removeUserFromChannel(channelId, userId);

        if (this.currentChannelId === channelId) {
            this.closePeerConnection(userId);
        }
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.currentChannelId) {
                fetch('/voice/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                    },
                    body: JSON.stringify({
                        channel_id: this.currentChannelId
                    })
                });
            }
        }, 120000);
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    async loadActiveUsers(channelId) {
        try {
            const response = await fetch(`/voice/active-users?channel_id=${channelId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            });

            if (!response.ok) throw new Error();

            const data = await response.json();

            if (Object.values(data.users).length > 0) {
                Object.values(data.users).forEach(user => {
                    if (user.id !== current_user_id) {
                        this.addUserToChannel(channelId, user.id, user.name, user.avatar);
                    }
                });
            }
        } catch {}
    }

    async joinChannel(channelId) {
        channelId = parseInt(channelId);

        if (this.currentChannelId) {
            await this.leaveChannel();
        }

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });

            this.currentChannelId = channelId;
            this.updateChannelActiveState(channelId, true);
            this.updateGlobalUI();

            await this.broadcastJoined(channelId);
            await this.broadcastMuteStatus(channelId);
            this.startHeartbeat();

            setTimeout(() => {
                const users = this.channelUsers.get(channelId) || new Set();
                users.forEach(userId => {
                    if (userId !== current_user_id && this.isPolite(userId)) {
                        this.initiateConnection(userId);
                    }
                });
            }, 1500);
        } catch {
            alert('Could not access microphone. Please check permissions.');
        }
    }

    async leaveChannel() {
        if (!this.currentChannelId) return;

        const channelId = this.currentChannelId;

        this.stopHeartbeat();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.peerConnections.forEach((pc, userId) => {
            this.closePeerConnection(userId);
        });

        this.peerConnections.clear();
        this.makingOffer.clear();
        this.ignoreOffer.clear();
        this.pendingCandidates.clear();

        await this.broadcastLeft(channelId);

        this.updateChannelActiveState(channelId, false);
        this.currentChannelId = null;
        this.updateGlobalUI();
    }

    async toggleMute() {
        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        this.updateGlobalUI();

        if (this.currentChannelId) {
            await this.broadcastMuteStatus(this.currentChannelId);
        }
    }

    isPolite(otherUserId) {
        return current_user_id > otherUserId;
    }

    async initiateConnection(userId) {
        if (this.peerConnections.has(userId)) return;

        const pc = this.createPeerConnection(userId);

        try {
            this.makingOffer.set(userId, true);

            const offer = await pc.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: false
            });

            if (pc.signalingState !== "stable") return;

            await pc.setLocalDescription(offer);

            this.sendSignal(userId, 'offer', {
                type: offer.type,
                sdp: btoa(offer.sdp)
            });
        } catch {
            this.closePeerConnection(userId);
        } finally {
            this.makingOffer.set(userId, false);
        }
    }

    createPeerConnection(userId) {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(userId, pc);
        this.pendingCandidates.set(userId, []);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        pc.ontrack = (event) => {
            let remoteAudio = document.getElementById(`remote-audio-${userId}`);
            if (!remoteAudio) {
                remoteAudio = new Audio();
                remoteAudio.id = `remote-audio-${userId}`;
                remoteAudio.autoplay = true;
                document.body.appendChild(remoteAudio);
            }

            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play();
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                this.sendSignal(userId, 'ice-candidate', {
                    candidate: event.candidate.candidate,
                    sdpMLineIndex: event.candidate.sdpMLineIndex,
                    sdpMid: event.candidate.sdpMid
                });
            }
        };

        pc.oniceconnectionstatechange = () => {
            if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
                this.closePeerConnection(userId);

                const users = this.channelUsers.get(this.currentChannelId) || new Set();
                if (this.currentChannelId && users.has(userId) && this.isPolite(userId)) {
                    setTimeout(() => this.initiateConnection(userId), 3000);
                }
            }
        };

        return pc;
    }

    async handleSignal(data) {
        const {userId, type, signal} = data;
        if (!this.currentChannelId) return;

        try {
            if (type === 'offer') {
                await this.handleOffer(userId, signal);
            } else if (type === 'answer') {
                await this.handleAnswer(userId, signal);
            } else if (type === 'ice-candidate') {
                await this.handleIceCandidate(userId, signal);
            }
        } catch {}
    }

    async handleOffer(userId, signal) {
        const polite = this.isPolite(userId);
        let pc = this.peerConnections.get(userId);

        const offerCollision = pc && (
            this.makingOffer.get(userId) ||
            pc.signalingState !== 'stable'
        );

        const ignoreOffer = !polite && offerCollision;
        if (ignoreOffer) return;

        if (offerCollision && polite) {
            this.closePeerConnection(userId);
            pc = null;
        }

        if (!pc) {
            pc = this.createPeerConnection(userId);
        }

        try {
            const offerDesc = new RTCSessionDescription({
                type: signal.type,
                sdp: atob(signal.sdp)
            });

            await pc.setRemoteDescription(offerDesc);

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            this.sendSignal(userId, 'answer', {
                type: answer.type,
                sdp: btoa(answer.sdp)
            });

            await this.processPendingCandidates(userId);
        } catch {
            this.closePeerConnection(userId);
        }
    }

    async handleAnswer(userId, signal) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;
        if (pc.signalingState !== 'have-local-offer') return;

        try {
            const answerDesc = new RTCSessionDescription({
                type: signal.type,
                sdp: atob(signal.sdp)
            });

            await pc.setRemoteDescription(answerDesc);
            await this.processPendingCandidates(userId);
        } catch {}
    }

    async handleIceCandidate(userId, signal) {
        const pc = this.peerConnections.get(userId);
        if (!pc) return;

        if (!pc.remoteDescription || !pc.remoteDescription.type) {
            const pending = this.pendingCandidates.get(userId) || [];
            pending.push(signal);
            this.pendingCandidates.set(userId, pending);
            return;
        }

        try {
            await pc.addIceCandidate(new RTCIceCandidate({
                candidate: signal.candidate,
                sdpMLineIndex: signal.sdpMLineIndex,
                sdpMid: signal.sdpMid
            }));
        } catch {}
    }

    async processPendingCandidates(userId) {
        const pending = this.pendingCandidates.get(userId) || [];
        const pc = this.peerConnections.get(userId);
        if (!pc || pending.length === 0) return;

        for (const signal of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate({
                    candidate: signal.candidate,
                    sdpMLineIndex: signal.sdpMLineIndex,
                    sdpMid: signal.sdpMid
                }));
            } catch {}
        }
        this.pendingCandidates.set(userId, []);
    }

    sendSignal(targetUserId, type, signal) {
        if (!this.currentChannelId) return;

        fetch('/voice/signal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                channel_id: this.currentChannelId,
                target_user_id: targetUserId,
                type: type,
                signal: signal
            })
        });
    }

    async broadcastJoined(channelId) {
        try {
            const response = await fetch('/voice/joined', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({channel_id: channelId})
            });
            return await response.json();
        } catch {}
    }

    async broadcastLeft(channelId) {
        try {
            await fetch('/voice/left', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({channel_id: channelId})
            });
        } catch {}
    }

    async broadcastMuteStatus(channelId) {
        try {
            await fetch('/voice/mute-status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                },
                body: JSON.stringify({
                    channel_id: channelId,
                    is_muted: this.isMuted
                })
            });
        } catch {}
    }

    closePeerConnection(userId) {
        const pc = this.peerConnections.get(userId);
        if (pc) {
            pc.close();
            this.peerConnections.delete(userId);
        }

        this.makingOffer.delete(userId);
        this.ignoreOffer.delete(userId);
        this.pendingCandidates.delete(userId);

        const audio = document.getElementById(`remote-audio-${userId}`);
        if (audio) audio.remove();
    }

    updateChannelActiveState(channelId, isActive) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        channel.classList.toggle('active', isActive);
    }

    addUserToChannel(channelId, userId, userName, userAvatar) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const usersContainer = channel.querySelector('.voice-channel-users');
        if (!usersContainer) return;

        let userElement = usersContainer.querySelector(`.voice-user[data-user-id="${userId}"]`);
        if (userElement) return;

        userElement = document.createElement('div');
        userElement.className = 'voice-user';
        if (userId === current_user_id) userElement.classList.add('current-user');
        userElement.dataset.userId = userId;

        const isMuted = this.userMuteStatus.get(userId) || (userId === current_user_id && this.isMuted);

        userElement.innerHTML = `
            <div class="voice-user-avatar">
                <img src="${userAvatar}" alt="${userName}">
            </div>
            <span class="voice-user-name">${userName}</span>
            <div class="voice-user-status ${isMuted ? 'muted' : ''}">
                ${isMuted
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
        }
            </div>
        `;

        usersContainer.appendChild(userElement);
        usersContainer.style.display = 'block';
    }

    removeUserFromChannel(channelId, userId) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const userElement = channel.querySelector(`.voice-user[data-user-id="${userId}"]`);
        if (userElement) userElement.remove();

        this.userMuteStatus.delete(userId);

        const usersContainer = channel.querySelector('.voice-channel-users');
        if (usersContainer && usersContainer.children.length === 0) {
            usersContainer.style.display = 'none';
        }
    }

    updateUserMuteUI(channelId, userId, isMuted) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const userElement = channel.querySelector(`.voice-user[data-user-id="${userId}"]`);
        if (!userElement) return;

        const statusElement = userElement.querySelector('.voice-user-status');
        if (!statusElement) return;

        statusElement.classList.toggle('muted', isMuted);
        statusElement.innerHTML = isMuted
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    }

    updateGlobalUI() {
        const muteBtn = document.getElementById('muteBtn');

        if (muteBtn) {
            muteBtn.classList.toggle('muted', this.isMuted);
            muteBtn.innerHTML = this.isMuted
                ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
                : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        }

        if (this.currentChannelId) {
            this.updateUserMuteUI(this.currentChannelId, current_user_id, this.isMuted);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});
