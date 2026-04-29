import { Component, computed, signal } from '@angular/core';
import ollama from 'ollama/browser';
import showdown from 'showdown';
import { CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';
import { Header } from './components/app/header/header';
import { Footer } from './components/app/footer/footer';
import { ChatHeader } from './components/chat/chat-header/chat-header';
import { MessageBubble } from './components/chat/message-bubble/message-bubble';
import { ChatInput } from './components/chat/chat-input/chat-input';

type ModelType = 'ollama' | 'web-llm';

const CurrentMode: ModelType = 'web-llm';

const OllamaModel = 'qwen3.5:0.8b';
const webLLMModel = 'Llama-3-8B-Instruct-q4f32_1-MLC';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type: 'message' | 'error';
}

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [Header, Footer, ChatHeader, MessageBubble, ChatInput],
})
export class App {
  protected modelLoading = signal<number>(0);
  protected messages = signal<ChatMessage[]>([]);

  protected isAiReady = computed(() => this.modelLoading() === 100);
  protected isThinking = computed(
    () => this.messages().length > 0 && this.messages().at(-1)?.role !== 'assistant',
  );

  protected currentMode = CurrentMode;
  protected currentModel = this.currentMode === 'ollama' ? OllamaModel : webLLMModel;

  private converter = new showdown.Converter();

  private webLLMEngine!: MLCEngine;

  constructor() {
    if (this.currentMode === 'web-llm') {
      CreateMLCEngine(webLLMModel, {
        initProgressCallback: (progress) => {
          this.modelLoading.set(Math.round(progress.progress * 100));
        },
      }).then((webLLMEngine) => {
        this.webLLMEngine = webLLMEngine;
        this.modelLoading.set(100);
      });
    }
  }

  protected sendMessage(content: string): void {
    if (this.currentMode === 'ollama') {
      this.sendOllamaMessage(content);
    } else {
      this.sendWebLLMMessage(content);
    }
  }

  protected sendWebLLMMessage(content: string): void {
    const newMessage = { role: 'user', content, type: 'message' } as ChatMessage;
    this.messages.update((messages) => [...messages, newMessage]);

    this.webLLMEngine.chat.completions
      .create({ messages: this.messages() })
      .then((reply) => this.addAssistantMessage(reply.choices[0]?.message.content || ''))
      .catch((error) => this.handleError(error));
  }

  protected sendOllamaMessage(content: string): void {
    const newMessage = { role: 'user', content, type: 'message' } as ChatMessage;
    this.messages.update((messages) => [...messages, newMessage]);

    ollama
      .chat({ model: OllamaModel, messages: this.messages() })
      .then(({ message: { content } }) => this.addAssistantMessage(content))
      .catch((error) => this.handleError(error));
  }

  private handleError(error: any): void {
    const isModelError = error.status_code === 404;

    let errorMessage = 'I am sorry, an error occurred while contacting the AI. Try again later.';

    if (this.currentMode === 'ollama' && isModelError) {
      errorMessage = `The model cannot be found. Run <strong>'ollama run ${OllamaModel}'</strong> before try again.`;
    }

    this.addAssistantMessage(errorMessage, { type: 'error' });
  }

  private addAssistantMessage(message: string, config?: { type: 'message' | 'error' }): void {
    const htmlContent = this.converter.makeHtml(message);
    const assistantMessage = {
      role: 'assistant',
      content: htmlContent,
      type: config?.type || 'message',
    } as ChatMessage;
    this.messages.update((messages) => [...messages, assistantMessage]);
  }
}
