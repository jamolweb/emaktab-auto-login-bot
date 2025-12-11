import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import axios from 'axios';

export interface Student {
  username: string;
  password: string;
}

@Injectable()
export class ExcelParserService {
  async parseExcelFile(fileUrl: string): Promise<Student[]> {
    try {
      // Download the file
      const response = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      });

      // Parse Excel file
      const workbook = XLSX.read(response.data, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      // Extract students (first column: username, second column: password)
      const students: Student[] = [];
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i] as any[];
        if (row && row.length >= 2 && row[0] && row[1]) {
          const username = String(row[0]).trim();
          const password = String(row[1]).trim();
          
          if (username && password) {
            students.push({ username, password });
          }
        }
      }

      return students;
    } catch (error) {
      console.error('Error parsing Excel file:', error);
      throw new Error(`Failed to parse Excel file: ${error.message}`);
    }
  }
}

