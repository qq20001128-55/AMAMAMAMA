import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post('/api/webhook/discord', async (req, res) => {
    try {
      const { nickname, category, price, contact, email } = req.body;
      
      // Use environment variable for webhook URL
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL || "https://discord.com/api/webhooks/1493563364444471398/tcBS2db1T93onhkIFxbTidbhfRgVcL4o4y1-itI6qcEYsYKj6dLDePODT-tPh27ODvYz";
      
      if (!webhookUrl) {
        return res.status(500).json({ error: 'Webhook URL not configured' });
      }

      const embed = {
        title: "🏮 龍契局：收到新的委託願望！",
        color: 3355443, // #333333 in decimal
        fields: [
          {
            name: "委託人名稱",
            value: nickname || "未提供",
            inline: true
          },
          {
            name: "委託項目",
            value: category || "未提供",
            inline: true
          },
          {
            name: "金額",
            value: price || "請確認價目表",
            inline: false
          },
          {
            name: "聯絡方式",
            value: `${email ? `Email: ${email}\n` : ''}${contact ? `其他: ${contact}` : ''}`,
            inline: false
          }
        ],
        timestamp: new Date().toISOString()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed]
        })
      });

      if (!response.ok) {
        throw new Error(`Discord API error: ${response.status}`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Failed to send webhook' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
