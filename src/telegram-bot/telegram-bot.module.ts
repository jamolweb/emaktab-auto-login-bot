import { Module } from '@nestjs/common';
import { TelegramBotService } from './telegram-bot.service';
import { ExcelParserService } from './excel-parser.service';
import { LoginService } from './login.service';

@Module({
  providers: [TelegramBotService, ExcelParserService, LoginService],
})
export class TelegramBotModule {
  constructor(private readonly telegramBotService: TelegramBotService) {
    this.telegramBotService.start();
  }
}

