/**
 * Mistral API Client
 * Verbindung zur Mistral API für KI-Antworten
 */

class MistralClient {
  constructor() {
    this.apiKey = null;
    this.model = 'mistral-medium';
    this.baseURL = 'https://api.mistral.ai/v1';
  }

  async init() {
    const apiKey = await storage.loadSetting('mistral_api_key');
    const model = await storage.loadSetting('mistral_model');
    
    if (apiKey) this.apiKey = apiKey;
    if (model) this.model = model;
  }

  async setApiKey(key) {
    this.apiKey = key;
    await storage.saveSetting('mistral_api_key', key);
  }

  async setModel(model) {
    this.model = model;
    await storage.saveSetting('mistral_model', model);
  }

  async chat(messages, options = {}) {
    if (!this.apiKey) {
      throw new Error('Mistral API Key nicht gesetzt. Bitte in Einstellungen hinzufügen.');
    }

    const requestBody = {
      model: this.model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.max_tokens || 500,
      top_p: options.top_p || 0.9,
    };

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Mistral API Error: ${error.message}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('LLM Error:', error);
      throw error;
    }
  }

  async generateResponse(systemPrompt, userMessage, context = '') {
    const messages = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `[KONTEXT]\n${context}\n\n[USER]\n${userMessage}`,
      },
    ];

    return await this.chat(messages, {
      temperature: 0.8,
      max_tokens: 600,
    });
  }
}

const mistralClient = new MistralClient();
