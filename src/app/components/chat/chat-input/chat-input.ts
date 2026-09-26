import { Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { form, FormField, SchemaPath, validate } from '@angular/forms/signals';

export interface ChatInputSendEvent {
  text: string;
  imageUrl?: string;
}

const DEFAULT_IMAGE_PROMPT = 'Describe this image.';

/**
 * WebLLM's Phi-3.5-vision support expects every image to produce a fixed number of
 * embedding tokens (hardcoded as `IMAGE_EMBED_SIZE` in @mlc-ai/web-llm): 1921 for this
 * compiled model. WebLLM tiles the image into up to sixteen 336px tiles based purely on
 * its aspect ratio, and only a 3:2 image lands on the exact tile grid (3x4) that adds up
 * to 1921 tokens — a square, for instance, tiles to 4x4 and is rejected. 504x336 is the
 * smallest frame at that ratio, so every photo is cropped to it before being sent.
 */
const VISION_IMAGE_FRAME = { width: 504, height: 336 } as const;
const VISION_IMAGE_RATIO = VISION_IMAGE_FRAME.width / VISION_IMAGE_FRAME.height;

/**
 * The message text is required unless an image is attached (a VLM can be prompted with
 * just an image), in which case a minimum length no longer applies.
 */
const requiredTextUnlessImageAttached = (
  fieldTree: SchemaPath<string>,
  hasImage: () => boolean,
) => {
  const minLenght = 3;

  return validate(fieldTree, ({ value }) => {
    if (hasImage()) {
      return null;
    }

    const trimmedValue = value()?.trim() ?? '';

    if (!trimmedValue) {
      return { kind: 'required' };
    }

    if (trimmedValue.length < minLenght) {
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
  supportsImages = input<boolean>(false);

  send = output<ChatInputSendEvent>();

  attachedImage = signal<string | null>(null);

  userText = signal<string>('');
  inputForm = form(this.userText, (schemaPath) => {
    requiredTextUnlessImageAttached(schemaPath, () => this.attachedImage() !== null);
  });

  private fileInput = viewChild<ElementRef<HTMLInputElement>>('fileInput');

  openFilePicker(): void {
    this.fileInput()?.nativeElement.click();
  }

  onImageSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) return;

    this.imageToVisionFrameDataUrl(file)
      .then((dataUrl) => this.attachedImage.set(dataUrl))
      .catch((error) => console.error('Could not read the selected image:', error));

    target.value = '';
  }

  removeAttachedImage(): void {
    this.attachedImage.set(null);
  }

  sendMessage(): void {
    if (this.isDisabled() || this.inputForm().invalid()) return;

    const imageUrl = this.attachedImage() ?? undefined;
    const text = this.userText().trim() || (imageUrl ? DEFAULT_IMAGE_PROMPT : '');

    this.send.emit({ text, imageUrl });
    this.userText.set('');
    this.attachedImage.set(null);
  }

  /**
   * Cuts the largest centred rectangle at the vision model's required aspect ratio out of
   * the source image and scales it to the exact frame size. Centred, because that is where
   * the subject usually is.
   */
  private imageToVisionFrameDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const { naturalWidth: w, naturalHeight: h } = image;
        const cutWidth = w / h >= VISION_IMAGE_RATIO ? h * VISION_IMAGE_RATIO : w;
        const cutHeight = cutWidth / VISION_IMAGE_RATIO;

        const canvas = document.createElement('canvas');
        canvas.width = VISION_IMAGE_FRAME.width;
        canvas.height = VISION_IMAGE_FRAME.height;
        const context = canvas.getContext('2d');

        if (!context) {
          reject(new Error('Canvas 2D context unavailable'));
          return;
        }

        context.drawImage(
          image,
          (w - cutWidth) / 2,
          (h - cutHeight) / 2,
          cutWidth,
          cutHeight,
          0,
          0,
          VISION_IMAGE_FRAME.width,
          VISION_IMAGE_FRAME.height,
        );
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not load the selected image'));
      };

      image.src = objectUrl;
    });
  }
}
