import express from 'express';
import cors from 'cors';
import { BailianService } from './bailianService';

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const bailianService = new BailianService();

app.post('/api/retrieve', async (req, res) => {
  try {
    const { query } = req.body;
    console.log('Retrieve API called with query:', query);
    const results = await bailianService.retrieve(query);
    console.log('Retrieve API results:', results);
    res.json({ results });
  } catch (error) {
    console.error('Error in retrieve:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, documents } = req.body;
    console.log('Chat API called with messages:', messages);
    console.log('Chat API documents:', documents);
    const response = await bailianService.getChatResponse(messages, documents);
    console.log('Chat API response:', response);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: 'Internal server error', details: errorMessage });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
