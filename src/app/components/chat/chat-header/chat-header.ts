import { Component, input, output } from '@angular/core';

type WebLLMModelType = 'text' | 'vision';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss',
})
export class ChatHeader {
  currentMode = input.required<'ollama' | 'web-llm'>();
  currentModel = input.required<string>();
  modelLoading = input<number>();
  webLLMModelType = input<WebLLMModelType>('text');
  disableModelSwitch = input<boolean>(false);

  modelTypeChange = output<WebLLMModelType>();

  selectModelType(type: WebLLMModelType): void {
    if (this.disableModelSwitch() || this.webLLMModelType() === type) return;

    this.modelTypeChange.emit(type);
  }
}
