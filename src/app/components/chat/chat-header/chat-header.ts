import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { TEXT_MODEL_OPTIONS, modelLabel } from '../../../data/llm-models';

type WebLLMModelType = 'text' | 'vision';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatHeader {
  currentMode = input.required<'ollama' | 'web-llm'>();
  currentModel = input.required<string>();
  modelLoading = input<number>();
  modelLoadingText = input<string>();
  modelLoadError = input<string>();
  webLLMModelType = input<WebLLMModelType>('text');
  webLLMTextModel = input<string>();
  disableModelSwitch = input<boolean>(false);

  modelTypeChange = output<WebLLMModelType>();
  textModelChange = output<string>();

  protected textModelOptions = TEXT_MODEL_OPTIONS;
  protected currentModelLabel = computed(() => modelLabel(this.currentModel()));
  protected isLoaded = computed(() => !this.modelLoadError() && this.modelLoading() === 100);

  selectModelType(type: WebLLMModelType): void {
    if (this.disableModelSwitch() || this.webLLMModelType() === type) return;

    this.modelTypeChange.emit(type);
  }

  selectTextModel(event: Event): void {
    const modelId = (event.target as HTMLSelectElement).value;
    if (this.disableModelSwitch() || this.webLLMTextModel() === modelId) return;

    this.textModelChange.emit(modelId);
  }
}
