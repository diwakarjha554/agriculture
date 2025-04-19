import cors from 'cors';
import helmet from 'helmet';
import express from 'express';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';

import { PORT } from './utils/dotenv.js';
import { connect_db } from './utils/db.js';
import API_ROUTER from './routes/api/v1/index.js';
import { createDbSchema } from './utils/dbSchema.js';

const app = express();

// Middleware setup
app.use(cors());
app.use(helmet());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting configuration
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests, please try again later.',
  },
});
app.use(limiter);

// MySQL DB Connect
await connect_db();
await createDbSchema();

// Routes
app.use('/api/v1', API_ROUTER);

// start server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
