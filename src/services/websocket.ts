import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuthStore } from '@src/store/auth';
import { useStore } from '@src/store/store';
import type { IMessage as IAppMessage, IConversation } from '@src/types';

export class WebSocketService {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor() {
    this.setupClient();
  }

  private setupClient() {
    const authStore = useAuthStore();
    
    this.client = new Client({
      webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_URL || 'http://localhost:8080/ws'),
      connectHeaders: {
        Authorization: `Bearer ${authStore.token}`,
      },
      debug: (str) => {
        if (import.meta.env.DEV) {
          console.log('STOMP Debug:', str);
        }
      },
      reconnectDelay: this.reconnectDelay,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = this.onConnect.bind(this);
    this.client.onDisconnect = this.onDisconnect.bind(this);
    this.client.onStompError = this.onError.bind(this);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.client) {
        this.setupClient();
      }

      this.client!.onConnect = (frame) => {
        this.onConnect(frame);
        resolve();
      };

      this.client!.onStompError = (frame) => {
        this.onError(frame);
        reject(new Error('WebSocket connection failed'));
      };

      this.client!.activate();
    });
  }

  disconnect() {
    if (this.client?.connected) {
      this.subscriptions.forEach(sub => sub.unsubscribe());
      this.subscriptions.clear();
      this.client.deactivate();
    }
  }

  private onConnect(frame: any) {
    console.log('Connected to WebSocket:', frame);
    this.reconnectAttempts = 0;
    this.subscribeToUserChannels();
  }

  private onDisconnect() {
    console.log('Disconnected from WebSocket');
  }

  private onError(frame: any) {
    console.error('WebSocket error:', frame);
    
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private subscribeToUserChannels() {
    const authStore = useAuthStore();
    const store = useStore();
    
    if (!authStore.user?.id) return;

    // Subscribe to personal message queue
    const personalSub = this.client!.subscribe(
      `/user/${authStore.user.id}/queue/messages`,
      this.handleIncomingMessage.bind(this)
    );
    this.subscriptions.set('personal', personalSub);

    // Subscribe to conversation updates
    const conversationSub = this.client!.subscribe(
      `/user/${authStore.user.id}/queue/conversations`,
      this.handleConversationUpdate.bind(this)
    );
    this.subscriptions.set('conversations', conversationSub);

    // Subscribe to typing indicators
    const typingSub = this.client!.subscribe(
      `/user/${authStore.user.id}/queue/typing`,
      this.handleTypingIndicator.bind(this)
    );
    this.subscriptions.set('typing', typingSub);

    // Subscribe to presence updates
    const presenceSub = this.client!.subscribe(
      `/topic/presence`,
      this.handlePresenceUpdate.bind(this)
    );
    this.subscriptions.set('presence', presenceSub);
  }

  subscribeToConversation(conversationId: number) {
    if (this.subscriptions.has(`conversation-${conversationId}`)) {
      return;
    }

    const sub = this.client!.subscribe(
      `/topic/conversation/${conversationId}`,
      this.handleConversationMessage.bind(this)
    );
    this.subscriptions.set(`conversation-${conversationId}`, sub);
  }

  unsubscribeFromConversation(conversationId: number) {
    const sub = this.subscriptions.get(`conversation-${conversationId}`);
    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(`conversation-${conversationId}`);
    }
  }

  sendMessage(conversationId: number, content: string, attachments?: any[], replyTo?: number) {
    if (!this.client?.connected) {
      throw new Error('WebSocket not connected');
    }

    const message = {
      conversationId,
      content,
      attachments: attachments || [],
      replyTo,
      timestamp: new Date().toISOString(),
    };

    this.client.publish({
      destination: '/app/chat.sendMessage',
      body: JSON.stringify(message),
    });
  }

  sendTypingIndicator(conversationId: number, isTyping: boolean) {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: '/app/chat.typing',
      body: JSON.stringify({
        conversationId,
        isTyping,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  markMessageAsRead(messageId: number) {
    if (!this.client?.connected) return;

    this.client.publish({
      destination: '/app/chat.markAsRead',
      body: JSON.stringify({
        messageId,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  private handleIncomingMessage(message: IMessage) {
    try {
      const data: IAppMessage = JSON.parse(message.body);
      const store = useStore();
      store.addMessage(data);
    } catch (error) {
      console.error('Error handling incoming message:', error);
    }
  }

  private handleConversationMessage(message: IMessage) {
    try {
      const data: IAppMessage = JSON.parse(message.body);
      const store = useStore();
      store.addMessage(data);
    } catch (error) {
      console.error('Error handling conversation message:', error);
    }
  }

  private handleConversationUpdate(message: IMessage) {
    try {
      const data: IConversation = JSON.parse(message.body);
      const store = useStore();
      store.updateConversation(data);
    } catch (error) {
      console.error('Error handling conversation update:', error);
    }
  }

  private handleTypingIndicator(message: IMessage) {
    try {
      const data = JSON.parse(message.body);
      const store = useStore();
      store.updateTypingIndicator(data.conversationId, data.userId, data.isTyping);
    } catch (error) {
      console.error('Error handling typing indicator:', error);
    }
  }

  private handlePresenceUpdate(message: IMessage) {
    try {
      const data = JSON.parse(message.body);
      const store = useStore();
      store.updateUserPresence(data.userId, data.isOnline, data.lastSeen);
    } catch (error) {
      console.error('Error handling presence update:', error);
    }
  }
}

export const webSocketService = new WebSocketService();