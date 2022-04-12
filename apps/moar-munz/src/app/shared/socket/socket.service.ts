import { Injectable } from '@angular/core';
import { Match, Message, Prompt, Trade, TradeSide } from '@moar-munz/api-interfaces';
import { Socket } from 'ngx-socket-io';
import { Subject } from 'rxjs';

type SocketType<P, C = undefined> = { payload: P, callback?: C };

@Injectable()
export class SocketService extends Socket {

    onMatch$: Subject<SocketType<Match>> = new Subject<SocketType<Match>>();
    onMessage$: Subject<SocketType<Message>> = new Subject<SocketType<Message>>();
    onDiceRoll$: Subject<SocketType<number[]>> = new Subject<SocketType<number[]>>();
    onPromptNew$: Subject<SocketType<Prompt>> = new Subject<SocketType<Prompt>>();
    onPromptUpdate$: Subject<SocketType<Prompt>> = new Subject<SocketType<Prompt>>();
    onTradeUpdate$: Subject<SocketType<TradeSide, (confirmed: Trade | false) => void>> = new Subject<SocketType<TradeSide, (confirmed: Trade | false) => void>>();
    onTradeEnd$: Subject<SocketType<string>> = new Subject<SocketType<string>>();

    constructor() {
        super ({
            url: window.location.origin,
            options: {
                autoConnect: false,
                query: `token=${sessionStorage.getItem('token')}`
            }
        });
        console.log('Construct SocketService with token', sessionStorage.getItem('token'));

        const next = <T, C = undefined>(
            subject: Subject<SocketType<T, C>>
        ) => ((payload: T, callback?: C) => {
            subject.next({ payload, callback });
        });

        super.on('match', match => {
            console.log('socket match state', match?.state);
            next(this.onMatch$)(match);
        });
        super.on('message', next(this.onMessage$));
        super.on('dice roll', next(this.onDiceRoll$));
        super.on('new prompt', next(this.onPromptNew$));
        super.on('update prompt', next(this.onPromptUpdate$));
        super.on('update trade', next(this.onTradeUpdate$));
        super.on('end trade', next(this.onTradeEnd$));
    }

    emit(event: string, data?: object, cb: Function = null) {
        const token = sessionStorage.getItem('token');
        const body = { token, data };
        if (cb) super.emit(event, body, cb);
        else super.emit(event, body);
    }

}
