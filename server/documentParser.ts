/**
 * Document parser service for extracting text from various file formats
 */

/**
 * Parse text from base64 encoded file
 */
export async function parseDocument(
  fileContent: string,
  fileType: string
): Promise<string> {
  try {
    // For demo, we'll handle text files directly
    // In production, use libraries like pdf-parse, mammoth for PDF/DOCX
    
    if (fileType === 'text/plain' || fileType === 'text/markdown') {
      // Decode base64 to text
      const buffer = Buffer.from(fileContent, 'base64');
      return buffer.toString('utf-8');
    }
    
    if (fileType === 'application/pdf') {
      // For demo, return placeholder
      // In production: use pdf-parse
      return "PDF content would be extracted here using pdf-parse library";
    }
    
    if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // For demo, return placeholder
      // In production: use mammoth
      return "DOCX content would be extracted here using mammoth library";
    }
    
    // Try to decode as text for unknown types
    try {
      const buffer = Buffer.from(fileContent, 'base64');
      return buffer.toString('utf-8');
    } catch {
      throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    console.error("Error parsing document:", error);
    throw error;
  }
}

/**
 * Estimate token count for text
 */
export function estimateTokenCount(text: string): number {
  // Rough estimation: ~4 characters per token for English, ~2 for Chinese
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const otherChars = text.length - chineseChars;
  return Math.ceil(chineseChars / 2 + otherChars / 4);
}
