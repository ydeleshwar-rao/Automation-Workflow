import { WebhookData } from "../models/webhook";

/**
 * Interface for Webhook Storage to follow Dependency Inversion Principle.
 */
export interface IWebhookRepository {
  save(id: string, data: WebhookData): Promise<void>;
  findAllById(id: string): Promise<WebhookData[]>;
  deleteById(id: string): Promise<void>;
}

/**
 * In-memory implementation of Webhook Storage.
 */
export class InMemoryWebhookRepository implements IWebhookRepository {
  private cache: Record<string, WebhookData[]> = {};

  async save(id: string, data: WebhookData): Promise<void> {
    if (!this.cache[id]) {
      this.cache[id] = [];
    }
    
    this.cache[id].unshift(data);
    
    // Keep only last 10
    if (this.cache[id].length > 10) {
      this.cache[id].pop();
    }
  }

  async findAllById(id: string): Promise<WebhookData[]> {
    return this.cache[id] || [];
  }

  async deleteById(id: string): Promise<void> {
    delete this.cache[id];
  }
}

// Export a singleton instance for use in the controller
export const webhookRepository = new InMemoryWebhookRepository();
