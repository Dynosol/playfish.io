<p align="center">
  <img src="readme-header.png" alt="playfish.io" width="350">
  <br><br>
  <strong>The classic team card game of deduction — now online.</strong>
  <br>
  <a href="https://playfish.io">playfish.io</a>
</p>

## What is Fish?

Fish is a strategic team card game for 4, 6, or 8 players. Teams compete to collect "half-suits" by asking opponents for specific cards and making deductions based on the questions asked. Not to be confused with Go Fish.

App created with React, TypeScript, Vite, Tailwind, and Shadcn for the frontend, firestore cloud functions for game logic and firestore for storage.

Frontend code is located in `src/`, while Cloud Functions are in `functions/`.

## Rules

### The Deck

A standard deck with all 8s removed, leaving 48 cards. These form eight half-suits:

- **Low:** 2, 3, 4, 5, 6, 7 of each suit
- **High:** 9, 10, J, Q, K, A of each suit

Cards are dealt evenly. Players sit alternating by team.

### Taking a Turn

On your turn, ask any opponent for a specific card. Your question is valid only if:

- You hold at least one card from that half-suit
- You do not already have the card you're asking for

**If they have it:** They give it to you face-up. You ask again.

**If they don't:** The turn passes to them.

You may only ask opponents—never teammates.

### Making a Declaration

When you believe your team holds all six cards of a half-suit, you may declare it on your turn. State exactly which teammate has which card.

- **If correct:** Your team claims that half-suit.
- **If incorrect:** The opposing team claims it—even if your team had all the cards but you named the wrong holder.

Only declare when you are certain. A wrong guess hands the half-suit to your opponents.

### Running Out of Cards

Players who lose all their cards cannot be asked questions, so the turn cannot pass to them.

When one team has no cards left, the other team must declare all remaining half-suits without consulting each other.

### Winning

The team that declares the most half-suits wins. With eight half-suits total, you need five to win outright. Ties at four each are possible.

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Lint
pnpm lint
```

### Local Development

```bash
# Start Firebase emulators
firebase emulators:start
```

| Service | Port |
|---------|------|
| Vite dev server | 5173 |
| Firebase Emulator UI | 4000 |
| Firestore emulator | 8080 |
| Functions emulator | 5001 |

### Deploying Functions

```bash
pnpm --dir functions run build && firebase deploy --only functions
```

## License

MIT
