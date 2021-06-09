import { Component, Input, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Trade, Message, PlayerComplete, Lobby, Match, Player } from '@moar-munz/api-interfaces';
import { LobbyService } from '../shared/services/lobby.service';
import { PlayerService } from '../shared/services/player.service';
import { SocketService } from '../shared/socket/socket.service';

interface ClientMessage extends Message {
  name: string,
  nameColor: string,
  read: boolean
}

interface Tab {
  type: 'global' | 'private',
  title: string,
  chat: ClientMessage[],
  input: FormControl,
  visible: boolean,
  player?: PlayerComplete
  trade?: Trade,
}

@Component({
  selector: 'moar-munz-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit {

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
    input: this.globalInput,
    visible: true
  };

  tabs: Tab[] = [ this.globalTab ];

  autoScroll = true;

  constructor(
    private socket: SocketService,
    private lobbyService: LobbyService,
    private playerService: PlayerService
  ) { }

  ngOnInit() {
    this.socket.on('message', (message: Message) => {
      console.log(`Got message`, message);
      const me = this.playerService.player;
      const myId = me.id;
      const idNotMine = message.recipients.find(id => id !== myId);
      let tab = message.type === 'global' ? this.globalTab : this.tabs.find(tab => tab.player?.id === idNotMine);
      if (!tab) {
        const player = this.lobbyService.lobby.players[idNotMine];
        tab = this.addTab(player, false, false);
      }
      this.pushMessageToTab(tab, message);
      setTimeout(() => {
        this.scrollTabToBottom();
      }, 0);
    });
  }

  get visibleTabs() {
    return this.tabs.filter(tab => tab.visible);
  }

  get selectedTabIndex() {
    if (this.selected.value === 0) return 0;
    else return this.tabs.findIndex((t, i) => i > 0 && t.visible);
  }

  get selectedTab() {
    return this.tabs[this.selectedTabIndex];
  }

  getUnreadMessages(id: string) {
    const tab = this.tabs.find(t => t.player?.id === id);
    return tab?.chat.filter(m => !m.read).length;
  }

  addTab(player: Player, visible: boolean, selectAfterAdding: boolean) {
    if (visible) {
      this.tabs.forEach(tab => {
        if (tab.visible && tab.type === 'private') tab.visible = false;
      });
    }
    const existsIndex = this.tabs.findIndex(tab => tab.player?.id === player.id);
    const exists = this.tabs[existsIndex];
    if (exists) {
      exists.visible = visible;
      this.checkSelected(selectAfterAdding, 1);
      return exists;
    }
    const input = new FormControl('');
    this.formGroup.addControl(player.name, input);
    const tab = { type: 'private', title: player.name, player, input, chat: [ ], visible } as Tab;
    this.tabs.push(tab);
    this.checkSelected(selectAfterAdding, 1);
    return tab;
  }

  checkSelected(select: boolean, index: number) {
    if (!select) return;
    setTimeout(() => {
      this.selected.setValue(index);
      this.selectedTab.chat.forEach(m => m.read = true);
    }, 0);
  }

  removeTab(tab: Tab) {
    if (tab.type === 'global') return;
    const tabToHide = this.tabs.find(t => t === tab);
    if (!tabToHide) return;
    tabToHide.visible = false;
  }

  pushMessageToTab(tab: Tab, ...messages: Message[]) {
    const read = this.selectedTab === tab;
    tab.chat.push(...messages.map(({from, data}) => {
      const fromPlayer = this.lobbyService.lobby.players[from];
      return {
        from: fromPlayer?.id,
        data, type: tab.type,
        name: fromPlayer?.name,
        nameColor: fromPlayer?.color,
        read
      } as ClientMessage;
    }));
  }

  onSubmit() {
    const tab = this.selectedTab;
    const control = tab.input;
    const data = control.value;
    control.reset();
    const me = this.playerService.player;
    const recipients = tab.type === 'global' ? this.match.playerOrder : [ me.id, tab.player?.id ];
    const message: Message = { from: me.id, recipients, data, type: tab.type };
    this.socket.emit('send message', { message });
  }

  onScroll(evt: Event) {
    const el = evt.target as HTMLElement;
    const scrollDistance = el.scrollHeight - el.scrollTop - el.clientHeight;
    this.autoScroll = !scrollDistance;
  }

  scrollTabToBottom() {
    const index = this.selectedTabIndex;
    const el = document.getElementById(`message-wrapper-${index}`);
    if (!this.autoScroll) return;
    el?.scroll({
      top: el.scrollHeight,
      left: 0,
      behavior: 'auto'
    });
  }

}
