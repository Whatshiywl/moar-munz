import { Injectable } from "@nestjs/common";
import { sample } from 'lodash';

@Injectable()
export class AIService {

    answer<T extends ReadonlyArray<unknown>>(question: string, options: T) {
        const answer = sample(options);
        return answer;
    }
    
}