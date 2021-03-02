import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Trade, Message, PlayerComplete, Lobby, Match, Player } from '@moar-munz/api-interfaces';
import { SocketService } from '../shared/socket/socket.service';

interface ClientMessage extends Message {
  name: string,
  nameColor: string
}

interface Tab {
  type: 'global' | 'private',
  title: string,
  chat: ClientMessage[],
  input: FormControl,
  player?: PlayerComplete
  trade?: Trade,
}

@Component({
  selector: 'moar-munz-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, OnChanges {

  @Input() lobby: Lobby;
  @Input() match: Match;

  globalInput = new FormControl('');
  selected = new FormControl(0);
  formGroup = new FormGroup({
    selected: this.selected,
    global: this.globalInput
  });

  globalTab: Tab = {
    type: 'global',
    title: 'Global',
    chat: [ ],
    input: this.globalInput
  };

  tabs: Tab[] = [ this.globalTab ];

  constructor(
    private socket: SocketService
  ) { }

  ngOnInit() {
    this.socket.on('message', (message: Message) => {
      console.log(`Got message`, message);
      const me = JSON.parse(sessionStorage.getItem('player')) as PlayerComplete;
      const myId = me.id;
      const idNotMine = message.from !== myId ? message.from : message.to;
      let tab = message.type === 'global' ? this.globalTab : this.tabs.find(tab => tab.player?.id === idNotMine);
      if (!tab) {
        const player = this.lobby.players[idNotMine];
        tab = this.addTab(player, false);
      }
      this.pushMessageToTab(tab, message);
    });
  }

  ngOnChanges(changes: SimpleChanges) {

  }

  addTab(player: Player, selectAfterAdding: boolean) {
    const exists = this.tabs.find(tab => tab.player?.id === player.id);
    if (exists) return;
    const input = new FormControl('');
    this.formGroup.addControl(player.name, input);
    const tab = { type: 'private', title: player.name, player, input, chat: [ ] } as Tab;
    this.tabs.push(tab);

    if (selectAfterAdding) {
      this.selected.setValue(this.tabs.length - 1);
    }
    return tab;
  }

  removeTab(index: number) {
    this.tabs.splice(index, 1);
  }

  pushMessageToTab(tab: Tab, ...messages: Message[]) {
    tab.chat.push(...messages.map(({from, data, to}) => {
      const fromPlayer = this.lobby.players[from];
      return {
        from: fromPlayer.id,
        data, type: tab.type, to,
        name: fromPlayer.name,
        nameColor: fromPlayer.color
      } as ClientMessage;
    }));
  }

  onSubmit(formGroup: FormGroup) {
    const { selected } = formGroup.value;
    const tab = this.tabs[selected];
    const control = tab.input;
    const data = control.value;
    control.reset();
    const me = JSON.parse(sessionStorage.getItem('player')) as PlayerComplete;
    console.log('me', me);
    const message: Message = { from: me.id, data, type: tab.type, to: tab.player?.id };
    this.socket.emit('send message', { match: this.match.id, message });
  }

}
