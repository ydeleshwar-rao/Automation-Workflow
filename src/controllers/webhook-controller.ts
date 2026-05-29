import { WebhookData } from '../models/webhook';
import { IWebhookRepository, webhookRepository } from '../repositories/webhook.repository';

/**
 * WebhookController handles the logic of transforming incoming HTTP requests 
 * into domain models and orchestrating storage.
 */
class WebhookController {
  constructor(private repository: IWebhookRepository = webhookRepository) {}

  public async handleIncoming(id: string, data: any, method: string, headers: any): Promise<WebhookData> {
    const webhookEntry: WebhookData = {
      id: `${id}/${Math.random().toString(36).substring(7)}`,
      data,
      method,
      timestamp: new Date().toISOString(),
      headers: this.sanitizeHeaders(headers)
    };

    await this.repository.save(id, webhookEntry);
    console.log(`[MVC] Webhook processed for ID: ${id}`);
    
    return webhookEntry;
  }

  public async getWebhooks(id: string): Promise<WebhookData[]> {
    return this.repository.findAllById(id);
  }

  public async clearHistory(id: string): Promise<void> {
    await this.repository.deleteById(id);
  }

  private sanitizeHeaders(headers: any): Record<string, string> {
    const sanitized: Record<string, string> = {};
    const whitelist = ['content-type', 'user-agent', 'x-forwarded-for'];
    
    if (headers && typeof headers.get === 'function') {
      whitelist.forEach(key => {
        const val = headers.get(key);
        if (val) sanitized[key] = val;
      });
    }
    
    return sanitized;
  }
}

export const webhookController = new WebhookController();
