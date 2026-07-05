export enum MessageType {
  Text = 0,
  Image = 1,
  Video = 2,
  Audio = 3,
  File = 4
}

export interface CreateDirectChatDto {
  recipientPersonId: number;
}

export interface CreateGroupChatDto {
  name: string;
  description?: string;
  imageUrl?: File;
  participantPersonIds: number[];
}

export interface UpdateGroupChatDto {
  name: string;
  description?: string;
  imageUrl?: string;
}

export interface AddParticipantsDto {
  personIds: number[];
}

export interface RemoveParticipantDto {
  personId: number;
}

// Attachments payload when sending message
export interface MessageAttachmentDto {
  fileName: string;
  filePath: File;
  contentType: string;
  fileSize: number;
  thumbnailPath?: string;
  type?: MessageType;
}

export interface SendMessageDto {
  chatId: number;
  content?: string;
  type: MessageType;
  attachments: MessageAttachmentDto[];
}

export interface ChatParticipantDto {
  personId: number;
  fullName: string;
  profileImageUrl?: string;
  isAdmin: boolean;
  isOnline: boolean;
}

export interface GetMessageAttachmentDto {
  fileName: string;
  fileUrl?: string;
  filePath?: string;
  contentType: string;
  fileSize: number;
  thumbnailPath?: string;
}

export interface MessageDto {
  id: number;
  chatId: number;
  senderPersonId: number;
  senderName: string;
  senderProfileImage?: string;
  content?: string;
  type: MessageType;
  isEdited: boolean;
  isDeleted: boolean;
  sentAt: Date | string;
  attachments: GetMessageAttachmentDto[];
}

export interface ChatDto {
  id: number;
  name?: string;
  description?: string;
  isGroup: boolean;
  imageUrl?: string;
  createdAt: Date | string;
  participants: ChatParticipantDto[];
  lastMessage?: MessageDto;
  unreadCount: number;
}

export interface RealtimeMessageDto {
  messageId: number;
  chatId: number;
  senderPersonId: number;
  senderName: string;
  content?: string;
  type: MessageType;
  sentAt: Date | string;
  attachments: MessageAttachmentDto[];
}

export interface TypingDto {
  chatId: number;
  personId: number;
  name: string;
  isTyping: boolean;
}

export interface ReadReceiptDto {
  chatId: number;
  personId: number;
  readAt: Date | string;
}

export interface PresenceDto {
  personId: number;
  isOnline: boolean;
}

export interface MessageQueryDto {
  chatId: number;
  page: number;
  pageSize: number;
}
