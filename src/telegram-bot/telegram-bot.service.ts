import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Bot, Context } from 'grammy';
import { ExcelParserService } from './excel-parser.service';
import { LoginService } from './login.service';

// Selected users array - only these users can use the bot
const SELECTED_USERS: number[] = [6495964834];

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private bot: Bot;
  private readonly selectedUsers: number[] = SELECTED_USERS;

  constructor(
    private readonly excelParserService: ExcelParserService,
    private readonly loginService: LoginService,
    private readonly configService: ConfigService,
  ) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
    }
    this.bot = new Bot(token);
  }

  async onModuleInit() {
    this.setupHandlers();
    // Start the bot
    this.bot.start().catch((error) => {
      console.error('Error starting bot:', error);
    });
  }

  start() {
    // This method is called from the module constructor
    // Bot initialization happens in onModuleInit
  }

  private setupHandlers() {
    // Check if user is authorized
    this.bot.use(async (ctx: Context, next) => {
      const userId = ctx.from?.id;
      if (!userId) {
        return;
      }

      if (!this.selectedUsers.includes(userId)) {
        await ctx.reply('You are not authorized to use this bot.');
        return;
      }

      await next();
    });

    // Handle document (Excel file) uploads
    this.bot.on('message:document', async (ctx: Context) => {
      try {
        const document = ctx.message?.document;
        if (!document) {
          await ctx.reply('Please send an Excel file (.xlsx)');
          return;
        }

        const fileExtension = document.file_name?.split('.').pop()?.toLowerCase();
        if (fileExtension !== 'xlsx' && fileExtension !== 'xls') {
          await ctx.reply('Please send a valid Excel file (.xlsx or .xls)');
          return;
        }

        await ctx.reply('Processing Excel file... Please wait.');

        // Download the file
        const file = await ctx.api.getFile(document.file_id);
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        const fileUrl = `https://api.telegram.org/file/bot${token}/${file.file_path}`;

        // Parse Excel file
        const students = await this.excelParserService.parseExcelFile(fileUrl);

        if (students.length === 0) {
          await ctx.reply('No valid data found in the Excel file. Please ensure it has username and password columns.');
          return;
        }

        await ctx.reply(`Found ${students.length} students. Starting login verification...`);

        // Process logins
        const results = await this.loginService.processLogins(students);

        // Format results
        let message = 'Login Verification Results:\n\n';
        let successCount = 0;
        let failCount = 0;

        for (const [username, success] of Object.entries(results)) {
          const status = success ? '✅ Success' : '❌ Failed';
          message += `${username}: ${status}\n`;
          if (success) successCount++;
          else failCount++;
        }

        message += `\nSummary: ${successCount} successful, ${failCount} failed out of ${students.length} total.`;

        await ctx.reply(message);

      } catch (error) {
        console.error('Error processing file:', error);
        await ctx.reply(`Error processing file: ${error.message}`);
      }
    });

    // Handle start command
    this.bot.command('start', async (ctx: Context) => {
      await ctx.reply('Welcome! Send me an Excel file (.xlsx) with username and password columns to verify logins.');
    });

    // Handle help command
    this.bot.command('help', async (ctx: Context) => {
      await ctx.reply(
        'This bot verifies eMaktab logins.\n\n' +
        'Send an Excel file (.xlsx) with two columns:\n' +
        '1. First column: Username\n' +
        '2. Second column: Password\n\n' +
        'The bot will process each row and verify the login credentials.'
      );
    });
  }
}

