import { apiService } from './api';
import type { IConversation, IMessage, IContact } from '@src/types';

export interface CreateConversationRequest {
  type: 'couple' | 'group' | 'broadcast';
  name?: string;
  contactIds: number[];
  avatar?: string;
}

export interface SendMessageRequest {
  content?: string;
  type?: 'text' | 'recording';
  attachments?: any[];
  replyTo?: number;
}

export class ConversationsService {
  async getConversations(): Promise<IConversation[]> {
    return apiService.get<IConversation[]>('/conversations');
  }

  async getConversation(id: number): Promise<IConversation> {
    return apiService.get<IConversation>(`/conversations/${id}`);
  }

  async createConversation(data: CreateConversationRequest): Promise<IConversation> {
    return apiService.post<IConversation>('/conversations', data);
  }

  async updateConversation(id: number, data: Partial<IConversation>): Promise<IConversation> {
    return apiService.put<IConversation>(`/conversations/${id}`, data);
  }

  async deleteConversation(id: number): Promise<void> {
    return apiService.delete<void>(`/conversations/${id}`);
  }

  async archiveConversation(id: number): Promise<void> {
    return apiService.post<void>(`/conversations/${id}/archive`);
  }

  async unarchiveConversation(id: number): Promise<void> {
    return apiService.post<void>(`/conversations/${id}/unarchive`);
  }

  async getArchivedConversations(): Promise<IConversation[]> {
    return apiService.get<IConversation[]>('/conversations/archived');
  }

  async getMessages(conversationId: number, page = 0, size = 50): Promise<IMessage[]> {
    return apiService.get<IMessage[]>(`/conversations/${conversationId}/messages`, {
      page,
      size,
    });
  }

  async sendMessage(conversationId: number, data: SendMessageRequest): Promise<IMessage> {
    return apiService.post<IMessage>(`/conversations/${conversationId}/messages`, data);
  }

  async updateMessage(conversationId: number, messageId: number, data: Partial<IMessage>): Promise<IMessage> {
    return apiService.put<IMessage>(`/conversations/${conversationId}/messages/${messageId}`, data);
  }

  async deleteMessage(conversationId: number, messageId: number): Promise<void> {
    return apiService.delete<void>(`/conversations/${conversationId}/messages/${messageId}`);
  }

  async markAsRead(conversationId: number, messageId: number): Promise<void> {
    return apiService.post<void>(`/conversations/${conversationId}/messages/${messageId}/read`);
  }

  async pinMessage(conversationId: number, messageId: number): Promise<void> {
    return apiService.post<void>(`/conversations/${conversationId}/messages/${messageId}/pin`);
  }

  async unpinMessage(conversationId: number): Promise<void> {
    return apiService.delete<void>(`/conversations/${conversationId}/pinned-message`);
  }

  async addMembers(conversationId: number, contactIds: number[]): Promise<IConversation> {
    return apiService.post<IConversation>(`/conversations/${conversationId}/members`, {
      contactIds,
    });
  }

  async removeMember(conversationId: number, contactId: number): Promise<void> {
    return apiService.delete<void>(`/conversations/${conversationId}/members/${contactId}`);
  }

  async leaveConversation(conversationId: number): Promise<void> {
    return apiService.post<void>(`/conversations/${conversationId}/leave`);
  }

  async uploadAttachment(file: File, onProgress?: (progress: number) => void): Promise<any> {
    return apiService.uploadFile<any>('/attachments/upload', file, onProgress);
  }

  async searchMessages(conversationId: number, query: string): Promise<IMessage[]> {
    return apiService.get<IMessage[]>(`/conversations/${conversationId}/messages/search`, {
      q: query,
    });
  }
}

export const conversationsService = new ConversationsService();