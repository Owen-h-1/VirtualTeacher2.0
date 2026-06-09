import { ExpressionData } from './faceRecognitionApi';

export type TeachingAdjustment = {
  action: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  suggestedResponse?: string;
};

class TeachingStrategyService {
  addExpressionData(_data: ExpressionData): void {
    // Placeholder implementation
  }

  getTeachingAdjustment(): TeachingAdjustment | null {
    return null;
  }
}

export const teachingStrategyService = new TeachingStrategyService();
