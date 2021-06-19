import { Prompt } from "@moar-munz/api-interfaces";
import { Injectable } from "@nestjs/common";
import { sample } from 'lodash';

@Injectable()
export class AIService {

    answer<T>(prompt: Prompt<T>) {
        return new Promise<T>((resolve, reject) => {
            const answer = sample(prompt.options);
            return answer;
        });
    }

}
