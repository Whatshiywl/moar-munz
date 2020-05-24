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
        console.log('has token?');
        if (!uuid || !token) {
            console.log('no');
            const tokenResponse = await this.http.get<{ token: string, uuid: string }>('/api/v1/token').toPromise();
            sessionStorage.setItem('token', tokenResponse.token);
            sessionStorage.setItem('uuid', tokenResponse.uuid);
            console.log('got', tokenResponse);
        }
        return true;
    }
}