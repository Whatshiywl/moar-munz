import { Injectable } from '@nestjs/common';

@Injectable()
export class UUIDService {

    //http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript
    generateUUID(batches = 1) {
        const radix = 36;
        const batchSize = 8;
        const arr = [ ];
        for (let i = 0; i < batches; i++) {
            const full = Math.random().toString(radix);
            const batch = full.substr(2, batchSize);
            arr.push(batch);
        }
        const uuid = arr.join('');
        return uuid;
    }

}