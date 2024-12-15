<template>
  <div 
    class="flex"
    :class="message.role === 'assistant' ? 'justify-start' : 'justify-end'"
  >
    <div 
      class="max-w-[80%] rounded-lg px-4 py-2"
      :class="message.role === 'assistant' ? 'bg-gray-100' : 'bg-blue-500 text-white'"
    >
      <div class="prose prose-sm dark:prose-invert" v-html="formattedContent"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { marked } from 'marked'
import hljs from 'highlight.js'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const props = defineProps<{
  message: Message
}>()

// Configure marked with syntax highlighting
marked.setOptions({
  highlight: function(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value
    }
    return hljs.highlightAuto(code).value
  }
})

const formattedContent = computed(() => {
  return marked(props.message.content)
})
</script>

<style>
.prose {
  max-width: none;
}

.prose pre {
  background-color: #1a1a1a;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0.5rem 0;
}

.prose code {
  color: inherit;
  background-color: rgba(0, 0, 0, 0.1);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}

.prose pre code {
  background-color: transparent;
  padding: 0;
}

.prose * {
  margin: 0;
}

.prose p {
  margin: 0.5rem 0;
}
</style>