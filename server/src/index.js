import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import claudeRouter from './routes/claude.js';
import rentcastRouter from './routes/rentcast.js';
import walkscoreRouter from './routes/walkscore.js';
import teleportRouter from './routes/teleport.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/claude', claudeRouter);
app.use('/api/rentcast', rentcastRouter);
app.use('/api/walkscore', walkscoreRouter);
app.use('/api/teleport', teleportRouter);

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
