// Interfaces
interface RTCSignal {
    type: string;
    sdp: string;
}

interface ICECandidateSignal {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
}

interface SignalData {
    userId: number;
    targetUserId: number;
    type: 'offer' | 'answer' | 'ice-candidate';
    signal: RTCSignal | ICECandidateSignal;
}

interface VoiceUserJoinedData {
    userId: number;
    userName: string;
    userAvatar: string;
    isMuted: boolean;
    isMutedByAdmin: boolean;
}

interface VoiceUserLeftData {
    userId: number;
}

interface VoiceMuteStatusData {
    userId: number;
    isMuted: boolean;
    mutedByAdmin?: boolean;
}

interface ActiveUser {
    id: number;
    name: string;
    avatar: string;
    muted: boolean;
    muted_by_admin: boolean;
}

interface ActiveUsersResponse {
    users: Record<string, ActiveUser>;
}

interface JoinedResponse {
    isMutedByAdmin?: boolean;
}

interface CachedElements {
    muteBtn: HTMLButtonElement | null;
    csrfToken: string | null;
}

class VoiceChat {
    private localStream: MediaStream | null = null;
    private peerConnections: Map<number, RTCPeerConnection> = new Map();
    private currentChannelId: number | null = null;
    private isMuted: boolean = false;
    private mutedByAdmin: boolean = false;
    private channelUsers: Map<number, Set<number>> = new Map();
    private userMuteStatus: Map<number, boolean> = new Map();
    private userMutedByAdmin: Map<number, boolean> = new Map();
    private makingOffer: Map<number, boolean> = new Map();
    private ignoreOffer: Map<number, boolean> = new Map();
    private pendingCandidates: Map<number, ICECandidateSignal[]> = new Map();
    private heartbeatInterval: number | null = null;
    private volumeThreshold: number = 5;

    private userElements: Map<number, HTMLDivElement> = new Map();
    private channelContainers: Map<number, HTMLDivElement> = new Map();
    private cachedElements: CachedElements = {
        muteBtn: null,
        csrfToken: null
    };

    private iceServers: RTCConfiguration = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    constructor() {
        this.initializeUI();
        this.setupChannelListeners();
        this.setupBeforeUnload();
    }

    private getCsrfToken(): string {
        if (!this.cachedElements.csrfToken) {
            const token = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.getAttribute('content');
            this.cachedElements.csrfToken = token || '';
        }
        return this.cachedElements.csrfToken;
    }

    private getChannelContainer(channelId: number): HTMLDivElement | undefined {
        if (!this.channelContainers.has(channelId)) {
            const container = document.querySelector<HTMLDivElement>(`.voice-channel[data-channel-id="${channelId}"] .voice-channel-users`);
            if (container) {
                this.channelContainers.set(channelId, container);
            }
        }
        return this.channelContainers.get(channelId);
    }

    private setupBeforeUnload(): void {
        window.addEventListener('beforeunload', () => {
            if (this.currentChannelId) {
                navigator.sendBeacon(
                    '/voice/left',
                    new Blob([JSON.stringify({
                        channel_id: this.currentChannelId,
                        _token: this.getCsrfToken()
                    })], { type: 'application/json' })
                );
            }
        });
    }

    private initializeUI(): void {
        document.querySelectorAll<HTMLButtonElement>('.voice-channel-join').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const channel = target.closest<HTMLDivElement>('.voice-channel');
                const channelId = channel?.dataset.channelId;
                if (channelId) {
                    this.joinChannel(channelId);
                }
            });
        });

        document.querySelectorAll<HTMLButtonElement>('.voice-channel-leave').forEach(btn => {
            btn.addEventListener('click', () => {
                this.leaveChannel();
            });
        });

        this.cachedElements.muteBtn = document.querySelector<HTMLButtonElement>('#muteBtn');
        if (this.cachedElements.muteBtn) {
            this.cachedElements.muteBtn.addEventListener('click', () => {
                this.toggleMute();
            });
        }
    }

    private setupChannelListeners(): void {
        voices_count.forEach((channelId: number) => {
            const echoChannel = window.Echo.join(`voice-channel-${channelId}`);

            echoChannel.here((users: any[]) => {
                const userIds = new Set(users.map((u: any) => u.id as number));
                this.channelUsers.set(channelId, userIds);
                this.loadActiveUsers(channelId);
            });

            echoChannel.joining((user: any) => {
                const users = this.channelUsers.get(channelId) || new Set<number>();
                users.add(user.id as number);
                this.channelUsers.set(channelId, users);
            });

            echoChannel.leaving((user: any) => {
                this.handleUserLeft(channelId, user.id as number);
            });

            echoChannel
                .listen('.voice-user-joined', (data: VoiceUserJoinedData) => {
                    const users = this.channelUsers.get(channelId) || new Set<number>();
                    users.add(data.userId);
                    this.channelUsers.set(channelId, users);

                    if (data.userId === current_user_id && this.currentChannelId === channelId) {
                        this.userMuteStatus.set(current_user_id, data.isMuted);
                        this.userMutedByAdmin.set(current_user_id, data.isMutedByAdmin);
                    }

                    this.addUserToChannel(
                        channelId,
                        data.userId,
                        data.userName,
                        data.userAvatar,
                        data.isMuted,
                        data.isMutedByAdmin
                    );

                    if (this.currentChannelId === channelId && data.userId !== current_user_id) {
                        setTimeout(() => this.initiateConnection(data.userId), 500);
                    }
                })
                .listen('.voice-user-left', (data: VoiceUserLeftData) => {
                    this.handleUserLeft(channelId, data.userId);
                })
                .listen('.voice-mute-status', (data: VoiceMuteStatusData) => {
                    this.userMuteStatus.set(data.userId, data.isMuted);
                    this.userMutedByAdmin.set(data.userId, data.mutedByAdmin || false);
                    this.updateUserMuteUI(channelId, data.userId, data.isMuted);

                    if (data.userId === current_user_id) {
                        this.isMuted = data.isMuted;
                        this.mutedByAdmin = data.mutedByAdmin || false;

                        if (this.localStream) {
                            this.localStream.getAudioTracks().forEach(track => {
                                track.enabled = !data.isMuted;
                            });
                        }

                        this.updateSelfMuteUI();
                    }
                })
                .listen('.voice-signal', (data: SignalData) => {
                    if (this.currentChannelId === channelId && data.targetUserId === current_user_id) {
                        this.handleSignal(data);
                    }
                });
        });
    }

    private handleUserLeft(channelId: number, userId: number): void {
        this.removeUserFromChannel(channelId, userId);

        const users = this.channelUsers.get(channelId) || new Set<number>();
        users.delete(userId);
        this.channelUsers.set(channelId, users);

        if (this.currentChannelId === channelId) {
            this.closePeerConnection(userId);
        }
    }

    private startHeartbeat(): void {
        this.heartbeatInterval = window.setInterval(() => {
            if (this.currentChannelId) {
                fetch('/voice/heartbeat', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': this.getCsrfToken()
                    },
                    body: JSON.stringify({ channel_id: this.currentChannelId })
                }).catch(() => {});
            }
        }, 120000);
    }

    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private loadActiveUsers(channelId: number): void {
        fetch(`/voice/active-users?channel_id=${channelId}`)
            .then(response => response.ok ? response.json() : null)
            .then((data: ActiveUsersResponse | null) => {
                if (!data) return;

                const users = Object.values(data.users);
                if (users.length === 0) return;

                const fragment = document.createDocumentFragment();
                const container = this.getChannelContainer(channelId);
                if (!container) return;

                users.forEach(user => {
                    this.userMuteStatus.set(user.id, user.muted || false);
                    this.userMutedByAdmin.set(user.id, user.muted_by_admin || false);

                    const userElement = this.createUserElement(
                        user.id,
                        user.name,
                        user.avatar,
                        user.muted,
                        user.muted_by_admin
                    );
                    this.userElements.set(user.id, userElement);
                    fragment.appendChild(userElement);
                });

                container.appendChild(fragment);
                container.style.display = 'block';
            })
            .catch(() => {});
    }

    private monitorAudioLevel(audioElement: HTMLAudioElement, userId: number): void {
        if (!audioElement.srcObject) return;

        const ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        const source = ctx.createMediaStreamSource(audioElement.srcObject as MediaStream);

        analyser.fftSize = 256;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const check = (): void => {
            if (!this.currentChannelId) return;

            analyser.getByteFrequencyData(data);
            const avg = data.reduce((a, b) => a + b) / data.length;

            const userEl = this.userElements.get(userId);
            if (userEl) {
                const shouldHighlight = avg > this.volumeThreshold;
                if (userEl.classList.contains('current-user') !== shouldHighlight) {
                    userEl.classList.toggle('current-user', shouldHighlight);
                }
            }

            requestAnimationFrame(check);
        };
        check();
    }

    async joinChannel(channelId: string | number): Promise<void> {
        const channelIdNum = parseInt(channelId.toString());

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

            const localAudio = new Audio();
            localAudio.srcObject = this.localStream;
            localAudio.muted = true;
            this.monitorAudioLevel(localAudio, current_user_id);

            this.currentChannelId = channelIdNum;
            this.updateChannelActiveState(channelIdNum, true);

            const response = await fetch('/voice/joined', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': this.getCsrfToken()
                },
                body: JSON.stringify({
                    channel_id: channelIdNum,
                    muted: this.isMuted,
                })
            });

            if (!response.ok) return;

            const data: JoinedResponse = await response.json();

            if (data.isMutedByAdmin) {
                this.isMuted = true;
                this.mutedByAdmin = true;
            }

            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });

            this.updateSelfMuteUI();

            if (this.isMuted && !this.mutedByAdmin) {
                this.broadcastMuteStatus(channelIdNum, null, this.isMuted, false);
            }

            this.startHeartbeat();

            setTimeout(() => {
                const users = this.channelUsers.get(channelIdNum) || new Set<number>();
                users.forEach(userId => {
                    if (userId !== current_user_id) {
                        this.initiateConnection(userId);
                    }
                });
            }, 800);
        } catch (error) {
            console.error('Microphone access error:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    }

    leaveChannel(): void {
        if (!this.currentChannelId) return;

        const channelId = this.currentChannelId;

        this.stopHeartbeat();

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
            this.localStream = null;
        }

        this.peerConnections.forEach((pc) => pc.close());
        this.peerConnections.clear();
        this.makingOffer.clear();
        this.ignoreOffer.clear();
        this.pendingCandidates.clear();

        document.querySelectorAll<HTMLAudioElement>('[id^="remote-audio-"]').forEach(audio => audio.remove());

        this.updateChannelActiveState(channelId, false);
        this.currentChannelId = null;
        this.mutedByAdmin = false;
        this.updateSelfMuteUI();
        this.broadcastLeft(channelId);
    }

    toggleMute(userId: number | null = null): void {
        if (userId && userId !== current_user_id) {
            const isMutedByAdmin = this.userMutedByAdmin.get(userId) ?? false;
            const newMuteStatusByAdmin = !isMutedByAdmin;

            this.userMuteStatus.set(userId, newMuteStatusByAdmin);
            this.userMutedByAdmin.set(userId, newMuteStatusByAdmin);

            if (this.currentChannelId) {
                this.updateUserMuteUI(this.currentChannelId, userId, newMuteStatusByAdmin);
                this.broadcastMuteStatus(this.currentChannelId, userId, true, newMuteStatusByAdmin);
            }
            return;
        }

        if (this.mutedByAdmin) return;

        this.isMuted = !this.isMuted;

        if (this.localStream) {
            this.localStream.getAudioTracks().forEach(track => {
                track.enabled = !this.isMuted;
            });
        }

        this.updateSelfMuteUI();
        if (this.currentChannelId) {
            this.broadcastMuteStatus(this.currentChannelId, null, this.isMuted, false);
        }
    }

    private updateSelfMuteUI(): void {
        const muteBtn = this.cachedElements.muteBtn;
        if (!muteBtn) return;

        const isDisabled = this.mutedByAdmin;

        muteBtn.classList.remove('muted', 'muted-by-admin');

        if (this.isMuted) {
            muteBtn.classList.add(this.mutedByAdmin ? 'muted-by-admin' : 'muted');
        }

        muteBtn.style.cssText = `opacity: ${isDisabled ? '0.5' : '1'}; cursor: ${isDisabled ? 'not-allowed' : 'pointer'}`;

        muteBtn.innerHTML = this.isMuted
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

        if (this.currentChannelId) {
            this.updateUserMuteUI(this.currentChannelId, current_user_id, this.isMuted);
        }
    }

    private isPolite(otherUserId: number): boolean {
        return current_user_id > otherUserId;
    }

    private async initiateConnection(userId: number): Promise<void> {
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

            if (offer.sdp) {
                this.sendSignal(userId, 'offer', {
                    type: offer.type,
                    sdp: btoa(offer.sdp)
                });
            }
        } catch (error) {
            console.error('Error initiating connection:', error);
            this.closePeerConnection(userId);
        } finally {
            this.makingOffer.set(userId, false);
        }
    }

    private createPeerConnection(userId: number): RTCPeerConnection {
        const pc = new RTCPeerConnection(this.iceServers);
        this.peerConnections.set(userId, pc);
        this.pendingCandidates.set(userId, []);

        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                if (this.localStream) {
                    pc.addTrack(track, this.localStream);
                }
            });
        }

        pc.ontrack = (event: RTCTrackEvent) => {
            let remoteAudio = document.getElementById(`remote-audio-${userId}`) as HTMLAudioElement | null;
            if (!remoteAudio) {
                remoteAudio = new Audio();
                remoteAudio.id = `remote-audio-${userId}`;
                remoteAudio.autoplay = true;
                document.body.appendChild(remoteAudio);
            }

            remoteAudio.srcObject = event.streams[0];
            this.monitorAudioLevel(remoteAudio, userId);
        };

        pc.onicecandidate = (event: RTCPeerConnectionIceEvent) => {
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

                const users = this.channelUsers.get(this.currentChannelId!) || new Set<number>();
                if (this.currentChannelId && users.has(userId)) {
                    setTimeout(() => this.initiateConnection(userId), 2000);
                }
            }
        };

        return pc;
    }

    private async handleSignal(data: SignalData): Promise<void> {
        const { userId, type, signal } = data;
        if (!this.currentChannelId) return;

        try {
            if (type === 'offer') {
                await this.handleOffer(userId, signal as RTCSignal);
            } else if (type === 'answer') {
                await this.handleAnswer(userId, signal as RTCSignal);
            } else if (type === 'ice-candidate') {
                await this.handleIceCandidate(userId, signal as ICECandidateSignal);
            }
        } catch (error) {
            console.error('Error handling signal:', error);
        }
    }

    private async handleOffer(userId: number, signal: RTCSignal): Promise<void> {
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
            pc = undefined;
        }

        if (!pc) {
            pc = this.createPeerConnection(userId);
        }

        try {
            await pc.setRemoteDescription(new RTCSessionDescription({
                type: signal.type as RTCSdpType,
                sdp: atob(signal.sdp)
            }));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            if (answer.sdp) {
                this.sendSignal(userId, 'answer', {
                    type: answer.type,
                    sdp: btoa(answer.sdp)
                });
            }

            await this.processPendingCandidates(userId);
        } catch (error) {
            console.error('Error handling offer:', error);
            this.closePeerConnection(userId);
        }
    }

    private async handleAnswer(userId: number, signal: RTCSignal): Promise<void> {
        const pc = this.peerConnections.get(userId);
        if (!pc || pc.signalingState !== 'have-local-offer') return;

        try {
            await pc.setRemoteDescription(new RTCSessionDescription({
                type: signal.type as RTCSdpType,
                sdp: atob(signal.sdp)
            }));
            await this.processPendingCandidates(userId);
        } catch (error) {
            console.error('Error handling answer:', error);
        }
    }

    private async handleIceCandidate(userId: number, signal: ICECandidateSignal): Promise<void> {
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
        } catch (error) {
            console.error('Error adding ICE candidate:', error);
        }
    }

    private async processPendingCandidates(userId: number): Promise<void> {
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
            } catch (error) {
                console.error('Error processing pending candidate:', error);
            }
        }

        this.pendingCandidates.set(userId, []);
    }

    private sendSignal(
        targetUserId: number,
        type: 'offer' | 'answer' | 'ice-candidate',
        signal: RTCSignal | ICECandidateSignal
    ): void {
        if (!this.currentChannelId) return;

        fetch('/voice/signal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({
                channel_id: this.currentChannelId,
                target_user_id: targetUserId,
                type: type,
                signal: signal
            })
        }).catch(() => {});
    }

    private broadcastJoined(channelId: number): Promise<Response> {
        return fetch('/voice/joined', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({
                channel_id: channelId,
                muted: this.isMuted,
            })
        });
    }

    private broadcastLeft(channelId: number): void {
        fetch('/voice/left', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({ channel_id: channelId })
        }).catch(() => {});
    }

    private broadcastMuteStatus(
        channelId: number,
        userId: number | null = null,
        isMuted: boolean | null = null,
        mutedByAdmin: boolean = false
    ): void {
        fetch('/voice/mute-status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': this.getCsrfToken()
            },
            body: JSON.stringify({
                channel_id: channelId,
                is_muted: isMuted !== null ? isMuted : this.isMuted,
                user_id: userId,
                muted_by_admin: mutedByAdmin,
            })
        }).catch(() => {});
    }

    private closePeerConnection(userId: number): void {
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

    private updateChannelActiveState(channelId: number, isActive: boolean): void {
        const channel = document.querySelector<HTMLDivElement>(`.voice-channel[data-channel-id="${channelId}"]`);
        if (channel) {
            channel.classList.toggle('active', isActive);
        }
    }

    private createUserElement(
        userId: number,
        userName: string,
        userAvatar: string,
        isMuted: boolean,
        mutedByAdmin: boolean
    ): HTMLDivElement {
        const mutedStatus = isMuted || false;
        const mutedByAdminStatus = mutedByAdmin || false;

        const statusIconClass = mutedStatus ? (mutedByAdminStatus ? 'muted-by-admin' : 'muted') : '';
        const statusIcon = mutedStatus
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';

        const userElement = document.createElement('div');
        userElement.className = 'voice-user';
        userElement.dataset.userId = userId.toString();
        userElement.innerHTML = `
            <div class="voice-user-avatar">
                <img src="${userAvatar}" alt="${userName}">
            </div>
            <span class="voice-user-name">${userName}</span>
            <div class="voice-user-status ${statusIconClass}" data-user-id="${userId}">
                ${statusIcon}
            </div>
        `;

        if (is_admin && userId !== current_user_id) {
            const statusElement = userElement.querySelector<HTMLDivElement>('.voice-user-status');
            if (statusElement) {
                statusElement.style.cursor = 'pointer';
                statusElement.addEventListener('click', (e: MouseEvent) => {
                    e.stopPropagation();
                    const userIdAttr = statusElement.dataset.userId;
                    if (userIdAttr) {
                        this.toggleMute(parseInt(userIdAttr));
                    }
                });
            }
        }

        return userElement;
    }

    private addUserToChannel(
        channelId: number,
        userId: number,
        userName: string,
        userAvatar: string,
        isMuted: boolean,
        mutedByAdmin: boolean
    ): void {
        const container = this.getChannelContainer(channelId);
        if (!container) return;

        if (this.userElements.has(userId)) return;

        const mutedStatus = isMuted || false;
        const mutedByAdminStatus = mutedByAdmin || false;

        this.userMuteStatus.set(userId, mutedStatus);
        this.userMutedByAdmin.set(userId, mutedByAdminStatus);

        const userElement = this.createUserElement(userId, userName, userAvatar, isMuted, mutedByAdmin);
        this.userElements.set(userId, userElement);

        container.appendChild(userElement);
        container.style.display = 'block';
    }

    private removeUserFromChannel(channelId: number, userId: number): void {
        const userElement = this.userElements.get(userId);
        if (userElement) {
            userElement.remove();
            this.userElements.delete(userId);
        }

        const container = this.getChannelContainer(channelId);
        if (container && container.children.length === 0) {
            container.style.display = 'none';
        }

        this.userMuteStatus.delete(userId);
        this.userMutedByAdmin.delete(userId);
    }

    private updateUserMuteUI(channelId: number, userId: number, isMuted: boolean): void {
        const userElement = this.userElements.get(userId);
        if (!userElement) return;

        const statusElement = userElement.querySelector<HTMLDivElement>('.voice-user-status');
        if (!statusElement) return;

        const isMutedByAdmin = this.userMutedByAdmin.get(userId) || false;

        statusElement.className = 'voice-user-status';
        if (isMuted) {
            statusElement.classList.add(isMutedByAdmin ? 'muted-by-admin' : 'muted');
        }

        statusElement.innerHTML = isMuted
            ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>'
            : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>';
    }
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
    window.voiceChat = new VoiceChat();
});

export {};
