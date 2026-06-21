import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import inboxRoutes from './routes/inbox';
import kbRoutes from './routes/kb';
import ordersRoutes from './routes/orders';
import activationRoutes from './routes/activation';
import adminRoutes from './routes/admin';
import { startPollingJob } from './jobs/message-poller';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/inbox', inboxRoutes);
app.use('/api/kb', kbRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/activation', activationRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`AutoFlow API running on port ${PORT}`);
  startPollingJob();
});
