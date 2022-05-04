import { Global, Module } from "@nestjs/common";
import { BodyLobbyPipe } from "./pipes/body-lobby.pipe";
import { BodyMatchPipe } from "./pipes/body-match.pipe";
import { BodyMessagePipe } from "./pipes/body-message.pipe";
import { BodyPlayerPipe } from "./pipes/body-player.pipe";
import { BoardService } from "../shared/services/board.service";
import { JWTService } from "../shared/services/jwt.service";
import { MatchService } from "../shared/services/match.service";
import { PlayerService } from "../shared/services/player.service";
import { UUIDService } from "../shared/services/uuid.service";
import { SocketService } from "./socket.service";

@Global()
@Module({
  providers: [
    JWTService,
    SocketService,

    BodyPlayerPipe,
    BodyLobbyPipe,
    BodyMatchPipe,
    BodyMessagePipe,

    PlayerService,
    MatchService,
    BoardService,
    UUIDService
  ],
  exports: [
    SocketService
  ]
})
export class SocketModule { }
