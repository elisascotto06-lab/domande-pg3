# Domande dal pubblico · Politicamente Giovani

Due pagine:

- **`/`**: la pagina che vede il pubblico, dove scrivere e inviare la domanda.
- **`/regia`**: la pagina riservata alla regia (con password). Mostra le domande in tempo reale e permette di segnarle come *Selezionate*, *Lette*, *Scartate*, di leggerle a schermo intero e di chiudere/riaprire la ricezione.

Nessuna dipendenza da installare: serve solo Node.js 18 o superiore.

## Provarlo sul tuo computer

```
REGIA_PASSWORD=unapasswordtua node server.js
```

Poi apri `http://localhost:3000/` (pubblico) e `http://localhost:3000/regia` (regia).

## Metterlo online (link accessibile da tutti)

La soluzione più semplice è un servizio di hosting per Node.js, per esempio **Render** (piano gratuito):

1. Carica questa cartella su un repository GitHub.
2. Su render.com crea un nuovo **Web Service** collegato al repository.
   - Build command: lascia vuoto (o `npm install`)
   - Start command: `node server.js`
3. Nelle *Environment variables* aggiungi `REGIA_PASSWORD` con la password scelta per la regia.
4. Render ti darà un indirizzo tipo `https://nome-scelto.onrender.com`. Il nome (e quindi il link) lo scegli tu quando crei il servizio.

Per un link ancora più corto e personalizzato (es. `domande.politicamentegiovani.it`) puoi collegare un dominio tuo dalle impostazioni del servizio. Per l'evento puoi anche generare un **QR code** del link e mostrarlo sullo schermo.

### Cose da sapere

- Sul piano gratuito di Render il servizio "si addormenta" dopo un po' di inattività e la prima visita può metterci circa un minuto. **Aprite il link qualche minuto prima dell'evento** per svegliarlo.
- Sul piano gratuito i dati possono azzerarsi quando il servizio si riavvia. Va bene per una serata, ma non conservate le domande lì a lungo. Se serve la persistenza, usate un disco persistente (a pagamento) e impostate `DATA_DIR` sulla sua cartella.
- La **password della regia** va sempre cambiata: se non viene impostata, quella di default è `cambiami`.

## Note

- Le domande sono anonime (non si chiede nome o email) e al massimo di 400 caratteri.
- Ogni dispositivo può inviare al massimo 5 domande al minuto, per evitare abusi.
- Il testo della Privacy Policy (`public/privacy.html`) è una bozza semplice: controllatela e adattatela, aggiungendo un contatto dell'associazione.
