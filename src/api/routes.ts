import { Router, Request, Response } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { env } from '../config/env';

type ConnectionStatus = 'connected' | 'disconnected';

/**
 * Creates the Express router with all HTTP endpoints.
 *
 * Accepts injected dependencies rather than importing globals so the
 * router stays testable and decoupled from Baileys internals.
 */
export function createRouter(
  getConnectionStatus: () => ConnectionStatus,
  sendMessage: (to: string, text: string) => Promise<void>
): Router {
  const router = Router();

  /**
   * @openapi
   * /health:
   *   get:
   *     summary: Health check
   *     description: Returns gateway and WhatsApp connection status. Used by Railway for auto-restart.
   *     responses:
   *       200:
   *         description: Service status
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: ok
   *                 whatsapp:
   *                   type: string
   *                   enum: [connected, disconnected]
   */
  router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', whatsapp: getConnectionStatus() });
  });

  /**
   * @openapi
   * /send:
   *   post:
   *     summary: Send a WhatsApp message
   *     description: >
   *       Egress endpoint for downstream apps to deliver messages to the user.
   *       Accepts plain phone numbers only — the gateway normalises to JID internally.
   *     security:
   *       - ApiKeyAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [to, text]
   *             properties:
   *               to:
   *                 type: string
   *                 description: Recipient phone number without + (e.g. 919876543210)
   *                 example: "919876543210"
   *               text:
   *                 type: string
   *                 example: "Your task was saved!"
   *     responses:
   *       200:
   *         description: Message sent
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 status:
   *                   type: string
   *                   example: sent
   *       400:
   *         description: Missing required fields
   *       401:
   *         description: Invalid or missing API key
   *       503:
   *         description: WhatsApp not connected
   */
  router.post('/send', async (req: Request, res: Response) => {
    const apiKey = req.headers['x-api-key'];

    // Checked first so unauthenticated callers learn nothing about the payload shape.
    if (apiKey !== env.GATEWAY_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { to, text } = req.body as { to?: string; text?: string };
    if (!to || !text) {
      return res.status(400).json({ error: 'Missing "to" or "text"' });
    }

    if (getConnectionStatus() === 'disconnected') {
      return res.status(503).json({ error: 'WhatsApp not connected' });
    }

    try {
      await sendMessage(to, text);
      return res.json({ status: 'sent' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: message });
    }
  });

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: 'Odyssey Gateway API',
        version: '2.0.0',
        description: 'Personal WhatsApp API Gateway — egress and health endpoints.',
      },
      components: {
        securitySchemes: {
          ApiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
          },
        },
      },
    },
    // Swagger scans both source (dev) and compiled output (prod).
    apis: ['./src/api/routes.ts', './dist/api/routes.js'],
  });

  router.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  router.get('/docs.json', (_req, res) => res.json(swaggerSpec));

  return router;
}
