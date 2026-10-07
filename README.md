# Forge · Gym Tracker

React + Vite + Firebase (Auth and Firestore), deployed on Vercel.

## Run locally
```bash
npm install
cp .env.example .env     # then paste your Firebase keys
npm run dev
```

## Environment variables
Copy the values from Firebase Console > Project settings > Your apps > Web app:

`VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
`VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`

Add the same variables in Vercel > Project > Settings > Environment Variables.

## Data model (Firestore)
Everything lives under `users/{uid}` so each person only sees their own data:

- `users/{uid}`: name, unit, startWeight, targetWeight, targetDate
- `users/{uid}/weights/{id}`: value (kg), date
- `users/{uid}/exercises/{id}`: name, archived
- `users/{uid}/logs/{id}`: exerciseId, exerciseName, weight (kg), reps, sets, date
- `users/{uid}/inbody/{id}`: date, weight, muscle, fatMass, fatPct, visceral, bmr, note, image

All weights are stored in kg. The unit switch only changes how they are shown.
InBody images are compressed in the browser and stored inside the document (no paid Storage plan needed).

## Security rules
See `firestore.rules`. Paste them in Firebase Console > Firestore > Rules.

## Ideas for next versions
Leaderboard and crew (new shared collection with opt-in), challenges, badges, progress photos.
