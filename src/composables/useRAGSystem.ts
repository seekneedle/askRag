import { ref } from 'vue';
import axios, { AxiosProgressEvent } from 'axios';
import { generateSpeech } from './Text2Speech';
import { AudioQueueManager } from './AudioQueueManager';
import { extractJsonObjects } from '../utils/utils';
import { config } from '../config/config';

const STREAM_QUERY_URL = `${config.api.baseUrl}/vector_store/stream_query`;
const QUERY_URL = `${config.api.baseUrl}/vector_store/query`;

//let authToken = ref<string | null>(null);
let seenBytes = 0;
const shouldDisplayText = ref(true);

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Add a rate limiter for audio generation
class AudioProcessingManager {
  // Static instance variable
  private static instance: AudioProcessingManager;

  private queue: Array<() => Promise<ArrayBuffer>> = [];
  private runningTasks = 0;
  private readonly MAX_CONCURRENT = 1; // Limit to 1 concurrent audio generations
  private readonly DELAY_BETWEEN_CALLS = 500; // 500ms delay between calls
  private accumulatedChunk = '';
  private readonly SENTENCE_DELIMITER = '。';
  private sentenceSequence = 0;  // Add this line to track full sentence count
  // Create audio context and source for decoding
  private audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  private audioQueueManager = AudioQueueManager.getInstance();
  // Private constructor to prevent direct instantiation
  private constructor() {}

  // Static method to get the singleton instance
  public static getInstance(): AudioProcessingManager {
    if (!AudioProcessingManager.instance) {
      AudioProcessingManager.instance = new AudioProcessingManager();
    }
    return AudioProcessingManager.instance;
  }

  async enqueue(generator: () => Promise<ArrayBuffer>): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await generator();
          const safeResult = result.byteLength > 0 ? result : new ArrayBuffer(0);
          resolve(safeResult);
          return safeResult;
        } catch (error) {
          reject(error);
          throw error; // Re-throw to maintain original error handling
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    while (this.queue.length > 0 && this.runningTasks < this.MAX_CONCURRENT) {
      const generator = this.queue.shift();
      if (generator) {
        this.runningTasks++;
        try {
          await generator();
        } catch (error) {
          console.error('Error processing audio generation:', error);
        } finally {
          this.runningTasks--;
          // Add a delay between calls using the DELAY_BETWEEN_CALLS constant
          if (this.queue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, this.DELAY_BETWEEN_CALLS));
          }
          // Continue processing the queue
          this.processQueue();
        }
      }
    }
  }

  private async decodeAudioData(buffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      // Create a deep copy of the ArrayBuffer using Uint8Array
      const uint8Array = new Uint8Array(buffer);
      const audioBufferCopy = uint8Array.buffer;
      
      // Attempt to decode audio data with error handling
      const decodingAttempts: (() => Promise<AudioBuffer>)[] = [
        () => this.audioContext.decodeAudioData(buffer),
        () => this.audioContext.decodeAudioData(audioBufferCopy),
        async () => {
          const blob = new Blob([audioBufferCopy], { type: 'audio/mp3' });
          const arrayBuffer = await blob.arrayBuffer();
          return this.audioContext.decodeAudioData(arrayBuffer);
        }
      ];

      // Validate input buffer
      if (!buffer || buffer.byteLength === 0) {
        reject(new Error('Invalid or empty audio buffer'));
        return;
      }

      // Ensure audio context is in the right state
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(console.error);
      }

      // Use the helper method to attempt decoding
      this.attemptDecode(decodingAttempts)
        .then(resolve)
        .catch(reject);
    });
  }

  private async attemptDecode(attempts: (() => Promise<AudioBuffer>)[]): Promise<AudioBuffer> {
    if (attempts.length === 0) {
      throw new Error('All audio decoding attempts failed');
    }

    try {
      return await attempts[0]();
    } catch (error) {
      console.error('Audio decoding attempt failed:', {
        error: error
      });
      return this.attemptDecode(attempts.slice(1));
    }
  }

  async processAudioChunk(chunk: string): Promise<void> {
    // Accumulate chunks until a complete sentence is formed
    this.accumulatedChunk += chunk;

    // Check if the accumulated chunk contains a complete sentence
    if (this.accumulatedChunk.includes(this.SENTENCE_DELIMITER)) {
      // Split sentences and filter out empty ones
      const sentences = this.accumulatedChunk.split(this.SENTENCE_DELIMITER)
        .filter(sentence => sentence.trim() !== '');

      // If we have at least one complete sentence
      if (sentences.length > 0) {
        // Take only the first sentence
        const sentence = sentences[0];
        const fullSentence = sentence + this.SENTENCE_DELIMITER;

        //capture the current sentence sequence to be tied with audio
        let currentSentenceSequence = this.sentenceSequence;
        console.log(`Processing sentence ${currentSentenceSequence}: ${fullSentence}`);
        
        // Increment sentence sequence
        this.sentenceSequence++;

        // Remove the processed sentence from the accumulated chunk
        this.accumulatedChunk = this.accumulatedChunk.replace(fullSentence, '');

        // Generate speech for the complete sentence
        const audioBuffer = await this.enqueue(() => generateSpeech(fullSentence));
        
        const audioBufferDecoded = await this.decodeAudioData(audioBuffer);
        // Process audio in background
        console.log('sentenceSequence of audio playback', {
          sentence: fullSentence, 
          sentenceSequence: currentSentenceSequence
        });
        await this.audioQueueManager.processAudioInBackground(audioBufferDecoded, currentSentenceSequence);
      }
    }
  }

  async stopAudioPlayback() {
    this.audioQueueManager.stopAudioPlayback();
  }
}

const audioProcessor = AudioProcessingManager.getInstance();

async function makeNormalQueryRequest(question: string): Promise<string> {
  const requestBody = {
    id: "wtu9xf10cd", // knowledge base id
    messages: [
      {
        "role": "user", 
        "content": question
      }
    ],
    system: "", // optional system prompt
    top_k: 20,  // adjust these values as needed
    rerank_top_k: 5,
  };

  const axiosConfig = {
    headers: {
      'Authorization': `Basic ${btoa(`${config.auth.username}:${config.auth.password}`)}`,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  };

  try {
    const response = await axios.post(QUERY_URL, requestBody, axiosConfig);
    if (response.data.code == 200) {
      return response.data.data.content;
    } else {
      return response.data.error;
    }
  } catch (error) {
    console.error('Normal query request error:', error);
    throw error;
  }
}

async function makeStreamQueryRequest(question: string, onChunk: (chunk: string) => void): Promise<void> {
  shouldDisplayText.value = true;
  const requestBody = {
    id: "wtu9xf10cd", // knowledge base id
    messages: [
      {
        "role": "user", 
        "content": question
      }
    ],
    system: 'You are a helpful assistant.',
    top_k: 20,  // adjust these values as needed
    rerank_top_k: 5,
  };

  const axiosConfig = {
    headers: {
      'Authorization': `Basic ${btoa(`${config.auth.username}:${config.auth.password}`)}`,
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    responseType: 'stream' as const,
    onDownloadProgress: async (progressEvent: AxiosProgressEvent) => {
      if (progressEvent.event && progressEvent.event.target) {
        const target = progressEvent.event.target as XMLHttpRequest;
        const responseText = target.responseText.slice(seenBytes || 0);
        seenBytes = target.responseText.length;
        
        if (responseText) {
          const jsonObjects = extractJsonObjects(responseText);

          const chunks = jsonObjects
            .map((obj) => obj.data?.content || '')
            .filter((content: string) => content.trim() !== '');

          const chunksArray = chunks.flatMap((chunk) => chunk.split('\n').filter(Boolean));

          for (const chunk of chunksArray) {
            try {
              // Only display text if shouldDisplayText is true
              if (shouldDisplayText.value) {
                onChunk(chunk);
                // Process audio in background
                await audioProcessor.processAudioChunk(chunk);
              } else {
                audioProcessor.stopAudioPlayback(); 
              }
            } catch (chunkError) {
              console.error('Error processing stream chunk:', {
                error: chunkError,
                chunkLength: chunk?.length ?? 0
              });
            }
          }
        }
      }
    }
  };

  try {
    seenBytes = 0;
    await axios.post(STREAM_QUERY_URL, requestBody, axiosConfig);
  } catch (error) {
    console.error('Stream query request error:', error);
    throw error;
  }
}

export function useRAGSystem() {
  const isLoading = ref(false);
  const isStreamingMode = ref(true);
 
  const messages = ref<Message[]>([
    {
      role: 'assistant',
      content: 'Hello Boss! How can I assist you today?'
    }
  ]);
  const error = ref<string | null>(null);

  const stopStreaming = () => {
    shouldDisplayText.value = false;
  };

  async function getResponse(question: string) {
    error.value = null;
    messages.value.push({ role: 'user', content: question });
    const assistantMessageIndex = messages.value.push({ 
      role: 'assistant', 
      content: '' 
    }) - 1;

    isLoading.value = true;
    try {
      if (isStreamingMode.value) {
        await makeStreamQueryRequest(question, (chunk) => {
          messages.value[assistantMessageIndex].content += chunk;
        });
      } else {
        const response = await makeNormalQueryRequest(question);
        messages.value[assistantMessageIndex].content = response;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      error.value = errorMessage;
      
      messages.value[assistantMessageIndex].content = `Error: ${errorMessage}`;
    } finally {
      isLoading.value = false;
    }
  }

  function toggleStreamingMode() {
    isStreamingMode.value = !isStreamingMode.value;
  }

  return {
    messages,
    isLoading,
    error,
    isStreamingMode,
    getResponse,
    toggleStreamingMode,
    stopStreaming
  };
}