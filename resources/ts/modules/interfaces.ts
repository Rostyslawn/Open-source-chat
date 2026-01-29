export interface UserInterface {
    channelId: number,
    id: number,
    name: string,
    avatar: string,
    isMuted: boolean,
    isMutedByAdmin: boolean,
}

export interface MessageInterface {
    id: number,
    message: string,
    sender: string,
    sender_avatar: string,
    message_time: string,
    file_path: string | null,
    file_name: string | null,
    file_type: string | null,
    file_size: number | null,
}

export interface MessageToDeleteInterface {
    message_id: number
}
