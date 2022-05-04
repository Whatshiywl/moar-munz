import { Global, Module } from "@nestjs/common";
import { LowDbService } from "./lowdb.service";

@Global()
@Module({
  providers: [
    LowDbService
  ],
  exports: [
    LowDbService
  ]
})
export class LowDbModule { }
