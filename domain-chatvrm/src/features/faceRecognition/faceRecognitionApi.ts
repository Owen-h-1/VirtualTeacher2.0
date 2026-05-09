const FACE_RECOGNITION_BASE_URL = process.env.NEXT_PUBLIC_FACE_RECOGNITION_URL 
  ? `${process.env.NEXT_PUBLIC_FACE_RECOGNITION_URL}/api`
  : (typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
    ? '/api/facerecognition' 
    : 'http://localhost:8080/api');

export interface ExpressionData {
  expression: string;
  confidence: number;
  learning_state: {
    state: string;
    confidence: number;
    description: string;
  };
  engagement_score: number;
  intervention?: {
    state: string;
    suggestions: string[];
    confidence: number;
  };
}

export interface SessionData {
  session_id: string;
  success: boolean;
}

class FaceRecognitionService {
  private sessionId: string | null = null;
  private isSessionActive: boolean = false;

  async startSession(): Promise<SessionData> {
    try {
      const response = await fetch(`${FACE_RECOGNITION_BASE_URL}/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) throw new Error('Failed to start session');
      
      const data = await response.json();
      this.sessionId = data.session_id;
      this.isSessionActive = true;
      return data;
    } catch (error) {
      console.error('Error starting face recognition session:', error);
      throw error;
    }
  }

  async endSession(): Promise<void> {
    if (!this.sessionId) return;
    
    try {
      await fetch(`${FACE_RECOGNITION_BASE_URL}/session/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: this.sessionId }),
      });
      
      this.sessionId = null;
      this.isSessionActive = false;
    } catch (error) {
      console.error('Error ending session:', error);
    }
  }

  async analyzeFrame(imageDataUrl: string): Promise<ExpressionData> {
    if (!this.sessionId || !this.isSessionActive) {
      throw new Error('No active session. Call startSession() first.');
    }

    try {
      const response = await fetch(`${FACE_RECOGNITION_BASE_URL}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.sessionId,
          image: imageDataUrl,
        }),
      });

      if (!response.ok) throw new Error('Analysis failed');

      const data = await response.json();
      return {
        expression: data.expression,
        confidence: data.confidence,
        learning_state: data.learning_state,
        engagement_score: data.engagement_score,
        intervention: data.intervention,
      };
    } catch (error) {
      console.error('Error analyzing frame:', error);
      throw error;
    }
  }

  async getSessionStatus() {
    if (!this.sessionId) return null;

    try {
      const response = await fetch(
        `${FACE_RECOGNITION_BASE_URL}/session/${this.sessionId}/status`
      );
      return response.ok ? await response.json() : null;
    } catch (error) {
      console.error('Error getting session status:', error);
      return null;
    }
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  isActive(): boolean {
    return this.isSessionActive;
  }
}

export const faceRecognitionService = new FaceRecognitionService();
