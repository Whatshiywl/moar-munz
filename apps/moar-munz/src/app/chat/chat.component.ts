import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { PlayerComplete } from '@moar-munz/api-interfaces';

interface Tab {
  type: 'global' | 'private',
  title: string,
  chat: Message[],
  input: FormControl,
  player?: PlayerComplete
  trade?: Trade,
}

interface Trade {
  id: string
}

interface Message {
  from: PlayerComplete,
  data: string
}

@Component({
  selector: 'moar-munz-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnChanges {

  tabs: Tab[] = [ {
    type: 'global',
    title: "Global",
    chat: [ ],
    input: new FormControl('')
  } ];
  selected = new FormControl(0);

  ngOnChanges(changes: SimpleChanges) {

  }

  addTab(player: PlayerComplete, selectAfterAdding: boolean) {
    const exists = this.tabs.find(tab => tab.player?.id === player.id);
    if (exists) return;
    const control = new FormControl('');
    const me = JSON.parse(localStorage.getItem('player')) as PlayerComplete;
    this.tabs.push({ type: 'private', title: player.name, player, chat: [
      {from: me, data: "Hello"},
      {from: player, data: "Hi"},
      {from: me, data: "How are you?"},
      {from: player, data: "Fine, how about you?"},
      {from: me, data: "Kill me"},
      {from: me, data: "Please"}
    ], input: new FormControl('') });

    if (selectAfterAdding) {
      this.selected.setValue(this.tabs.length - 1);
    }
  }

  removeTab(index: number) {
    this.tabs.splice(index, 1);
  }

  onSubmit(event) {
    console.log(event);
  }

}
