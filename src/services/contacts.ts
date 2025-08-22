import { apiService } from './api';
import type { IContact } from '@src/types';

export interface AddContactRequest {
  email: string;
}

export class ContactsService {
  async getContacts(): Promise<IContact[]> {
    return apiService.get<IContact[]>('/contacts');
  }

  async addContact(data: AddContactRequest): Promise<IContact> {
    return apiService.post<IContact>('/contacts', data);
  }

  async updateContact(id: number, data: Partial<IContact>): Promise<IContact> {
    return apiService.put<IContact>(`/contacts/${id}`, data);
  }

  async deleteContact(id: number): Promise<void> {
    return apiService.delete<void>(`/contacts/${id}`);
  }

  async blockContact(id: number): Promise<void> {
    return apiService.post<void>(`/contacts/${id}/block`);
  }

  async unblockContact(id: number): Promise<void> {
    return apiService.post<void>(`/contacts/${id}/unblock`);
  }

  async getBlockedContacts(): Promise<IContact[]> {
    return apiService.get<IContact[]>('/contacts/blocked');
  }

  async searchContacts(query: string): Promise<IContact[]> {
    return apiService.get<IContact[]>('/contacts/search', { q: query });
  }
}

export const contactsService = new ContactsService();