import { Injectable } from '@nestjs/common';
import axios from 'axios';
import FormData from 'form-data';
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
      formData.append('Captcha.Id', '153dbd65-003c-4c24-ac3c-016996d1e7aa');

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
      
      // Check if response is status 200 (success indicator)
      if (response.status === 200) {
        console.log(`[LOGIN] ✅ SUCCESS for ${username}: Status code is 200`);
        return true;
      } else {
        console.log(`[LOGIN] ❌ Failed for ${username}: Status code is ${response.status}, expected 200`);
        
        // Log response body snippet for non-200 status
        const responseBody = response.data || '';
        const bodyString = typeof responseBody === 'string' 
          ? responseBody 
          : JSON.stringify(responseBody);
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
          
          // Check if status is 200 (success)
          if (status === 200) {
            console.log(`[LOGIN] ✅ SUCCESS for ${username}: Status code is 200 (from error response)`);
            return true;
          } else {
            console.log(`[LOGIN] ❌ Failed for ${username}: Status code is ${status}, expected 200`);
            
            const responseBody = error.response.data || '';
            const bodyString = typeof responseBody === 'string' 
              ? responseBody 
              : JSON.stringify(responseBody);
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

