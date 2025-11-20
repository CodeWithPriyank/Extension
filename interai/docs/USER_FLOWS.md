# InterviewCopilot User Flows

## Flow 1: Initial Setup and Configuration

### 1.1 First-Time User Onboarding
```
1. User installs extension
   ↓
2. Extension requests microphone permission
   ↓
3. Welcome screen appears with:
   - Brief introduction
   - Privacy policy acceptance
   - Initial settings configuration
   ↓
4. User uploads resume (PDF/JSON)
   - Resume parser extracts key information
   - User reviews and edits parsed data
   - Resume saved to local storage
   ↓
5. User completes initial setup
   - Selects preferred LLM provider
   - Configures API keys (if needed)
   - Sets default language
   ↓
6. Extension ready for use
```

### 1.2 Resume Upload Flow
```
1. User clicks "Upload Resume" in settings
   ↓
2. File picker opens (PDF, DOCX, or JSON)
   ↓
3. File uploaded and parsed
   ↓
4. Parsed data displayed in structured form:
   - Personal information
   - Work experience
   - Education
   - Skills
   - Projects
   ↓
5. User reviews and edits data
   ↓
6. User saves resume
   ↓
7. Resume data encrypted and stored locally
```

### 1.3 Job Description Setup Flow
```
1. User clicks "Add Job Description" before interview
   ↓
2. User can:
   - Paste job description text
   - Upload job description file
   - Enter job URL (extension scrapes)
   ↓
3. Extension extracts key information:
   - Job title
   - Required skills
   - Responsibilities
   - Qualifications
   ↓
4. User reviews and confirms
   ↓
5. Job description saved for current session
```

## Flow 2: Active Interview Session

### 2.1 Starting an Interview
```
1. User navigates to video conference (Zoom, Meet, etc.)
   ↓
2. User clicks extension icon
   ↓
3. Extension detects video conference platform
   ↓
4. Interview setup panel appears:
   - Select job description (if multiple)
   - Enable/disable suggestions
   - Adjust settings (sensitivity, latency)
   ↓
5. User clicks "Start Interview"
   ↓
6. Extension:
   - Requests microphone access (if not granted)
   - Begins audio capture
   - Starts speech-to-text transcription
   - Activates question detector
   ↓
7. Overlay UI appears (minimized state)
   ↓
8. Interview session active
```

### 2.2 Question Detection and Suggestion Flow
```
1. Interviewer speaks
   ↓
2. Audio captured and transcribed in real-time
   ↓
3. Question Detector analyzes transcript:
   - Detects question mark or question pattern
   - Analyzes speech patterns (pitch, pause)
   ↓
4. Question confirmed → UI notification appears
   ↓
5. Full question text captured
   ↓
6. LLM Integration triggered:
   - Formats prompt with:
     * Resume data
     * Job description
     * Question text
   - Calls LLM API
   ↓
7. Suggestion generated (streaming response)
   ↓
8. Suggestion displayed in overlay/sidebar:
   - Structured answer format
   - Key talking points
   - STAR method structure (if applicable)
   ↓
9. User can:
   - Read suggestion
   - Click "Show Full" for detailed answer
   - Click "Edit" to personalize
   - Click "Dismiss" to hide
   - Click "Disable for this question"
```

### 2.3 User Interaction with Suggestions
```
Scenario A: User uses suggestion as-is
1. Suggestion appears
2. User reads suggestion
3. User responds naturally in interview
4. Suggestion auto-dismisses after user starts speaking

Scenario B: User edits suggestion
1. Suggestion appears
2. User clicks "Edit"
3. Text editor opens with suggestion
4. User modifies text
5. User saves edited version
6. Edited suggestion displayed

Scenario C: User dismisses suggestion
1. Suggestion appears
2. User clicks "Dismiss" or "X"
3. Suggestion hidden
4. No further suggestions for this question

Scenario D: User disables suggestions temporarily
1. User clicks "Pause Suggestions" button
2. Suggestions stop appearing
3. Transcription continues
4. User can re-enable anytime
```

### 2.4 Manual Suggestion Request
```
1. User notices a question but detector didn't trigger
   ↓
2. User clicks "Get Suggestion" button in overlay
   ↓
3. Extension captures last 30 seconds of transcript
   ↓
4. User selects question text (or extension auto-detects)
   ↓
5. LLM generates suggestion
   ↓
6. Suggestion displayed
```

## Flow 3: Interview Session Management

### 3.1 Pausing/Resuming Suggestions
```
1. During active interview
   ↓
2. User clicks "Pause Suggestions" in overlay
   ↓
3. Suggestions stop generating
   ↓
4. Transcription continues
   ↓
5. User can resume by clicking "Resume Suggestions"
```

### 3.2 Switching Job Descriptions Mid-Interview
```
1. User clicks settings icon in overlay
   ↓
2. Settings panel opens
   ↓
3. User selects different job description
   ↓
4. New job description loaded
   ↓
5. Future suggestions use new job description
```

### 3.3 Adjusting Settings During Interview
```
1. User clicks settings icon
   ↓
2. Quick settings panel appears:
   - Suggestion sensitivity
   - Overlay position
   - Text size
   - Auto-dismiss delay
   ↓
3. User adjusts settings
   ↓
4. Changes apply immediately
```

## Flow 4: Ending Interview Session

### 4.1 Normal Session End
```
1. Interview concludes
   ↓
2. User clicks "End Interview" in overlay
   ↓
3. Confirmation dialog appears
   ↓
4. User confirms
   ↓
5. Extension:
   - Stops audio capture
   - Stops transcription
   - Saves session transcript
   - Generates session summary
   ↓
6. Post-interview summary page opens:
   - Questions asked
   - Suggestions provided
   - User responses (if logged)
   - Analytics and feedback
   ↓
7. User reviews summary
   ↓
8. User can:
   - Export transcript
   - Save session for later review
   - Delete session data
   - Start new interview
```

### 4.2 Session Timeout/Error Recovery
```
1. Extension detects error (API failure, network issue)
   ↓
2. Error notification appears in overlay
   ↓
3. User can:
   - Retry failed operation
   - Continue without suggestions
   - End session
   ↓
4. Extension attempts automatic recovery
   ↓
5. Session continues if recovery successful
```

## Flow 5: Post-Interview Review

### 5.1 Viewing Interview Summary
```
1. User opens extension after interview
   ↓
2. Recent interviews list appears
   ↓
3. User selects interview session
   ↓
4. Summary page displays:
   - Timeline of questions and responses
   - Suggestions that were shown
   - Speech analysis (filler words, pacing)
   - Question categories
   - Response time metrics
   ↓
5. User can:
   - Review each question-answer pair
   - See what suggestions were provided
   - View analytics charts
   - Export data
```

### 5.2 Analytics Review
```
1. User navigates to Analytics tab
   ↓
2. Dashboard shows:
   - Question type distribution
   - Average response time
   - Filler word frequency
   - Suggestion usage rate
   - Improvement trends over time
   ↓
3. User can filter by:
   - Date range
   - Interview type
   - Job role
   ↓
4. User views insights and recommendations
```

## Flow 6: Practice Mode

### 6.1 Starting Practice Session
```
1. User clicks "Practice Mode" in extension
   ↓
2. Practice setup screen:
   - Select job role/type
   - Choose difficulty level
   - Set session duration
   - Enable/disable hints
   ↓
3. User clicks "Start Practice"
   ↓
4. Extension:
   - Loads question bank for role
   - Starts audio capture
   - Begins transcription
   ↓
5. Practice interview begins
   ↓
6. Extension asks questions (text-to-speech or displayed)
   ↓
7. User responds
   ↓
8. Extension provides feedback after each response
```

### 6.2 Practice Session Feedback
```
1. User completes response to practice question
   ↓
2. Extension analyzes response:
   - Structure and clarity
   - Relevance to question
   - Use of STAR method (if applicable)
   - Filler words and pacing
   ↓
3. Feedback displayed:
   - Strengths
   - Areas for improvement
   - Suggested improvements
   - Example answer
   ↓
4. User can:
   - Try answering again
   - Move to next question
   - Review all feedback at end
```

### 6.3 Practice Session Summary
```
1. Practice session ends
   ↓
2. Summary page shows:
   - Questions answered
   - Overall performance score
   - Detailed feedback for each question
   - Improvement recommendations
   ↓
3. User can:
   - Review specific questions
   - Export practice report
   - Start new practice session
```

## Flow 7: Settings Management

### 7.1 Accessing Settings
```
1. User clicks extension icon
   ↓
2. Options page opens
   ↓
3. Settings categories:
   - General (language, theme)
   - LLM Configuration (provider, model, API keys)
   - Audio (microphone, sample rate)
   - UI (overlay position, size, transparency)
   - Privacy (data retention, analytics)
   - Notifications
```

### 7.2 Configuring LLM Provider
```
1. User navigates to LLM Settings
   ↓
2. User selects provider:
   - OpenAI (GPT-4, GPT-3.5)
   - Anthropic (Claude)
   - Local model (if available)
   ↓
3. User enters API key (encrypted storage)
   ↓
4. User selects model
   ↓
5. User tests connection
   ↓
6. Settings saved
```

### 7.3 Privacy Settings
```
1. User navigates to Privacy settings
   ↓
2. Options available:
   - Auto-delete transcripts after X days
   - Enable/disable analytics
   - Data export
   - Clear all data
   - Privacy policy link
   ↓
3. User configures preferences
   ↓
4. Changes saved and applied
```

## Flow 8: Error Handling and Edge Cases

### 8.1 Microphone Permission Denied
```
1. Extension requests microphone access
   ↓
2. User denies permission
   ↓
3. Error message displayed:
   - Explanation of why permission needed
   - Instructions to grant permission
   - Link to browser settings
   ↓
4. Extension shows "Grant Permission" button
   ↓
5. User grants permission
   ↓
6. Extension resumes normal flow
```

### 8.2 Network/API Failure
```
1. LLM API call fails
   ↓
2. Error notification in overlay
   ↓
3. Extension:
   - Retries with exponential backoff
   - Falls back to cached suggestions (if available)
   - Shows "Retry" button to user
   ↓
4. User can:
   - Wait for retry
   - Manually retry
   - Continue without suggestions
```

### 8.3 Platform Detection Failure
```
1. Extension cannot detect video conference platform
   ↓
2. Manual platform selection dialog
   ↓
3. User selects platform
   ↓
4. Extension adapts UI injection method
   ↓
5. Interview proceeds normally
```

