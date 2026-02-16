/**
 * Mia State Manager
 * Verwaltet den kompletten Zustand von Mia
 */

class StateManager {
  constructor(storage) {
    this.storage = storage;
    this.state = this.getDefaultState();
    this.listeners = [];
  }

  getDefaultState() {
    return {
      id: 'mia_001',
      name: 'Mia',
      
      ageData: {
        startDate: Date.now(),
        currentDay: 1,
        birthDay: 1,
      },
      
      location: 'Schlafzimmer',
      consciousness: 'awake',
      activity: 'Aufwachen',
      
      needs: {
        hunger: 50,
        energy: 75,
        attachment: 90,
        security: 85,
        stimulation: 40,
        hygiene: 80,
      },
      
      emotion: {
        label: 'Sicher',
        color: '#10b981',
        intensity: 0.6,
      },
      
      personality: {
        curiosity: 85,
        attachment: 90,
        anxiety: 40,
        independence: 20,
        creativity: 75,
        empathy: 30,
      },
      
      skills: {
        language: 3.0,
        vocabulary: 500,
        motor_fine: 3.0,
        motor_gross: 3.1,
        social: 3.0,
        cognitive: 3.0,
        emotional_regulation: 2.8,
      },
      
      relationships: {
        papa: { bonding: 100, trust: 100, interactions: 0 },
        lea: { bonding: 0, trust: 0, interactions: 0, met_day: null },
        mama: { bonding: 70, memory_clarity: 20, grief_stage: 'initial_awareness' },
      },
      
      lastUpdated: Date.now(),
    };
  }

  async init() {
    const saved = await this.storage.loadState('mia_state');
    if (saved) {
      this.state = saved;
    } else {
      await this.saveState();
    }
  }

  async saveState() {
    this.state.lastUpdated = Date.now();
    await this.storage.saveState('mia_state', this.state);
    this.notifyListeners();
  }

  getState() {
    return this.state;
  }

  getAge() {
    const days = this.state.ageData.currentDay;
    const baseAge = 3;
    const yearsPassed = Math.floor(days / 180);
    const daysInCurrentYear = days % 180;
    const monthsInCurrentYear = Math.floor(daysInCurrentYear / 30);

    return {
      years: baseAge + yearsPassed,
      months: monthsInCurrentYear,
      days: days,
      display: `${baseAge + yearsPassed} Jahre, ${monthsInCurrentYear} Monate`,
      stage: this.calculateDevelopmentStage(days),
    };
  }

  calculateDevelopmentStage(days) {
    if (days < 90) return '3-3.5';
    if (days < 180) return '3.5-4';
    if (days < 270) return '4-4.5';
    if (days < 360) return '4.5-5';
    if (days < 450) return '5-5.5';
    if (days < 540) return '5.5-6';
    return '6+';
  }

  updateNeeds(deltaMinutes = 1) {
    const delta = deltaMinutes / 60;

    this.state.needs.hunger = Math.max(0, this.state.needs.hunger - delta * 0.33);
    
    if (this.state.consciousness === 'awake') {
      this.state.needs.energy = Math.max(0, this.state.needs.energy - delta * 0.17);
    }

    this.state.needs.hygiene = Math.max(0, this.state.needs.hygiene - delta * 0.08);
    this.state.needs.attachment = Math.max(0, this.state.needs.attachment - delta * 0.25);
    this.state.needs.stimulation = Math.max(0, this.state.needs.stimulation - delta * 0.42);

    return this.state.needs;
  }

  async advanceDay(days = 1) {
    this.state.ageData.currentDay += days;
    
    for (let i = 0; i < days; i++) {
      this.updateNeeds(1440);
    }

    await this.saveState();
    return this.getAge();
  }

  setNeed(needName, value) {
    if (needName in this.state.needs) {
      this.state.needs[needName] = Math.max(0, Math.min(100, value));
    }
  }

  setEmotion(label, color, intensity = 0.6) {
    this.state.emotion = { label, color, intensity };
    this.notifyListeners();
  }

  setActivity(activity, location = null) {
    this.state.activity = activity;
    if (location) {
      this.state.location = location;
    }
    this.notifyListeners();
  }

  updateRelationship(character, change = {}) {
    if (character in this.state.relationships) {
      this.state.relationships[character] = {
        ...this.state.relationships[character],
        ...change,
      };
    }
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }
}

const stateManager = new StateManager(storage);
