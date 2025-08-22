import { defineStore } from "pinia";
import type { Ref } from "vue";
import { computed, ref } from "vue";
import { conversationsService } from '@src/services/conversations';
import { contactsService } from '@src/services/contacts';
import { webSocketService } from '@src/services/websocket';

import type {
  IConversation,
  IContactGroup,
  IUser,
  INotification,
  ICall,
  ISettings,
  IEmoji,
  IMessage,
  IContact,
} from "@src/types";

const useStore = defineStore("chat", () => {
  // local storage
  const storage = JSON.parse(localStorage.getItem("chat") || "{}");

  // app status refs
  const status = ref<'idle' | 'loading' | 'success' | 'error'>('idle');

  // app data refs
  const conversations: Ref<IConversation[]> = ref([]);
  const notifications: Ref<INotification[]> = ref([]);
  const archivedConversations: Ref<IConversation[]> = ref(
    []
  );
  const calls: Ref<ICall[]> = ref([]);
  const contacts: Ref<IContact[]> = ref([]);
  const settings: Ref<ISettings> = ref(
    storage.settings || {
      lastSeen: false,
      readReceipt: false,
      joiningGroups: false,
      privateMessages: false,
      darkMode: false,
      borderedTheme: false,
      allowNotifications: false,
      keepNotifications: false,
    }
  );
  const activeCall: Ref<ICall | undefined> = ref();
  const recentEmoji: Ref<IEmoji[]> = ref(storage.recentEmoji || []);
  const emojiSkinTone: Ref<string> = ref(storage.emojiSkinTone || "neutral");
  const typingUsers: Ref<Map<number, Set<number>>> = ref(new Map());
  const onlineUsers: Ref<Set<number>> = ref(new Set());

  // ui refs
  const activeSidebarComponent: Ref<string> = ref(
    storage.activeSidebarComponent || "messages"
  );
  const delayLoading = ref(true);
  const conversationOpen: Ref<string | undefined> = ref(
    storage.conversationOpen
  );
  const callMinimized = ref(false);
  const openVoiceCall = ref(false);

  // Actions
  const loadConversations = async () => {
    try {
      status.value = 'loading';
      const data = await conversationsService.getConversations();
      conversations.value = data;
      status.value = 'success';
    } catch (error) {
      console.error('Failed to load conversations:', error);
      status.value = 'error';
    }
  };

  const loadArchivedConversations = async () => {
    try {
      const data = await conversationsService.getArchivedConversations();
      archivedConversations.value = data;
    } catch (error) {
      console.error('Failed to load archived conversations:', error);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await contactsService.getContacts();
      contacts.value = data;
    } catch (error) {
      console.error('Failed to load contacts:', error);
    }
  };

  const createConversation = async (type: 'couple' | 'group' | 'broadcast', contactIds: number[], name?: string) => {
    try {
      const conversation = await conversationsService.createConversation({
        type,
        contactIds,
        name,
      });
      conversations.value.unshift(conversation);
      return conversation;
    } catch (error) {
      console.error('Failed to create conversation:', error);
      throw error;
    }
  };

  const sendMessage = async (conversationId: number, content: string, attachments?: any[], replyTo?: number) => {
    try {
      // Send via WebSocket for real-time delivery
      webSocketService.sendMessage(conversationId, content, attachments, replyTo);
      
      // Also send via REST API for persistence
      const message = await conversationsService.sendMessage(conversationId, {
        content,
        attachments,
        replyTo,
      });
      
      return message;
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  };

  const addMessage = (message: IMessage) => {
    const conversation = conversations.value.find(c => 
      c.messages.some(m => m.id === message.id) || 
      c.id === (message as any).conversationId
    );
    
    if (conversation) {
      const existingIndex = conversation.messages.findIndex(m => m.id === message.id);
      if (existingIndex >= 0) {
        conversation.messages[existingIndex] = message;
      } else {
        conversation.messages.push(message);
      }
      
      // Move conversation to top
      const convIndex = conversations.value.findIndex(c => c.id === conversation.id);
      if (convIndex > 0) {
        conversations.value.splice(convIndex, 1);
        conversations.value.unshift(conversation);
      }
    }
  };

  const updateConversation = (updatedConversation: IConversation) => {
    const index = conversations.value.findIndex(c => c.id === updatedConversation.id);
    if (index >= 0) {
      conversations.value[index] = updatedConversation;
    }
  };

  const markMessageAsRead = async (conversationId: number, messageId: number) => {
    try {
      await conversationsService.markAsRead(conversationId, messageId);
      webSocketService.markMessageAsRead(messageId);
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const updateTypingIndicator = (conversationId: number, userId: number, isTyping: boolean) => {
    if (!typingUsers.value.has(conversationId)) {
      typingUsers.value.set(conversationId, new Set());
    }
    
    const conversationTyping = typingUsers.value.get(conversationId)!;
    if (isTyping) {
      conversationTyping.add(userId);
    } else {
      conversationTyping.delete(userId);
    }
  };

  const updateUserPresence = (userId: number, isOnline: boolean, lastSeen?: Date) => {
    if (isOnline) {
      onlineUsers.value.add(userId);
    } else {
      onlineUsers.value.delete(userId);
    }
    
    // Update contact's last seen
    const contact = contacts.value.find(c => c.id === userId);
    if (contact && lastSeen) {
      contact.lastSeen = lastSeen;
    }
  };

  const addContact = async (email: string) => {
    try {
      const contact = await contactsService.addContact({ email });
      contacts.value.push(contact);
      return contact;
    } catch (error) {
      console.error('Failed to add contact:', error);
      throw error;
    }
  };

  const deleteContact = async (contactId: number) => {
    try {
      await contactsService.deleteContact(contactId);
      const index = contacts.value.findIndex(c => c.id === contactId);
      if (index >= 0) {
        contacts.value.splice(index, 1);
      }
    } catch (error) {
      console.error('Failed to delete contact:', error);
      throw error;
    }
  };

  const archiveConversation = async (conversationId: number) => {
    try {
      await conversationsService.archiveConversation(conversationId);
      const index = conversations.value.findIndex(c => c.id === conversationId);
      if (index >= 0) {
        const conversation = conversations.value.splice(index, 1)[0];
        archivedConversations.value.push(conversation);
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
      throw error;
    }
  };

  const unarchiveConversation = async (conversationId: number) => {
    try {
      await conversationsService.unarchiveConversation(conversationId);
      const index = archivedConversations.value.findIndex(c => c.id === conversationId);
      if (index >= 0) {
        const conversation = archivedConversations.value.splice(index, 1)[0];
        conversations.value.unshift(conversation);
      }
    } catch (error) {
      console.error('Failed to unarchive conversation:', error);
      throw error;
    }
  };

  const subscribeToConversation = (conversationId: number) => {
    webSocketService.subscribeToConversation(conversationId);
  };

  const unsubscribeFromConversation = (conversationId: number) => {
    webSocketService.unsubscribeFromConversation(conversationId);
  };

  const sendTypingIndicator = (conversationId: number, isTyping: boolean) => {
    webSocketService.sendTypingIndicator(conversationId, isTyping);
  };

  // contacts grouped alphabetically.
  const contactGroups = computed(() => {
    if (contacts.value.length > 0) {
      let sortedContacts = [...contacts.value];

      sortedContacts.sort();

      let groups: IContactGroup[] = [];
      let currentLetter: string = "";
      let groupNames: string[] = [];

      // create an array of letter for every different sort level.
      for (let contact of sortedContacts) {
        // if the first letter is different create a new group.
        if (contact.firstName[0].toUpperCase() !== currentLetter) {
          currentLetter = contact.firstName[0].toUpperCase();
          groupNames.push(currentLetter);
        }
      }

      // create an array that groups contact names based on the first letter;
      for (let groupName of groupNames) {
        let group: IContactGroup = { letter: groupName, contacts: [] };
        for (let contact of sortedContacts) {
          if (contact.firstName[0].toUpperCase() === groupName) {
            group.contacts.push(contact);
          }
        }
        groups.push(group);
      }

      return groups;
    }
    return [];
  });

  const getStatus = computed(() => status);

  return {
    // status refs
    status,
    getStatus,

    // data refs
    conversations,
    contacts,
    contactGroups,
    notifications,
    archivedConversations,
    calls,
    settings,
    activeCall,
    recentEmoji,
    emojiSkinTone,
    typingUsers,
    onlineUsers,

    // ui refs
    activeSidebarComponent,
    delayLoading,
    conversationOpen,
    callMinimized,
    openVoiceCall,

    // actions
    loadConversations,
    loadArchivedConversations,
    loadContacts,
    createConversation,
    sendMessage,
    addMessage,
    updateConversation,
    markMessageAsRead,
    updateTypingIndicator,
    updateUserPresence,
    addContact,
    deleteContact,
    archiveConversation,
    unarchiveConversation,
    subscribeToConversation,
    unsubscribeFromConversation,
    sendTypingIndicator,
  };
});

export default useStore;
