import { Component, input } from '@angular/core';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.html',
  styleUrl: './message-bubble.scss',
})
export class MessageBubble {
  message = input.required<string>();
  role = input.required<'user' | 'assistant'>();
  type = input.required<'message' | 'thinking' | 'error'>();
}
