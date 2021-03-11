import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Injectable()
export class SocketService extends Socket {

    constructor() {
        super ({
            url: window.location.origin,
            options: {
                autoConnect: false,
                query: `token=${sessionStorage.getItem('token')}`
            }
        });
    }

    emit(event: string, data?: object, cb: Function = null) {
        const token = sessionStorage.getItem('token');
        const body = { token, data };
        if (cb) super.emit(event, body, cb);
        else super.emit(event, body);
    }

}
