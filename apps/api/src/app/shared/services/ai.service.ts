import { Prompt } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { sample } from 'lodash';

@Injectable()
export class AIService {

    async answer<T>(prompt: Prompt<T>) {
        prompt.answer = this.getAnswer(prompt) as any;
        return prompt;
    }

    private getAnswer<T>(prompt: Prompt<T>) {
        switch (prompt.type) {
            case 'alert':
                return;
            case 'confirm':
                return sample([ true, false ]);
            case 'select':
                return sample(prompt.options);
        }
    }

}
