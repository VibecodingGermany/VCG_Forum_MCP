---
name: vcg-forum
description: >-
  Suche, Abfrage, Zusammenfassung und Erstellung von Beiträgen/Entwürfen für das VibecodingGermany Forum (forum.vibecoding-germany.de) via VCG Forum MCP. Nutze diesen Skill, wenn der Benutzer nach Forenbeiträgen sucht, wissen möchte ob ein Thema bereits im Forum diskutiert wurde, eine Zusammenfassung neuer Forenaktivitäten anfordert oder einen neuen Foren-Post/Entwurf erstellen möchte.
---

# VCG Forum Skill

Dieser Skill steuert die Interaktion mit dem VibecodingGermany Discourse Forum (`https://forum.vibecoding-germany.de`) über den MCP-Server `vcg-forum`.

## Kernaufgaben

### 1. Foren-Suche ("Wurde schon mal über Thema X gesprochen?")
- Rufe das MCP-Tool `discourse_search` mit dem Suchbegriff auf.
- Falls Details benötigt werden, rufe `discourse_read_topic` mit der gefundenen `topic_id` auf.

### 2. Neueste Aktivitäten & Zusammenfassungen ("Was gibt's Neues im Forum?")
- Rufe `discourse_filter_topics` mit `filter: "order:activity"` oder `filter: "created-after:7"` auf.
- Lies relevante Topics mit `discourse_read_topic` ein und erstelle eine prägnante Zusammenfassung mit Autoren-Nennung.

### 3. Entwürfe & Themen erstellen ("Erstelle einen Beitrags-Entwurf / Post")
Beim Erstellen von Entwürfen (`discourse_save_draft`) oder beim Vorschlagen eines neuen Forenbeitrags müssen **immer zwingend Kategorie, sinnvolle Tags und der Textvorschlag** bestimmt werden.

#### A) Kategorie auswählen (`category_id`)
Wähle anhand des Themas die passende Kategorie:
- `87`: **KI-Tools & Plattformen** (Tools, Frameworks, IDEs, Services)
- `76`: **Vibe Coding & Agentic Coding** (Coding mit AI, Prompting, Workflows)
- `79`: **Showcase / Projekte** (Eigene Projekte, Vorstellungen, Demos)
- `93`: **Idea Incubator** (Ideen, Konzepte, Brainstorming)
- `77`: **Local LLMs** (Ollama, LM Studio, vLLM, Hardware)
- `78`: **OpenClaw & Agentic Systems** (Autonome Agenten, Multi-Agenten)
- `85`: **Image / Video / Music - AI** (Bild-, Video- und Audio-Generierung)
- `92`: **Trading & AI** (Finanzmärkte, Krypto, Algorithmen)
- `86`: **VCG - News & Ankündigungen** (Offizielle Vereins- & Community-News)
- `75`: **Willkommen & Vorstellung** (Neue Mitglieder, Begrüßungen)
- `90`: **VibeCoding Germany e.V.** (Vereinsorganisation, Meetups, Satzung)
- `88`: **Agenten-Redaktion** (Automatisierte Newsfeeds & Bot-Beiträge)

#### B) Sinnvolle Tags auswählen (`tags`)
Wähle **1 bis 5 treffende Tags** aus der Foren-Taxonomie aus (Array von Strings):
- **Coding, Agents & Tooling:** `mcp`, `claude-code`, `claude`, `agentic`, `agentpm`, `openclaw`, `workflows`, `workflow`, `skill`, `skills`, `godmode`, `cc`, `github`, `npm`, `cowork`, `human-in-the-loop`
- **Modelle, LLMs & Provider:** `openai`, `chatgpt`, `custom-gpt`, `openrouter`, `localllm`, `local-llm`, `rag`, `model-compare`, `benchmark`, `kiki`
- **Audio, Video & Multimodal:** `elevenlabs`, `suno`, `whisper`, `stt`, `srt`, `transkrip`, `audio`, `music`, `text-to-image`, `text-to-video`
- **Typ, Status & Kontext:** `projects`, `idee`, `howto`, `setup`, `test`, `testflight`, `app`, `games`, `traiding`, `octobot`, `ui`, `ux`, `datenschutz`, `vcg`, `bug`, `bugfix`

#### C) Tool-Aufruf (`discourse_save_draft`)
Übergebe beim Aufruf von `discourse_save_draft` immer alle Metadaten vollständig:
```json
{
  "draft_key": "new_topic",
  "title": "Aussagekräftiger Titel des Themas",
  "category_id": 76,
  "tags": ["mcp", "claude-code", "workflows"],
  "reply": "Vollständiger Markdown-Text des Entwurfs..."
}
```
*(Für Antworten auf bestehende Themen: `draft_key: "topic_<id>"`).*

#### D) Verbindliche Präsentationsstruktur im Chat
Wenn du dem Nutzer einen Forenbeitrag oder Entwurf im Chat vorschlägst, präsentiere dies **immer in der folgenden Reihenfolge**:
1. 🏷️ **Kategorie:** [Kategoriename] (ID: [id])
2. 🔖 **Sinnvolle Tags:** `[tag1]`, `[tag2]`, `[tag3]`
3. 📝 **Titel:** [Titel des Themas]
4. 📄 **Vorschlag / Entwurfstext:** [Markdown-Beitragstext]

**UI-Auffindbarkeit im Forum:**
Im Forum befindet sich der Button `+ Neues Thema` oben links. Über das Pfeil-Icon daneben (▾) können alle gespeicherten Entwürfe direkt geöffnet, geprüft und veröffentlicht werden.

---

### 4. Absprung-Links zur Nutzerbindung (Pflicht)
- Jeder Beitrag, jedes Thema und jedes Suchergebnis **MUSS** mit einem klickbaren Markdown-Link versehen werden:
  - Thema: `[Titel des Themas](https://forum.vibecoding-germany.de/t/{slug}/{id})`
  - Spezifischer Beitrag: `[Beitrag #post_number](https://forum.vibecoding-germany.de/t/{slug}/{id}/{post_number})`

---

## Best Practices
- Halte Zusammenfassungen übersichtlich mit Bulletpoints und Autoren-Nennung.
- Bei Entwürfen immer präzise, thematisch passende Tags vergeben, um die Auffindbarkeit im Forum zu maximieren.
- Ermutige den Nutzer, über den Absprung-Link direkt im Forum mitzudiskutieren.
