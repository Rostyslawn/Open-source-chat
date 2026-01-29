interface EchoChannel {
    here(callback: (users: any[]) => void): EchoChannel;
    joining(callback: (user: any) => void): EchoChannel;
    leaving(callback: (user: any) => void): EchoChannel;
    listen(event: string, callback: (data: any) => void): EchoChannel;
}

declare global {
    interface Window {
        Echo: {
            join(channel: string): EchoChannel;
        };
        voiceChat?: VoiceChat;
        voices_count: number[];
        current_user_id: number;
        current_user_name: string;
        current_user_avatar: string;
        is_admin: boolean;
        selectedFile: File | null;
    }

    let voices_count: number[];
    let current_user_id: number;
    let current_user_name: string;
    let current_user_avatar: string;
    let is_admin: boolean;
}

export {};
