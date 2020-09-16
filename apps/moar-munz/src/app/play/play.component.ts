import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SocketService } from '../shared/socket/socket.service';
import { sample } from 'lodash';
import { Subject, Subscription } from 'rxjs';
import { Lobby, LobbyState, Match, Player, PlayerState, Tile, VictoryState } from '@moar-munz/api-interfaces';

@Component({
  selector: 'moar-munz-play',
  templateUrl: './play.component.html',
  styleUrls: ['./play.component.scss']
})
export class PlayComponent implements OnInit, OnDestroy {
  debug = false;

  player: Player & PlayerState & LobbyState;
  uuid: string;
  first: boolean;

  lobby: Lobby;
  match: Match;

  playerTurn: string;
  isMyTurn: boolean;

  players: (Player & PlayerState & LobbyState)[];

  notificationData: {
    message: string;
    options?: string[];
    callback?: (answer: string) => void;
  };
  answerSubscription: Subscription;

  targetViewportDimentions = {
    w: 0, h: 0
  };

  tileClicked$: Subject<Tile>;
  
  constructor(
    private socket: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit() {
    console.log('play component on init', this.debug);
    this.uuid = sessionStorage.getItem('uuid');
    this.tileClicked$ = new Subject<Tile>();
    this.route.params.subscribe(params => {
      const id = params.id;
      this.socket.connect();
      this.socket.on('update lobby', (lobby: Lobby) => {
        console.log('lobby updated', lobby);
        this.lobby = lobby;
        this.players = this.getPlayers();
        this.player = this.players.find(p => p.id === this.uuid);
        this.first = this.uuid === lobby.playerOrder[0];
      });
      this.socket.on('match', (match: Match) => {
        console.log('match', match);
        this.match = match;
        this.playerTurn = Object.keys(match.playerState).find(playerId => {
          const playerState = match.playerState[playerId];
          return playerState.turn;
        });
        this.isMyTurn = this.playerTurn === this.uuid;
        this.players = this.getPlayers();
        this.player = this.players.find(p => p.id === this.uuid);
        this.first = this.uuid === match.playerOrder[0];
        if (this.debug) {
          setTimeout(() => {
            if (this.isMyTurn) this.throwDice();
          }, 100);
        }
      })
      this.socket.on('ask question', (question, callback) => {
        console.log('question asked')
        this.notificationData = { ...question, callback };
        if (this.debug) {
          setTimeout(() => {
            this.onQuestionAnswer(sample(question.options));
          }, 100);
        }
        if (this.answerSubscription) this.answerSubscription.unsubscribe();
        this.answerSubscription = this.tileClicked$
        .subscribe(tile => {
          const clickAnswer = question.options.find(o => o.includes(tile.name));
          if (clickAnswer) {
            this.onQuestionAnswer(clickAnswer);
            this.answerSubscription.unsubscribe();
          }
        });
      });
      this.socket.on('notification', (message: string) => {
        this.notificationData = { message };
      });
      this.socket.emit('enter lobby', { lobbyId: id }, (response: { token: string, uuid: string }) => {
        if (!response) {
          alert('This lobby has closed! :(');
          this.router.navigate([ '/' ]);
        }
      });
    });
  }

  ngOnDestroy() {
    console.log('destroy play component');
    this.socket.disconnect(true);
  }

  throwDice() {
    this.socket.emit('throw dice');
  }

  onReady(ready: boolean) {
    this.socket.emit('ready', { ready });
  }

  onLobbyPlayerClick(player: Player & LobbyState & PlayerState) {
    this.socket.emit('remove player', { id: player.id });
  }

  onLobbyAddAI() {
    this.socket.emit('add ai');
  }

  onQuestionAnswer(answer: string) {
    this.notificationData.callback(answer);
    this.notificationData = undefined;
  }

  onTileClicked(tile: Tile) {
    this.tileClicked$.next(tile);
  }

  onTileMouseEnter(tile: Tile) {
    this.highlightTile(tile, true);
  }

  onTileMouseLeave(tile: Tile) {
    this.highlightTile(tile, false);
  }

  onPlayerMouseEnter(player: Player) {
    this.getPlayerProperties(player)
    .forEach(tile => this.highlightTile(tile, true));
  }

  onPlayerMouseLeave(player: Player) {
    this.getPlayerProperties(player)
    .forEach(tile => this.highlightTile(tile, false));
  }

  onOptionMouseEnter(option: string) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, true);
  }

  onOptionMouseLeave(option: string) {
    const tile = this.match.board.tiles.find(t => option.includes(t.name));
    if (!tile) return;
    this.highlightTile(tile, false);
  }

  highlightTile(tile: Tile, state: boolean) {
    tile.highlighted = state;
    const owner = this.players.find(p => p.id === tile.owner);
    if (!owner) return;
    owner.highlighted = state;
  }

  private getPlayers() {
    return this.lobby.playerOrder.filter(Boolean).map(playerId => {
      const matchPlayer = this.match?.playerState[playerId];
      const lobbyPlayer = this.lobby?.players[playerId];
      return { ...matchPlayer, ...lobbyPlayer };
    });
  }

  getPlayersInTile(t: number) {
    return this.players
    .filter(player => {
      return player.victory !== VictoryState.LOST && player.position === t;
    });
  }

  getPlayerProperties(player: Player) {
    return this.match.board.tiles
    .filter(tile => tile.owner === player.id);
  }

}
