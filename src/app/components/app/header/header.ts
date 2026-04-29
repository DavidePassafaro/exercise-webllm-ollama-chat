import { Component, input } from '@angular/core';

@Component({
  selector: 'app-header',
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header {
  currentMode = input.required<'ollama' | 'web-llm'>();
}
