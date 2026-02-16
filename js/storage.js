/**
 * IndexedDB Storage Manager
 * Speichert alle Daten lokal persistent
 */

class StorageManager {
  constructor(dbName = 'MiaVoyager', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error('IndexedDB Error: ' + request.error));

      request.onupgradeneeded = (e) => {
        const db = e.target.result;

        if (!db.objectStoreNames.contains('state')) {
          db.createObjectStore('state');
        }
        if (!db.objectStoreNames.contains('memories')) {
          const memStore = db.createObjectStore('memories', { keyPath: 'id', autoIncrement: true });
          memStore.createIndex('timestamp', 'timestamp', { unique: false });
          memStore.createIndex('type', 'type', { unique: false });
        }
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
        if (!db.objectStoreNames.contains('chat_history')) {
          const chatStore = db.createObjectStore('chat_history', { keyPath: 'id', autoIncrement: true });
          chatStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
    });
  }

  async saveState(key, data) {
    const tx = this.db.transaction('state', 'readwrite');
    const store = tx.objectStore('state');
    await store.put(data, key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  }

  async loadState(key) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('state', 'readonly');
      const store = tx.objectStore('state');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('State Load Error'));
    });
  }

  async addMemory(memory) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      const request = store.add(memory);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Memory Add Error'));
    });
  }

  async getMemories(limit = 100) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('memories', 'readonly');
      const store = tx.objectStore('memories');
      const request = store.getAll();

      request.onsuccess = () => {
        const memories = request.result.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
        resolve(memories);
      };
      request.onerror = () => reject(new Error('Memory Get Error'));
    });
  }

  async getMemoriesByType(type, limit = 50) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('memories', 'readonly');
      const store = tx.objectStore('memories');
      const index = store.index('type');
      const request = index.getAll(type);

      request.onsuccess = () => {
        const memories = request.result.slice(0, limit);
        resolve(memories);
      };
      request.onerror = () => reject(new Error('Memory Type Get Error'));
    });
  }

  async clearMemories() {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('memories', 'readwrite');
      const store = tx.objectStore('memories');
      const request = store.clear();

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(new Error('Memory Clear Error'));
    });
  }

  async saveSetting(key, value) {
    const tx = this.db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    await store.put(value, key);
    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  }

  async loadSetting(key) {
    return new Promise((resolve) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async addChatMessage(message) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chat_history', 'readwrite');
      const store = tx.objectStore('chat_history');
      const request = store.add(message);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error('Chat Add Error'));
    });
  }

  async getChatHistory(limit = 200) {
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('chat_history', 'readonly');
      const store = tx.objectStore('chat_history');
      const request = store.getAll();

      request.onsuccess = () => {
        const messages = request.result.sort((a, b) => a.timestamp - b.timestamp).slice(-limit);
        resolve(messages);
      };
      request.onerror = () => reject(new Error('Chat Get Error'));
    });
  }

  async exportData() {
    const state = await this.loadState('mia_state');
    const memories = await this.getMemories(1000);
    const settings = await this.loadSetting('settings');
    const chat = await this.getChatHistory(500);

    return {
      state,
      memories,
      settings,
      chat_history: chat,
      exportDate: new Date().toISOString(),
    };
  }

  async importData(data) {
    if (data.state) await this.saveState('mia_state', data.state);
    if (data.memories) {
      await this.clearMemories();
      for (const memory of data.memories) {
        await this.addMemory(memory);
      }
    }
    if (data.settings) await this.saveSetting('settings', data.settings);
    return true;
  }

  async clearAll() {
    const tx = this.db.transaction(['state', 'memories', 'settings', 'chat_history'], 'readwrite');
    tx.objectStore('state').clear();
    tx.objectStore('memories').clear();
    tx.objectStore('settings').clear();
    tx.objectStore('chat_history').clear();

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve(true);
    });
  }
}

const storage = new StorageManager();
