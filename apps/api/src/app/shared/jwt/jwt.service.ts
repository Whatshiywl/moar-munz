import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

interface TokenPayload {
    uuid: string;
}

@Injectable()
export class JWTService {

    private key = Buffer.from(process.env.JWT_KEY || 'bW9jaw==', 'base64');

    genToken(payload: TokenPayload) {
        return jwt.sign(payload, this.key);
    }

    getPayload(token: string) {
        return jwt.verify(token, this.key) as TokenPayload;
    }

}