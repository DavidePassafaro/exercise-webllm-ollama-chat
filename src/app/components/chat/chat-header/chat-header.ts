import { Component, input } from '@angular/core';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss',
})
export class ChatHeader {
  currentMode = input.required<'ollama' | 'web-llm'>();
  currentModel = input.required<string>();
  modelLoading = input<number>();
}
