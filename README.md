# Kundalik.com Auto Login Bot

A Telegram bot built with NestJS and Grammy that verifies eMaktab login credentials from Excel files.

## Features

- Only responds to selected users (whitelist)
- Accepts Excel (.xlsx) files with username and password columns
- Verifies login credentials against eMaktab login system
- Returns success/failure status for each student
- 30-second timeout for API requests
- Automatic memory cleanup

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```bash
cp .env.example .env
```

3. Add your Telegram bot token to `.env`:
```
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
```

4. Update the selected users array in `src/telegram-bot/telegram-bot.service.ts`:
```typescript
const SELECTED_USERS: number[] = [6495964834]; // Add your Telegram user IDs
```

5. Run the application:
```bash
npm run start:dev
```

## Usage

1. Start a conversation with the bot on Telegram
2. Send an Excel file (.xlsx) with two columns:
   - First column: Username
   - Second column: Password
3. The bot will process each row and verify the login credentials
4. You'll receive a report with success/failure status for each student

## Excel File Format

The Excel file should have the following structure:

| Username | Password |
|----------|----------|
| student1 | password1 |
| student2 | password2 |
| ... | ... |

## Commands

- `/start` - Start the bot
- `/help` - Show help message

## Technical Details

- **Framework**: NestJS
- **Telegram Library**: Grammy
- **Excel Parser**: xlsx
- **HTTP Client**: axios
- **API Timeout**: 30 seconds
- **Login Endpoint**: https://login.emaktab.uz/

