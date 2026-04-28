import { Component, input } from '@angular/core';

@Component({
  selector: 'app-chat-header',
  templateUrl: './chat-header.html',
  styleUrl: './chat-header.scss',
})
export class ChatHeader {
  currentModel = input.required<string>();
}
