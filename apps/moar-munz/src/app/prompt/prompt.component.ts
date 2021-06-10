import { Component, EventEmitter, Input, Output } from '@angular/core';
import { PromptService } from '../shared/services/prompt.service';

@Component({
  selector: 'moar-munz-prompt',
  templateUrl: './prompt.component.html',
  styleUrls: ['./prompt.component.scss']
})
export class PromptComponent {
  @Input() debug: boolean;
  @Output() optionmouseenter: EventEmitter<string> = new EventEmitter<string>();
  @Output() optionmouseleave: EventEmitter<string> = new EventEmitter<string>();

  constructor(
    private promptService: PromptService
  ) { }

  get awaitingResponse() { return this.promptService.awaitingResponse; }
  get notificationData() { return this.promptService.notificationData; }

  onQuestionAnswer(answer: string) {
    this.promptService.answer(answer);
  }

  onOptionMouseEnter(option: string) {
    this.optionmouseenter.next(option);
  }

  onOptionMouseLeave(option: string) {
    this.optionmouseleave.next(option);
  }

}
