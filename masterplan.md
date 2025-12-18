# Masterplan: AI Career Mentor

## 1. App Overview and Objectives
**Product Name:** AI Career Mentor (Working Title)
**Concept:** A 24/7 AI-powered career coach designed to democratize career guidance for students and recent graduates.
**Core Value Proposition:** "Your personal AI career coach - available 24/7, costs nothing, judges nothing."
**Mission:** To bridge the gap between education and employment by providing accessible, high-quality career guidance that was previously reserved for those who could afford private coaching.

**Success Criteria (Hackathon):**
*   Resume analysis completes in <5 seconds.
*   Interview feedback scores are consistent (test with same answer twice).
*   Dashboard loads in <2 seconds.
*   Zero crashes during 3-minute judge demo.

## 2. Target Audience
*   **Primary:** College Students (2nd-4th year) & Recent Graduates (0-2 years).
*   **Secondary:** Career Switchers, Bootcamp Grads, International Students.
*   **User Persona:** "Alex," a Computer Science junior who is anxious about upcoming internships, has a messy resume, and freezes up during technical interviews.

## 3. Core Features & Functionality

### Phase 1: MVP (Hackathon Scope)
1.  **Smart Resume Analysis**
    *   **Input:** PDF Upload (Primary) with Text Paste fallback.
    *   **Processing:** Text extraction via `pdf-parse` (Node) or `PyMuPDF` (Python).
    *   **Output:**
        *   **ATS Score (0-100):** Visual progress bar with color coding.
        *   **Section Breakdown:** Detailed scoring for Contact, Summary, Experience, Skills, Education.
        *   **Actionable Insights:** Specific "Fix this" suggestions (e.g., "Add metrics to this bullet point").
        *   **Model Examples:** "Before vs. After" comparisons for specific bullet points.

2.  **AI Mock Interviews (Text-Based)**
    *   **Format:** Chat interface (like a messaging app).
    *   **Flow:**
        *   User selects Type (Behavioral/Technical) and Difficulty.
        *   AI asks a question.
        *   User types answer (Rich text support for code blocks).
        *   **Instant Feedback:** AI analyzes the answer immediately for clarity, technical accuracy, and STAR method usage.
    *   **UX:** Typing indicators, "End Interview" summary report.

3.  **Dynamic Career Roadmaps**
    *   **Input:** Target Role + Current Skill Level (captured during onboarding).
    *   **Output:** An interactive checklist of milestones (e.g., "Learn React Hooks," "Build a Portfolio Site").
    *   **Dynamic Nature:** Updates based on user progress (e.g., "You're moving fast, let's skip to advanced topics").

4.  **User Dashboard**
    *   Central hub showing Resume Score, Recent Interview Performance, and Roadmap Progress.

### Phase 2: Future Expansion
*   **Voice/Video Interviews:** Speech-to-text analysis and body language tracking.
*   **Job Matching:** Scraping job boards to match users with roles based on their analyzed profile.
*   **Community:** Peer-to-peer mock interviews.

## 4. Technical Stack Recommendations

### Frontend
*   **Framework:** React.js (Vite) or Next.js.
*   **Styling:** Tailwind CSS (for rapid, responsive UI).
*   **State Management:** React Context or Zustand.
*   **Icons/Components:** Lucide React / ShadcnUI (for polished look).

### Backend
*   **Runtime:** Node.js (Express) OR Python (FastAPI/Flask).
    *   *Note: Python is superior for PDF parsing and AI libraries, but Node.js keeps the stack unified.*
*   **AI Integration:** Anthropic Claude API (via SDK) or OpenAI API.
*   **PDF Processing:** `pdf-parse` (Node) or `PyMuPDF` (Python).

### Database
*   **System:** PostgreSQL.
*   **Hosting:** Supabase, Neon, or Railway.
*   **Schema Strategy:** Relational for Users/Auth, JSONB for flexible Roadmap structures.

### Infrastructure
*   **Hosting:** Vercel (Frontend), Railway/Render (Backend).
*   **Auth:** Google OAuth (via NextAuth or Passport.js).

## 5. Conceptual Data Model

### Users
*   `id` (UUID)
*   `email`, `name`, `avatar`
*   `onboarding_data` (JSON: target_role, skill_level, graduation_year)

### Resumes
*   `id` (UUID)
*   `user_id` (FK)
*   `raw_text` (Text)
*   `analysis_result` (JSON: scores, suggestions, keywords)
*   `created_at`

### Interviews
*   `id` (UUID)
*   `user_id` (FK)
*   `type` (Enum: behavioral, technical)
*   `transcript` (JSON: array of Q&A objects with feedback)
*   `overall_score` (Int)

### Roadmaps
*   `id` (UUID)
*   `user_id` (FK)
*   `role` (String)
*   `milestones` (JSONB: array of phases, tasks, status, resources)
*   `progress` (Int: percentage)

## 6. User Interface Design Principles
*   **Encouraging & Non-Judgmental:** Use positive language ("Let's polish this" instead of "This is bad").
*   **Clean & Focused:** Minimal distractions during the interview mode.
*   **Gamified Progress:** Progress bars, checkmarks, and "confetti" moments when completing milestones.
*   **Professional but Modern:** Dark mode support, crisp typography (Inter/San Francisco).

## 7. Security Considerations
*   **Data Privacy:** Resumes contain PII (Personally Identifiable Information). Ensure they are processed in memory or stored securely with RLS (Row Level Security).
*   **OAuth Only:** Minimize risk by not handling passwords directly.
*   **Rate Limiting:** Prevent API abuse (AI costs) by limiting resumes/interviews per hour.

## 8. Development Phases (Hackathon Plan)

### Day 1: Foundation
*   Setup Repo & CI/CD.
*   Implement Google OAuth.
*   Build Onboarding Flow (3-question survey).
*   Database Schema Setup.

### Day 2: The "Wow" Factor (Resume)
*   Implement PDF Upload & Text Extraction.
*   Build AI Prompt for Resume Analysis.
    *   **Prompt Structure:** System role as ATS/Career Coach. User prompt includes resume text and requests JSON output with: Overall Score, Section Scores, 3 Quick Wins, Missing Keywords, and one "Before/After" example.
*   Create Resume Dashboard UI.

### Day 3: The Core Loop (Interview)
*   Build Chat Interface.
*   Implement AI Interview Logic (Question -> Answer -> Feedback loop).
*   Save Interview History.

### Day 4: Retention (Roadmap)
*   Implement Roadmap Generation Logic.
*   Build Interactive Checklist UI.
*   Polish UI/UX & Fix Bugs.

### Day 5: Demo Prep & Storytelling
*   Create "Golden Path" demo account with pre-filled data.
    *   *Tip:* Pre-seed with a "bad" resume (42/100) and have a "good" version ready to upload to show the transformation (89/100).
*   **Pitch Deck (5 slides max):**
    *   Slide 1: The Problem (Alex's story).
    *   Slide 2: Market Size ($1.66B → $3.38B).
    *   Slide 3: Our Solution (3 features with screenshots).
    *   Slide 4: Tech Stack (impress technical judges).
    *   Slide 5: Traction Plan (how we'll get first 100 users).
*   **3-Minute Pitch Script:** Practice until smooth.
*   Record backup demo video.
*   Final polish + bug fixes.

## 9. Potential Challenges & Solutions
*   **Challenge:** PDF Parsing fails on complex layouts.
    *   **Solution:** Fallback to "Paste Text" option immediately.
*   **Challenge:** AI Hallucinations (giving wrong advice).
    *   **Solution:** Use "System Prompts" to ground the AI as a "Supportive Senior Recruiter" and lower temperature settings.
*   **Challenge:** Latency (AI taking too long to reply).
    *   **Solution:** Use streaming responses (typing effect) so the user sees activity immediately.
*   **Challenge:** Running out of time on Day 4.
    *   **Solution:** Have a "Cut List" ready:
        *   ✂️ First to cut: Dynamic roadmap updates (make it static generation).
        *   ✂️ Second to cut: Rich text editor in interviews (plain textarea is fine).
        *   ✂️ Third to cut: Multiple interview types (just do "Behavioral" well).

## 10. Business Model (Post-Hackathon)

**Free Tier:**
*   3 resume analyses/month.
*   5 mock interviews/month.
*   Basic roadmap.

**Pro Tier ($9.99/month):**
*   Unlimited analyses.
*   Unlimited interviews.
*   Advanced roadmap with resources.
*   Priority AI response time.
*   Export reports as PDF.

**Enterprise (B2B - Future):**
*   University career centers pay for campus-wide access.
*   Pricing: $5,000-15,000/year per campus.
*   TAM: 5,000+ colleges in US alone.
