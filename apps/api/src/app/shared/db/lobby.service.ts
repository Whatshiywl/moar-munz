import { Injectable } from '@nestjs/common';
import { LowDbService } from '../lowdb/lowdb.service';
import { UUIDService } from '../uuid/uuid.service';

@Injectable()
export class LobbyService {

    constructor(
        private db: LowDbService,
        private uuidService: UUIDService
    ) { }

    generateLobby() {
        const lobby = {
            id: this.uuidService.generateUUID(),
            players: [ ]
        };
        this.db.createLobby(lobby);
        return lobby;
    }

    getLobby(id: string) {
        return this.db.readLobby(id);
    }

    saveLobby(lobby) {
        return this.db.updateLobby(lobby);
    }

    deleteLobby(id: string) {
        return this.db.deleteLobby(id);
    }

}