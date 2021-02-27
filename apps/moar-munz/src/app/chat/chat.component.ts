import { Component, OnChanges, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Trade, Message, PlayerComplete } from '@moar-munz/api-interfaces';

interface Tab {
  type: 'global' | 'private',
  title: string,
  chat: Message[],
  input: FormControl,
  player?: PlayerComplete
  trade?: Trade,
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
      {from: me.id, data: "Hello", type: 'private', to: player.id},
      {from: player.id, data: "Hi", type: 'private', to: me.id},
      {from: me.id, data: "How are you?", type: 'private', to: player.id},
      {from: player.id, data: "Fine, how about you?", type: 'private', to: me.id},
      {from: me.id, data: "Kill me", type: 'private', to: player.id},
      {from: me.id, data: "Please", type: 'private', to: player.id}
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
