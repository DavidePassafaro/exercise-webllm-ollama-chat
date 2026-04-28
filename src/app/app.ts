import { Component, computed, signal } from '@angular/core';
import ollama from 'ollama/browser';
import showdown from 'showdown';
import { Header } from './components/app/header/header';
import { Footer } from './components/app/footer/footer';
import { ChatHeader } from './components/chat/chat-header/chat-header';
import { MessageBubble } from './components/chat/message-bubble/message-bubble';
import { ChatInput } from './components/chat/chat-input/chat-input';

const OllamaModel = 'qwen3.5:0.8b';

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
  protected messages = signal<ChatMessage[]>([]);

  protected isThinking = computed(
    () => this.messages().length > 0 && this.messages().at(-1)?.role !== 'assistant',
  );

  protected currentModel = OllamaModel;

  private converter = new showdown.Converter();

  protected sendMessage(content: string): void {
    const newMessage = { role: 'user', content, type: 'message' } as ChatMessage;
    this.messages.update((messages) => [...messages, newMessage]);

    ollama
      .chat({ model: OllamaModel, messages: [newMessage] })
      .then(({ message: { content } }) => this.addAssistantMessage(content, 'message'))
      .catch((error) => this.handleError(error));
  }

  private addAssistantMessage(message: string, type: 'message' | 'error'): void {
    const htmlContent = this.converter.makeHtml(message);
    const assistantMessage = {
      role: 'assistant',
      content: htmlContent,
      type,
    } as ChatMessage;
    this.messages.update((messages) => [...messages, assistantMessage]);
  }

  private handleError(error: any): void {
    const isModelError = error.status_code === 404;

    const assistantMessage = {
      role: 'assistant',
      content: isModelError
        ? `The model cannot be found. Run <strong>'ollama run ${OllamaModel}'</strong> before try again.`
        : 'I am sorry, an error occurred while contacting the server. Try again later.',
      type: 'error',
    } as ChatMessage;
    this.messages.update((messages) => [...messages, assistantMessage]);
  }
}
