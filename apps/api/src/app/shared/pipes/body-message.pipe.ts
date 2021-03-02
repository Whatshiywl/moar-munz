import { PipeTransform, Injectable } from '@nestjs/common';
import { DataBody, SocketBody, SocketMessageBody } from '../../socket/socket.interfaces';
import { Message } from '@moar-munz/api-interfaces';

type InBody = SocketBody & DataBody<{ message: Message }>
type OutBody = SocketBody & SocketMessageBody;

@Injectable()
export class BodyMessagePipe implements PipeTransform<InBody, OutBody> {
    transform(body: InBody) {
        return { ...body, message: body.data.message };
    }
}
