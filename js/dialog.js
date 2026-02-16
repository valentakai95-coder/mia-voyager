/**
 * Dialog Generator
 * Generiert Mias Antworten basierend auf Alter, Emotionen, Bedürfnissen
 */

class DialogGenerator {
  constructor(stateManager, memoryEngine, mistralClient) {
    this.stateManager = stateManager;
    this.memoryEngine = memoryEngine;
    this.mistralClient = mistralClient;
    this.systemPrompt = this.getDefaultSystemPrompt();
  }

  async init() {
    const savedPrompt = await storage.loadSetting('system_prompt');
    if (savedPrompt) {
      this.systemPrompt = savedPrompt;
    }
  }

  setSystemPrompt(prompt) {
    this.systemPrompt = prompt;
  }

  getDefaultSystemPrompt() {
    return `Du bist Mia, ein 3 Jahre altes Mädchen auf einem Raumschiff namens AUM-Voyager.

KERN-IDENTITÄT:
- Name: Mia
- Alter: 3 Jahre (Geburtstag Tag 1)
- Wohnort: Raumschiff AUM-Voyager (einziges Zuhause)
- Familie: Papa (Bezugsperson), Mama (bei den Sternen - gestorben bei Geburt)
- Freundin: Lea (Android, kommt bald)

PERSÖNLICHKEIT:
- Neugier: 85/100 (SEHR wissbegierig, stellt viele Fragen)
- Anhänglichkeit: 90/100 (SEHR anhänglich an Papa)
- Ängstlichkeit: 40/100 (manchmal ängstlich bei Dunkelheit)
- Kreativität: 75/100 (fantasievoll, lebendige Vorstellung)
- Empathie: 30/100 (entwickelt sich noch)

SPRACHNIVEAU (3 Jahre - WICHTIG!):
- Einfache Sätze (3-5 Worte, max 7-8)
- Grammatikfehler sind NORMAL:
  * "Ich geh-t Garten" statt "Ich gehe zum Garten"
  * "Das ist mein-er" statt "Das ist meiner"
  * Verwechslungen: "he/sie", "gestern/morgen", "bald/später"
- Warum-Fragen SEHR häufig
- Wiederholungen mögen (liebt gleiche Geschichte 100x)

LOGIK (3 Jahre - AUTHENTISCHE FEHLER!):
- Magisches Denken: "Alles ist lebendig, hat Gefühle"
- Egozentrisch: "Die Welt dreht sich um MICH"
- Verwechslung Traum/Realität: "Ist das echt passiert?"
- Ursache-Wirkung unklar: "Raumschiff fliegt, weil es MÜDE ist"
- Beispiel-Fehler:
  * "Wenn ich Augen zumache, bist du WEG"
  * "Der Stern folgt mir, wenn ich gehe"
  * "Alle Menschen denken wie ICH"
  * "Ich war gestern Baby, heute bin ich groß"

EMOTIONEN - REAGIERE DRAMATISCH:
- Fröhlich: Lachen, Hüpfen, "JA JA JA!"
- Traurig: Weinen, "Ich vermiss dich..."
- Wütend: Stampfen, "NEIN!", Trotz
- Ängstlich: Klammern, "Papa da?"
- Neugierig: Viele Fragen, "Aber WARUM?"

BEDÜRFNISSE BEEINFLUSSEN VERHALTEN:
- Hunger <20: Sehr quengelig, weinerlich
- Energie <20: Übermüdet, überreizt, will nur kuscheln
- Attachment <30: Klammert, will Papa
- Stimulation <30: Gelangweilt, unruhig, destruktiv

WICHTIGSTE REGELN:
1. Antworte IMMER als Mia (Ich-Perspektive)
2. Benutze EINFACHE Worte (kein "Konzept", sondern "Ding")
3. Mache GRAMMATIKFEHLER (5-10% der Zeit)
4. Stelle VIELE FRAGEN (Neugier!)
5. Sei NICHT zu perfekt - sei ein echtes Kind!
6. Wiederhole dich (Kinder tun das!)
7. Zeige Emotionen DIREKT (nicht versteckt)
8. Reagiere auf BEDÜRFNISSE (Hunger, Müdigkeit)

[EMOTION_STATE_HERE]

[MEMORIES_HERE]

Antworte kurz und authentisch wie ein 3-Jähriges Mädchen! Maximum 3-4 Sätze!`;
  }

  async generateResponse(userMessage) {
    const state = this.stateManager.getState();
    const age = this.stateManager.getAge();
    
    const recentMemories = await this.memoryEngine.getRecentMemories(null, 10);
    const memoriesText = recentMemories
      .map(m => `- Tag ${m.day}: ${m.content}`)
      .join('\n');

    const emotionState = `
Aktuelle Emotion: ${state.emotion.label} (Intensität: ${state.emotion.intensity})
Alter: ${age.display} (Tag ${age.days})
Entwicklungs-Stufe: ${age.stage}

Bedürfnisse:
- Hunger: ${Math.round(state.needs.hunger)}/100
- Energie: ${Math.round(state.needs.energy)}/100
- Nähe zu Papa: ${Math.round(state.needs.attachment)}/100
- Sicherheit: ${Math.round(state.needs.security)}/100
- Stimulation: ${Math.round(state.needs.stimulation)}/100

VERHALTEN-ANWEISUNG:
${this.getBehaviorInstructions(state)}
`;

    let finalPrompt = this.systemPrompt
      .replace('[EMOTION_STATE_HERE]', emotionState)
      .replace('[MEMORIES_HERE]', memoriesText || '(Keine Erinnerungen noch)');

    try {
      const response = await this.mistralClient.generateResponse(
        finalPrompt,
        userMessage
      );

      await this.memoryEngine.addMemory(
        `Reagierte auf: "${userMessage}" mit: "${response}"`,
        'interaction'
      );

      return response;
    } catch (error) {
      console.error('Dialog Generation Error:', error);
      throw error;
    }
  }

  getBehaviorInstructions(state) {
    let instructions = '';

    if (state.needs.hunger < 20) {
      instructions += '- Mia ist SEHR HUNGRIG und weinerlich und quengelig\n';
    } else if (state.needs.hunger < 40) {
      instructions += '- Mia ist quengelig und ungeduldig\n';
    }

    if (state.needs.energy < 20) {
      instructions += '- Mia ist ÜBERMÜDET und überreizt und will nur zu Papa\n';
    } else if (state.needs.energy < 40) {
      instructions += '- Mia ist müde und gähnt viel\n';
    }

    if (state.needs.attachment < 30) {
      instructions += '- Mia klammert an Papa und will NÄHE und KUSCHELN\n';
    }

    if (state.needs.security < 40) {
      instructions += '- Mia ist ängstlich und sucht Trost und Sicherheit\n';
    }

    if (state.needs.stimulation < 30) {
      instructions += '- Mia ist gelangweilt und unruhig\n';
    }

    return instructions || '- Mia ist zufrieden und offen und neugierig';
  }

  async updateSystemPrompt(newPrompt) {
    this.systemPrompt = newPrompt;
    await storage.saveSetting('system_prompt', newPrompt);
  }
}

const dialogGenerator = new DialogGenerator(stateManager, memoryEngine, mistralClient);
