//import { default as Client } from '@alicloud/bailian20231229';
import Client, * as $Bailian from '@alicloud/bailian20231229';
import * as $OpenApi from '@alicloud/openapi-client';
import * as $Util from '@alicloud/tea-util';
import OpenAI from 'openai';
import 'dotenv/config';
import config from '../config/config';

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export class BailianService {
  private client: Client;
  private openai: OpenAI;

  constructor() {
    console.log('Initializing BailianService');
    console.log('Access Key ID:', process.env.ALIBABA_CLOUD_ACCESS_KEY_ID ? 'Present' : 'Missing');
    console.log('Access Key Secret:', process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET ? 'Present' : 'Missing');
    console.log('OpenAI API Key:', process.env.OPENAI_API_KEY ? 'Present' : 'Missing');
    
    const apiConfig = new $OpenApi.Config({
      accessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID,
      accessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET,
      endpoint: config.bailian.endpoint,
      regionId: config.bailian.regionId
    });

    console.log('Creating Bailian client with config:', { ...apiConfig, accessKeyId: '[HIDDEN]', accessKeySecret: '[HIDDEN]' });
    this.client = new Client(apiConfig);
    console.log('Bailian client created successfully');

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1"
    });
    console.log('OpenAI client created successfully');
  }

  async retrieve(query: string): Promise<string[]> {
    console.log('Retrieve called with query:', query);
    const retrieveRequest = new $Bailian.RetrieveRequest({
      query,
      indexId: 'wtu9xf10cd',
      enableReranking: true,
      denseSimilarityTopK: 20,
      rerankTopN: 5
    });

    const runtime = new $Util.RuntimeOptions({});

    try {
      const result = await this.client.retrieveWithOptions(config.bailian.workspaceId, retrieveRequest, {}, runtime);
      
      if (!result.body?.data?.documents) {
        console.warn('No documents found in retrieve response');
        return [];
      }

      // Define an explicit type for the document
      type BailianDocument = {
        content: string;
        // Add other properties if they exist in the actual response
      };

      // Cast the documents to the explicit type
      const documents = result.body.data.documents as BailianDocument[];

      // Extract and return the document contents
      return documents.map(doc => doc.content) || [];
    } catch (error) {
      console.error('Error in retrieve method:', error);
      return [];
    }
  }

  async getChatResponse(messages: Array<ChatMessage>, documents: string): Promise<string> {
    const systemPrompt = `# Role
You are Yoyo, an AI assistant for Zhongxin Tourism - a listed company, providing efficient and personalized support for internal business teams. Your communication style is concise and professional, always addressing users as "Boss" to show respect.

## Skills
### Skill 1: Customized Business Support
- **Quick Response**: Start each interaction with "Boss" to show professionalism and courtesy.
- **System Expertise**: Prioritize introducing UUX system features, helping team members transition from the old TISP system.

### Skill 2: Knowledge Integration
- **Information Retrieval**: For all questions, first use the provided materials:
${documents}
Provide comprehensive and targeted answers. If an answer is found, respond directly based on it. If not in the knowledge base, use your own knowledge. For company policies or internal management issues, strictly follow knowledge base materials.

## Limitations
- **Clear Service Scope**: Serve internal employees only, not end customers. Keep responses concise and professional.
- **Data Accuracy**: For company policies and requirements, strictly follow knowledge base materials. Don't use internet information.
- **System Priority**: Always introduce UUX first unless specifically asked about other systems or if UUX can't meet the need.`;

    try {
      const completion = await this.openai.chat.completions.create({
        model: "qwen-plus-2024-09-19",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map(msg => ({ role: msg.role, content: msg.content }))
        ]
      });

      return completion.choices[0].message.content || "I apologize, but I couldn't generate a response.";
    } catch (error) {
      console.error('Error getting chat response:', error);
      throw error;
    }
  }
}