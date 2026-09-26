import { Component, computed, signal } from '@angular/core';
import ollama from 'ollama/browser';
import showdown from 'showdown';
import { ChatCompletionChunk, ChatCompletionMessageParam, MLCEngine } from '@mlc-ai/web-llm';
import { Header } from './components/app/header/header';
import { Footer } from './components/app/footer/footer';
import { ChatHeader } from './components/chat/chat-header/chat-header';
import { MessageBubble } from './components/chat/message-bubble/message-bubble';
import { ChatInput, ChatInputSendEvent } from './components/chat/chat-input/chat-input';

type ModelType = 'ollama' | 'web-llm';
type WebLLMModelType = 'text' | 'vision';

const CurrentMode: ModelType = 'web-llm';

const OllamaModel = 'qwen3.5:0.8b';
const webLLMTextModel = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';
const webLLMVisionModel = 'Phi-3.5-vision-instruct-q4f16_1-MLC';

function webLLMModelIdFor(type: WebLLMModelType): string {
  return type === 'vision' ? webLLMVisionModel : webLLMTextModel;
}

interface BaseChatMessage {
  content: string;
  type: 'message' | 'error';
}

type ChatMessage =
  | (BaseChatMessage & { role: 'user'; imageUrl?: string })
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
  protected webLLMModelType = signal<WebLLMModelType>('text');

  protected isAiReady = computed(() => this.modelLoading() === 100);
  protected lastMessage = computed(() => this.messages().at(-1));
  protected shouldShowThinkingBubble = computed(
    () => this.isAiReplying() && this.lastMessage()?.role !== 'assistant',
  );

  protected currentMode = CurrentMode;
  protected currentModel = computed(() =>
    this.currentMode === 'ollama' ? OllamaModel : webLLMModelIdFor(this.webLLMModelType()),
  );

  protected supportsVision = computed(
    () => this.currentMode === 'web-llm' && this.webLLMModelType() === 'vision',
  );
  protected disableModelSwitch = computed(() => !this.isAiReady() || this.isAiReplying());

  private converter = new showdown.Converter();

  private webLLMEngine!: MLCEngine;

  constructor() {
    if (this.currentMode === 'web-llm') {
      this.webLLMEngine = new MLCEngine({
        initProgressCallback: (progress) => {
          this.modelLoading.set(Math.round(progress.progress * 100));
        },
      });
      this.loadWebLLMModel(this.currentModel());
    }
  }

  protected sendMessage(event: ChatInputSendEvent): void {
    if (this.currentMode === 'ollama') {
      this.sendOllamaMessage(event.text);
    } else {
      this.sendWebLLMMessage(event.text, event.imageUrl);
    }
  }

  protected switchWebLLMModelType(type: WebLLMModelType): void {
    if (this.currentMode !== 'web-llm') return;
    if (this.webLLMModelType() === type) return;
    if (this.disableModelSwitch()) return;

    this.webLLMModelType.set(type);
    this.messages.set([]);
    this.loadWebLLMModel(webLLMModelIdFor(type));
  }

  protected sendWebLLMMessage(content: string, imageUrl?: string): void {
    const newMessage: ChatMessage = { role: 'user', content, type: 'message', imageUrl };
    this.messages.update((messages) => [...messages, newMessage]);
    this.isAiReplying.set(true);

    let message: string = '';
    this.webLLMEngine.chat.completions
      .create({ messages: this.toApiMessages(), stream: true })
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

  private loadWebLLMModel(model: string): void {
    this.modelLoading.set(0);
    this.webLLMEngine.reload(model).then(() => {
      this.modelLoading.set(100);
    });
  }

  /**
   * Maps the internal chat history to the shape expected by WebLLM's chat completions API.
   * User messages that carry an attached image are sent as multimodal content (image +
   * text), which is only understood by a vision-language model (VLM).
   */
  private toApiMessages(): ChatCompletionMessageParam[] {
    return this.messages().map((message): ChatCompletionMessageParam => {
      if (message.role === 'user' && message.imageUrl) {
        return {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: message.imageUrl } },
            { type: 'text', text: message.content },
          ],
        };
      }

      return { role: message.role, content: message.content };
    });
  }

  private handleError(error: any): void {
    console.error('WebLLM/Ollama request failed:', error);

    const isModelError = error.status_code === 404;

    let errorMessage = 'I am sorry, an error occurred while contacting the AI. Try again later.';

    if (this.currentMode === 'ollama' && isModelError) {
      errorMessage = `The model cannot be found. Run <strong>'ollama run ${OllamaModel}'</strong> before try again.`;
    }

    this.addAssistantMessage(errorMessage, { type: 'error' });
    this.isAiReplying.set(false);
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
