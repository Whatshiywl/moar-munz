import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { HttpClient } from '@angular/common/http';

@Injectable()
export class SessionGuard implements CanActivate {

    constructor(
        private http: HttpClient,
    ) {}

    async canActivate() {
        const uuid = sessionStorage.getItem('uuid');
        const token = sessionStorage.getItem('token');
        if (!uuid || !token) {
            const tokenResponse = await this.http.get<{ token: string, uuid: string }>('/api/v1/token').toPromise();
            sessionStorage.setItem('token', tokenResponse.token);
            sessionStorage.setItem('uuid', tokenResponse.uuid);
            console.log('got', tokenResponse);
            window.location.reload();
            return false;
        }
        console.log(`Guard: uuid=${sessionStorage.getItem('uuid')} token=${sessionStorage.getItem('token')}`);
        return true;
    }
}
