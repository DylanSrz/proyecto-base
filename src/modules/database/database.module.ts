import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module.js";
import { SeedService } from "./seed.service.js";

@Module({
    imports: [UsersModule],
    providers: [SeedService]
})
export class DatabaseModule { }