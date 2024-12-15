<template>
  <div class="max-w-4xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
    <div class="h-[600px] flex flex-col">
      <!-- Chat Messages -->
      <div class="flex-1 overflow-y-auto p-4 space-y-4" ref="messagesContainer">
        <ChatMessage
          v-for="(message, index) in messages"
          :key="index"
          :message="message"
        />
        
        <!-- Loading Spinner -->
        <div v-if="isLoading && !isStreamingMode" class="flex justify-center items-center py-4">
          <div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12"></div>
        </div>
      </div>

      <!-- Error Message Banner -->
      <div 
        v-if="error" 
        class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" 
        role="alert"
      >
        <span class="block sm:inline">{{ error }}</span>
        <span 
          @click="clearError" 
          class="absolute top-0 bottom-0 right-0 px-4 py-3 cursor-pointer"
        >
          ×
        </span>
      </div>

      <!-- Input Area -->
      <div class="border-t p-4 bg-gray-50">
        <div class="flex space-x-4 items-center">
          <input
            v-model="userInput"
            type="text"
            placeholder="Ask a question..."
            class="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            @keyup.enter="handleButtonClick"
          />
          <div class="flex items-center space-x-2">
            <label class="text-sm text-gray-600">Streaming Mode</label>
            <button 
              @click="toggleStreamingMode" 
              class="relative inline-flex items-center h-6 rounded-full w-11 transition-colors duration-200 ease-in-out"
              :class="isStreamingMode ? 'bg-blue-500' : 'bg-gray-300'"
            >
              <span 
                class="transform transition-transform duration-200 ease-in-out inline-block w-5 h-5 bg-white rounded-full shadow-md"
                :class="isStreamingMode ? 'translate-x-6' : 'translate-x-1'"
              ></span>
            </button>
          </div>
          <button
            @click="handleButtonClick"
            class="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="!isStreamingMode && (isLoading || !userInput.trim())"
          >
            {{ buttonText }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import ChatMessage from './ChatMessage.vue';
import { useRAGSystem } from '../composables/useRAGSystem';

const userInput = ref('');
const messagesContainer = ref<HTMLElement | null>(null);
const isStreaming = ref(false);

const { 
  messages, 
  isLoading, 
  error, 
  getResponse,
  isStreamingMode,
  toggleStreamingMode: toggleRAGStreamingMode,
  stopStreaming 
} = useRAGSystem();

const buttonText = computed(() => {
  if (!isStreamingMode.value) {
    return isLoading.value ? 'Thinking...' : 'Send';
  }
  return isStreaming.value ? 'Stop' : 'Send';
});

const handleButtonClick = async () => {
  if (!userInput.value.trim()) return;

  if (!isStreamingMode.value) {
    // Normal mode behavior
    await sendMessage();
  } else {
    // Streaming mode behavior
    if (isStreaming.value) {
      // Stop streaming
      stopStreaming();
      userInput.value = '';
      isStreaming.value = false;
    } else {
      // Start streaming
      isStreaming.value = true;
      await sendMessage();
      isStreaming.value = false;
    }
  }
};

const toggleStreamingMode = () => {
  if (isStreaming.value) {
    // If currently streaming, stop it when toggling mode
    isStreaming.value = false;
    // TODO: Add actual stop functionality later
  }
  toggleRAGStreamingMode();
};

const clearError = () => {
  if (error.value) {
    error.value = null;
  }
};

const sendMessage = async () => {
  if (!userInput.value.trim()) return;

  try {
    await getResponse(userInput.value);
    userInput.value = '';
    await scrollToBottom();
  } catch (err) {
    console.error('Error sending message:', err);
  }
};

const scrollToBottom = async () => {
  await nextTick();
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    console.log('Scrolled to bottom:', messagesContainer.value.scrollHeight);
  }
};

onMounted(() => {
  console.log('ChatInterface mounted');
  scrollToBottom();
});
</script>

<style scoped>
.error-enter-active,
.error-leave-active {
  transition: opacity 0.5s;
}
.error-enter-from,
.error-leave-to {
  opacity: 0;
}

.loader {
  border-top-color: #3B82F6; /* Tailwind blue-500 */
  animation: spinner 1s linear infinite;
}

@keyframes spinner {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>