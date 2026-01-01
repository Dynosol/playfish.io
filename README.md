<p align="center">
  <img src="readme-header.png" alt="playfish.io" width="350">
</p>

<p align="center">
  <strong>The classic team card game of deduction — now online.</strong>
</p>

<p align="center">
  <a href="https://playfish.io">playfish.io</a>
</p>

---

## What is Fish?

Fish is a strategic team card game for 4, 6, or 8 players. Teams compete to collect "half-suits" by asking opponents for specific cards and making deductions based on the questions asked.

Not to be confused with Go Fish.

---

## Tech Stack

|  |  |
|--|--|
| **Frontend** | React · TypeScript · Vite · Tailwind · Shadcn |
| **Backend** | Firebase (Firestore, Cloud Functions, Hosting) |

---

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

---

## License

MIT
