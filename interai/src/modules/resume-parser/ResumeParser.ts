/**
 * ResumeParser - Extracts and parses resume data from PDF files
 * Uses PDF.js for text extraction, Tesseract.js for OCR, and local parsing
 */
import * as pdfjsLib from 'pdfjs-dist';
import { createWorker } from 'tesseract.js';
import type { ResumeData } from '@/types';

// Set up PDF.js worker dynamically
function setupPDFWorker() {
  if (pdfjsLib.GlobalWorkerOptions.workerSrc) {
    return; // Already set
  }
  
  if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
    // Use extension's local worker file
    pdfjsLib.GlobalWorkerOptions.workerSrc = chrome.runtime.getURL('assets/pdf.worker.min.mjs');
  } else if (typeof window !== 'undefined') {
    // Fallback for non-extension contexts (development/testing)
    try {
      // @vite-ignore - This path is only used in development/testing, not in extension
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        '../../node_modules/pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url
      ).href;
    } catch (e) {
      // Suppress warning
    }
  }
}

export class ResumeParser {
  /**
   * Extract text from PDF file using PDF.js
   */
  async extractTextFromPDF(file: File): Promise<string> {
    setupPDFWorker();
    
    console.log('Extracting text from PDF:', file.name);
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    console.log('PDF loaded, pages:', pdf.numPages);
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    
    const extractedText = fullText.trim();
    console.log('Extracted text length:', extractedText.length);
    
    return extractedText;
  }

  /**
   * Convert PDF page to image for OCR
   */
  private async pdfPageToImage(page: any, scale: number = 2): Promise<string> {
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    
    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    };
    
    await page.render(renderContext).promise;
    return canvas.toDataURL('image/png');
  }

  /**
   * Extract text from PDF using OCR (Tesseract.js) when text extraction fails
   */
  async extractTextWithOCR(file: File): Promise<string> {
    console.log('Using OCR to extract text from PDF:', file.name);
    setupPDFWorker();
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    // Initialize Tesseract worker
    const worker = await createWorker('eng');
    
    let fullText = '';
    
    try {
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing page ${i}/${pdf.numPages} with OCR...`);
        const page = await pdf.getPage(i);
        const imageDataUrl = await this.pdfPageToImage(page, 2);
        
        // Convert data URL to image
        const img = new Image();
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = imageDataUrl;
        });
        
        // Perform OCR
        const { data: { text } } = await worker.recognize(img);
        fullText += text + '\n';
      }
    } finally {
      await worker.terminate();
    }
    
    const extractedText = fullText.trim();
    console.log('OCR extracted text length:', extractedText.length);
    return extractedText;
  }

  /**
   * Main text extraction method - tries PDF.js first, falls back to OCR
   */
  async extractText(file: File): Promise<string> {
    try {
      // First try direct text extraction
      const text = await this.extractTextFromPDF(file);
      
      // If we got very little text, it might be an image-based PDF
      if (text.trim().length < 100) {
        console.log('Low text extraction, trying OCR...');
        return await this.extractTextWithOCR(file);
      }
      
      return text;
    } catch (error) {
      console.warn('PDF text extraction failed, trying OCR:', error);
      return await this.extractTextWithOCR(file);
    }
  }

  /**
   * Advanced local parser - extracts structured data from resume text
   */
  private parseResume(text: string): ResumeData {
    // Fix spaced-out text like "D A T A   A N A L Y S T" -> "DATA ANALYST"
    // This happens when PDFs have character-level spacing
    let normalizedText = text;
    
    // Pattern: Single uppercase letters separated by spaces (2+ spaces indicate word break)
    // Replace "A B C D" (single letters with 1 space) with "ABCD"
    normalizedText = normalizedText.replace(/([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])/g, 
      (match, ...letters) => letters.join(''));
    
    // Shorter patterns
    normalizedText = normalizedText.replace(/([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])/g, 
      (match, ...letters) => letters.join(''));
    
    normalizedText = normalizedText.replace(/([A-Z])\s+([A-Z])\s+([A-Z])\s+([A-Z])/g, 
      (match, a, b, c, d) => `${a}${b}${c}${d}`);
    
    // Normalize whitespace - replace multiple spaces with single space
    normalizedText = normalizedText.replace(/[ \t]+/g, ' ').trim();
    
    // Split by newlines, but if there are no newlines, try to split by common separators
    let lines = normalizedText.split(/\n|\r\n/).map(l => l.trim()).filter(l => l.length > 0);
    
    // If everything is on one line, try to split intelligently
    if (lines.length === 1 || lines.length < 5) {
      const singleLine = lines.join(' ');
      // Split by common patterns that indicate new sections/entries
      lines = singleLine.split(/(?=\b(?:Education|Experience|Skills|Projects|Work|Employment|Summary|Objective|Contact|Phone|Email|LinkedIn|GitHub)\b)/i)
        .map(l => l.trim())
        .filter(l => l.length > 0);
      
      // Also split by patterns like "Company Name | Position" or date ranges
      const furtherSplit: string[] = [];
      for (const line of lines) {
        // Split by date patterns (YYYY - YYYY)
        const dateSplit = line.split(/(\d{4}\s*[-–—]\s*(?:\d{4}|Present|Current))/i);
        if (dateSplit.length > 1) {
          furtherSplit.push(...dateSplit.filter(s => s.trim().length > 0));
        } else {
          furtherSplit.push(line);
        }
      }
      lines = furtherSplit;
    }
    
    const fullText = normalizedText.toLowerCase();
    
    console.log('Parsing resume with', lines.length, 'lines');
    console.log('First 10 lines:', lines.slice(0, 10));
    
    // Extract email (handle emails with spaces like "email @gmail.com")
    const emailPattern = /([A-Za-z0-9._%+-]+)\s*@\s*([A-Za-z0-9.-]+\.[A-Z|a-z]{2,})/;
    const emailMatch = normalizedText.match(emailPattern);
    const email = emailMatch ? `${emailMatch[1]}@${emailMatch[2]}` : '';
    
    // Extract phone (handle various formats)
    const phonePatterns = [
      /\+?\d{1,3}[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
      /\+?\d{10,15}/,
    ];
    let phone: string | undefined;
    for (const pattern of phonePatterns) {
      const match = normalizedText.match(pattern);
      if (match) {
        phone = match[0].replace(/\s+/g, '');
        break;
      }
    }
    
    // Extract LinkedIn
    const linkedInMatch = text.match(/linkedin\.com\/in\/[\w-]+/i);
    const linkedIn = linkedInMatch ? `https://${linkedInMatch[0]}` : undefined;
    
    // Extract portfolio/GitHub
    const portfolioMatch = text.match(/(?:github|portfolio|website)[\s:]*([\w\.-]+\.(?:com|io|dev|net|org))/i);
    const portfolio = portfolioMatch ? `https://${portfolioMatch[1]}` : undefined;
    
    // Extract location
    const locationMatch = text.match(/(?:location|address|based in)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z]{2})/i);
    const location = locationMatch ? locationMatch[1] : undefined;
    
    // Extract name from the very beginning - first 2-4 capitalized words
    let fullName = 'Unknown';
    const firstWords = normalizedText.split(/\s+/).slice(0, 6);
    
    // Look for name pattern: 2-4 words, all starting with capital letters, 2+ chars each
    for (let i = 2; i <= 4; i++) {
      const candidate = firstWords.slice(0, i).join(' ');
      const words = candidate.split(/\s+/);
      
      // Check if all words are valid name words (2+ letters, start with capital)
      const allValid = words.every(w => /^[A-Z][A-Za-z-]{1,}$/.test(w) && w.length >= 2);
      const hasInvalid = words.some(w => 
        /^(Data|Analyst|Software|Engineer|Developer|Manager|Phone|Email|LinkedIn|GitHub)$/i.test(w)
      );
      
      if (allValid && !hasInvalid && candidate.length >= 4 && candidate.length < 50) {
        fullName = words
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        console.log('Found name:', fullName);
        break;
      }
    }

    // Extract summary/objective
    const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
    let summary: string | undefined;
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      if (summaryKeywords.some(kw => lower.includes(kw)) && i + 1 < lines.length) {
        summary = lines.slice(i + 1, i + 4).join(' ').substring(0, 500);
        break;
      }
    }

    // Extract work experience - parse from full text using patterns
    const workExperience: any[] = [];
    
    // Look for job titles in the text
    const jobTitlePattern = /\b(Data\s+Analyst|Software\s+Engineer|Developer|Manager|Consultant|Specialist|Lead|Senior|Junior|Analyst|Engineer|Developer|Designer|Architect)\b/gi;
    const jobMatches = [...normalizedText.matchAll(jobTitlePattern)];
    
    console.log('Found', jobMatches.length, 'potential job titles');
    
    // For each job title, extract context and try to find company
    for (const match of jobMatches.slice(0, 5)) {
      const matchIndex = match.index!;
      const beforeContext = normalizedText.substring(Math.max(0, matchIndex - 150), matchIndex);
      const afterContext = normalizedText.substring(matchIndex, Math.min(normalizedText.length, matchIndex + 300));
      
      // Try to find company name before or after the job title
      const companyPatterns = [
        /([A-Z][A-Za-z\s&]+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems|Solutions|Services|Group|Labs)?)\s+(?:[-–—|]|at|@)/,
        /(?:at|@|[-–—|])\s+([A-Z][A-Za-z\s&]+(?:Inc|LLC|Corp|Ltd|Company|Technologies|Systems|Solutions|Services|Group|Labs)?)/,
      ];
      
      let company = 'Unknown';
      for (const pattern of companyPatterns) {
        const beforeMatch = beforeContext.match(pattern);
        const afterMatch = afterContext.match(pattern);
        if (beforeMatch && beforeMatch[1]) {
          company = beforeMatch[1].trim();
          break;
        }
        if (afterMatch && afterMatch[1]) {
          company = afterMatch[1].trim();
          break;
        }
      }
      
      // Extract dates if present
      const datePattern = /(\d{4}|\w+\s+\d{4})\s*[-–—]\s*(\d{4}|Present|Current)/i;
      const dateMatch = (beforeContext + afterContext).match(datePattern);
      
      let startDate = new Date();
      let endDate: Date | undefined;
      let isCurrent = false;
      
      if (dateMatch) {
        try {
          startDate = this.parseDateString(dateMatch[1]);
          if (dateMatch[2].toLowerCase().includes('present') || dateMatch[2].toLowerCase().includes('current')) {
            isCurrent = true;
          } else {
            endDate = this.parseDateString(dateMatch[2]);
          }
        } catch (e) {
          // Ignore
        }
      }
      
      workExperience.push({
        id: crypto.randomUUID(),
        company: company,
        position: match[0].trim(),
        startDate,
        endDate,
        isCurrent,
        description: afterContext.substring(0, 300),
        achievements: [],
        technologies: [],
      });
    }
    
    // Traditional line-by-line parsing as fallback
    const workKeywords = ['experience', 'employment', 'work history', 'professional experience', 'work'];
    let inWorkSection = false;
    let currentExp: any = null;
    let foundWorkHeader = false;
    
    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      line = line.replace(/\s+/g, ' ').trim();
      const lowerLine = line.toLowerCase();
      
      if (!foundWorkHeader && workKeywords.some(kw => lowerLine.includes(kw) && lowerLine.length < 50)) {
        inWorkSection = true;
        foundWorkHeader = true;
        console.log('Found work section at line', i);
        continue;
      }
      
      // Look for dates (YYYY-YYYY, MM/YYYY, etc.)
      const datePattern = /(\d{4}|\d{1,2}\/\d{4}|\w+\s+\d{4})\s*[-–—]\s*(\d{4}|\d{1,2}\/\d{4}|\w+\s+\d{4}|present|current)/i;
      const dateMatch = line.match(datePattern);
      
      // Look for job titles and companies - more flexible patterns
      const jobPatterns = [
        /^(.+?)\s+(?:at|@)\s+(.+)$/i,
        /^(.+?)\s*[-–—]\s*(.+)$/,
        /^(.+?)\s*\|\s*(.+)$/,
        /^(.+?),\s*(.+)$/,
        /^(.+?)\s+(.+)$/, // Generic: "Title Company"
      ];
      
      let jobMatch = null;
      for (const pattern of jobPatterns) {
        jobMatch = line.match(pattern);
        if (jobMatch && jobMatch[1].length > 2 && jobMatch[2].length > 2) break;
      }
      
      // Also check if line looks like a job title (capitalized words, not too long)
      if (!jobMatch && inWorkSection && line.length > 5 && line.length < 80) {
        const words = line.split(/\s+/);
        if (words.length >= 2 && words.length <= 8) {
          // Check if it looks like "Job Title at Company" or similar
          const atIndex = words.findIndex(w => w.toLowerCase() === 'at');
          if (atIndex > 0 && atIndex < words.length - 1) {
            jobMatch = [
              null,
              words.slice(0, atIndex).join(' '),
              words.slice(atIndex + 1).join(' ')
            ];
          }
        }
      }
      
      if (jobMatch && inWorkSection && jobMatch[1] && jobMatch[2] && jobMatch[1].length < 100) {
        // Save previous experience
        if (currentExp) {
          workExperience.push(currentExp);
        }
        
        // Extract dates if present
        let startDate = new Date();
        let endDate: Date | undefined;
        let isCurrent = false;
        
        if (dateMatch) {
          try {
            startDate = this.parseDateString(dateMatch[1]);
            if (dateMatch[2].toLowerCase().includes('present') || dateMatch[2].toLowerCase().includes('current')) {
              isCurrent = true;
            } else {
              endDate = this.parseDateString(dateMatch[2]);
            }
          } catch (e) {
            // Ignore date parsing errors
          }
        }
        
        currentExp = {
          id: crypto.randomUUID(),
          company: jobMatch[2]?.trim() || 'Unknown',
          position: jobMatch[1]?.trim() || 'Unknown',
          startDate,
          endDate,
          isCurrent,
          description: '',
          achievements: [],
          technologies: [],
        };
        console.log('Found work experience:', currentExp.position, 'at', currentExp.company);
      } else if (currentExp && line.length > 10 && !dateMatch && !workKeywords.some(kw => lowerLine === kw)) {
        // Add description lines to current experience
        if (line.match(/^[-•*]\s+/)) {
          // Bullet point - likely an achievement
          currentExp.achievements.push(line.replace(/^[-•*]\s+/, ''));
        } else {
          currentExp.description += (currentExp.description ? ' ' : '') + line;
        }
        
        // Extract technologies mentioned
        const techKeywords = ['javascript', 'python', 'java', 'react', 'node', 'typescript', 'sql', 'aws', 'docker', 'kubernetes'];
        techKeywords.forEach(tech => {
          if (lowerLine.includes(tech) && !currentExp.technologies.includes(tech)) {
            currentExp.technologies.push(tech);
          }
        });
      }
      
      // Check if we've left the work section (hit education or skills)
      if (inWorkSection && (lowerLine.includes('education') || lowerLine.includes('skills') || lowerLine.includes('projects'))) {
        if (currentExp) {
          workExperience.push(currentExp);
          currentExp = null;
        }
        inWorkSection = false;
      }
    }
    if (currentExp) {
      workExperience.push(currentExp);
    }

    // Extract education - parse from full text
    const education: any[] = [];
    
    // Look for degree patterns
    const degreePattern = /\b(Master|Bachelor|PhD|Doctorate|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|M\.?C\.?A\.?)\s+of\s+([A-Z][A-Za-z\s&]+(?:\([^)]+\))?)/gi;
    const degreeMatches = [...normalizedText.matchAll(degreePattern)];
    
    // Also look for simpler patterns
    const simpleDegreePattern = /\b(Master|Bachelor|PhD|Doctorate|MCA|MBA|B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?)\b/gi;
    const simpleMatches = [...normalizedText.matchAll(simpleDegreePattern)];
    
    const allDegreeMatches = [...degreeMatches, ...simpleMatches].slice(0, 5);
    
    for (const match of allDegreeMatches) {
      const matchIndex = match.index!;
      const context = normalizedText.substring(Math.max(0, matchIndex - 50), Math.min(normalizedText.length, matchIndex + 200));
      
      // Find institution
      const institutionPattern = /([A-Z][A-Za-z\s&]+(?:University|College|Institute|School|Academy|Univ))/;
      const institutionMatch = context.match(institutionPattern);
      
      const degreeText = match[0] + (match[2] ? ' ' + match[2] : '');
      
      education.push({
        id: crypto.randomUUID(),
        institution: institutionMatch ? institutionMatch[1].trim() : 'Unknown',
        degree: degreeText.trim(),
        startDate: new Date(),
        endDate: undefined,
      });
    }
    
    console.log('Found', education.length, 'education entries');

    // Extract skills - search entire text
    const technicalSkills: string[] = [];
    const softSkills: string[] = [];
    
    // Comprehensive list of technical skills
    const commonTechSkills = [
      'javascript', 'python', 'java', 'react', 'node', 'typescript', 'sql', 'html', 'css',
      'aws', 'docker', 'kubernetes', 'git', 'mongodb', 'postgresql', 'redis', 'linux',
      'angular', 'vue', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'c++', 'c#',
      'express', 'next.js', 'django', 'flask', 'spring', 'laravel', 'rails',
      'mysql', 'oracle', 'elasticsearch', 'graphql', 'rest', 'api',
      'jenkins', 'ci/cd', 'terraform', 'ansible', 'nginx', 'apache',
      'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'matplotlib', 'seaborn',
      'excel', 'power bi', 'tableau', 'jupyter', 'r language', 'spark', 'hadoop'
    ];
    
    const commonSoftSkills = [
      'leadership', 'communication', 'teamwork', 'problem solving', 'analytical',
      'collaboration', 'management', 'agile', 'scrum', 'project management'
    ];
    
    // Search entire text for skills
    const lowerText = fullText;
    commonTechSkills.forEach(skill => {
      if (lowerText.includes(skill) && !technicalSkills.includes(skill)) {
        technicalSkills.push(skill);
      }
    });
    
    commonSoftSkills.forEach(skill => {
      if (lowerText.includes(skill) && !softSkills.includes(skill)) {
        softSkills.push(skill);
      }
    });
    
    console.log('Found', technicalSkills.length, 'technical skills');

    // Extract projects
    const projects: any[] = [];
    const projectKeywords = ['projects', 'portfolio', 'personal projects'];
    let inProjectSection = false;
    let currentProject: any = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (projectKeywords.some(kw => lowerLine.includes(kw))) {
        inProjectSection = true;
        continue;
      }
      
      if (inProjectSection && line.length > 5 && line.length < 100 && !line.includes('@')) {
        if (currentProject) projects.push(currentProject);
        currentProject = {
          id: crypto.randomUUID(),
          name: line,
          description: '',
          technologies: [],
          keyFeatures: [],
        };
      } else if (currentProject && line.length > 10) {
        if (line.match(/^[-•*]\s+/)) {
          currentProject.keyFeatures.push(line.replace(/^[-•*]\s+/, ''));
        } else {
          currentProject.description += (currentProject.description ? ' ' : '') + line;
        }
        
        // Extract technologies
        commonTechSkills.forEach(tech => {
          if (lowerLine.includes(tech) && !currentProject.technologies.includes(tech)) {
            currentProject.technologies.push(tech);
          }
        });
      }
    }
    if (currentProject) {
      projects.push(currentProject);
    }

    return {
      id: crypto.randomUUID(),
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      personalInfo: {
        fullName,
        email,
        phone,
        location,
        linkedIn,
        portfolio,
        summary,
      },
      workExperience: workExperience.slice(0, 15),
      education: education.slice(0, 10),
      skills: {
        technical: technicalSkills.slice(0, 30),
        soft: softSkills.slice(0, 15),
        languages: [],
        certifications: [],
      },
      projects: projects.slice(0, 10),
      source: 'parsed',
    };
  }

  /**
   * Parse date string to Date object
   */
  private parseDateString(dateStr: string): Date {
    if (!dateStr) return new Date();
    
    // Try ISO format first
    if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(dateStr);
    }
    
    // Try MM/YYYY or M/YYYY
    const monthYear = dateStr.match(/(\d{1,2})\/(\d{4})/);
    if (monthYear) {
      return new Date(parseInt(monthYear[2]), parseInt(monthYear[1]) - 1, 1);
    }
    
    // Try YYYY
    const year = dateStr.match(/^(\d{4})$/);
    if (year) {
      return new Date(parseInt(year[1]), 0, 1);
    }
    
    // Try other formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }
    
    return new Date();
  }

  /**
   * Main method to parse PDF resume
   */
  async parsePDFResume(file: File): Promise<ResumeData> {
    console.log('Starting resume parsing for:', file.name);
    
    // Extract text from PDF (tries PDF.js first, falls back to OCR)
    const resumeText = await this.extractText(file);
    
    if (!resumeText || resumeText.trim().length < 50) {
      throw new Error('Could not extract sufficient text from PDF. The file might be corrupted.');
    }
    
    console.log('Extracted text length:', resumeText.length);
    console.log('First 300 chars:', resumeText.substring(0, 300));
    
    // Parse using local parser (no API needed)
    const parsed = this.parseResume(resumeText);
    parsed.sourceFile = file.name;
    
    console.log('Parsing complete:', {
      name: parsed.personalInfo.fullName,
      email: parsed.personalInfo.email,
      workExp: parsed.workExperience.length,
      education: parsed.education.length,
      skills: parsed.skills.technical.length,
      projects: parsed.projects.length
    });
    
    return parsed;
  }
}
