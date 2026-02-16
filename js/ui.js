/**
 * UI Controller
 * Verwaltet die Benutzeroberfläche
 */

class UIController {
  constructor(stateManager, memoryEngine, dialogGenerator) {
    this.stateManager = stateManager;
    this.memoryEngine = memoryEngine;
    this.dialogGenerator = dialogGenerator;
    this.updateInterval = null;
    this.isLoading = false;
  }

  init() {
    this.setupEventListeners();
    this.subscribeToState();
    this.startNeedsUpdate();
  }

  setupEventListeners() {
    // Chat
    document.getElementById('sendBtn').addEventListener('click', () => this.sendMessage());
    document.getElementById('userInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });

    // Settings
    document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());
    document.getElementById('closeSettingsBtn').addEventListener('click', () => this.closeSettings());

    // API Settings
    document.getElementById('saveApiBtn').addEventListener('click', () => this.saveApiSettings());
    document.getElementById('savePromptBtn').addEventListener('click', () => this.savePromptSettings());
    document.getElementById('resetPromptBtn').addEventListener('click', () => this.resetPrompt());

    // Time Control
    document.getElementById('advanceTimeBtn').addEventListener('click', () => this.advanceTime());

    // Data Management
    document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());
    document.getElementById('importDataBtn').addEventListener('click', () => this.importData());
    document.getElementById('resetAllBtn').addEventListener('click', () => this.resetAll());
  }

  subscribeToState() {
    this.stateManager.subscribe((state) => {
      this.updateUI(state);
    });
  }

  startNeedsUpdate() {
    this.updateInterval = setInterval(() => {
      this.stateManager.updateNeeds(1);
      this.stateManager.saveState();
    }, 1000);
  }

  updateUI(state) {
    const age = this.stateManager.getAge();
    document.getElementById('ageDisplay').textContent = age.display;
    document.getElementById('dayCounter').textContent = `Tag ${age.days}`;

    document.getElementById('emotionColor').style.background = state.emotion.color;
    document.getElementById('emotionLabel').textContent = state.emotion.label;

    this.updateNeedsDisplay(state.needs);
    this.updateMemoryDisplay();
  }

  updateNeedsDisplay(needs) {
    document.getElementById('hungerBar').style.width = needs.hunger + '%';
    document.getElementById('hungerValue').textContent = Math.round(needs.hunger) + '/100';

    document.getElementById('energyBar').style.width = needs.energy + '%';
    document.getElementById('energyValue').textContent = Math.round(needs.energy) + '/100';

    document.getElementById('attachmentBar').style.width = needs.attachment + '%';
    document.getElementById('attachmentValue').textContent = Math.round(needs.attachment) + '/100';

    document.getElementById('securityBar').style.width = needs.security + '%';
    document.getElementById('securityValue').textContent = Math.round(needs.security) + '/100';

    document.getElementById('stimulationBar').style.width = needs.stimulation + '%';
    document.getElementById('stimulationValue').textContent = Math.round(needs.stimulation) + '/100';
  }

  async updateMemoryDisplay() {
    const memories = await this.memoryEngine.getRecentMemories(null, 10);
    const container = document.getElementById('memoryList');
    container.innerHTML = '';

    memories.slice().reverse().forEach(mem => {
      const div = document.createElement('div');
      div.className = 'memory-item';
      div.innerHTML = `
        <strong>${mem.type}</strong>
        <div>${mem.content.substring(0, 100)}...</div>
        <small>Tag ${mem.day}</small>
      `;
      container.appendChild(div);
    });
  }

  async sendMessage() {
    const input = document.getElementById('userInput');
    const message = input.value.trim();

    if (!message || this.isLoading) return;

    this.addChatMessage(message, 'user');
    input.value = '';

    this.isLoading = true;
    document.getElementById('sendBtn').disabled = true;

    try {
      const response = await this.dialogGenerator.generateResponse(message);
      
      this.addChatMessage(response, 'mia');
      this.updateEmotionFromResponse(response);
    } catch (error) {
      this.addChatMessage(
        `Fehler: ${error.message}`,
        'system'
      );
    } finally {
      this.isLoading = false;
      document.getElementById('sendBtn').disabled = false;
    }
  }

  addChatMessage(content, sender = 'user') {
    const chatHistory = document.getElementById('chatHistory');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;

    messageDiv.appendChild(contentDiv);
    chatHistory.appendChild(messageDiv);
    chatHistory.scrollTop = chatHistory.scrollHeight;
  }

  updateEmotionFromResponse(response) {
    const lower = response.toLowerCase();
    
    if (lower.includes('wein') || lower.includes('traurig') || lower.includes('trauer')) {
      this.stateManager.setEmotion('Traurig', '#1e40af', 0.7);
    } else if (lower.includes('lach') || lower.includes('fröhlich') || lower.includes('freud')) {
      this.stateManager.setEmotion('Fröhlich', '#fbbf24', 0.8);
    } else if (lower.includes('angst') || lower.includes('ängstlich') || lower.includes('furcht')) {
      this.stateManager.setEmotion('Ängstlich', '#7c3aed', 0.7);
    } else if (lower.includes('frage') || lower.includes('warum') || lower.includes('wie')) {
      this.stateManager.setEmotion('Neugierig', '#f97316', 0.7);
    } else if (lower.includes('wut') || lower.includes('wütend') || lower.includes('nein')) {
      this.stateManager.setEmotion('Wütend', '#ef4444', 0.7);
    } else {
      this.stateManager.setEmotion('Aufmerksam', '#10b981', 0.5);
    }
  }

  openSettings() {
    const modal = document.getElementById('settingsModal');
    modal.style.display = 'flex';
    this.loadSettings();
  }

  closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
  }

  async loadSettings() {
    const apiKey = await storage.loadSetting('mistral_api_key');
    if (apiKey) {
      document.getElementById('apiKey').value = apiKey;
    }

    const model = await storage.loadSetting('mistral_model');
    if (model) {
      document.getElementById('apiModel').value = model;
    }

    const prompt = await storage.loadSetting('system_prompt');
    document.getElementById('systemPromptEditor').value = 
      prompt || this.dialogGenerator.getDefaultSystemPrompt();

    document.getElementById('currentDay').value = 
      `Tag ${this.stateManager.state.ageData.currentDay}`;

    const memories = await this.memoryEngine.getRecentMemories(null, 5);
    const debugPanel = document.getElementById('memoryDebug');
    debugPanel.textContent = JSON.stringify(memories.slice(0, 3), null, 2);
  }

  async saveApiSettings() {
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('apiModel').value;

    if (!apiKey) {
      alert('API Key erforderlich!');
      return;
    }

    await mistralClient.setApiKey(apiKey);
    await mistralClient.setModel(model);
    alert('✅ API Einstellungen gespeichert!');
  }

  async savePromptSettings() {
    const prompt = document.getElementById('systemPromptEditor').value;
    await this.dialogGenerator.updateSystemPrompt(prompt);
    alert('✅ System-Prompt gespeichert!');
  }

  resetPrompt() {
    const defaultPrompt = this.dialogGenerator.getDefaultSystemPrompt();
    document.getElementById('systemPromptEditor').value = defaultPrompt;
    alert('✅ Prompt zurückgesetzt!');
  }

  async advanceTime() {
    const days = parseInt(document.getElementById('dayInput').value) || 1;
    const newAge = await this.stateManager.advanceDay(days);
    alert(`⏰ Zeit um ${days} Tage vorstellen.\nNeue Alter: ${newAge.display}`);
    document.getElementById('currentDay').value = `Tag ${this.stateManager.state.ageData.currentDay}`;
  }

  async exportData() {
    const data = await storage.exportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mia-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert('✅ Daten exportiert!');
  }

  importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      const text = await file.text();
      const data = JSON.parse(text);
      await storage.importData(data);
      alert('✅ Daten importiert! Seite wird neu geladen...');
      setTimeout(() => location.reload(), 1*
