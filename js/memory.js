/**
 * Memory Engine
 * Speichert und verwaltet Mias Erinnerungen
 */

class MemoryEngine {
  constructor(storage, stateManager) {
    this.storage = storage;
    this.stateManager = stateManager;
    this.contextWindow = [];
  }

  async addMemory(content, type = 'interaction', metadata = {}) {
    const age = this.stateManager.getAge();
    
    const memory = {
      timestamp: Date.now(),
      day: this.stateManager.state.ageData.currentDay,
      age: age.display,
      type,
      content,
      metadata: {
        location: this.stateManager.state.location,
        emotion: this.stateManager.state.emotion,
        ...metadata,
      },
    };

    await this.storage.addMemory(memory);
    
    this.contextWindow.push(memory);
    if (this.contextWindow.length > 50) {
      this.contextWindow.shift();
    }

    return memory.id;
  }

  async getRecentMemories(type = null, limit = 30) {
    let memories;
    if (type) {
      memories = await this.storage.getMemoriesByType(type, limit * 2);
    } else {
      memories = await this.storage.getMemories(limit * 2);
    }
    return memories.slice(0, limit);
  }

  async getMemoriesAbout(keyword, limit = 20) {
    const memories = await this.storage.getMemories(500);
    return memories
      .filter(m => m.content.toLowerCase().includes(keyword.toLowerCase()))
      .slice(0, limit);
  }

  async formatMemoriesForContext(limit = 20) {
    const memories = await this.getRecentMemories(null, limit);
    
    return memories
      .map(m => `[Tag ${m.day}] ${m.type}: ${m.content}`)
      .join('\n');
  }

  async getStoryMemories() {
    return await this.storage.getMemoriesByType('story', 50);
  }

  async getEventMemories() {
    return await this.storage.getMemoriesByType('event', 50);
  }

  async getEmotionalMemories(emotion = 'traurig') {
    const memories = await this.storage.getMemories(300);
    return memories.filter(m => 
      m.metadata.emotion?.label?.toLowerCase().includes(emotion.toLowerCase())
    );
  }

  async clearMemories() {
    await this.storage.clearMemories();
    this.contextWindow = [];
  }
}

const memoryEngine = new MemoryEngine(storage, stateManager);
