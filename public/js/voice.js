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

        this.iceServers = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' }
            ]
        };

        this.initializeUI();
        this.setupChannelListeners();
    }

    initializeUI() {
        document.querySelectorAll('.voice-channel-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const channelId = e.target.closest('.voice-channel').dataset.channelId;
                this.joinChannel(channelId);
            });
        });

        document.querySelectorAll('.voice-channel-leave').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const channelId = e.target.closest('.voice-channel').dataset.channelId;
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
            window.Echo.join(`voice-channel-${channelId}`)
                .here(users => {
                    console.log(`[Channel ${channelId}] .here() - Users already in channel:`, users);
                    this.channelUsers.set(channelId, new Set(users.map(u => u.id)));
                })
                .joining(user => {
                    console.log(`[Channel ${channelId}] .joining() - User joining:`, user);
                    const users = this.channelUsers.get(channelId) || new Set();
                    users.add(user.id);
                    this.channelUsers.set(channelId, users);
                    this.updateChannelUI(channelId);
                })
                .leaving(user => {
                    console.log(`[Channel ${channelId}] .leaving() - User leaving:`, user);
                    const users = this.channelUsers.get(channelId) || new Set();
                    users.delete(user.id);
                    this.channelUsers.set(channelId, users);
                    this.updateChannelUI(channelId);

                    if (this.currentChannelId === channelId) {
                        this.closePeerConnection(user.id);
                    }
                })
                .listen('.voice-user-joined', (data) => {
                    console.log(`[Channel ${channelId}] EVENT .voice-user-joined:`, data);

                    if (this.currentChannelId === channelId) {
                        console.log(`[Channel ${channelId}] Adding user to UI:`, data.userId, data.userName);
                        this.addUserToChannel(channelId, data.userId, data.userName, data.userAvatar);

                        if (data.userId !== current_user_id && this.isPolite(data.userId)) {
                            console.log(`[Channel ${channelId}] Initiating connection to user:`, data.userId);
                            this.closePeerConnection(data.userId);
                            setTimeout(() => {
                                this.initiateConnection(data.userId);
                            }, 500);
                        }
                    }
                })
                .listen('.voice-user-left', (data) => {
                    console.log(`[Channel ${channelId}] EVENT .voice-user-left:`, data);

                    if (this.currentChannelId === channelId) {
                        this.removeUserFromChannel(channelId, data.userId);
                        this.closePeerConnection(data.userId);
                    }
                })
                .listen('.voice-mute-status', (data) => {
                    console.log(`[Channel ${channelId}] EVENT .voice-mute-status:`, data);
                    this.userMuteStatus.set(data.userId, data.isMuted);

                    if (this.currentChannelId === channelId) {
                        this.updateUserMuteUI(channelId, data.userId, data.isMuted);
                    }
                })
                .listen('.voice-signal', (data) => {
                    if (this.currentChannelId === channelId && data.targetUserId === current_user_id) {
                        console.log(`[Channel ${channelId}] EVENT .voice-signal:`, data.type);
                        this.handleSignal(data);
                    }
                });
        });
    }

    async joinChannel(channelId) {
        console.log('=== JOINING VOICE CHANNEL ===');
        console.log('Channel ID:', channelId);
        console.log('Current user ID:', current_user_id);
        console.log('Current user name:', current_user_name);

        if (this.currentChannelId) {
            console.log('Already in channel, leaving first:', this.currentChannelId);
            await this.leaveChannel();
        }

        try {
            console.log('Requesting microphone access...');
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });
            console.log('Microphone access granted');

            this.currentChannelId = channelId;
            console.log('Set currentChannelId to:', channelId);

            const userAvatarElement = document.querySelector('.voice-user[data-user-id="' + current_user_id + '"] .voice-user-avatar img');
            const currentUserAvatar = userAvatarElement ? userAvatarElement.src : '/default-avatar.png';
            console.log('Current user avatar:', currentUserAvatar);

            console.log('Updating channel active state...');
            this.updateChannelActiveState(channelId, true);

            console.log('Adding current user to UI...');
            this.addUserToChannel(channelId, current_user_id, current_user_name, currentUserAvatar);

            console.log('Updating global UI...');
            this.updateGlobalUI();

            console.log('Broadcasting joined event...');
            await this.broadcastJoined(channelId);
            console.log('Broadcast complete');

            const users = this.channelUsers.get(channelId) || new Set();
            console.log('Existing users in channel:', Array.from(users));

            users.forEach(userId => {
                if (userId !== current_user_id && this.isPolite(userId)) {
                    console.log('Initiating connection to existing user:', userId);
                    this.closePeerConnection(userId);
                    this.initiateConnection(userId);
                }
            });

            console.log('=== SUCCESSFULLY JOINED VOICE CHANNEL ===');
        } catch (error) {
            console.error('ERROR joining voice channel:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    async leaveChannel() {
        if (!this.currentChannelId) return;

        console.log('=== LEAVING VOICE CHANNEL ===');
        console.log('Channel ID:', this.currentChannelId);

        const channelId = this.currentChannelId;

        if (this.localStream) {
            console.log('Stopping local stream...');
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        console.log('Closing peer connections...');
        this.peerConnections.forEach((pc, userId) => {
            this.closePeerConnection(userId);
        });

        this.peerConnections.clear();
        this.makingOffer.clear();
        this.ignoreOffer.clear();
        this.pendingCandidates.clear();

        console.log('Broadcasting left event...');
        await this.broadcastLeft(channelId);

        console.log('Updating UI...');
        this.updateChannelActiveState(channelId, false);
        this.currentChannelId = null;
        this.isMuted = false;

        this.updateGlobalUI();
        console.log('=== LEFT VOICE CHANNEL ===');
    }

    async toggleMute() {
        if (!this.localStream || !this.currentChannelId) return;

        this.isMuted = !this.isMuted;
        console.log('Toggled mute:', this.isMuted);

        this.localStream.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });

        this.updateGlobalUI();
        await this.broadcastMuteStatus(this.currentChannelId);
    }

    isPolite(otherUserId) {
        return current_user_id > otherUserId;
    }

    async initiateConnection(userId) {
        if (this.peerConnections.has(userId)) {
            return;
        }

        console.log('Initiating connection to user:', userId);
        const pc = this.createPeerConnection(userId);

        try {
            this.makingOffer.set(userId, true);

            const offer = await pc.createOffer({
                offerToReceiveAudio: true
            });

            await pc.setLocalDescription(offer);
            console.log('Sending offer to user:', userId);

            this.sendSignal(userId, 'offer', {
                type: offer.type,
                sdp: btoa(offer.sdp)
            });
        } catch (error) {
            console.error('Error creating offer for user:', userId, error);
            this.closePeerConnection(userId);
        } finally {
            this.makingOffer.set(userId, false);
        }
    }

    createPeerConnection(userId) {
        console.log('Creating peer connection for user:', userId);
        const pc = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(userId, pc);
        this.pendingCandidates.set(userId, []);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                pc.addTrack(track, this.localStream);
            });
        }

        pc.ontrack = (event) => {
            console.log('Received remote track from user:', userId);
            let remoteAudio = document.getElementById(`remote-audio-${userId}`);
            if (!remoteAudio) {
                remoteAudio = new Audio();
                remoteAudio.id = `remote-audio-${userId}`;
                remoteAudio.autoplay = true;
                document.body.appendChild(remoteAudio);
            }

            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => {});
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
            console.log('ICE connection state for user', userId, ':', pc.iceConnectionState);
            if (pc.iceConnectionState === 'failed') {
                console.log('Connection failed, closing peer connection for user:', userId);
                this.closePeerConnection(userId);

                const users = this.channelUsers.get(this.currentChannelId) || new Set();
                if (this.currentChannelId && users.has(userId) && this.isPolite(userId)) {
                    console.log('Retrying connection in 3 seconds...');
                    setTimeout(() => {
                        this.initiateConnection(userId);
                    }, 3000);
                }
            }
        };

        return pc;
    }

    async handleSignal(data) {
        const { userId, type, signal } = data;

        if (!this.currentChannelId) {
            return;
        }

        try {
            if (type === 'offer') {
                await this.handleOffer(userId, signal);
            } else if (type === 'answer') {
                await this.handleAnswer(userId, signal);
            } else if (type === 'ice-candidate') {
                await this.handleIceCandidate(userId, signal);
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    async handleOffer(userId, signal) {
        console.log('Handling offer from user:', userId);
        const polite = this.isPolite(userId);
        let pc = this.peerConnections.get(userId);

        const offerCollision = pc &&
            (pc.signalingState !== 'stable' || this.makingOffer.get(userId) === true);

        const ignoreOffer = !polite && offerCollision;

        if (ignoreOffer) {
            console.log('Ignoring offer due to collision (impolite)');
            return;
        }

        if (offerCollision) {
            console.log('Offer collision detected, restarting connection');
            this.closePeerConnection(userId);
            pc = null;
        }

        if (!pc) {
            pc = this.createPeerConnection(userId);
        }

        const offerDesc = new RTCSessionDescription({
            type: signal.type,
            sdp: atob(signal.sdp)
        });

        await pc.setRemoteDescription(offerDesc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        console.log('Sending answer to user:', userId);
        this.sendSignal(userId, 'answer', {
            type: answer.type,
            sdp: btoa(answer.sdp)
        });

        await this.processPendingCandidates(userId);
    }

    async handleAnswer(userId, signal) {
        console.log('Handling answer from user:', userId);
        const pc = this.peerConnections.get(userId);

        if (!pc || pc.signalingState !== 'have-local-offer') {
            console.log('Invalid state for answer, ignoring');
            return;
        }

        const answerDesc = new RTCSessionDescription({
            type: signal.type,
            sdp: atob(signal.sdp)
        });

        await pc.setRemoteDescription(answerDesc);
        await this.processPendingCandidates(userId);
    }

    async handleIceCandidate(userId, signal) {
        const pc = this.peerConnections.get(userId);

        if (!pc) {
            return;
        }

        if (!pc.remoteDescription || !pc.remoteDescription.type) {
            const pending = this.pendingCandidates.get(userId) || [];
            pending.push(signal);
            this.pendingCandidates.set(userId, pending);
            return;
        }

        await pc.addIceCandidate(new RTCIceCandidate({
            candidate: signal.candidate,
            sdpMLineIndex: signal.sdpMLineIndex,
            sdpMid: signal.sdpMid
        }));
    }

    async processPendingCandidates(userId) {
        const pending = this.pendingCandidates.get(userId) || [];
        const pc = this.peerConnections.get(userId);

        if (!pc || pending.length === 0) return;

        console.log('Processing', pending.length, 'pending candidates for user:', userId);
        for (const signal of pending) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate({
                    candidate: signal.candidate,
                    sdpMLineIndex: signal.sdpMLineIndex,
                    sdpMid: signal.sdpMid
                }));
            } catch (error) {
                console.error('Error adding pending ICE candidate:', error);
            }
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
        }).catch(error => console.error('Error sending signal:', error));
    }

    broadcastJoined(channelId) {
        return fetch('/voice/joined', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ channel_id: channelId })
        }).catch(error => console.error('Error broadcasting joined:', error));
    }

    broadcastLeft(channelId) {
        return fetch('/voice/left', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ channel_id: channelId })
        }).catch(error => console.error('Error broadcasting left:', error));
    }

    broadcastMuteStatus(channelId) {
        return fetch('/voice/mute-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({
                channel_id: channelId,
                is_muted: this.isMuted
            })
        }).catch(error => console.error('Error broadcasting mute status:', error));
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

    updateChannelUI(channelId) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const count = (this.channelUsers.get(channelId) || new Set()).size;
        const countElement = channel.querySelector('.voice-channel-count');
        if (countElement) {
            countElement.textContent = count;
        }
    }

    updateChannelActiveState(channelId, isActive) {
        console.log('Updating channel active state:', channelId, isActive);
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) {
            console.log('Channel element not found!');
            return;
        }

        if (isActive) {
            channel.classList.add('active');
        } else {
            channel.classList.remove('active');
            const usersContainer = channel.querySelector('.voice-channel-users');
            if (usersContainer) {
                usersContainer.innerHTML = '';
            }
        }
    }

    addUserToChannel(channelId, userId, userName, userAvatar) {
        console.log('>>> addUserToChannel called:', { channelId, userId, userName, userAvatar });

        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) {
            console.log("ERROR: Can't find voice channel with id:", channelId);
            return;
        }

        const usersContainer = channel.querySelector('.voice-channel-users');
        if (!usersContainer) {
            console.log("ERROR: Can't find voice-channel-users container");
            return;
        }

        let userElement = usersContainer.querySelector(`.voice-user[data-user-id="${userId}"]`);

        if (userElement) {
            console.log('User already in UI, skipping');
            return;
        }

        console.log('Creating user element...');
        userElement = document.createElement('div');
        userElement.className = 'voice-user';
        if (userId === current_user_id) {
            userElement.classList.add('current-user');
        }
        userElement.dataset.userId = userId;

        const isMuted = this.userMuteStatus.get(userId) || (userId === current_user_id && this.isMuted);

        userElement.innerHTML = `
            <div class="voice-user-avatar">
                <img src="${userAvatar}" alt="${userName}">
            </div>
            <span class="voice-user-name">${userName}</span>
            <div class="voice-user-status ${isMuted ? 'muted' : ''}">
                ${isMuted ?
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' :
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
        }
            </div>
        `;

        usersContainer.appendChild(userElement);
        console.log('User element added to DOM');
    }

    removeUserFromChannel(channelId, userId) {
        console.log('Removing user from channel:', channelId, userId);
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const userElement = channel.querySelector(`.voice-user[data-user-id="${userId}"]`);
        if (userElement) {
            userElement.remove();
            console.log('User element removed');
        }

        this.userMuteStatus.delete(userId);
    }

    updateUserMuteUI(channelId, userId, isMuted) {
        const channel = document.querySelector(`.voice-channel[data-channel-id="${channelId}"]`);
        if (!channel) return;

        const userElement = channel.querySelector(`.voice-user[data-user-id="${userId}"]`);
        if (!userElement) return;

        const statusElement = userElement.querySelector('.voice-user-status');
        if (!statusElement) return;

        if (isMuted) {
            statusElement.classList.add('muted');
            statusElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        } else {
            statusElement.classList.remove('muted');
            statusElement.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
        }
    }

    updateGlobalUI() {
        const joinBtn = document.getElementById('joinVoiceBtn');
        const muteBtn = document.getElementById('muteBtn');
        const leaveBtn = document.getElementById('leaveVoiceBtn');
        const voiceIndicator = document.getElementById('voiceIndicator');

        const isInVoice = this.currentChannelId !== null;

        if (joinBtn) joinBtn.style.display = isInVoice ? 'none' : 'flex';

        if (muteBtn) {
            muteBtn.style.display = isInVoice ? 'flex' : 'none';
            muteBtn.innerHTML = this.isMuted
                ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
                : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
            muteBtn.classList.toggle('muted', this.isMuted);
        }

        if (leaveBtn) leaveBtn.style.display = isInVoice ? 'flex' : 'none';
        if (voiceIndicator) voiceIndicator.style.display = isInVoice ? 'block' : 'none';

        if (this.currentChannelId) {
            this.updateUserMuteUI(this.currentChannelId, current_user_id, this.isMuted);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});
