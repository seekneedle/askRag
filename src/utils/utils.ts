import axios from 'axios';
import { config } from '../config/config';

const AUTH_URL = 'user/login';
/**
 * Extracts JSON objects from a given text string
 * Handles nested JSON objects by tracking bracket count
 * 
 * @param text - The input text containing JSON objects
 * @returns An array of parsed JSON objects
 */
export const extractJsonObjects = (text: string): any[] => {
  const jsonObjects: any[] = [];
  let currentJson = '';
  let bracketCount = 0;

  for (let char of text) {
    if (char === '{') bracketCount++;
    if (char === '}') bracketCount--;

    currentJson += char;

    if (bracketCount === 0 && currentJson.trim() !== '') {
      try {
        const parsedObject = JSON.parse(currentJson);
        jsonObjects.push(parsedObject);
        currentJson = '';
      } catch (error) {
        currentJson = '';
        bracketCount = 0;
      }
    }
  }

  return jsonObjects;
};


// Helper function to guess audio format based on file signature
export const identifyAudioFormat = (uint8Array: Uint8Array): string => {
  // Check for common audio file signatures
  const signatures = [
    { format: 'WAV', signature: [82, 73, 70, 70] },  // RIFF
    { format: 'MP3', signature: [255, 251] },        // MP3 frame sync
    { format: 'AAC', signature: [255, 240] },        // AAC
    { format: 'FLAC', signature: [102, 76, 97, 67] } // fLaC
  ];

  for (const sig of signatures) {
    if (sig.signature.every((byte, index) => uint8Array[index] === byte)) {
      return sig.format;
    }
  }

  return 'Unknown';
}


export async function getAuthToken(): Promise<string> {
  try {
    const response = await axios.post(AUTH_URL, 
      { name: "sales" },
      {
        auth: {
          username: config.auth.username,
          password: config.auth.password
        },
        headers: {        
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        withCredentials: true
      }
    );
    console.log('Full response details from auth:', {
      status: response.status,
      headers: response.headers,
      data: response.data
    });
    const authToken = response.data.data.token;
    if (authToken === null) {
      throw new Error('Authentication token is null');
    }
    return authToken;
  } catch (error) {
    console.error('Error getting auth token:', error);
    return Promise.reject(error);
  }
}