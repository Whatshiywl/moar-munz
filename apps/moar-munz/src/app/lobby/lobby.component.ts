import { Clipboard } from '@angular/cdk/clipboard';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Player } from '@moar-munz/api-interfaces';
import { LobbyService } from '../shared/services/lobby.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from '../shared/socket/socket.service';

@Component({
  selector: 'moar-munz-lobby',
  templateUrl: './lobby.component.html',
  styleUrls: ['./lobby.component.scss']
})
export class LobbyComponent implements OnInit {
  uuid: string;

  constructor(
    private socket: SocketService,
    private lobbyService: LobbyService,
    public playerService: PlayerService,
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
  }

  get lobby() { return this.lobbyService.lobby; }


  onLobbyPlayerClick(player: Player) {
    this.socket.emit('remove player', { id: player.id });
  }

  onLobbyAddAI() {
    this.socket.emit('add ai');
  }

  onReady(ready: boolean) {
    this.socket.emit('ready', { ready });
  }

}
