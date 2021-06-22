import { Prompt } from '@moar-munz/api-interfaces';
import { WebSocketGateway, SubscribeMessage, MessageBody } from '@nestjs/websockets';
import { JWTService } from '../shared/services/jwt.service';
import { PromptService } from './prompt.service';

@WebSocketGateway()
export class PromptGateway {

  constructor(
    private promptService: PromptService,
    private jwtService: JWTService
  ) { }

  @SubscribeMessage('prompt answer')
  async onThrowDice(@MessageBody() body: { token: string, data: Prompt }) {
    const { token, data: prompt } = body;
    const payload = this.jwtService.getPayload(token);
    this.promptService.answer(payload.uuid, prompt);
  }

}
