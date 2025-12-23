import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';
import * as path from 'path';
import { Student } from './excel-parser.service';

@Injectable()
export class LoginService {
  private readonly loginUrl = 'https://login.emaktab.uz/';
  private readonly timeout = 30000; // 30 seconds

  async processLogins(students: Student[]): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    
    console.log(`[LOGIN] Starting batch processing for ${students.length} students`);

    // Process each student sequentially to avoid overwhelming the server
    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      console.log(`[LOGIN] Processing student ${i + 1}/${students.length}: ${student.username}`);
      
      try {
        const success = await this.verifyLogin(student.username, student.password);
        results[student.username] = success;
        console.log(`[LOGIN] Completed ${i + 1}/${students.length}: ${student.username} - ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
      } catch (error) {
        console.error(`[LOGIN] ❌ Exception processing ${student.username}:`, error);
        results[student.username] = false;
      }
      
      // Small delay between requests to avoid rate limiting
      if (i < students.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`[LOGIN] Batch processing completed. Results:`, results);
    
    // Clean up - clear any local variables to prevent memory leaks
    // Results are returned and will be garbage collected after use
    
    return results;
  }

  private async verifyLogin(username: string, password: string): Promise<boolean> {
    console.log(`[LOGIN] Starting verification for: ${username}`);
    
    try {
      // Create form data
      const formData = new FormData();
      formData.append('exceededAttempts', 'False');
      formData.append('ReturnUrl', '');
      formData.append('FingerprintId', '');
      formData.append('login', username);
      formData.append('password', password);
      formData.append('Captcha.Input', '');
      formData.append('Captcha.Id', '');

      console.log(`[LOGIN] Sending POST request to ${this.loginUrl} for ${username}`);

      // Make POST request
      const response = await axios.post(this.loginUrl, formData, {
        headers: {
          ...formData.getHeaders(),
        },
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: () => true, // Accept all status codes to check response body
      });

      console.log(`[LOGIN] Response status for ${username}: ${response.status}`);
      
      // Get response body as string
      const responseBody = response.data || '';
      const bodyString = typeof responseBody === 'string' 
        ? responseBody 
        : JSON.stringify(responseBody);
      
      // Save response body to file
      const responsesDir = path.join(process.cwd(), 'responses');
      if (!fs.existsSync(responsesDir)) {
        fs.mkdirSync(responsesDir, { recursive: true });
      }
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${username}_${timestamp}.html`;
      const filepath = path.join(responsesDir, filename);
      fs.writeFileSync(filepath, bodyString, 'utf-8');
      console.log(`[LOGIN] Response body saved to: ${filepath}`);
      
      console.log(`[LOGIN] Response body length: ${bodyString.length} characters`);
      
      // Check if response body contains failure indicators
      const containsKirish = bodyString.includes('Kirish');
      const containsParol = bodyString.includes('Parol');
      const hasFailureIndicators = containsKirish || containsParol;
      
      // Find positions where these strings appear
      if (containsKirish) {
        const kirishIndex = bodyString.indexOf('Kirish');
        const context = bodyString.substring(Math.max(0, kirishIndex - 50), Math.min(bodyString.length, kirishIndex + 100));
        console.log(`[LOGIN] Found "Kirish" at position ${kirishIndex}`);
        console.log(`[LOGIN] Context around "Kirish": ...${context}...`);
      }
      
      if (containsParol) {
        const parolIndex = bodyString.indexOf('Parol');
        const context = bodyString.substring(Math.max(0, parolIndex - 50), Math.min(bodyString.length, parolIndex + 100));
        console.log(`[LOGIN] Found "Parol" at position ${parolIndex}`);
        console.log(`[LOGIN] Context around "Parol": ...${context}...`);
      }
      
      console.log(`[LOGIN] Response body check for ${username}:`);
      console.log(`[LOGIN]   - Contains "Kirish": ${containsKirish}`);
      console.log(`[LOGIN]   - Contains "Parol": ${containsParol}`);
      
      // Check if response is status 200 and doesn't contain failure indicators
      if (response.status === 200) {
        if (hasFailureIndicators) {
          console.log(`[LOGIN] ❌ Failed for ${username}: Status is 200 but response body contains failure indicators (Kirish or Parol)`);
          return false;
        } else {
          console.log(`[LOGIN] ✅ SUCCESS for ${username}: Status code is 200 and no failure indicators found`);
          return true;
        }
      } else {
        console.log(`[LOGIN] ❌ Failed for ${username}: Status code is ${response.status}, expected 200`);
        const bodySnippet = bodyString.substring(0, 500);
        console.log(`[LOGIN] Response body snippet (first 500 chars) for ${username}:`, bodySnippet);
        return false;
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        // If it's a timeout or network error, return false
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
          console.error(`[LOGIN] ❌ Timeout for ${username} after ${this.timeout}ms`);
          return false;
        }
        
        // If response exists, check the status
        if (error.response) {
          const status = error.response.status;
          console.log(`[LOGIN] Error response status for ${username}: ${status}`);
          
          // Get response body as string
          const responseBody = error.response.data || '';
          const bodyString = typeof responseBody === 'string' 
            ? responseBody 
            : JSON.stringify(responseBody);
          
          // Save response body to file
          const responsesDir = path.join(process.cwd(), 'responses');
          if (!fs.existsSync(responsesDir)) {
            fs.mkdirSync(responsesDir, { recursive: true });
          }
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const filename = `${username}_${timestamp}_error.html`;
          const filepath = path.join(responsesDir, filename);
          fs.writeFileSync(filepath, bodyString, 'utf-8');
          console.log(`[LOGIN] Error response body saved to: ${filepath}`);
          
          // Check if response body contains failure indicators
          const containsKirish = bodyString.includes('Kirish');
          const containsParol = bodyString.includes('Parol');
          const hasFailureIndicators = containsKirish || containsParol;
          
          console.log(`[LOGIN] Error response body check for ${username}:`);
          console.log(`[LOGIN]   - Contains "Kirish": ${containsKirish}`);
          console.log(`[LOGIN]   - Contains "Parol": ${containsParol}`);
          
          // Check if status is 200 and doesn't contain failure indicators
          if (status === 200) {
            if (hasFailureIndicators) {
              console.log(`[LOGIN] ❌ Failed for ${username}: Status is 200 but response body contains failure indicators (Kirish or Parol)`);
              const bodySnippet = bodyString.substring(0, 500);
              console.log(`[LOGIN] Error response body snippet (first 500 chars) for ${username}:`, bodySnippet);
              return false;
            } else {
              console.log(`[LOGIN] ✅ SUCCESS for ${username}: Status code is 200 and no failure indicators found (from error response)`);
              return true;
            }
          } else {
            console.log(`[LOGIN] ❌ Failed for ${username}: Status code is ${status}, expected 200`);
            const bodySnippet = bodyString.substring(0, 500);
            console.log(`[LOGIN] Error response body snippet (first 500 chars) for ${username}:`, bodySnippet);
            return false;
          }
        } else {
          console.error(`[LOGIN] ❌ Network error for ${username}:`, error.message);
          console.error(`[LOGIN] Error code: ${error.code}`);
          console.error(`[LOGIN] Error details:`, error);
        }
      } else {
        console.error(`[LOGIN] ❌ Unexpected error for ${username}:`, error);
      }
      
      return false;
    }
  }
}

