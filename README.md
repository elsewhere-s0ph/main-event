
# MAIN EVENT — Documento Master

**Versione:** 2.4 — 8 novembre 2026
**Nome del prodotto:** **Main Event** (in fase di progettazione: "Wrestling Empire Manager")
**Origine:** consolidamento di GDD 1.0 + TDD 1.0 + ADD 1.0, con le modifiche approvate in data 7 novembre 2026
**Repo:** `elsewhere-s0ph/main-event`
**Deploy:** https://main-event.pages.dev/
**Stato:** sviluppo in corso — C0 superato · C1 superato (verificato dall’utente) · C2 completato (CI verde, demo /match online) · C3 completato (v0.3.0: gestionale base, in attesa di verifica utente)

> **Come usare questo documento.** È l'unica fonte di verità del progetto. Chi lavora al progetto — umano o AI — deve leggerlo prima di toccare il codice, e deve aggiornarlo quando una decisione cambia. GDD 1.0, TDD 1.0 e ADD 1.0 restano come riferimento storico, ma in caso di conflitto vince questo documento. Ogni cambiamento rilevante va registrato nel Registro decisioni (§13).

---

# 1. Il progetto in una pagina

Main Event è un simulatore manageriale di wrestling: l'utente è proprietario e General Manager di una federazione e ne gestisce ogni aspetto — roster, contratti, campionati, booking, rivalità, storyline, eventi, finanze, pubblico e reputazione.

Il progetto offre due esperienze complementari:

1. **Gestionale profondo** — ogni decisione ha conseguenze persistenti nel breve e lungo periodo.
2. **Spettacolo visivo** — i match scelti dall'utente si animano da soli su un ring isometrico in pixel art 2D HD.

L'utente non controlla mai direttamente i wrestler: la simulazione statistica determina il risultato, il motore grafico lo rappresenta.

**Pilastri di gioco:** libertà di booking · conseguenze reali · personalità dei wrestler (non solo statistiche) · spettacolo · profondità senza complicazione inutile · accessibilità touch + desktop · rigiocabilità · mondo che evolve anche senza il giocatore.

**Posizionamento studio:** per Little Elsewhere questo è sempre un'"**app**", mai un "gioco" (comunicazione esterna, landing, descrizioni store).

**Vincoli fissi:** PWA single player, offline-first, nessun backend nella prima versione, nessuna API a pagamento obbligatoria, nessun contenuto protetto di federazioni reali distribuito ufficialmente.

---

# 2. Decisioni vincolanti

| Area | Decisione | Note |
|---|---|---|
| Linguaggio | TypeScript (strict) | |
| Build | Vite | |
| UI | React + Zustand + React Router | CSS Modules; React non tocca le animazioni |
| Rendering | Phaser 3 | integrato in React con un solo componente wrapper, mai ricreato a ogni render |
| Grafica | Pixel art 2D HD | visuale isometrica del ring |
| **Animazione** | **Pose chiave + tween (rig)** | *Modifica v2:* niente animazioni frame-based pure; dettagli in §6 |
| **Orientamenti sprite** | **2 disegnati (fronte/retro) + flip** | *Modifica v2:* coprono le 4 direzioni isometriche |
| Simulazione | Deterministica con seed (PRNG controllato) | mai `Math.random()` nei motori |
| Stato UI | Zustand | non contiene lo stato della simulazione |
| Persistenza | IndexedDB via Dexie.js | salvataggi versionati, import/export JSON |
| Validazione | Zod | |
| PWA | vite-plugin-pwa + standard studio | vedi §9 |
| **Test** | **Vitest (motori) + typecheck + build in CI** | *Modifica v2:* Playwright solo dal Checkpoint 7 |
| Backend | Nessuno | Supabase solo ipotetico in futuro |
| **Lingua UI** | **Italiano al lancio** | *Modifica v2:* landing bilingue solo se/quando esiste |
| Modalità | Single player, offline-first | |
| **Controlli spettatore** | Play, pausa, velocità, salta al risultato | *Modifica v2:* riavvolgere rimandato alle funzionalità future |

Qualsiasi modifica a questa tabella va motivata e registrata nel Registro decisioni (§13).

---

# 3. Architettura

## 3.1 Livelli

1. **Presentation Layer** — React: dashboard, roster, schede, booking, titoli, finanze, calendario, interfaccia match.
2. **Application Layer** — operazioni richieste dalla UI (creare wrestler, assumere, organizzare match, avviare show).
3. **Domain Layer** — regole di gioco pure: WrestlerEngine, MatchEngine (simulazione), BookingEngine, RivalryEngine, EconomyEngine, FederationEngine, WorldEngine. **Non dipende da React né da Phaser.**
4. **Infrastructure Layer** — Dexie/IndexedDB, repository, import/export, versionamento, asset.
5. **Rendering Layer** — scene Phaser, ring, entità, animazioni, effetti, camera.

## 3.2 Flusso

```text
REACT UI → APPLICATION → DOMAIN (Booking / MatchSim / Economy)
                                |
                     MatchSim → EVENT TIMELINE → PHASER → RENDERING
                                |
                              DATABASE
```

Regola d'oro: **la simulazione non dipende dalla velocità di rendering**. Il simulatore produce una timeline di eventi; Phaser la riproduce. Il risultato non è mai deciso dalle animazioni.

## 3.3 Struttura del progetto

```text
main-event/
├── public/assets/{wrestlers,rings,arenas,effects,ui,audio}
├── src/
│   ├── app/            (App, router, providers)
│   ├── components/     (common, layout, cards, charts, forms)
│   ├── features/       (dashboard, roster, booking, rivalries, titles, finances, calendar, history)
│   ├── game/
│   │   ├── core/       (GameManager, GameClock, PRNG, EventBus)
│   │   ├── engines/    (Wrestler, Match, Booking, Rivalry, Economy, Federation, World)
│   │   ├── simulation/ (MatchSimulator, ActionResolver, Momentum, Stamina, Pinfall)
│   │   ├── animation/  (PoseRegistry, MoveTimeline, SyncController)
│   │   ├── data/       (wrestlers, moves, archetypes, federations, titles)
│   │   └── types/
│   ├── renderer/       (PhaserGame, scenes/, entities/, camera/, effects/)
│   ├── data/           (repositories, database, migrations, import-export)
│   ├── hooks/ stores/ services/ styles/ utils/
├── tests/
├── docs/
└── package.json
```

---

# 4. Modello dati

ID univoci e stabili per ogni entità, mai basati sul nome visualizzato. Attributi su scala 0–100.

## 4.1 Wrestler (sintesi)

```ts
interface Wrestler {
  id: string;
  identity: { name: string; realName?: string; age: number; nationality: string; height: number; weight: number };
  attributes: {
    // fisici: strength speed agility stamina recovery durability condition
    // tecnici: technical brawling aerial power submission defense
    // mentali: charisma intelligence aggression determination discipline creativity
  };
  personality: { archetype: string; alignment: "face" | "heel" | "tweener"; ambition: number; loyalty: number; professionalism: number; morale: number };
  career: { popularity: number; experience: number; potential: number; matches: number; wins: number; losses: number; draws: number };
  presentation: { gimmick: string; spriteId: string; entranceId?: string; musicId?: string };
  moveset: { moveIds: string[]; signatureMoveIds: string[]; finisherMoveIds: string[] };
  status: { condition: number; stamina: number; injured: boolean; injuryId?: string };
}
```

Archetipi di personalità: arrogante, carismatico, opportunisto, leale, aggressivo, codardo, professionale, imprevedibile. Le caratteristiche evolvono nel tempo.

**Face/Heel non binario:** allineamento principale + livello di coerenza col personaggio; il pubblico reagisce alle azioni. Previsti face/heel/double turn, gimmick change, tradimenti, riconciliazioni.

**Corporature** (influenzano silhouette e animazioni, non solo statistiche): Cruiserweight, Lightweight, Middleweight, Heavyweight, Super Heavyweight, Muscoloso, Atletico, Massiccio, Alto e slanciato, Luchador.

## 4.2 Contratti, Match, Risultati

```ts
interface Match { id: string; participants: { wrestlerIds: string[]; teamIds?: string[] }; matchType: string; stipulation?: string; championshipId?: string; durationTarget: number; status: "planned"|"scheduled"|"simulated"|"completed"; result?: MatchResult }

interface MatchResult { winnerIds: string[]; loserIds: string[]; duration: number; rating: number; finishType: string; eventTimeline: MatchEvent[]; titleChange?: boolean }

interface MatchEvent { id: string; timestamp: number; type: string; actorId?: string; targetId?: string; moveId?: string; duration: number; result?: string; metadata?: Record<string, unknown> }
```

## 4.3 Titoli e rivalità

- `Championship`: nome, categoria (world/secondary/tag/women's/cruiserweight/hardcore), campione/i attuale/i, data assegnazione, difese, storico regni, prestigio. Numero di titoli libero per federazione. Albi d'oro e record tracciati.
- `Rivalry`: partecipanti, intensità, popolarità, stato (attiva/pausa/risolta). Fasi: inizio → provocazione → escalation → conflitto → culmine → risoluzione. Generabili dagli eventi e dal booking manuale.

## 4.4 Versionamento salvataggi

```ts
interface SaveMetadata { saveId: string; gameVersion: string; schemaVersion: number; createdAt: string; updatedAt: string; randomSeed: number }
```

Ogni modifica futura al modello dati passa da migrazioni: mai cancellare una partita per aggiornare l'app.

## 4.5 Identità della federazione (C3)

La carriera (`Career`) porta con sé l'identità della federazione: `colors` (primario/secondario/accento, hex), `philosophy` (spettacolare, tecnica, hardcore, mainstream, sviluppo giovani — stessa lista delle federazioni AI §8), `shows` (1–4 show settimanali con nome e giorno), `logo` (immagine caricata dall'utente come dataURL, o null = stemma generato dalle iniziali con i colori). Validazione Zod in `src/game/core/federation.ts`; migrazione lazy a SCHEMA_VERSION 2 riempie i salvataggi precedenti con i default, senza toccare nessun dato esistente.

---

# 5. Motore di simulazione

## 5.1 Input → Output

Il MatchEngine è indipendente da Phaser. Riceve: partecipanti, attributi, condizioni fisiche, mosse disponibili, tipo di match, stipulazioni, seed. Restituisce: risultato, durata, timeline di eventi, statistiche, rating.

## 5.2 Determinismo

PRNG controllato con seed (stessa filosofia di Pitchtory: mulberry32 + seed da stringa per risultati riproducibili). Stessi dati + stesse regole + stesso seed + stessa versione del motore = stesso match. Niente `Math.random()` nei moduli di simulazione.

## 5.3 Stati e variabili

Macchina a stati per wrestler (Entrance, Idle, Grappling, Attacking, Defending, Selling, Knockdown, Grounded, PinAttempt, SubmissionAttempt, RopeBreak, Recovery, Victory, Defeat) più uno stato generale del match.

Variabili dinamiche separate dagli attributi permanenti: **Health, Stamina, Momentum, Damage, Fatigue, Confidence, CrowdReaction**.

## 5.4 Regole chiave

- **Selezione azioni:** stato corrente, distanza, posizionamento, energia, attributi, disponibilità della mossa, contesto. Mai un singolo attributo a decidere una probabilità.
- **Successo:** attaccante rilevante vs difesa avversario, fatica, momentum, compatibilità mossa, modificatori di contesto — con limiti per evitare percentuali estreme.
- **Stamina:** cala con corse, power move, sequenze, sottomissioni; recupero da Recovery + tempo di inattività; la fatica degrada progressivamente l'efficacia.
- **Pinfall:** danni accumulati, stamina, qualità della mossa precedente, difesa, determinazione, momentum → kickout, interferenze, rope break, vittoria.
- **Durata:** parametro obiettivo, non vincolo — incontri brevi, equilibrati, dominati, con rimonte e finali sorprendenti.
- **Rating:** varietà, equilibrio, intensità, durata, coinvolgimento, importanza evento, aspettative del pubblico. Non è la somma degli attributi.

## 5.5 Event Timeline

La timeline è la **fonte ufficiale** degli eventi del match; la usano renderer, commento testuale, statistiche, rating e archivio storico. Esempio: 00:00 Entrance · 00:15 Lock-up · 00:24 Irish Whip · 00:29 Shoulder Block · 00:41 Pin Attempt · 00:45 Kickout · 00:58 Suplex · 01:28 Finisher · 01:42 Pin Attempt · 01:48 Victory.

---

# 6. Motore grafico e animazione — approccio pose + tween *(modifica v2)*

## 6.1 Principio

Le animazioni **non sono sprite sheet frame-by-frame**: sono **pose chiave interpolate dal motore**. Ogni wrestler è un contenitore Phaser di parti componibili (corpo base, testa, costume), ancorato a punti articolari predefiniti. Una mossa è una sequenza di pose (offset/rotazione/scala delle parti) con tween di interpolazione tra loro.

Perché: l'AI generativa non produce sprite sheet coerenti frame per frame — con pose + tween servono poche decine di pose per corporatura, riusabili per tutte le mosse, e le animazioni restano fluide a qualsiasi velocità di riproduzione.

```ts
interface PoseDefinition { id: string; parts: Record<string, { x: number; y: number; rotation: number; scale?: number }>; }
interface MoveAnimation { id: string; steps: Array<{ poseId: string; duration: number; easing: string; syncGroup?: string }>; }
```

## 6.2 Sincronizzazione

Le mosse che coinvolgono due wrestler sono un'unica sequenza coordinata, gestita da un **SyncController**: il suplex è una sola definizione con due ruoli (attaccante/vittima) che si muovono sugli stessi syncGroup — mai due animazioni indipendenti che sperano di coincidere.

## 6.3 Isometrica

- Coordinate logiche del ring separate da quelle dello schermo; conversione dedicata:
  `screenX = originX + (worldX - worldY) * tileWidth / 2; screenY = originY + (worldX + worldY) * tileHeight / 2;`
- **Depth sorting:** wrestler, arbitro, corde, pali, effetti ordinati per profondità. Le corde sono spezzate per lato in livelli separati (lati posteriori dietro i wrestler, lati anteriori davanti), decisi dalla posizione del wrestler rispetto al centro.
- **Direzioni (v2):** 2 orientamenti disegnati per sprite (fronte/retro) + flip orizzontale = 4 direzioni isometriche (NE, SE, SW, NW). Direzioni intermedie solo se servono davvero.

## 6.4 Fallback e controllo

- Pose mancante → fallback su pose generica compatibile; il match non si blocca mai; l'asset mancante viene loggato; il risultato simulato non cambia mai.
- Controlli spettatore: **play, pausa, velocità ×1/×2/×4, salta al risultato**, statistiche in tempo reale, commento testuale attivabile. Niente rewind nella v1.
- Ring composto da livelli separati e personalizzabili (struttura, tappeto, corde, pali, protezioni, scaletta, logo).

---

# 7. Pipeline degli asset

## 7.1 Stile

Pixel art **2D HD** moderna: pixel definiti, contorni puliti (non per forza neri), ombre coerenti con una luce comune, palette controllata, anatomia stilizzata proporzionata. Niente estetica 8-bit. Dimensioni indicative: wrestler 96×128 px su area di lavoro 128×160, ring ~640×360, spettatore 32×48 — valori da validare col prototipo.

**Riferimento approvato:** il Visual Prototype Pack (novembre 2026) — Raven Black, 5 corporature (Cruiserweight, Middleweight, Heavyweight, Super Heavyweight, Luchador), sprite sheet di riferimento, suplex in 6 momenti, arene alternative, palette. Lo stile del gioco è quello.

## 7.2 Modularità

Personaggi composti da parti sovrapponibili: corpo base (per corporatura) + testa + capelli/barba + costume + calzature + accessori. **Nuovi wrestler = combinazioni di parti esistenti + palette/costumi via codice**, non nuovi disegni da zero. I costumi sono varianti predefinite, no ricolorazioni libere che rompono ombre e dettagli.

## 7.3 Regole di produzione

1. L'AI generativa produce concept e singole pose; **mai integrare immagini generate senza verifica** (proporzioni, trasparenza, palette, orientamento, pivot, coerenza tra pose).
2. Ogni asset ha manifest JSON (id, dimensioni, pose disponibili, anchor, compatibilità).
3. Naming descrittivo: `wrestler_body_heavy_01.png`, `pose_suplex_attacker.png`, `ring_rope_red.png`.
4. Nessun contenuto protetto di federazioni/performer reali distribuito ufficialmente; il sistema è predisposto per contenuti personalizzati e, in futuro, mod.

---

# 8. Gestionale

**Roster:** assunzioni, licenziamenti, rinnovi, stipendi, contratti esclusivi/a gettone, promozioni, infortuni, riposi, tag team, stable, manager. I wrestler possono rifiutare offerte, chiedere aumenti, lamentarsi dell'utilizzo, chiedere di andarsene. Relazioni tra wrestler: amicizia, rivalità personale, rispetto, antipatia, alleanza, inimicizia — influenzano collaborazione, storyline e morale.

**Booking:** show composti da match + segmenti (promo, interviste, interferenze, attacchi backstage, celebrazioni, annunci). Match types v1: singles, tag, triple threat, fatal 4-way, handicap, battle royal, royal rumble, tournament. Espansioni: ladder, tables, cage, hell in a cell, hardcore, submission, last man standing, iron man. Stipulazioni: squalifica on/off, count-out, condizioni speciali di vittoria, titolo in palio, conseguenze narrative.

**Eventi:** show settimanali, special event, PPV, tornei, tour. Ogni evento ha nome, data, arena, città, capacità, card, budget; a fine evento si calcolano affluenza, ricavi, spese, valutazione, soddisfazione del pubblico, evoluzione delle rivalità.

**Economia:** entrate (biglietti, merchandising, sponsor, TV, streaming, eventi speciali) e uscite (stipendi, arene, produzione, trasporti, marketing, medici, amministrazione). Registrazione di ogni transazione: bilancio con storico, mai un singolo valore modificato a mano. Importi in interi, valuta configurabile.

**Federazioni AI:** roster, budget, reputazione, filosofia di booking (tecnica, spettacolare, hardcore, mainstream, sviluppo giovani), obiettivi. Decidono da sole assunzioni, licenziamenti, booking, rivalità, eventi, titoli. Mercato wrestler condiviso tra federazioni. Calendario interno con elaborazione ordinata delle giornate, progettata per l'avanzamento veloce senza costi inutili.

**Progressione:** gioco infinito — invecchiamento, evoluzione delle caratteristiche, emergere di giovani, ritiri, nuovi ingressi nel mercato, federazioni che crescono o falliscono, record aggiornati, Hall of Fame.

---

# 9. PWA, persistenza e qualità

## 9.1 PWA (standard studio, obbligatorio)

Secondo lo standard Little Elsewhere: manifest completo (id, icone 192/512 any + maskable separati + SVG, shortcuts, screenshots wide+narrow, lang, display standalone, colori coerenti) · service worker con precache resiliente per elemento, navigazioni network-first con fallback shell offline, asset cache-first, timbro di build automatico, banner "Aggiorna" controllato (mai skipWaiting silenzioso) · `beforeinstallprompt` + istruzioni iOS/iPadOS · `_headers` con CSP (prima in Report-Only), HSTS, nosniff, X-Frame-Options, Referrer-Policy, Permissions-Policy · bundle pesanti lazy · target Lighthouse mobile ≥90/100/≥95.

## 9.2 Persistenza

Dexie.js su IndexedDB. Tabelle: saves, wrestlers, federations, contracts, championships, rivalries, shows, matches, matchResults, storylines, finances, settings. I moduli di gioco non toccano mai il DB direttamente: solo tramite repository. Autosave + salvataggio manuale + slot multipli + export/import JSON versionato (un import non valido non sovrascrive mai un salvataggio esistente). I dati di gioco non dipendono dalla cache del service worker.

## 9.3 Test (v2)

- **Da subito:** Vitest sui motori (simulazione: timeline, risultati, stamina, pinfall, stipulazioni — qui i test valgono oro), typecheck e build in CI (GitHub Actions).
- **Dal Checkpoint 7:** Playwright end-to-end (avvio → nuova partita → federazione → wrestler → match → simulazione → risultato → salvataggio → riapertura → recupero).
- Scenari di test grafico (sprite mancanti, desync, depth) verificati a mano sul prototipo, poi automatizzati dove conviene.

## 9.4 Performance

60 FPS target con riduzione adattiva · texture atlas · asset caricati su richiesta (mai tutto l'archivio all'avvio) · pubblico a gruppi di sprite animati in ciclo, mai individui · memoria controllata.

---

# 10. Roadmap — checkpoint

> **Priorità assoluta (confermata):** il progetto **non** inizia con il gestionale completo. Prima si dimostra la fattibilità del sistema distintivo — il match animato. I checkpoint sono riordinati di conseguenza rispetto al TDD 1.0.

**C0 — Ambiente.** Repo, Vite + React + TS, ESLint/Prettier, CI (typecheck + build), LICENSE, README. *Superato quando:* l'app vuota compila e la CI è verde.

**C1 — Fondamenta.** Navigazione responsive (mobile-first), Zustand, Dexie, autosave. *Superato quando:* creazione e recupero di una partita funzionano.

**C2 — Prototipo del motore (cuore del progetto).** Ring isometrico, due wrestler originali (corporature diverse), simulazione automatica deterministica → event timeline → animazioni sincronizzate pose+tween (idle, camminata, presa, una mossa d'impatto, una finisher, knockdown, rientro, schienamento, kickout), barra energia, controlli play/pausa/velocità/skip, schermata risultato. *Superato quando:* due personaggi disputano da soli un incontro completo, leggibile e bello da vedere, con risultato corretto dal motore — su desktop **e** smartphone.

**C3 — Gestionale base.** Creazione federazione (nome, logo, colori, filosofia, show settimanali), modello dati wrestler completo, roster, schede, contratti, titoli, albi d'oro. *Superato quando:* gestione completa di un piccolo roster. **Completato il 10/11/2026 (v0.3.0).**

**C4 — Booking & show.** Card, segmenti, rivalità con fasi narrative, turn, eventi speciali, valutazione show. *Superato quando:* si organizza e si svolge uno show completo.

**C5 — Universo persistente.** Federazioni AI, mercato, economia, evoluzione/progressione temporale, classifiche, archivio, Hall of Fame. *Superato quando:* il mondo vive da solo tra uno show e l'altro.

**C6 — Espansione contenuti.** Più corporature, mosse, tipi di match avanzati (cage, ladder, hardcore…), arene, pubblico, effetti, entrate.

**C7 — Pubblicazione.** PWA a pieno standard (§9.1), Playwright, ottimizzazione, test su dispositivi reali, CSP enforced, backup. *Superato quando:* app installabile e stabile.

Ogni checkpoint superato = un commit (o una serie coerente) + README aggiornato + versione (semver) aggiornata.

---

# 11. Protocollo di lavoro AI + Flynn

## Regole per l'AI (vincolanti in ogni sessione)

1. Leggere il codice esistente prima di modificarlo; mai ricostruire file senza ragione.
2. Mantenere compatibilità con i moduli esistenti; il codice resta modulare e comprensibile.
3. Verificare compilazione ed eseguire i test pertinenti prima di dichiarare finito.
4. Documentare le nuove dipendenze; nessuna dipendenza non necessaria.
5. Non dichiarare concluso un checkpoint senza verificarne i criteri.
6. Aggiornare questo documento (e il registro decisioni) quando una decisione cambia.
7. Commit per checkpoint; mai modifiche strutturali importanti senza una versione di recupero.

## Regole operative GitHub (lezioni da Pitchtory e da Main Event — revisionate l'8/11/2026)

- **Canali di push e lettura: caratteristiche accertate (lezione critica, 08/11/2026).** Durante la pagina bianca del primo deploy si è scoperto che i canali di trasporto testo hanno un bug deterministico: **inseriscono un newline ogni 2000 caratteri**. Mappatura verificata con evidenza CI + MCP:
  1. **`create_or_update_file`: canale PULITO** — il file arriva identico al byte (provato: il push del 13a541a era integro e la CI verde). **È il canale obbligatorio per i push di codice e documenti.** Un file per commit.
  2. **`push_files`: CORROMPE i file ≥ 2000 caratteri** (newline a 2000/4000/… — ha spezzato `className` in `CareerSelect.tsx` e causato la pagina bianca). Da usare solo per file < 2000 char oppure con il trucco del padding dei confini (garantire un a-capo ai punti 2000/4000/6000… del contenuto: il newline del trasporto diventa una riga vuota innocua).
  3. **Verifica post-push: `get_file_contents` (connettore MCP) + CI.** `get_file_contents` restituisce il contenuto reale ed è il canale di verifica; la CI (tsc) è il gate sintattico che becca ogni corruzione che rompe il codice.
  4. **I fetch via `open_url` (raw.githubusercontent.com, api.github.com) corrompono in INGRESSO** (stesso newline a 2000 char): **mai** usarli per verificare l'integrità dei file — producono falsi "danni" su file in realtà integri (è ciò che ha ingannato la prima diagnosi).
  5. Le scritture/letture file nella sandbox sono pulite (verificate con round-trip).
- **Immagini binarie:** si corrompono (ricodifica UTF-8) → si caricano a mano via web.
- Payload molto grandi possono andare in timeout senza eseguire il commit → push da 1–2 file, sempre verificare con la lista commit.

## Compiti di Flynn (che nessuna IA può fare)

- Testare l'app sul proprio telefono (installazione PWA reale).
- Approvare o bocciare lo stile visivo (VPP prima, prototipo poi): "così è bello / così no".
- Decisioni di gusto: nomi, tono, gimmick, palette.
- Amministrazione: repo e hosting (Cloudflare Pages come per Pitchtory).

---

# 12. Criteri di accettazione della prima versione

App installabile come PWA · funziona su PC e smartphone · utilizzabile offline · crea e gestisce una federazione · roster con contratti e caratteristiche · organizza show · rivalità e campionati · simula autonomamente gli incontri · li mostra con animazioni isometriche sincronizzate · salva i risultati · riprende la partita dopo la chiusura · nessuna dipendenza da servizi AI a pagamento · supera i test di integrazione ed e2e principali.

---

# 13. Registro decisioni

| Data | Decisione | Motivazione |
|---|---|---|
| nov 2026 | GDD 1.0 + TDD 1.0 + ADD 1.0 | base progettuale |
| 07/11/2026 | Approvato il Visual Prototype Pack come riferimento di stile | sblocca la produzione di asset |
| 07/11/2026 | Animazioni: pose chiave + tween al posto di frame-based puro | l'AI generativa non produce sprite sheet coerenti; così servono poche pose per corporatura, riusabili per ogni mossa |
| 07/11/2026 | Orientamenti sprite: 2 disegnati + flip (invece di 4) | dimezza la produzione di asset senza perdita leggibile |
| 07/11/2026 | Rimandato "riavvolgere" ai controlli futuri | richiede seek completo della timeline; non necessario in v1 |
| 07/11/2026 | Test: Vitest sui motori + CI; Playwright dal C7 | scala di testing realistica per sviluppo AI-assistito |
| 07/11/2026 | UI solo italiana al lancio | coerenza con Pitchtory; landing bilingue solo se serve |
| 07/11/2026 | Roadmap riordinata: prototipo (C2) prima del gestionale | dimostrare prima il sistema distintivo del progetto |
| 07/11/2026 | Registro "app" per lo studio | posizionamento Little Elsewhere |
| 07/11/2026 | PWA e repo rinominate: **Main Event** (`elsewhere-s0ph/main-event`); "Wrestling Empire Manager" resta solo come riferimento storico della progettazione | nome breve, memorabile, allineato alla repo |
| 07/11/2026 | C0 superato: scaffold compilato, CI verde | ambiente pronto |
| 08/11/2026 | C1 completato: creazione federazione + dashboard responsive, persistenza Dexie/Zustand, CI verde, app online su main-event.pages.dev | fondamenta pronte per C2; manca solo la verifica utente (crea/rinomina/chiudi-riapri) |
| 08/11/2026 | Protocollo GitHub revisionato: push solo via `create_or_update_file` (canale pulito); `push_files` riservato a file < 2000 char o con padding; verifica con `get_file_contents` + CI, mai con fetch raw (corrompono in ingresso) | il bug "newline ogni 2000 caratteri" vive in `push_files` (uscita) e nei fetch raw/API (ingresso), non in `create_or_update_file`; la doppia diagnosi errata via raw ha portato al protocollo v2.2, corretto in v2.3 |
| 08/11/2026 | C1 superato: verifica utente andata a buon fine su main-event.pages.dev (creazione federazione, persistenza dopo chiusura della tab) | fondamenta confermate, si passa al prototipo del motore |
| 08/11/2026 | C2 completato: motore di incontro deterministico (mulberry32 seminato, timeline di eventi), ring isometrico su Canvas 2D, animazioni pose+tween, demo su /match (seed via ?seed=), v0.2.0 | prototipo pronto per la verifica utente su desktop e smartphone |
| 08/11/2026 | Correzioni nate dalla prima CI rossa di C2: (1) i valori `as const` nei parametri default di funzione generano tipi letterali — `gap: number = DUR.gap` invece di `gap = DUR.gap`; (2) schienamento vincente solo su avversario davvero piegato (energia <= 18 endgame, < 25 flusso normale) — niente vittorie con lo sconfitto fresco; invarianti del motore ora verificati in CI su 17 seed | tsc strict come gate + test deterministici su molti seed: le regressioni del motore non passano più |
| 08/11/2026 | Prototipo C2 realizzato con Canvas 2D puro (niente Phaser): scena logica 480×300, scheletri a stecche con proporzioni per corporatura, corde disegnate in due livelli (dietro/davanti ai wrestler) | misurare prima sul prototipo: se Canvas regge anche con pubblico ed effetti, valutare la promozione a decisione vincolante; Phaser resta l’opzione per scene complesse |
| 10/11/2026 | Contratti completati: stato (attivo / in scadenza / scaduto), rinnovi a 26/39/52 settimane con paga ricalcolata, licenziamento; titoli e albi d'oro: Championship con regni storici (nome congelato nel regno), incoronazione, vacanza, titolo pesi leggeri riservato ai cruiserweight, pagina dedicata e card in dashboard | il gestionale del roster è completo; la data di gioco resta ferma al 2027-01-01 finché C4 non introduca il tempo settimanale |
| 10/11/2026 | C3 completato (v0.3.0): identità federazione — colori, filosofia di booking (spettacolare/tecnica/hardcore/mainstream/sviluppo giovani), 1–4 show settimanali con nome e giorno, logo caricato o stemma generato dalle iniziali; SCHEMA_VERSION 2 con migrazione lazy; fix id wrestler con prefisso saveId (evitate collisioni Dexie tra federazioni) | chiuso il gestionale base: si passa al booking e agli show (C4) |