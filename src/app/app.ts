import { Component, computed, signal } from '@angular/core';
import ollama from 'ollama/browser';
import showdown from 'showdown';
import { ChatCompletionChunk, CreateMLCEngine, MLCEngine } from '@mlc-ai/web-llm';
import { Header } from './components/app/header/header';
import { Footer } from './components/app/footer/footer';
import { ChatHeader } from './components/chat/chat-header/chat-header';
import { MessageBubble } from './components/chat/message-bubble/message-bubble';
import { ChatInput } from './components/chat/chat-input/chat-input';

type ModelType = 'ollama' | 'web-llm';

const CurrentMode: ModelType = 'web-llm';

const OllamaModel = 'qwen3.5:0.8b';
const webLLMModel = 'Llama-3-8B-Instruct-q4f32_1-MLC';

interface BaseChatMessage {
  content: string;
  type: 'message' | 'error';
}

type ChatMessage =
  | (BaseChatMessage & { role: 'user' })
  | (BaseChatMessage & { role: 'assistant'; completed: boolean });

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
  imports: [Header, Footer, ChatHeader, MessageBubble, ChatInput],
})
export class App {
  protected modelLoading = signal<number>(0);
  protected messages = signal<ChatMessage[]>([]);
  protected isAiReplying = signal<boolean>(false);

  protected isAiReady = computed(() => this.modelLoading() === 100);
  protected lastMessage = computed(() => this.messages().at(-1));
  protected shouldShowThinkingBubble = computed(
    () => this.isAiReplying() && this.lastMessage()?.role !== 'assistant',
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
    const newMessage: ChatMessage = { role: 'user', content, type: 'message' };
    this.messages.update((messages) => [...messages, newMessage]);
    this.isAiReplying.set(true);

    let message: string = '';
    this.webLLMEngine.chat.completions
      .create({ messages: this.messages(), stream: true })
      .then(async (chunks: AsyncIterable<ChatCompletionChunk>) => {
        for await (const chunk of chunks) {
          const response = chunk.choices[0];
          if (!response) {
            return;
          }

          message += response.delta.content || '';

          const lastMessage = this.lastMessage();
          const shouldUpdateLastMessage =
            lastMessage && lastMessage.role === 'assistant' && !lastMessage.completed;

          if (shouldUpdateLastMessage) {
            this.messages.update((messages) => [...messages.slice(0, -1)]);
          }

          const isMessageCompleted = response.finish_reason === 'stop';
          this.addAssistantMessage(message, { isMessageCompleted });
          if (isMessageCompleted) {
            this.isAiReplying.set(false);
          }
        }
      })
      .catch((error) => this.handleError(error));
  }

  protected sendOllamaMessage(content: string): void {
    const newMessage: ChatMessage = { role: 'user', content, type: 'message' };
    this.messages.update((messages) => [...messages, newMessage]);
    this.isAiReplying.set(true);

    ollama
      .chat({ model: OllamaModel, messages: this.messages() })
      .then(({ message: { content } }) => this.addAssistantMessage(content))
      .catch((error) => this.handleError(error))
      .finally(() => this.isAiReplying.set(false));
  }

  private handleError(error: any): void {
    const isModelError = error.status_code === 404;

    let errorMessage = 'I am sorry, an error occurred while contacting the AI. Try again later.';

    if (this.currentMode === 'ollama' && isModelError) {
      errorMessage = `The model cannot be found. Run <strong>'ollama run ${OllamaModel}'</strong> before try again.`;
    }

    this.addAssistantMessage(errorMessage, { type: 'error' });
  }

  private addAssistantMessage(
    message: string,
    config?: { type?: 'message' | 'error'; isMessageCompleted?: boolean },
  ): void {
    const htmlContent = this.converter.makeHtml(message);
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: htmlContent,
      type: config?.type || 'message',
      completed: config?.isMessageCompleted ?? true,
    };
    this.messages.update((messages) => [...messages, assistantMessage]);
  }
}
