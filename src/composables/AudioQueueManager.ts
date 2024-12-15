// Manages sequential audio playback
export class AudioQueueManager {
    private static instance: AudioQueueManager;
    private audioContext: AudioContext;
    private queue: Array<{
        buffer: AudioBuffer;
        onComplete: () => void;
        sequence: number;
    }> = [];
    private isPlaying = false;
    private currentSource: AudioBufferSourceNode | null = null;
    private textToAudioDelay = 500; // Default 500ms delay between text and audio
    private pendingBuffers = new Map<number, {
        buffer: AudioBuffer;
        onComplete: () => void;
    }>();
    private nextToPlay = 0;

    private constructor() {
        this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    public static getInstance(): AudioQueueManager {
        if (!AudioQueueManager.instance) {
            AudioQueueManager.instance = new AudioQueueManager();
        }
        return AudioQueueManager.instance;
    }

    public setTextToAudioDelay(delay: number) {
        this.textToAudioDelay = delay;
    }

    public stopAudioPlayback() {
        if (this.currentSource) {
            this.currentSource.stop();
            this.currentSource.disconnect();
            this.currentSource = null;
        }
        // Clear all pending buffers and queue
        this.pendingBuffers.clear();
        this.queue = [];
        this.isPlaying = false;
        this.nextToPlay = 0;
    }

    public async processAudioInBackground(audioBuffer: AudioBuffer, sequence: number): Promise<void> {
        // Add delay to maintain sync with text
        await new Promise(resolve => setTimeout(resolve, this.textToAudioDelay));
        console.log(`sequence: ${sequence}, nextToPlay: ${this.nextToPlay}`);
        
        return new Promise<void>((resolve) => {
            // Validate sequence to prevent out-of-order processing
            if (sequence < this.nextToPlay) {
                console.log(`Skipping audio sequence ${sequence} as it's before ${this.nextToPlay}`);
                resolve();
                return;
            }

            this.pendingBuffers.set(sequence, {
                buffer: audioBuffer,
                onComplete: resolve
            });
            this.tryProcessQueue();
        });
    }

    private tryProcessQueue() {
        // Keep track of processed sequences to detect potential stalls
        const processedSequences: number[] = [];

        while (this.pendingBuffers.has(this.nextToPlay)) {
            const nextBuffer = this.pendingBuffers.get(this.nextToPlay)!;
            this.pendingBuffers.delete(this.nextToPlay);
            
            this.queue.push({
                ...nextBuffer,
                sequence: this.nextToPlay
            });
            
            processedSequences.push(this.nextToPlay);
            this.nextToPlay++;
            
            if (!this.isPlaying) {
                this.playNext();
            }
        }

        // If no sequences were processed and pendingBuffers is not empty, 
        // find the next available sequence to prevent stalling
        if (processedSequences.length === 0 && this.pendingBuffers.size > 0) {
            const availableSequences = Array.from(this.pendingBuffers.keys()).sort((a, b) => a - b);
            
            console.warn('Queue processing stalled. Available sequences:', availableSequences);
            
            // Skip to the earliest available sequence to prevent complete stalling
            if (availableSequences.length > 0) {
                this.nextToPlay = availableSequences[0];
                console.log(`Skipping to sequence ${this.nextToPlay} to prevent queue stall`);
            }
        }
    }

    private playNext() {
        if (this.isPlaying || this.queue.length === 0) {
            return;
        }

        this.isPlaying = true;
        const { buffer, onComplete } = this.queue[0];
        
        const source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        
        // Store current source for stop functionality
        this.currentSource = source;

        source.onended = () => {
            this.queue.shift();
            this.isPlaying = false;
            this.currentSource = null;
            onComplete();
            this.playNext();
        };

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => source.start(0));
        } else {
            source.start(0);
        }
    }

    public clear() {
        this.queue = [];
        this.pendingBuffers.clear();
        this.isPlaying = false;
        this.nextToPlay = 0;
    }
}
