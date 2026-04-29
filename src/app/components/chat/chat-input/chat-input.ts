import { Component, input, output, signal } from '@angular/core';
import { form, FormField, required, SchemaPath, validate } from '@angular/forms/signals';

const trimmedMinLength = (fieldTree: SchemaPath<string>, minLenght: number) => {
  return validate(fieldTree, ({ value }) => {
    if (value() && value().trim().length < minLenght) {
      return { kind: 'trimmedMinLength', minLenght };
    }

    return null;
  });
};

@Component({
  selector: 'app-chat-input',
  templateUrl: './chat-input.html',
  styleUrl: './chat-input.scss',
  imports: [FormField],
})
export class ChatInput {
  isDisabled = input<boolean>(false);

  send = output<string>();

  userText = signal<string>('');
  inputForm = form(this.userText, (schemaPath) => {
    required(schemaPath);
    trimmedMinLength(schemaPath, 3);
  });

  sendMessage(): void {
    if (this.isDisabled() || this.inputForm().invalid()) return;

    this.send.emit(this.userText().trim());
    this.userText.set('');
  }
}
