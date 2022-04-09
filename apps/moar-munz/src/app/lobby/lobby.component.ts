import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Match, Player } from '@moar-munz/api-interfaces';
import { MatchService } from '../shared/services/match.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from '../shared/socket/socket.service';

@Component({
  selector: 'moar-munz-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  uuid: string;
  match: Match;

  constructor(
    private socket: SocketService,
    private matchService: MatchService,
    private playerService: PlayerService,
    private route: ActivatedRoute,
    private router: Router,
    private clipboard: Clipboard
  ) { }

  async ngOnInit() {
    this.uuid = sessionStorage.getItem('uuid');
    const params = this.route.snapshot.params;
    console.log('lobby component params', params);
    const id = params.id;
    this.clipboard.copy(location.href);
    this.socket.emit('enter lobby', { lobbyId: id }, (response: { token: string, uuid: string }) => {
      if (!response) {
        alert('This lobby has closed! :(');
        this.router.navigate([ '/' ]);
      }
    });
    this.matchService.matchChange$.subscribe(match => this.match = match);
  }

  getPlayer(id: string) {
    return this.playerService.getPlayer(id);
  }

  get isFirst() {
    return this.playerService?.first;
  }

  get isReady() {
    return this.playerService?.player?.ready;
  }

  onLobbyPlayerClick(player: Player) {
    this.socket.emit('remove player', { id: player?.id });
  }

  onLobbyAddAI() {
    this.socket.emit('add ai');
  }

  onReady(ready: boolean) {
    this.socket.emit('ready', { ready });
  }

}
