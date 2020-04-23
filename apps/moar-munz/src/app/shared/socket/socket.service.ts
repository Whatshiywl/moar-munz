import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';

@Injectable()
export class SocketService extends Socket {

    constructor() {
        super ({ url: window.location.origin, options: { autoConnect: false } });
    }

}